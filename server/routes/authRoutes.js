/* ============================================================
   Auth Routes — Love For You ❤️
   Login only (no public signup — users are seeded)
   Uses file-based DB (no MongoDB needed!)
   ============================================================ */
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fileDB from '../config/fileDB.js';

const router = express.Router();

// Generate JWT
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// Auth middleware (inline for this file)
const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return res.status(401).json({ error: 'Not authorized. Please log in.' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = fileDB.findById('users', decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'User no longer exists.' });
        }
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired. Please log in again.' });
        }
        return res.status(500).json({ error: 'Authentication error.' });
    }
};

// ── POST /api/auth/login — Login ──
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = fileDB.findOne('users', { email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// ── GET /api/auth/me — Get current user ──
router.get('/me', protect, (req, res) => {
    const user = fileDB.findById('users', req.user._id);
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }
    res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
    });
});

// ── GET /api/auth/partner — Get the other user ──
router.get('/partner', protect, (req, res) => {
    const users = fileDB.find('users');
    const partner = users.find(u => u._id !== req.user._id);
    if (!partner) {
        return res.status(404).json({ error: 'Partner not found.' });
    }
    res.json({
        id: partner._id,
        name: partner.name,
        avatar: partner.avatar,
    });
});

// ═══════════════════════════════════════════════
// OTP RECOVERY ROUTES
// ═══════════════════════════════════════════════

import crypto from 'crypto';

// In-memory rate limit (resets on server restart)
const otpRateLimit = new Map();

// Helper: send OTP via Twilio or console
async function sendOTPviaSMS(mobileNumber, otp) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
        console.log(`\n📱 OTP for ${mobileNumber}: ${otp}`);
        console.log('⚠️  Twilio not configured — OTP logged to console\n');
        return { success: true, method: 'console' };
    }

    try {
        const formattedNumber = mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}`;
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const body = new URLSearchParams({
            To: formattedNumber, From: fromNumber,
            Body: `💕 Love For You — Your OTP is: ${otp}. Valid for 5 minutes.`,
        });
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });
        return response.ok ? { success: true, method: 'sms' } : { success: false };
    } catch (err) {
        console.error('SMS error:', err.message);
        return { success: false };
    }
}

// POST /api/auth/request-otp
router.post('/request-otp', async (req, res) => {
    try {
        const { mobileNumber, type } = req.body;
        if (!mobileNumber) return res.status(400).json({ error: 'Mobile number is required.' });
        if (!['forgot-email', 'forgot-password'].includes(type)) {
            return res.status(400).json({ error: 'Invalid recovery type.' });
        }

        const cleanMobile = mobileNumber.replace(/[^0-9]/g, '');
        if (cleanMobile.length < 10) return res.status(400).json({ error: 'Invalid mobile number.' });

        // Rate limit: 1 per 60s
        const now = Date.now();
        const last = otpRateLimit.get(cleanMobile);
        if (last && now - last < 60000) {
            return res.status(429).json({ error: 'Please wait 60 seconds before requesting another OTP.' });
        }
        otpRateLimit.set(cleanMobile, now);

        const users = fileDB.find('users');
        const user = users.find(u => u.mobileNumber === cleanMobile);
        if (!user) return res.status(404).json({ error: 'No account found with this mobile number.' });

        const otp = crypto.randomInt(100000, 999999).toString();
        const hashedOtp = await bcrypt.hash(otp, 10);

        // Store OTP on user record
        fileDB.update('users', user._id, {
            otpCode: hashedOtp,
            otpExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            otpAttempts: 0,
            otpVerified: false,
        });

        const result = await sendOTPviaSMS(cleanMobile, otp);
        if (!result.success) return res.status(500).json({ error: 'Failed to send OTP.' });

        const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

        res.json({
            success: true,
            message: `OTP sent to ****${cleanMobile.slice(-4)}`,
            userId: user._id,
            maskedName: user.name.split(' ')[0],
            maskedEmail: type === 'forgot-password' ? maskedEmail : undefined,
            method: result.method,
        });
    } catch (err) {
        console.error('OTP request error:', err);
        res.status(500).json({ error: 'Failed to process request.' });
    }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { userId, otp, type } = req.body;
        if (!userId || !otp) return res.status(400).json({ error: 'User ID and OTP required.' });

        const user = fileDB.findById('users', userId);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        // Check expiry
        if (!user.otpExpiry || new Date() > new Date(user.otpExpiry)) {
            fileDB.update('users', userId, { otpCode: '', otpExpiry: null, otpAttempts: 0 });
            return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
        }

        // Check max attempts
        if ((user.otpAttempts || 0) >= 3) {
            fileDB.update('users', userId, { otpCode: '', otpExpiry: null, otpAttempts: 0 });
            return res.status(400).json({ error: 'Maximum attempts exceeded. Request a new OTP.' });
        }

        // Verify
        const isValid = await bcrypt.compare(otp.toString(), user.otpCode);
        if (!isValid) {
            fileDB.update('users', userId, { otpAttempts: (user.otpAttempts || 0) + 1 });
            const remaining = 3 - ((user.otpAttempts || 0) + 1);
            return res.status(400).json({ error: `Invalid OTP. ${remaining} attempt(s) remaining.` });
        }

        // Clear OTP, mark verified
        fileDB.update('users', userId, { otpCode: '', otpExpiry: null, otpAttempts: 0, otpVerified: true });

        const resetToken = jwt.sign({ id: userId, purpose: 'reset' }, process.env.JWT_SECRET, { expiresIn: '10m' });

        if (type === 'forgot-email') {
            return res.json({ success: true, email: user.email, name: user.name, message: 'Email retrieved.' });
        }

        res.json({ success: true, resetToken, message: 'OTP verified. Reset your password.' });
    } catch (err) {
        console.error('OTP verify error:', err);
        res.status(500).json({ error: 'Verification failed.' });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        if (!resetToken || !newPassword) return res.status(400).json({ error: 'Token and password required.' });
        if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

        let decoded;
        try { decoded = jwt.verify(resetToken, process.env.JWT_SECRET); }
        catch { return res.status(400).json({ error: 'Reset link expired. Start over.' }); }

        if (decoded.purpose !== 'reset') return res.status(400).json({ error: 'Invalid reset token.' });

        const user = fileDB.findById('users', decoded.id);
        if (!user) return res.status(404).json({ error: 'User not found.' });
        if (!user.otpVerified) return res.status(400).json({ error: 'OTP verification required.' });

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        fileDB.update('users', decoded.id, { password: hashedPassword, otpVerified: false });

        res.json({ success: true, message: 'Password reset successfully!' });
    } catch (err) {
        console.error('Reset error:', err);
        res.status(500).json({ error: 'Password reset failed.' });
    }
});

export { protect, generateToken };
export default router;

