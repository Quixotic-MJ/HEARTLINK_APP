import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session storage on load
    const storedUserId = sessionStorage.getItem('heartlink_admin_user_id');
    const storedUser = sessionStorage.getItem('heartlink_admin_user');
    
    if (storedUserId) {
      setUserId(storedUserId);
      setIsAuthenticated(true);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
    setLoading(false);
  }, []);

  const login = (userId, userData = null) => {
    setUserId(userId);
    setIsAuthenticated(true);
    sessionStorage.setItem('heartlink_admin_user_id', userId);
    
    if (userData) {
      setUser(userData);
      sessionStorage.setItem('heartlink_admin_user', JSON.stringify(userData));
    }
  };

  const logout = () => {
    setUserId(null);
    setUser(null);
    setIsAuthenticated(false);
    sessionStorage.removeItem('heartlink_admin_user_id');
    sessionStorage.removeItem('heartlink_admin_user');
  };

  return (
    <AuthContext.Provider value={{ user, userId, isAuthenticated, login, logout, loading }}>
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
