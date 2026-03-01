/* ============================================================
   Vercel Serverless API — Love For You ❤️
   All backend routes in one serverless function
   Includes: Auth, Messages, Content CMS, Our Future
   ============================================================ */
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const app = express();

// ── MongoDB connection (cached for serverless) ────────────────
let isConnected = false;

async function connectDB() {
    if (isConnected) return;
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI environment variable is not set');
    }
    try {
        await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        throw err;
    }
}

// ── Mongoose Schemas ──────────────────────────────────────────
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    avatar: { type: String, default: '💕' },
}, { timestamps: true });

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

const messageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    readStatus: { type: Boolean, default: false },
}, { timestamps: true });

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

const contentSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });

const futureSchema = new mongoose.Schema({
    type: { type: String, enum: ['game', 'dare', 'surprise'], required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    emoji: { type: String, default: '✨' },
    enabled: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
const Content = mongoose.models.Content || mongoose.model('Content', contentSchema);
const Future = mongoose.models.Future || mongoose.model('Future', futureSchema);

// ── JWT helpers ───────────────────────────────────────────────
const generateToken = (userId) =>
    jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

const protect = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Not authorized.' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ error: 'User not found.' });
        req.user = user;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid token.' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
};

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || origin.endsWith('.vercel.app') ||
            origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return cb(null, true);
        }
        cb(null, true);
    },
    credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

// Connect DB before each request
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch {
        res.status(503).json({ error: 'Database not available.' });
    }
});

// ── Auto-seed on first request ────────────────────────────────
let seeded = false;
async function autoSeed() {
    if (seeded) return;
    const count = await User.countDocuments();
    if (count >= 2) { seeded = true; return; }

    await User.deleteMany({});
    await User.create({
        name: process.env.ADMIN_NAME || 'Salif',
        email: process.env.ADMIN_EMAIL || 'salif@loveforyou.com',
        password: process.env.ADMIN_PASSWORD || 'ILoveYou@2026',
        role: 'admin',
        avatar: '🥰',
    });
    await User.create({
        name: process.env.USER_NAME || 'My Love',
        email: process.env.USER_EMAIL || 'love@loveforyou.com',
        password: process.env.USER_PASSWORD || 'ILoveYouToo@2026',
        role: 'user',
        avatar: '💕',
    });
    seeded = true;
    console.log('🎉 Users seeded!');
}

// Seed default content
let contentSeeded = false;
async function seedContent() {
    if (contentSeeded) return;
    const count = await Content.countDocuments();
    if (count > 0) { contentSeeded = true; return; }

    const defaults = [
        { key: 'navbar_brand', value: 'Love For You' },
        { key: 'home_title', value: 'Love For You ❤️' },
        { key: 'home_subtitle', value: 'This little corner of the internet was built with nothing but love, late nights, and a heart full of you.' },
        { key: 'about_title', value: 'Our Love Story 💕' },
        { key: 'gallery_title', value: 'Our Gallery 📸' },
        { key: 'memories_title', value: 'Our Memories 🌸' },
        { key: 'surprise_title', value: 'Our forever is just beginning… ❤️' },
    ];

    await Content.insertMany(defaults);
    contentSeeded = true;
}

// Seed default future items
let futureSeeded = false;
async function seedFuture() {
    if (futureSeeded) return;
    const count = await Future.countDocuments();
    if (count > 0) { futureSeeded = true; return; }

    const defaults = [
        { type: 'game', title: 'Love Quiz', description: 'How well do you know each other?', emoji: '🎯', enabled: true },
        { type: 'game', title: 'Truth or Dare', description: 'Romantic truth or dare!', emoji: '🎲', enabled: true },
        { type: 'dare', title: 'Write a Poem', description: 'Write a 4-line love poem right now!', emoji: '✍️', enabled: true },
        { type: 'dare', title: 'Surprise Call', description: 'Call and say the sweetest thing!', emoji: '📞', enabled: true },
        { type: 'surprise', title: 'Mystery Date Night', description: 'Plan a surprise date!', emoji: '🌙', enabled: true },
        { type: 'surprise', title: 'Love Jar', description: 'Write 10 reasons why you love them!', emoji: '🫙', enabled: true },
    ];

    await Future.insertMany(defaults);
    futureSeeded = true;
}

// ═══════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════

