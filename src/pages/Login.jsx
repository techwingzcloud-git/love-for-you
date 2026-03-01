import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import HeartAnimation from '../components/HeartAnimation';
import './Login.css';

export default function Login() {
    const { login, error, setError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loginMode, setLoginMode] = useState(null); // null, 'admin', 'user'

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields.');
            return;
        }
        setSubmitting(true);
        try {
            const user = await login(email.trim(), password);
            // Verify role matches selected mode
            if (loginMode === 'admin' && user.role !== 'admin') {
                setError('This account does not have admin access.');
                return;
            }
            if (loginMode === 'user' && user.role !== 'user') {
                setError('Please use the admin login option instead.');
                return;
            }
        } catch {
            // error is set inside the login function
        } finally {
            setSubmitting(false);
        }
    };

    const selectMode = (mode) => {
        setLoginMode(mode);
        setEmail('');
        setPassword('');
        setError('');
    };

    return (
        <div className="login-page page-wrapper bg-pink-dream">
            <HeartAnimation count={14} />

            <div className="login__container flex-col-center">
                <motion.div
                    className="login__card card-soft"
                    initial={{ opacity: 0, y: 36, scale: 0.93 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
                >
                    <div className="login__header">
                        <motion.span
                            className="login__heart"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            ❤️
                        </motion.span>
                        <h1 className="heading-hero login__title">Love For You</h1>
                        <p className="text-soft login__subtitle">
                            {!loginMode
                                ? 'Choose how to enter our world 💕'
                                : loginMode === 'admin'
                                    ? '🛡️ Admin Login'
                                    : '💕 Welcome back, sweetheart'}
                        </p>
                    </div>

                    {/* ── Role selection ─── */}
                    {!loginMode ? (
                        <div className="login__role-select">
                            <motion.button
                                className="login__role-btn login__role-btn--admin"
                                onClick={() => selectMode('admin')}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                id="login-as-admin-btn"
                            >
                                <span className="login__role-icon">🛡️</span>
                                <span className="login__role-label">Login as Admin</span>
                                <span className="login__role-desc">Manage content & settings</span>
                            </motion.button>

                            <motion.button
                                className="login__role-btn login__role-btn--user"
                                onClick={() => selectMode('user')}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                id="login-as-user-btn"
                            >
                                <span className="login__role-icon">💕</span>
                                <span className="login__role-label">Login as User</span>
                                <span className="login__role-desc">View & enjoy our world</span>
                            </motion.button>
                        </div>
                    ) : (
                        <>
                            <form className="login__form" onSubmit={handleSubmit} noValidate>
                                {error && (
                                    <motion.div
                                        className="login__error"
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        role="alert"
                                    >
                                        💔 {error}
                                    </motion.div>
                                )}

                                <div className="login__field">
                                    <label htmlFor="login-email" className="login__label">Email</label>
                                    <input
                                        id="login-email"
                                        type="email"
                                        className="login__input"
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                        required
                                        aria-describedby={error ? 'login-error' : undefined}
                                    />
                                </div>

                                <div className="login__field">
                                    <label htmlFor="login-password" className="login__label">Password</label>
                                    <div className="login__password-wrap">
                                        <input
                                            id="login-password"
                                            type={showPassword ? 'text' : 'password'}
                                            className="login__input"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            autoComplete="current-password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="login__toggle-pw"
                                            onClick={() => setShowPassword(v => !v)}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>

                                <motion.button
                                    type="submit"
                                    className="btn-primary login__submit"
                                    disabled={submitting}
                                    whileHover={{ scale: submitting ? 1 : 1.02 }}
                                    whileTap={{ scale: submitting ? 1 : 0.97 }}
                                    id="login-submit-btn"
                                >
                                    {submitting ? '✨ Logging in…' : loginMode === 'admin' ? '🛡️ Enter Admin Panel' : '💕 Enter Our World'}
                                </motion.button>
                            </form>

                            <button
                                className="login__back-btn"
                                onClick={() => { setLoginMode(null); setError(''); }}
                            >
                                ← Choose different role
                            </button>
                        </>
                    )}

                    <p className="login__note text-soft">
                        🔒 This is a private space. No registration allowed.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
