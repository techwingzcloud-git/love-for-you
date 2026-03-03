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
    sendLoginOtp: (userId) => api.post('/auth/send-login-otp', { userId }),
    verifyLoginOtp: (userId, otp) => api.post('/auth/verify-login-otp', { userId, otp }),
    getMe: () => api.get('/auth/me'),
    getPartner: () => api.get('/auth/partner'),
    updateProfile: (data) => api.patch('/auth/profile', data),
};

// ── Messages API ──────────────────────────────────────────────
export const messagesApi = {
    getAll: () => api.get('/messages'),
    send: (receiverId, message) => api.post('/messages', { receiverId, message }),
    markRead: () => api.patch('/messages/read'),
    getUnread: () => api.get('/messages/unread'),
    delete: (id) => api.delete(`/messages/${id}`),
};

// ── Admin Content API (CMS) ───────────────────────────────────
export const contentApi = {
    getAll: () => api.get('/content'),
    update: (key, value) => api.put(`/content/${key}`, { value }),
    // Upload image as base64 (stored in MongoDB — works on Vercel!)
    upload: (base64, name) => api.post('/content/upload', { base64, name }),
    // Future items
    getFuture: () => api.get('/content/future'),
    addFuture: (item) => api.post('/content/future', item),
    updateFuture: (id, item) => api.put(`/content/future/${id}`, item),
    deleteFuture: (id) => api.delete(`/content/future/${id}`),
};

// ── Public Content API (read-only for any authenticated user) ──
export const publicApi = {
    getContent: () => api.get('/public/content'),
    getFuture: () => api.get('/public/future'),
};

// ── OTP Recovery API ──────────────────────────────────────────
export const recoveryApi = {
    requestOTP: (mobileNumber, type) => api.post('/auth/request-otp', { mobileNumber, type }),
    verifyOTP: (userId, otp, type) => api.post('/auth/verify-otp', { userId, otp, type }),
    resetPassword: (resetToken, newPassword) => api.post('/auth/reset-password', { resetToken, newPassword }),
};

// ── Health API ────────────────────────────────────────────────
export const healthApi = {
    check: () => api.get('/health'),
};

export default api;
