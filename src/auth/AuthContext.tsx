import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, logActivity } from '../services/api';
import socketService from '../socket/socketService';

export interface AuthenticatedUser {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'agent';
  token: string;
}

interface AuthContextType {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load user session and theme on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('enterprise_auth_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        // Reconnect socket and join company room on page reload
        socketService.connect();
        socketService.joinCompany(null);
      } catch (e) {
        console.error('Failed to parse stored auth user', e);
        localStorage.removeItem('enterprise_auth_user');
      }
    }

    const storedTheme = localStorage.getItem('enterprise_theme') as 'light' | 'dark';
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      setUser(data);
      localStorage.setItem('enterprise_auth_user', JSON.stringify(data));
      // Connect socket and join company room
      socketService.connect();
      socketService.joinCompany(null);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    if (user) {
      logActivity(`${user.name} logged out`, user.name, user.role);
    }
    socketService.disconnect();
    setUser(null);
    localStorage.removeItem('enterprise_auth_user');
  };


  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('enterprise_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    theme,
    toggleTheme
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
