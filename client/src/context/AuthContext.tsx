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
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9bdd0136-1069-43f1-84b9-1dd5076c3ea5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:21',message:'initAuth called',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      try {
        const token = localStorage.getItem('token');
        const storedUser = authAPI.getStoredUser();

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9bdd0136-1069-43f1-84b9-1dd5076c3ea5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:25',message:'initAuth token check',data:{hasToken:!!token,hasStoredUser:!!storedUser,isTokenValid:token ? isTokenValid(token) : false},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion

        // Always try to fetch user profile (backend supports optionalAuth)
        // This ensures we get the latest data even without a token
        try {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/9bdd0136-1069-43f1-84b9-1dd5076c3ea5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:32',message:'Fetching user profile',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          const userData = await userAPI.getProfile();
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/9bdd0136-1069-43f1-84b9-1dd5076c3ea5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:35',message:'User profile fetched',data:{userId:userData?._id,hasName:!!userData?.name,hasCarbs:!!userData?.dailyCarbsTarget},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          setUser(userData);
          // Update stored user data
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (error: any) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/9bdd0136-1069-43f1-84b9-1dd5076c3ea5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:40',message:'Failed to fetch profile',data:{error:String(error),status:error?.response?.status},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          console.error('Failed to fetch user profile:', error);
          // If there's a stored user, use it as fallback
          if (storedUser) {
            setUser(storedUser);
          } else {
            setUser(null);
          }
        }
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9bdd0136-1069-43f1-84b9-1dd5076c3ea5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:50',message:'initAuth error',data:{error:String(error)},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
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

  const login = async (username: string, password: string) => {
    const response = await authAPI.login(username, password);
    setUser(response.user);
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
  };

  const updateUser = async (userData: Partial<User>) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/9bdd0136-1069-43f1-84b9-1dd5076c3ea5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:82',message:'updateUser called',data:{hasCarbs:'dailyCarbsTarget' in userData,hasFats:'dailyFatsTarget' in userData,hasFiber:'dailyFiberTarget' in userData},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      const updatedUser = await userAPI.updateProfile(userData);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9bdd0136-1069-43f1-84b9-1dd5076c3ea5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:85',message:'updateUser API success',data:{userId:updatedUser?._id,hasCarbs:!!updatedUser?.dailyCarbsTarget},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setUser(updatedUser);
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9bdd0136-1069-43f1-84b9-1dd5076c3ea5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:89',message:'updateUser API error',data:{error:String(error),status:error?.response?.status},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
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

