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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields.');
            return;
        }
        setSubmitting(true);
        try {
            await login(email.trim(), password);
        } catch {
            // error is set inside the login function
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="login-page page-wrapper bg-pink-dream">
            <HeartAnimation count={16} />

            <div className="login__container flex-col-center">
                <motion.div
                    className="login__card card-soft"
                    initial={{ opacity: 0, y: 40, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.7, type: 'spring', stiffness: 90 }}
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
                            Welcome back, sweetheart 💕
                        </p>
                    </div>

                    <form className="login__form" onSubmit={handleSubmit} noValidate>
                        {error && (
                            <motion.div
                                className="login__error"
                                initial={{ opacity: 0, y: -8 }}
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
                            whileHover={{ scale: submitting ? 1 : 1.03 }}
                            whileTap={{ scale: submitting ? 1 : 0.97 }}
                            id="login-submit-btn"
                        >
                            {submitting ? '✨ Logging in…' : '💕 Enter Our World'}
                        </motion.button>
                    </form>

                    <p className="login__note text-soft">
                        🔒 This is a private space, just for us.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
