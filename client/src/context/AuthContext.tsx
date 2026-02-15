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

  const login = async (username: string, password: string) => {
    const response = await authAPI.login(username, password);
    setUser(response.user);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = authAPI.getStoredUser();

        // If no token exists, auto-login with default credentials
        if (!token) {
          try {
            const loginResponse = await authAPI.login('admin', 'admin123');
            setUser(loginResponse.user);
            // After auto-login, fetch the profile to get latest data
            try {
              const userData = await userAPI.getProfile();
              setUser(userData);
              localStorage.setItem('user', JSON.stringify(userData));
            } catch (profileError: any) {
              // If profile fetch fails, use login response
              console.error('Failed to fetch user profile after auto-login:', profileError);
            }
          } catch (loginError: any) {
            console.error('Auto-login failed:', loginError);
            // If auto-login fails, try to fetch profile anyway (optionalAuth)
            try {
              const userData = await userAPI.getProfile();
              setUser(userData);
              localStorage.setItem('user', JSON.stringify(userData));
            } catch (profileError: any) {
              console.error('Failed to fetch user profile:', profileError);
              if (storedUser) {
                setUser(storedUser);
              } else {
                setUser(null);
              }
            }
          }
        } else {
          // Token exists, fetch user profile
          try {
            const userData = await userAPI.getProfile();
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          } catch (error: any) {
            console.error('Failed to fetch user profile:', error);
            // If token is invalid, try auto-login
            if (error.response?.status === 401) {
              try {
                const loginResponse = await authAPI.login('admin', 'admin123');
                setUser(loginResponse.user);
                const userData = await userAPI.getProfile();
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
              } catch (loginError: any) {
                console.error('Auto-login after token failure:', loginError);
                if (storedUser) {
                  setUser(storedUser);
                } else {
                  setUser(null);
                }
              }
            } else {
              if (storedUser) {
                setUser(storedUser);
              } else {
                setUser(null);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
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

  const logout = () => {
    authAPI.logout();
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

