import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if exists
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const hadToken = !!localStorage.getItem('token');
      localStorage.removeItem('token');
      // Solo forzamos el redirect si había una sesión que se invalidó (token
      // expirado/inválido en una request autenticada). Un 401 de credenciales
      // incorrectas en el propio login no debe recargar la página: haría
      // desaparecer el error antes de que el usuario lo vea.
      if (hadToken) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);