app.post('/api/auth/login', async (req, res) => {
    try {
        await autoSeed();
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
        if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

        res.json({
            token: generateToken(user._id),
            user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed.' });
    }
});

app.get('/api/auth/me', protect, async (req, res) => {
    res.json({
        id: req.user._id, name: req.user.name, email: req.user.email,
        role: req.user.role, avatar: req.user.avatar,
    });
});

app.get('/api/auth/partner', protect, async (req, res) => {
    const partner = await User.findOne({ _id: { $ne: req.user._id } });
    if (!partner) return res.status(404).json({ error: 'Partner not found.' });
    res.json({ id: partner._id, name: partner.name, avatar: partner.avatar });
});

// ═══════════════════════════════════════════════
// MESSAGE ROUTES
// ═══════════════════════════════════════════════

app.get('/api/messages', protect, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
        })
            .sort({ createdAt: 1 })
            .limit(500)
            .populate('senderId', 'name avatar')
            .populate('receiverId', 'name avatar');
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages.' });
    }
});

app.post('/api/messages', protect, async (req, res) => {
    try {
        const { receiverId, message } = req.body;
        if (!receiverId || !message) return res.status(400).json({ error: 'receiverId and message required.' });
        if (message.length > 2000) return res.status(400).json({ error: 'Message too long.' });

        const newMsg = await Message.create({
            senderId: req.user._id,
            receiverId,
            message: message.trim(),
        });

        const populated = await newMsg.populate([
            { path: 'senderId', select: 'name avatar' },
            { path: 'receiverId', select: 'name avatar' },
        ]);

        res.status(201).json(populated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to send message.' });
    }
});

app.patch('/api/messages/read', protect, async (req, res) => {
    await Message.updateMany({ receiverId: req.user._id, readStatus: false }, { readStatus: true });
    res.json({ success: true });
});

app.get('/api/messages/unread', protect, async (req, res) => {
    const count = await Message.countDocuments({ receiverId: req.user._id, readStatus: false });
    res.json({ count });
});

app.delete('/api/messages/:id', protect, async (req, res) => {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found.' });
    if (msg.senderId.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Not your message.' });
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// ═══════════════════════════════════════════════
// ADMIN CONTENT ROUTES (CMS)
// ═══════════════════════════════════════════════

app.get('/api/content', protect, adminOnly, async (req, res) => {
    try {
        await seedContent();
        const content = await Content.find();
        const contentMap = {};
        content.forEach(c => { contentMap[c.key] = c; });
        res.json(contentMap);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch content.' });
    }
});

app.put('/api/content/:key', protect, adminOnly, async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        if (value === undefined) return res.status(400).json({ error: 'Value is required.' });

        const updated = await Content.findOneAndUpdate(
            { key },
            { value },
            { upsert: true, new: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update content.' });
    }
});

// ═══════════════════════════════════════════════
// ADMIN FUTURE ROUTES
// ═══════════════════════════════════════════════

app.get('/api/content/future', protect, adminOnly, async (req, res) => {
    try {
        await seedFuture();
        const items = await Future.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch future items.' });
    }
});

app.post('/api/content/future', protect, adminOnly, async (req, res) => {
    try {
        const { type, title, description, emoji, enabled } = req.body;
        if (!type || !title) return res.status(400).json({ error: 'Type and title required.' });
        const item = await Future.create({ type, title, description, emoji, enabled });
        res.status(201).json(item);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create future item.' });
    }
});

app.put('/api/content/future/:id', protect, adminOnly, async (req, res) => {
    try {
        const item = await Future.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!item) return res.status(404).json({ error: 'Item not found.' });
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update future item.' });
    }
});

app.delete('/api/content/future/:id', protect, adminOnly, async (req, res) => {
    try {
        const item = await Future.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found.' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete future item.' });
    }
});

// ═══════════════════════════════════════════════
// PUBLIC CONTENT ROUTES (read-only for users)
// ═══════════════════════════════════════════════

app.get('/api/public/content', protect, async (req, res) => {
    try {
        const content = await Content.find();
        const contentMap = {};
        content.forEach(c => { contentMap[c.key] = c.value; });
        res.json(contentMap);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch content.' });
    }
});

app.get('/api/public/future', protect, async (req, res) => {
    try {
        await seedFuture();
        const items = await Future.find({ enabled: true }).sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch future items.' });
    }
});

// ═══════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '💕 Love For You API is running!' });
});

// ── Export for Vercel ─────────────────────────────────────────
export default app;
