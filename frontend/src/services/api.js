import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - token ekle
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - hata yönetimi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token geçersiz, logout yap
      localStorage.removeItem('token');
      localStorage.removeItem('session');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// AUTH APIs
export const authAPI = {
  qrLogin: (data) => api.post('/auth/qr-login', data),
  createProfile: (data) => api.post('/auth/create-profile', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// CAFE APIs
export const cafeAPI = {
  getInfo: (cafeId) => api.get(`/cafes/${cafeId}/info`),
  getTables: (cafeId) => api.get(`/cafes/${cafeId}/tables`),
};

export default api;
