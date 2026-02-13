import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authAPI, userAPI } from '../utils/api';
import { isTokenValid } from '../utils/token';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = authAPI.getStoredUser();
        
        // Check if token exists and is valid
        if (token && storedUser && isTokenValid(token)) {
          try {
            // Verify token is still valid by fetching user profile
            const userData = await userAPI.getProfile();
            setUser(userData);
            // Update stored user data in case it changed
            localStorage.setItem('user', JSON.stringify(userData));
          } catch (error: any) {
            // If API call fails (401, network error, etc.), clear auth
            console.error('Failed to verify token:', error);
            authAPI.logout();
            setUser(null);
            
            // Only redirect if not already on login page
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }
        } else {
          // No valid token, clear everything
          if (token || storedUser) {
            authAPI.logout();
          }
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        authAPI.logout();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();
    
    // Listen for storage events (for PWA multi-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user') {
        initAuth();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = async (username: string, password: string) => {
    const response = await authAPI.login(username, password);
    setUser(response.user);
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
  };

  const updateUser = async (userData: Partial<User>) => {
    const updatedUser = await userAPI.updateProfile(userData);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

