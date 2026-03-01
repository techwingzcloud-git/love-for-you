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
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import { sanitizeInput } from './middleware/sanitize.js';
import fileDB from './config/fileDB.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

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

// ── Seed default content if empty ─────────────────────────────
function seedDefaultContent() {
    const existing = fileDB.find('content');
    if (existing.length > 0) return;

    const defaults = [
        { key: 'navbar_brand', value: 'Love For You' },
        { key: 'home_title', value: 'Love For You ❤️' },
        { key: 'home_subtitle', value: 'This little corner of the internet was built with nothing but love, late nights, and a heart full of you.' },
        { key: 'home_taglines', value: JSON.stringify(['Every moment with you is a poem 🌸', 'You are my favourite daydream 💭', 'In your arms, I found my home 🏡', 'With you, every second sparkles ✨']) },
        { key: 'home_cta', value: 'Start Our Journey 💕' },
        { key: 'about_title', value: 'Our Love Story 💕' },
        { key: 'about_subtitle', value: 'Every great love story has a beginning. Here\'s ours — clumsy, beautiful, and completely unforgettable.' },
        {
            key: 'about_blocks', value: JSON.stringify([
                { side: 'left', emoji: '🌷', title: 'How It Began', text: 'It started with something so simple — a glance, a smile, a "hey". Neither of us knew that tiny moment would change everything. The universe quietly conspired to bring two hearts together, and somehow, impossibly, it worked.' },
                { side: 'right', emoji: '💫', title: 'Falling Together', text: 'We fell slowly, then all at once. Long late-night calls, silly memes, inside jokes that no one else would understand. We built a world of our own — warm, safe, and overflowing with laughter.' },
                { side: 'left', emoji: '🌸', title: 'What You Mean to Me', text: 'You are the calm in my storm, the answer to questions I hadn\'t yet asked. You make ordinary days extraordinary just by being in them. I choose you — every single morning, and twice on the hard days.' },
                { side: 'right', emoji: '❤️', title: 'Our Future', text: 'Adventures unplanned, sunsets unshared, laughter yet to echo — so much still to come. But whatever lies ahead, I know one thing with absolute certainty: I want all of it, and all of it, I want with you.' },
            ])
        },
        {
            key: 'about_milestones', value: JSON.stringify([
                { icon: '👀', date: 'Day One', text: 'The moment our eyes met — the world slowed down.' },
                { icon: '💬', date: 'First Texts', text: 'Messages that started casual and turned into something magical.' },
                { icon: '☕', date: 'First Date', text: 'Coffee, butterflies, and smiles that wouldn\'t stop.' },
                { icon: '🤝', date: 'Together', text: 'We decided to be each other\'s person — forever.' },
                { icon: '🌟', date: 'Every Day', text: 'And every single day since then has been a blessing.' },
            ])
        },
        { key: 'gallery_title', value: 'Our Gallery 📸' },
        { key: 'gallery_subtitle', value: 'Moments too beautiful to forget — each one a treasure.' },
        {
            key: 'gallery_images', value: JSON.stringify([
                { src: 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=600&q=80', caption: 'Where it all began 🌸' },
                { src: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80', caption: 'Dancing in the rain 🌧️' },
                { src: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80', caption: 'Your smile ✨' },
                { src: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=600&q=80', caption: 'Golden hour moments 🌅' },
                { src: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=600&q=80', caption: 'Holding hands forever 🤝' },
                { src: 'https://images.unsplash.com/photo-1516589091380-5d8e87df6999?w=600&q=80', caption: 'Starry night with you 🌠' },
                { src: 'https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=600&q=80', caption: 'Coffee & conversations ☕' },
                { src: 'https://images.unsplash.com/photo-1488392359661-cd4e0f6963ba?w=600&q=80', caption: 'Cherry blossoms 🌸' },
                { src: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=600&q=80', caption: 'Adventures ahead 🗺️' },
                { src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80', caption: 'Night drives together 🚗' },
                { src: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&q=80', caption: 'Love in bloom 🌷' },
                { src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80', caption: 'Your laughter 😄' },
            ])
        },
        { key: 'memories_title', value: 'Our Memories 🌸' },
        { key: 'memories_subtitle', value: 'A timeline of the moments that stitched our hearts together.' },
        {
            key: 'memories_items', value: JSON.stringify([
                { date: 'The First Hello', emoji: '👋', color: '#ffdce8', border: '#ff85a9', title: 'It Started With a Smile', desc: 'A nervous smile, a bold hello — and suddenly the world felt different. I didn\'t know it yet, but that was the moment my life changed forever.' },
                { date: 'First Coffee Date', emoji: '☕', color: '#f0e6ff', border: '#c084fc', title: 'Two Hours That Felt Like Minutes', desc: 'We talked about everything and nothing. The coffee went cold. We didn\'t care. That café became our favourite place from that day on.' },
                { date: 'First Movie Night', emoji: '🍿', color: '#fff0f5', border: '#ff85a9', title: 'We Barely Watched the Movie', desc: 'Blanket forts, terrible popcorn, and so much laughter. We talked all the way through and got shushed twice. Perfect night.' },
                { date: 'First "I Love You"', emoji: '❤️', color: '#ffdce8', border: '#e83e6c', title: 'Three Words, Infinite Weight', desc: 'It slipped out quietly, somewhere between a laugh and a breath. And the silence after wasn\'t awkward — it was sacred.' },
                { date: 'Our First Trip', emoji: '✈️', color: '#f0e6ff', border: '#a855f7', title: 'Adventures With You Are Home', desc: 'New city, new memories, same goofy us. Getting lost was the best part — because we were lost together.' },
                { date: 'Today & Always', emoji: '🌟', color: '#fff0f5', border: '#ffb3cc', title: 'Every Day With You', desc: 'The story is still being written. Every morning we wake up is another chapter I can\'t wait to live. Here\'s to forever. 💕' },
            ])
        },
        { key: 'surprise_title', value: 'Our forever is just beginning… ❤️' },
        { key: 'surprise_subtitle', value: 'No matter how many pages, songs, or years pass — I will choose you every single time.' },
        { key: 'surprise_message', value: 'No matter how many pages, songs, or years pass — I will choose you every single time. You are my beginning, my middle, and every beautiful ending I dare to imagine. This isn\'t just a website. This is my heart, dressed up in pixels, whispering: I love you.' },
        {
            key: 'letter_content', value: JSON.stringify([
                'My Dearest Love,', '',
                'I have tried a thousand times to find the right words —',
                'words worthy of what you mean to me.',
                'None of them are quite enough.', '',
                'You are the reason mornings feel like magic.',
                'The reason I smile at absolutely nothing.',
                'The reason I believe in beautiful, impossible things.', '',
                'You walked into my life as if you had always belonged there,',
                'and quietly rearranged everything — in the most wonderful way.', '',
                'I love the way you laugh until your eyes crinkle.',
                'The way you say my name.',
                'The way you make the whole world feel softer somehow.', '',
                'If I could write a letter to the universe,',
                'I\'d simply say: "Thank you for giving me them."', '',
                'Forever and without conditions —', '',
                'Yours, completely. 💕',
            ])
        },
        { key: 'footer_text', value: 'Made with 💕 and infinite love · 2026' },
        {
            key: 'home_cards', value: JSON.stringify([
                { key: 'about', icon: '💌', title: 'Our Story', desc: 'How it all began…' },
                { key: 'gallery', icon: '📸', title: 'Gallery', desc: 'Moments frozen in time' },
                { key: 'memories', icon: '🌸', title: 'Memories', desc: 'Dates we\'ll never forget' },
                { key: 'surprise', icon: '🎉', title: 'Surprise', desc: 'Something special awaits…' },
            ])
        },
    ];

    for (const d of defaults) {
        fileDB.create('content', d);
    }
    console.log('   📝 Default content seeded');
}

// ── Seed default future items ─────────────────────────────────
function seedDefaultFuture() {
    const existing = fileDB.find('future');
    if (existing.length > 0) return;

    const defaults = [
        { type: 'game', title: 'Love Quiz', description: 'How well do you know each other? Take the ultimate love quiz!', emoji: '🎯', enabled: true },
        { type: 'game', title: 'Truth or Dare', description: 'Romantic truth or dare — only for the brave-hearted lovers!', emoji: '🎲', enabled: true },
        { type: 'dare', title: 'Write a Poem', description: 'Write a 4-line love poem for your partner right now!', emoji: '✍️', enabled: true },
        { type: 'dare', title: 'Surprise Call', description: 'Call your partner right now and say the sweetest thing!', emoji: '📞', enabled: true },
        { type: 'surprise', title: 'Mystery Date Night', description: 'Plan a surprise date night — no peeking at the plan!', emoji: '🌙', enabled: true },
        { type: 'surprise', title: 'Love Jar', description: 'Write 10 reasons why you love them and put them in a jar!', emoji: '🫙', enabled: true },
    ];

    for (const d of defaults) {
        fileDB.create('future', d);
    }
    console.log('   🔮 Default future items seeded');
}

// ── Allowed origins (local + deployed) ────────────────────────
const allowedOrigins = [
    CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

// ── Socket.IO ─────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
    cors: {
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

        socket.user = { id: user._id, name: user.name, role: user.role, avatar: user.avatar };
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

    console.log(`   🔌 ${socket.user.name} connected (${socket.user.role})`);

    // ── FIXED: Real-time message delivery ──
    socket.on('message:send', (data) => {
        try {
            const { receiverId, message } = data;
            if (!message || !receiverId) return;

            // Save message to DB
            const newMsg = fileDB.create('messages', {
                senderId: userId,
                receiverId,
                message: message.trim(),
                readStatus: false,
            });

            // Populate sender/receiver info
            const sender = fileDB.findById('users', newMsg.senderId);
            const receiver = fileDB.findById('users', newMsg.receiverId);
            const populated = {
                ...newMsg,
                senderId: sender ? { _id: sender._id, name: sender.name, avatar: sender.avatar } : { _id: newMsg.senderId },
                receiverId: receiver ? { _id: receiver._id, name: receiver.name, avatar: receiver.avatar } : { _id: newMsg.receiverId },
            };

            // Send to BOTH sender and receiver for instant update
            socket.emit('message:new', populated);
            const receiverSocket = onlineUsers.get(receiverId);
            if (receiverSocket) {
                io.to(receiverSocket).emit('message:new', populated);
            }

            // Delivery confirmation
            socket.emit('message:delivered', { messageId: newMsg._id });
        } catch (err) {
            console.error('Socket message error:', err);
            socket.emit('message:error', { error: 'Failed to send message.' });
        }
    });

    socket.on('typing:start', (data) => {
        const receiverSocket = onlineUsers.get(data.receiverId);
        if (receiverSocket) {
            io.to(receiverSocket).emit('typing:show', { userId, name: socket.user.name });
        }
    });

    socket.on('typing:stop', (data) => {
        const receiverSocket = onlineUsers.get(data.receiverId);
        if (receiverSocket) {
            io.to(receiverSocket).emit('typing:hide', { userId });
        }
    });

    socket.on('message:read', (data) => {
        const { messageIds } = data;
        if (messageIds && Array.isArray(messageIds)) {
            messageIds.forEach(id => {
                fileDB.updateOne('messages', { _id: id }, { readStatus: true });
            });
            // Notify sender their messages were read
            const allUsers = fileDB.find('users');
            const otherUser = allUsers.find(u => u._id !== userId);
            if (otherUser) {
                const otherSocket = onlineUsers.get(otherUser._id);
                if (otherSocket) {
                    io.to(otherSocket).emit('message:read_ack', { messageIds });
                }
            }
        }
    });

    socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        io.emit('user:online', { userId, online: false });
        console.log(`   🔌 ${socket.user.name} disconnected`);
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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
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

// ── Serve uploaded images ─────────────────────────────────────
app.use('/api/uploads', express.static(path.join(__dirname, 'data', 'uploads')));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/public', publicRoutes);

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
        error: process.env.NODE_ENV === 'production'
            ? 'Something went wrong.'
            : err.message || 'Something went wrong on the server.',
    });
});

// ── Start ────────────────────────────────────────────────────
const startServer = async () => {
    console.log('\n💕 Love For You — Starting Server...\n');
    console.log('   📂 Using file-based database');

    await autoSeed();
    seedDefaultContent();
    seedDefaultFuture();

    httpServer.listen(PORT, () => {
        console.log('━'.repeat(50));
        console.log(`   🌹 Server: http://localhost:${PORT}`);
        console.log(`   📡 Auth:   http://localhost:${PORT}/api/auth`);
        console.log(`   💬 Chat:   http://localhost:${PORT}/api/messages`);
        console.log(`   🛠️  Admin:  http://localhost:${PORT}/api/content`);
        console.log(`   💓 Health: http://localhost:${PORT}/api/health`);
        console.log(`   🔌 Socket.IO: enabled (real-time messaging)`);
        console.log('━'.repeat(50));
        console.log(`\n   🔐 Login credentials:`);
        console.log(`      Admin: ${process.env.ADMIN_EMAIL || 'salif@loveforyou.com'} / ${process.env.ADMIN_PASSWORD || 'ILoveYou@2026'}`);
        console.log(`      User:  ${process.env.USER_EMAIL || 'love@loveforyou.com'} / ${process.env.USER_PASSWORD || 'ILoveYouToo@2026'}`);
        console.log('');
    });
};

startServer();
