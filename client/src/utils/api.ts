import axios, { AxiosError } from 'axios';
import { User, FoodEntry, WeightLog, WaterLog, WaterStats } from '../types';
import { isTokenExpired } from './token';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
  },
  timeout: 10000, // 10 seconds timeout
  params: {}, // Will be populated per request with cache-busting
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized (token expired or invalid)
    if (error.response?.status === 401) {
      // Clear invalid token but don't redirect (login is disabled)
      const token = localStorage.getItem('token');
      if (token && isTokenExpired(token)) {
        // Token is expired, clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        // Token might be invalid for other reasons, clear it anyway
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    if (error.code === 'ECONNREFUSED' || error.message === 'Network Error') {
      error.message = 'Cannot connect to server. Please ensure the backend is running.';
    }
    return Promise.reject(error);
  }
);

// Add token to requests and check expiration
api.interceptors.request.use((config) => {
  // Add cache-busting parameter to GET requests only to prevent browser caching
  if (config.method === 'get' || !config.method) {
    config.params = { ...config.params, _t: Date.now() };
  }
  const token = localStorage.getItem('token');
  if (token) {
    // Check if token is expired before making request
    if (isTokenExpired(token)) {
      // Token expired, clear it but don't redirect (login is disabled)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Cancel the request
      return Promise.reject(new Error('Token expired'));
    }
    
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getStoredUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// User API
export const userAPI = {
  getProfile: async (): Promise<User> => {
    const response = await api.get('/users/profile');
    return response.data;
  },
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },
};

// Food API
export const foodAPI = {
  getAll: async (date?: string): Promise<FoodEntry[]> => {
    const response = await api.get('/foods', { params: { date } });
    return response.data;
  },
  getStats: async (date?: string) => {
    const response = await api.get('/foods/stats', { params: { date } });
    return response.data;
  },
  getWeekly: async () => {
    const response = await api.get('/foods/weekly');
    return response.data;
  },
  create: async (data: Omit<FoodEntry, '_id'>): Promise<FoodEntry> => {
    const response = await api.post('/foods', data);
    return response.data;
  },
  update: async (id: string, data: Partial<FoodEntry>): Promise<FoodEntry> => {
    const response = await api.put(`/foods/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/foods/${id}`);
  },
  migrate: async () => {
    const response = await api.post('/foods/migrate');
    return response.data;
  },
};

// Weight API
export const weightAPI = {
  getAll: async (limit?: number): Promise<WeightLog[]> => {
    const response = await api.get('/weight', { params: { limit } });
    return response.data;
  },
  create: async (data: Omit<WeightLog, '_id'>): Promise<WeightLog> => {
    const response = await api.post('/weight', data);
    return response.data;
  },
  update: async (id: string, data: Partial<WeightLog>): Promise<WeightLog> => {
    const response = await api.put(`/weight/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/weight/${id}`);
  },
};

// Water API
export const waterAPI = {
  getAll: async (date?: string): Promise<WaterLog[]> => {
    const response = await api.get('/water', { params: { date } });
    return response.data;
  },
  getStats: async (date?: string): Promise<WaterStats> => {
    const response = await api.get('/water/stats', { params: { date } });
    return response.data;
  },
  create: async (data: Omit<WaterLog, '_id'>): Promise<WaterLog> => {
    const response = await api.post('/water', data);
    return response.data;
  },
  update: async (id: string, data: Partial<WaterLog>): Promise<WaterLog> => {
    const response = await api.put(`/water/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/water/${id}`);
  },
};

export default api;

