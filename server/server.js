/* ============================================================
   Express + Socket.IO Server — Love For You ❤️
   Secure backend — Works with file-based DB or MongoDB Atlas
   ============================================================ */
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/authRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import { sanitizeInput } from './middleware/sanitize.js';
import fileDB from './config/fileDB.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ── Auto-seed users on startup ────────────────────────────────
async function autoSeed() {
    const { default: bcrypt } = await import('bcryptjs');
    const existingUsers = fileDB.find('users');

    if (existingUsers.length >= 2) {
        console.log('   ✅ Users already exist. Skipping seed.');
        return;
    }

    fileDB.deleteMany('users');

    const users = [
        {
            name: process.env.ADMIN_NAME || 'Salif',
            email: (process.env.ADMIN_EMAIL || 'salif@loveforyou.com').toLowerCase(),
            password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'ILoveYou@2026', 12),
            role: 'admin',
            avatar: '🥰',
        },
        {
            name: process.env.USER_NAME || 'My Love',
            email: (process.env.USER_EMAIL || 'love@loveforyou.com').toLowerCase(),
            password: await bcrypt.hash(process.env.USER_PASSWORD || 'ILoveYouToo@2026', 12),
            role: 'user',
            avatar: '💕',
        },
    ];

    for (const u of users) {
        fileDB.create('users', u);
        console.log(`   ✓ Created ${u.role}: ${u.name} (${u.email})`);
    }

    console.log('   🎉 Two users auto-seeded!\n');
}

// ── Allowed origins (local + deployed) ────────────────────────
const allowedOrigins = [
    CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
];

// Add any Vercel/Netlify URLs dynamically
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

// ── Socket.IO ─────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
    cors: {
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);
            // Allow any .vercel.app or .onrender.com origin
            if (allowedOrigins.includes(origin) ||
                origin.endsWith('.vercel.app') ||
                origin.endsWith('.onrender.com') ||
                origin.endsWith('.netlify.app')) {
                return callback(null, true);
            }
            callback(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Socket auth middleware
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Authentication required'));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = fileDB.findById('users', decoded.id);
        if (!user) return next(new Error('User not found'));

        socket.user = { id: user._id, name: user.name, role: user.role };
        next();
    } catch {
        next(new Error('Invalid token'));
    }
});

// Track online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
    const userId = socket.user.id;
    onlineUsers.set(userId, socket.id);
    io.emit('user:online', { userId, online: true });

    socket.on('message:send', (data) => {
        const receiverSocket = onlineUsers.get(data.receiverId);
        if (receiverSocket) {
            io.to(receiverSocket).emit('message:receive', data.message);
        }
    });

    socket.on('typing:start', (data) => {
        const receiverSocket = onlineUsers.get(data.receiverId);
        if (receiverSocket) {
            io.to(receiverSocket).emit('typing:show', { userId });
        }
    });

    socket.on('typing:stop', (data) => {
        const receiverSocket = onlineUsers.get(data.receiverId);
        if (receiverSocket) {
            io.to(receiverSocket).emit('typing:hide', { userId });
        }
    });

    socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        io.emit('user:online', { userId, online: false });
    });
});

// ── Security Middleware ───────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
}));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) ||
            origin.endsWith('.vercel.app') ||
            origin.endsWith('.onrender.com') ||
            origin.endsWith('.netlify.app')) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api', limiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many login attempts. Please try again later.' },
});
app.use('/api/auth/login', authLimiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(sanitizeInput);

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        database: 'file-based (JSON)',
        message: '💕 Love For You server is running!',
        timestamp: new Date().toISOString(),
    });
});

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found 💔' });
});

// Global error handler
app.use((err, req, res, _next) => {
    console.error('Server Error:', err.stack);
    res.status(err.statusCode || 500).json({
        error: err.message || 'Something went wrong on the server.',
    });
});

// ── Start ────────────────────────────────────────────────────
const startServer = async () => {
    console.log('\n💕 Love For You — Starting Server...\n');
    console.log('   📂 Using file-based database');

    await autoSeed();

    httpServer.listen(PORT, () => {
        console.log('━'.repeat(50));
        console.log(`   🌹 Server: http://localhost:${PORT}`);
        console.log(`   📡 Auth:   http://localhost:${PORT}/api/auth`);
        console.log(`   💬 Chat:   http://localhost:${PORT}/api/messages`);
        console.log(`   💓 Health: http://localhost:${PORT}/api/health`);
        console.log(`   🔌 Socket.IO: enabled`);
        console.log('━'.repeat(50));
        console.log(`\n   🔐 Login credentials:`);
        console.log(`      Admin: ${process.env.ADMIN_EMAIL || 'salif@loveforyou.com'} / ${process.env.ADMIN_PASSWORD || 'ILoveYou@2026'}`);
        console.log(`      User:  ${process.env.USER_EMAIL || 'love@loveforyou.com'} / ${process.env.USER_PASSWORD || 'ILoveYouToo@2026'}`);
        console.log('');
    });
};

startServer();
