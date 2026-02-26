/* ============================================================
   Auth Context — Love For You ❤️
   Global auth state with JWT persistence
   ============================================================ */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/messageApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Restore session from localStorage on mount
    useEffect(() => {
        const token = localStorage.getItem('lfyToken');
        const saved = localStorage.getItem('lfyUser');

        if (token && saved) {
            try {
                setUser(JSON.parse(saved));
            } catch {
                localStorage.removeItem('lfyUser');
            }
            // Verify token is still valid
            authApi.getMe()
                .then(({ data }) => {
                    setUser(data);
                    localStorage.setItem('lfyUser', JSON.stringify(data));
                })
                .catch(() => {
                    localStorage.removeItem('lfyToken');
                    localStorage.removeItem('lfyUser');
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (email, password) => {
        setError('');
        try {
            const { data } = await authApi.login(email, password);
            localStorage.setItem('lfyToken', data.token);
            localStorage.setItem('lfyUser', JSON.stringify(data.user));
            setUser(data.user);
            return data.user;
        } catch (err) {
            const msg = err.response?.data?.error || 'Login failed. Please try again.';
            setError(msg);
            throw new Error(msg);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('lfyToken');
        localStorage.removeItem('lfyUser');
        setUser(null);
    }, []);

    const value = {
        user,
        loading,
        error,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        login,
        logout,
        setError,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
