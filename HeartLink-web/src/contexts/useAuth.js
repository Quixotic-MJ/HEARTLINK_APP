import { createContext, useContext } from 'react';

// Kept apart from AuthProvider so AuthContext.jsx only exports a component (Vite's fast refresh needs that).
export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
