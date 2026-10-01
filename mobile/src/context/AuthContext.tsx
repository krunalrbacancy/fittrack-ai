import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authAPI, userAPI } from '../utils/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, name?: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (username: string, password: string) => {
    const response = await authAPI.login(username, password);
    setUser(response.user);
  };

  const register = async (username: string, password: string, name?: string) => {
    const response = await authAPI.register(username, password, name);
    setUser(response.user);
  };

  const loginAsGuest = async () => {
    const response = await authAPI.guest();
    setUser(response.user);
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const userData = await userAPI.getProfile();
        setUser(userData);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        await AsyncStorage.multiRemove(['token', 'user']);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      const updatedUser = await userAPI.updateProfile(userData);
      setUser(updatedUser);
    } catch (error: any) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginAsGuest, logout, updateUser }}>
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
