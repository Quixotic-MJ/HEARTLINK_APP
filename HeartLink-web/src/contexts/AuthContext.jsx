import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session storage on load
    const storedUserId = sessionStorage.getItem('heartlink_admin_user_id');
    const storedUser = sessionStorage.getItem('heartlink_admin_user');
    const storedToken = sessionStorage.getItem('heartlink_admin_token');
    
    if (storedUserId && storedToken) {
      setUserId(storedUserId);
      setToken(storedToken);
      setIsAuthenticated(true);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = (userId, tokenStr, userData = null) => {
    setUserId(userId);
    setToken(tokenStr);
    setIsAuthenticated(true);
    sessionStorage.setItem('heartlink_admin_user_id', userId);
    sessionStorage.setItem('heartlink_admin_token', tokenStr);
    
    if (userData) {
      setUser(userData);
      sessionStorage.setItem('heartlink_admin_user', JSON.stringify(userData));
    }
  };

  const logout = async () => {
    const currentToken = sessionStorage.getItem('heartlink_admin_token');
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
