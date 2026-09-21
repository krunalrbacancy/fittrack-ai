import axios, { AxiosError } from 'axios';
import { User, FoodEntry, WeightLog, WaterLog, WaterStats, ChatMessage } from '../types';
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
    // Handle 401 Unauthorized (token expired or invalid) by clearing stale auth state
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
  register: async (username: string, password: string, name?: string) => {
    const response = await api.post('/auth/register', { username, password, name });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  guest: async () => {
    const response = await api.post('/auth/guest');
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
  completeOnboarding: async (data: {
    age: number;
    gender: 'male' | 'female';
    height: number;
    currentWeight: number;
    targetWeight?: number | null;
    targetWaist?: number | null;
    activityLevel: string;
    goalType: string;
  }): Promise<User> => {
    const response = await api.post('/users/onboarding', data);
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

// Waist API
export const waistAPI = {
  getAll: async (limit?: number) => {
    const response = await api.get('/waist', { params: { limit } });
    return response.data;
  },
  create: async (data: { waist: number; date?: string; notes?: string }) => {
    const response = await api.post('/waist', data);
    return response.data;
  },
  update: async (id: string, data: Partial<{ waist: number; date?: string; notes?: string }>) => {
    const response = await api.put(`/waist/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/waist/${id}`);
  },
};

// Workout API
export const workoutAPI = {
  getAll: async (limit?: number) => {
    const response = await api.get('/workout', { params: { limit } });
    return response.data;
  },
  create: async (data: { date: string; workoutType?: string; duration?: number; notes?: string }) => {
    const response = await api.post('/workout', data);
    return response.data;
  },
  update: async (id: string, data: Partial<{ date?: string; workoutType?: string; duration?: number; notes?: string }>) => {
    const response = await api.put(`/workout/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/workout/${id}`);
  },
};

// Steps API
export const stepsAPI = {
  getAll: async (limit?: number) => {
    const response = await api.get('/steps', { params: { limit } });
    return response.data;
  },
  create: async (data: { steps: number; date?: string; notes?: string }) => {
    const response = await api.post('/steps', data);
    return response.data;
  },
  update: async (id: string, data: Partial<{ steps: number; date?: string; notes?: string }>) => {
    const response = await api.put(`/steps/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/steps/${id}`);
  },
};

// Reports API
export const reportsAPI = {
  getWeekly: async (startDate?: string, endDate?: string) => {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await api.get('/reports/weekly', { params });
    return response.data;
  },
};

export interface ChatUsage {
  tokensUsed: number;
  dailyBudget: number;
  tokensRemaining: number;
}

// Chat API
export const chatAPI = {
  getHistory: async (): Promise<ChatMessage[]> => {
    const response = await api.get('/chat/history');
    return response.data;
  },
  getUsage: async (): Promise<ChatUsage> => {
    const response = await api.get('/chat/usage');
    return response.data;
  },
  sendMessage: async (
    message: string,
    image?: File | null
  ): Promise<{
    reply: string;
    loggedFoodEntry?: { foodName: string; quantity: number; calories: number; protein: number; category: string } | null;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number; dailyBudget: number; tokensRemaining: number };
  }> => {
    if (image) {
      const formData = new FormData();
      if (message) formData.append('message', message);
      formData.append('image', image);
      // Image uploads + vision processing take longer than plain text; give it more room
      // than the default 10s timeout, especially if a model fallback retry kicks in server-side.
      const response = await api.post('/chat', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 45000,
      });
      return response.data;
    }
    const response = await api.post('/chat', { message });
    return response.data;
  },
  clearHistory: async (): Promise<void> => {
    await api.delete('/chat/history');
  },
};

export interface DocumentItem {
  _id: string;
  filename: string;
  sizeBytes: number;
  chunkCount: number;
  status: 'processing' | 'ready' | 'failed';
  createdAt: string;
}

export interface DocumentSource {
  filename: string;
  chunkIndex: number;
  excerpt: string;
  relevance: number;
}

// Documents API (RAG over uploaded text documents)
export const documentsAPI = {
  list: async (): Promise<DocumentItem[]> => {
    const response = await api.get('/documents');
    return response.data;
  },
  upload: async (file: File): Promise<DocumentItem> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },
  ask: async (question: string): Promise<{ answer: string; sources: DocumentSource[] }> => {
    const response = await api.post('/documents/ask', { question });
    return response.data;
  },
};

export default api;

