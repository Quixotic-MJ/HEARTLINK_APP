import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check storage on load
    const storedUserId = localStorage.getItem('heartlink_admin_user_id') || sessionStorage.getItem('heartlink_admin_user_id');
    const storedUser = localStorage.getItem('heartlink_admin_user') || sessionStorage.getItem('heartlink_admin_user');
    const storedToken = localStorage.getItem('heartlink_admin_token') || sessionStorage.getItem('heartlink_admin_token');
    
    if (storedUserId && storedToken) {
      setUserId(storedUserId);
      setToken(storedToken);
      setIsAuthenticated(true);
      let parsedUser = null;
      if (storedUser) {
        try {
          parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch (e) {}
      }
      
      if (!parsedUser) {
        const payload = decodeJwt(storedToken);
        if (payload) {
          const fallbackUser = { id: payload.user_id || storedUserId, role: payload.role };
          setUser(fallbackUser);
          parsedUser = fallbackUser;
          const storage = localStorage.getItem('heartlink_admin_token') ? localStorage : sessionStorage;
          storage.setItem('heartlink_admin_user', JSON.stringify(fallbackUser));
        }
      }

      // Sync latest profile details dynamically
      fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/users/${storedUserId}/profile`, {
        headers: { "Authorization": `Bearer ${storedToken}` }
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((profileData) => {
          if (profileData && profileData.id) {
            const updatedUser = {
              id: profileData.id,
              role: profileData.role || parsedUser?.role,
              first_name: profileData.first_name || "",
              last_name: profileData.last_name || "",
              email: profileData.email || "",
              phone: profileData.phone || "",
            };
            setUser(updatedUser);
            const storage = localStorage.getItem('heartlink_admin_token') ? localStorage : sessionStorage;
            storage.setItem('heartlink_admin_user', JSON.stringify(updatedUser));
          }
        })
        .catch(() => {});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      const hasToken = localStorage.getItem('heartlink_admin_token') || sessionStorage.getItem('heartlink_admin_token');
      if (hasToken && window.location.pathname !== '/' && window.location.pathname !== '/login') {
        logout();
      }
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = (userId, tokenStr, userData = null, remember = false) => {
    setUserId(userId);
    setToken(tokenStr);
    setIsAuthenticated(true);
    
    const storage = remember ? localStorage : sessionStorage;
    
    storage.setItem('heartlink_admin_user_id', userId);
    storage.setItem('heartlink_admin_token', tokenStr);
    
    let resolvedUser = userData;
    if (!resolvedUser && tokenStr) {
      const payload = decodeJwt(tokenStr);
      if (payload) {
        resolvedUser = { id: payload.user_id || userId, role: payload.role };
      }
    }
    
    if (resolvedUser) {
      setUser(resolvedUser);
      storage.setItem('heartlink_admin_user', JSON.stringify(resolvedUser));
    }
  };

  const logout = async () => {
    const currentToken = localStorage.getItem('heartlink_admin_token') || sessionStorage.getItem('heartlink_admin_token');
    if (currentToken) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${currentToken}`
          }
        });
      } catch(e) {}
    }

    setUserId(null);
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    sessionStorage.removeItem('heartlink_admin_user_id');
    sessionStorage.removeItem('heartlink_admin_user');
    sessionStorage.removeItem('heartlink_admin_token');
    localStorage.removeItem('heartlink_admin_user_id');
    localStorage.removeItem('heartlink_admin_user');
    localStorage.removeItem('heartlink_admin_token');
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, userId, token, isAuthenticated, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
