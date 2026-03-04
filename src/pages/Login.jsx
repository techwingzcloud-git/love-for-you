import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { authApi, recoveryApi } from '../api/messageApi';
import HeartAnimation from '../components/HeartAnimation';
import './Login.css';

const OTP_EXPIRY_SECONDS = 180; // 3 minutes
const RESEND_COOLDOWN = 60;  // 1 minute resend cooldown

export default function Login() {
    const { login, finalizeLogin, error, setError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loginMode, setLoginMode] = useState(null); // null | 'admin' | 'user'

    // ── Login OTP state ──
    const [loginStep, setLoginStep] = useState('creds'); // 'creds' | 'otp'
    const [pendingUserId, setPendingUserId] = useState(null);
    const [maskedEmail, setMaskedEmail] = useState('');
    const [loginOtp, setLoginOtp] = useState('');
    const [otpSending, setOtpSending] = useState(false);
    const [loginOtpError, setLoginOtpError] = useState('');
    const [loginOtpSuccess, setLoginOtpSuccess] = useState('');
    const [pendingRole, setPendingRole] = useState(null);
    // Countdown timer
    const [expiryCount, setExpiryCount] = useState(OTP_EXPIRY_SECONDS);
    const [resendCooldown, setResendCooldown] = useState(0);
    const timerRef = useRef(null);
    const resendRef = useRef(null);

    // ── OTP Recovery state ──
    const [recoveryMode, setRecoveryMode] = useState(null);
    const [recoveryStep, setRecoveryStep] = useState(1);
    const [mobileNumber, setMobileNumber] = useState('');
    const [recOtp, setRecOtp] = useState('');
    const [recoveryUserId, setRecoveryUserId] = useState(null);
    const [resetToken, setResetToken] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [recoveryResult, setRecoveryResult] = useState(null);
    const [recoveryError, setRecoveryError] = useState('');
    const [recoverySuccess, setRecoverySuccess] = useState('');
    const [recOtpSending, setRecOtpSending] = useState(false);

    // ── Start OTP expiry countdown ──
    const startExpiryTimer = useCallback(() => {
        clearInterval(timerRef.current);
        setExpiryCount(OTP_EXPIRY_SECONDS);
        timerRef.current = setInterval(() => {
            setExpiryCount(prev => {
                if (prev <= 1) { clearInterval(timerRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const startResendCooldown = useCallback(() => {
        clearInterval(resendRef.current);
        setResendCooldown(RESEND_COOLDOWN);
        resendRef.current = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) { clearInterval(resendRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
    }, []);

    useEffect(() => () => { clearInterval(timerRef.current); clearInterval(resendRef.current); }, []);

    const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    // ── Step 1: Password submit → get userId, trigger OTP ──
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
        setSubmitting(true);
        try {
            const result = await login(email.trim(), password);
            if (result?.requiresOtp) {
                // Role check before proceeding to OTP
                // We don't know role yet — check after OTP. Just store pending info.
                setPendingUserId(result.userId);
                setMaskedEmail(result.maskedEmail);
                setPendingRole(loginMode);

                // Auto-send the OTP
                setOtpSending(true);
                try {
                    const { data } = await authApi.sendLoginOtp(result.userId);
                    setLoginOtpSuccess(data.message || 'OTP sent!');
                    startExpiryTimer();
                    startResendCooldown();
                } catch (err) {
                    setLoginOtpError(err.response?.data?.error || 'Failed to send OTP.');
                } finally {
                    setOtpSending(false);
                }

                setLoginStep('otp');
                setLoginOtp('');
                setLoginOtpError('');
            }
        } catch {
            // error set inside login()
        } finally {
            setSubmitting(false);
        }
    };

    // ── Resend OTP ──
    const handleResendOtp = async () => {
        if (resendCooldown > 0 || !pendingUserId) return;
        setOtpSending(true);
        setLoginOtpError('');
        setLoginOtpSuccess('');
        setLoginOtp('');
        try {
            const { data } = await authApi.sendLoginOtp(pendingUserId);
            setLoginOtpSuccess(data.message || 'New OTP sent!');
            startExpiryTimer();
            startResendCooldown();
        } catch (err) {
            setLoginOtpError(err.response?.data?.error || 'Failed to resend OTP.');
        } finally {
            setOtpSending(false);
        }
    };

    // ── Step 2: Verify OTP → issue token ──
    const handleVerifyLoginOtp = async (e) => {
        e.preventDefault();
        if (loginOtp.length !== 6) { setLoginOtpError('Enter the 6-digit OTP.'); return; }
        setOtpSending(true);
        setLoginOtpError('');
        try {
            const { data } = await authApi.verifyLoginOtp(pendingUserId, loginOtp);
            const { token, user } = data;

            // Role gate check
            if (pendingRole === 'admin' && user.role !== 'admin') {
                setLoginOtpError('This account does not have admin access.');
                return;
            }
            if (pendingRole === 'user' && user.role !== 'user') {
                setLoginOtpError('Please use the admin login option instead.');
                return;
            }

            clearInterval(timerRef.current);
            clearInterval(resendRef.current);
            finalizeLogin(token, user);
        } catch (err) {
            setLoginOtpError(err.response?.data?.error || 'OTP verification failed.');
        } finally {
            setOtpSending(false);
        }
    };

    // ── Back to credentials ──
    const backToCreds = () => {
        clearInterval(timerRef.current); clearInterval(resendRef.current);
        setLoginStep('creds');
        setPendingUserId(null);
        setLoginOtp(''); setLoginOtpError(''); setLoginOtpSuccess('');
        setExpiryCount(OTP_EXPIRY_SECONDS); setResendCooldown(0);
    };

    const selectMode = (mode) => { setLoginMode(mode); setEmail(''); setPassword(''); setError(''); };

    // ── Recovery Handlers ──
    const startRecovery = (type) => {
        setRecoveryMode(type); setRecoveryStep(1); setMobileNumber(''); setRecOtp('');
        setRecoveryUserId(null); setResetToken(null); setNewPassword(''); setConfirmPassword('');
        setRecoveryResult(null); setRecoveryError(''); setRecoverySuccess(''); setError('');
    };
    const exitRecovery = () => { setRecoveryMode(null); setRecoveryStep(1); setRecoveryError(''); setRecoverySuccess(''); };

    const handleRequestOTP = async (e) => {
        e.preventDefault();
        if (!mobileNumber.trim()) { setRecoveryError('Please enter your registered mobile number.'); return; }
        setRecOtpSending(true); setRecoveryError('');
        try {
            const { data } = await recoveryApi.requestOTP(mobileNumber.trim(), recoveryMode);
            setRecoveryUserId(data.userId); setRecoverySuccess(data.message); setRecoveryStep(2);
        } catch (err) { setRecoveryError(err.response?.data?.error || 'Failed to send OTP.'); }
        finally { setRecOtpSending(false); }
    };

    const handleVerifyRecOTP = async (e) => {
        e.preventDefault();
        if (!recOtp.trim() || recOtp.length !== 6) { setRecoveryError('Please enter a valid 6-digit OTP.'); return; }
        setRecOtpSending(true); setRecoveryError('');
        try {
            const { data } = await recoveryApi.verifyOTP(recoveryUserId, recOtp.trim(), recoveryMode);
            if (recoveryMode === 'forgot-email') { setRecoveryResult({ email: data.email, name: data.name }); setRecoveryStep(3); }
            else { setResetToken(data.resetToken); setRecoveryStep(3); }
            setRecoverySuccess(data.message);
        } catch (err) { setRecoveryError(err.response?.data?.error || 'OTP verification failed.'); }
        finally { setRecOtpSending(false); }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 8) { setRecoveryError('Password must be at least 8 characters.'); return; }
        if (newPassword !== confirmPassword) { setRecoveryError('Passwords do not match.'); return; }
        setRecOtpSending(true); setRecoveryError('');
        try {
            const { data } = await recoveryApi.resetPassword(resetToken, newPassword);
            setRecoverySuccess(data.message); setRecoveryResult({ reset: true });
        } catch (err) { setRecoveryError(err.response?.data?.error || 'Password reset failed.'); }
        finally { setRecOtpSending(false); }
    };

    // ── Recovery UI ──
    const renderRecovery = () => (
        <div className="login__recovery">
            <h2 className="login__recovery-title">{recoveryMode === 'forgot-email' ? '📧 Recover Email' : '🔑 Reset Password'}</h2>
            {recoveryError && <motion.div className="login__error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="alert">💔 {recoveryError}</motion.div>}
            {recoverySuccess && <motion.div className="login__success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>✅ {recoverySuccess}</motion.div>}

            {recoveryStep === 1 && (
                <form className="login__form" onSubmit={handleRequestOTP} noValidate>
                    <p className="text-soft login__recovery-hint">Enter your registered mobile number to receive a verification code.</p>
                    <div className="login__field">
                        <label htmlFor="recovery-mobile" className="login__label">📱 Mobile Number</label>
                        <input id="recovery-mobile" type="tel" className="login__input" placeholder="9790558017"
                            value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} maxLength={15} autoFocus />
                    </div>
                    <motion.button type="submit" className="btn-primary login__submit" disabled={recOtpSending} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                        {recOtpSending ? '📤 Sending OTP…' : '📱 Send OTP'}
                    </motion.button>
                </form>
            )}

            {recoveryStep === 2 && (
                <form className="login__form" onSubmit={handleVerifyRecOTP} noValidate>
                    <p className="text-soft login__recovery-hint">Enter the 6-digit OTP sent to your mobile number.</p>
                    <div className="login__field">
                        <label htmlFor="recovery-otp" className="login__label">🔐 Enter OTP</label>
                        <input id="recovery-otp" type="text" className="login__input login__input--otp" placeholder="● ● ● ● ● ●"
                            value={recOtp} onChange={(e) => setRecOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength={6} autoFocus inputMode="numeric" autoComplete="one-time-code" />
                    </div>
                    <motion.button type="submit" className="btn-primary login__submit" disabled={recOtpSending || recOtp.length !== 6} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                        {recOtpSending ? '🔍 Verifying…' : '✅ Verify OTP'}
                    </motion.button>
                    <button type="button" className="login__resend-btn" onClick={() => { setRecoveryStep(1); setRecoveryError(''); setRecoverySuccess(''); }}>← Resend OTP</button>
                </form>
            )}

            {recoveryStep === 3 && recoveryMode === 'forgot-email' && recoveryResult && (
                <div className="login__recovery-result">
                    <div className="login__recovery-card">
                        <span className="login__recovery-emoji">📧</span>
                        <p className="login__recovery-found">Your registered email:</p>
                        <p className="login__recovery-email">{recoveryResult.email}</p>
                        <p className="login__recovery-name">Account name: {recoveryResult.name}</p>
                    </div>
                    <motion.button className="btn-primary login__submit" onClick={exitRecovery} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>💕 Back to Login</motion.button>
                </div>
            )}

            {recoveryStep === 3 && recoveryMode === 'forgot-password' && !recoveryResult?.reset && (
                <form className="login__form" onSubmit={handleResetPassword} noValidate>
                    <p className="text-soft login__recovery-hint">Create your new password:</p>
                    <div className="login__field">
                        <label htmlFor="new-password" className="login__label">🔑 New Password</label>
                        <input id="new-password" type="password" className="login__input" placeholder="Minimum 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} autoFocus />
                    </div>
                    <div className="login__field">
                        <label htmlFor="confirm-password" className="login__label">🔑 Confirm Password</label>
                        <input id="confirm-password" type="password" className="login__input" placeholder="Repeat your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} />
                    </div>
                    <motion.button type="submit" className="btn-primary login__submit" disabled={recOtpSending} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                        {recOtpSending ? '🔄 Resetting…' : '🔐 Reset Password'}
                    </motion.button>
                </form>
            )}

            {recoveryStep === 3 && recoveryMode === 'forgot-password' && recoveryResult?.reset && (
                <div className="login__recovery-result">
                    <div className="login__recovery-card">
                        <span className="login__recovery-emoji">✅</span>
                        <p className="login__recovery-found">Password changed successfully!</p>
                        <p className="text-soft">You can now log in with your new password.</p>
                    </div>
                    <motion.button className="btn-primary login__submit" onClick={exitRecovery} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>💕 Back to Login</motion.button>
                </div>
            )}

            {recoveryStep < 3 && <button className="login__back-btn" onClick={exitRecovery}>← Back to Login</button>}
        </div>
    );

    // ── Subtitle helper ──
    const subtitle = recoveryMode
        ? (recoveryMode === 'forgot-email' ? '📧 Email Recovery' : '🔑 Password Recovery')
        : loginStep === 'otp'
            ? '🔐 Two-Step Verification'
            : !loginMode
                ? 'Choose how to enter our world 💕'
                : loginMode === 'admin' ? '🛡️ Admin Login' : '💕 Welcome back, sweetheart';

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
                        <motion.span className="login__heart" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>❤️</motion.span>
                        <h1 className="heading-hero login__title">Love For You</h1>
                        <p className="text-soft login__subtitle">{subtitle}</p>
                    </div>

                    <AnimatePresence mode="wait">

                        {/* ── Recovery Mode ── */}
                        {recoveryMode ? (
                            <motion.div key="recovery" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                {renderRecovery()}
                            </motion.div>

                            /* ── OTP Verification Screen ── */
                        ) : loginStep === 'otp' ? (
                            <motion.div key="otp" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                                <div className="login__otp-screen">

                                    {/* Visual indicator */}
                                    <motion.div className="login__otp-icon" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}>🔐</motion.div>

                                    <p className="text-soft login__otp-hint">
                                        A 6-digit code was sent to your email <strong>{maskedEmail}</strong>
                                    </p>

                                    {/* Countdown timer */}
                                    <div className={`login__otp-timer ${expiryCount < 30 ? 'login__otp-timer--urgent' : ''}`}>
                                        <span>⏱️ Expires in </span>
                                        <strong>{formatTime(expiryCount)}</strong>
                                    </div>

                                    {loginOtpError && (
                                        <motion.div className="login__error" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} role="alert">
                                            💔 {loginOtpError}
                                        </motion.div>
                                    )}
                                    {loginOtpSuccess && !loginOtpError && (
                                        <motion.div className="login__success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                            ✅ {loginOtpSuccess}
                                        </motion.div>
                                    )}

                                    <form className="login__form" onSubmit={handleVerifyLoginOtp} noValidate>
                                        <div className="login__field">
                                            <label htmlFor="login-otp" className="login__label">🔢 Enter OTP</label>
                                            <input
                                                id="login-otp"
                                                type="text"
                                                className="login__input login__input--otp"
                                                placeholder="● ● ● ● ● ●"
                                                value={loginOtp}
                                                onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                maxLength={6}
                                                autoFocus
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                disabled={expiryCount === 0}
                                            />
                                        </div>

                                        <motion.button
                                            type="submit"
                                            className="btn-primary login__submit"
                                            disabled={otpSending || loginOtp.length !== 6 || expiryCount === 0}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.97 }}
                                            id="verify-login-otp-btn"
                                        >
                                            {otpSending ? '🔍 Verifying…' : '✅ Verify & Login'}
                                        </motion.button>
                                    </form>

                                    {/* Resend button with cooldown */}
                                    <div className="login__otp-resend">
                                        <button
                                            className="login__resend-btn"
                                            onClick={handleResendOtp}
                                            disabled={resendCooldown > 0 || otpSending}
                                            id="resend-otp-btn"
                                        >
                                            {resendCooldown > 0
                                                ? `🔄 Resend in ${resendCooldown}s`
                                                : otpSending ? '📤 Sending…' : '🔄 Resend OTP'}
                                        </button>
                                    </div>

                                    <button className="login__back-btn" onClick={backToCreds}>← Back to login</button>
                                </div>
                            </motion.div>

                            /* ── Role Selection ── */
                        ) : !loginMode ? (
                            <motion.div key="roles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <div className="login__role-select">
                                    <motion.button className="login__role-btn login__role-btn--admin" onClick={() => selectMode('admin')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} id="login-as-admin-btn">
                                        <span className="login__role-icon">🛡️</span>
                                        <span className="login__role-label">Login as Admin</span>
                                        <span className="login__role-desc">Manage content &amp; settings</span>
                                    </motion.button>
                                    <motion.button className="login__role-btn login__role-btn--user" onClick={() => selectMode('user')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} id="login-as-user-btn">
                                        <span className="login__role-icon">💕</span>
                                        <span className="login__role-label">Login as User</span>
                                        <span className="login__role-desc">View &amp; enjoy our world</span>
                                    </motion.button>
                                </div>
                            </motion.div>

                            /* ── Login Form (credentials) ── */
                        ) : (
                            <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <form className="login__form" onSubmit={handleSubmit} noValidate>
                                    {error && (
                                        <motion.div className="login__error" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} role="alert">
                                            💔 {error}
                                        </motion.div>
                                    )}
                                    <div className="login__field">
                                        <label htmlFor="login-email" className="login__label">Email</label>
                                        <input id="login-email" type="email" className="login__input" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                                    </div>
                                    <div className="login__field">
                                        <label htmlFor="login-password" className="login__label">Password</label>
                                        <div className="login__password-wrap">
                                            <input id="login-password" type={showPassword ? 'text' : 'password'} className="login__input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
                                            <button type="button" className="login__toggle-pw" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                                {showPassword ? '🙈' : '👁️'}
                                            </button>
                                        </div>
                                    </div>
                                    <motion.button type="submit" className="btn-primary login__submit" disabled={submitting} whileHover={{ scale: submitting ? 1 : 1.02 }} whileTap={{ scale: submitting ? 1 : 0.97 }} id="login-submit-btn">
                                        {submitting ? '✨ Sending OTP…' : loginMode === 'admin' ? '🛡️ Continue' : '💕 Continue'}
                                    </motion.button>
                                </form>

                                <div className="login__recovery-links">
                                    <button className="login__recovery-link" onClick={() => startRecovery('forgot-email')}>📧 Forgot Email?</button>
                                    <span className="login__recovery-divider">|</span>
                                    <button className="login__recovery-link" onClick={() => startRecovery('forgot-password')}>🔑 Forgot Password?</button>
                                </div>

                                <button className="login__back-btn" onClick={() => { setLoginMode(null); setError(''); }}>← Choose different role</button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <p className="login__note text-soft">🔒 This is a private space. No registration allowed.</p>
                </motion.div>
            </div>
        </div>
    );
}
