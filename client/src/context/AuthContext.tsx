import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authAPI, userAPI } from '../utils/api';

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
      const storedUser = authAPI.getStoredUser();
      if (storedUser) {
        try {
          const userData = await userAPI.getProfile();
          setUser(userData);
        } catch (error) {
          authAPI.logout();
        }
      }
      setLoading(false);
    };
    initAuth();
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

