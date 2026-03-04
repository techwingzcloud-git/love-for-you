/* ============================================================
   Auth Context — Love For You ❤️
   Manages JWT auth state, user data, and role-based access
   ============================================================ */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/messageApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Restore session on mount
    useEffect(() => {
        const token = localStorage.getItem('lfyToken');
        const storedUser = localStorage.getItem('lfyUser');

        if (token && storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
            } catch {
                localStorage.removeItem('lfyToken');
                localStorage.removeItem('lfyUser');
            }
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (email, password) => {
        setError('');
        try {
            const { data } = await authApi.login(email, password);
            // Step 1: password OK — server requires OTP before issuing token
            if (data.requiresOtp) {
                return { requiresOtp: true, userId: data.userId, maskedEmail: data.maskedEmail };
            }
            // Fallback: direct login (should not happen with new flow)
            localStorage.setItem('lfyToken', data.token);
            localStorage.setItem('lfyUser', JSON.stringify(data.user));
            setUser(data.user);
            return data.user;
        } catch (err) {
            const msg = err.response?.data?.error || 'Login failed. Please try again.';
            setError(msg);
            throw err;
        }
    }, []);

    // Called after OTP is verified — stores token and sets user
    const finalizeLogin = useCallback((token, userData) => {
        localStorage.setItem('lfyToken', token);
        localStorage.setItem('lfyUser', JSON.stringify(userData));
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('lfyToken');
        localStorage.removeItem('lfyUser');
        setUser(null);
        setError('');
    }, []);

    const isAuthenticated = !!user;
    const isAdmin = user?.role === 'admin';

    return (
        <AuthContext.Provider value={{
            user,
            setUser,
            loading,
            error,
            setError,
            login,
            finalizeLogin,
            logout,
            isAuthenticated,
            isAdmin,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
}

export default AuthContext;
