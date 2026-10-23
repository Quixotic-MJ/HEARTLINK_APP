import { useState, useEffect, useRef } from 'react';
import { AuthContext } from './useAuth';
import { apiFetch } from '../api';
import { queryClient } from '../app/queryClient';


// Pre-HL-033 keys that held the JWT in Web Storage. Purged on boot so no token lingers.
const LEGACY_STORAGE_KEYS = ['heartlink_admin_token', 'heartlink_admin_user', 'heartlink_admin_user_id'];

const purgeLegacyStorage = () => {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      LEGACY_STORAGE_KEYS.forEach((key) => storage.removeItem(key));
    } catch {
      // Storage can be unavailable (privacy mode); nothing to purge then.
    }
  }
};

const toUser = (data) => ({
  id: data.user_id || data.id,
  role: data.role,
  expert_type: data.expert_type || null,
  first_name: data.first_name || "",
  last_name: data.last_name || "",
  email: data.email || "",
  phone: data.phone || "",
  // HL-044: staff on a temporary password must set their own before using the portal
  mustChangePassword: !!(data.must_change_password ?? data.mustChangePassword),
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const isAuthenticatedRef = useRef(false);

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Clear the local session even if the server call fails.
    }

    queryClient.clear();
    setUserId(null);
    setUser(null);
    setIsAuthenticated(false);
    purgeLegacyStorage();
    window.location.href = '/';
  };

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    purgeLegacyStorage();

    // The session lives in an HttpOnly cookie, so ask the backend who we are.
    apiFetch('/api/auth/me')
      .then((data) => {
        if (data && data.user_id) {
          const resolvedUser = toUser(data);
          setUser(resolvedUser);
          setUserId(resolvedUser.id);
          setIsAuthenticated(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      if (isAuthenticatedRef.current && window.location.pathname !== '/' && window.location.pathname !== '/login') {
        logout();
      }
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // The backend refuses everything but a password change while the temporary password is in use.
  useEffect(() => {
    const handlePasswordChangeRequired = () => {
      setUser((prev) => (prev ? { ...prev, mustChangePassword: true } : prev));
    };
    window.addEventListener('auth:password-change-required', handlePasswordChangeRequired);
    return () => window.removeEventListener('auth:password-change-required', handlePasswordChangeRequired);
  }, []);

  const markPasswordChanged = () => {
    queryClient.clear();
    setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
  };

  // The backend already set the session cookie on the login response; only mirror the profile in memory.
  const login = (userId, userData = null) => {
    queryClient.clear();
    setUserId(userId);
    setIsAuthenticated(true);
    setUser(userData ? toUser({ id: userId, ...userData }) : { id: userId });
  };

  return (
    <AuthContext.Provider value={{ user, userId, isAuthenticated, login, logout, markPasswordChanged, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
