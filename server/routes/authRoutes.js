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

export { protect, generateToken };
export default router;
