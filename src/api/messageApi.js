/* ============================================================
   API Client — Love For You ❤️
   Axios instance with JWT interceptor
   Works on both localhost and Vercel deployment
   ============================================================ */
import axios from 'axios';

// On Vercel: API is on same domain (/api)
// Locally: API is on localhost:5000/api
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API_BASE = isProduction
    ? '/api'
    : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('lfyToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses (expired/invalid token)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('lfyToken');
            localStorage.removeItem('lfyUser');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ── Auth API ──────────────────────────────────────────────────
export const authApi = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    getMe: () => api.get('/auth/me'),
    getPartner: () => api.get('/auth/partner'),
};

// ── Messages API ──────────────────────────────────────────────
export const messagesApi = {
    getAll: () => api.get('/messages'),
    send: (receiverId, message) => api.post('/messages', { receiverId, message }),
    markRead: () => api.patch('/messages/read'),
    getUnread: () => api.get('/messages/unread'),
    delete: (id) => api.delete(`/messages/${id}`),
};

// ── Health API ────────────────────────────────────────────────
export const healthApi = {
    check: () => api.get('/health'),
};

export default api;
