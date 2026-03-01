/* ============================================================
   Vercel Serverless API — Love For You ❤️
   All backend routes in one serverless function
   Includes: Auth, Messages, Content CMS, Our Future
   Uses MongoDB Atlas for persistent storage
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
    if (isConnected && mongoose.connection.readyState === 1) return;
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI environment variable is not set');
    }
    try {
        mongoose.set('bufferCommands', false);
        await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
        console.log('✅ MongoDB connected');
    } catch (err) {
        isConnected = false;
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
        if (!token) return res.status(401).json({ error: 'Not authorized. Please log in.' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ error: 'User not found.' });
        req.user = user;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token.' });
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
        // Allow all Vercel preview/production URLs, localhost, and custom domains
        if (!origin || origin.endsWith('.vercel.app') ||
            origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return cb(null, true);
        }
        // Allow any origin for now (the JWT protects all routes anyway)
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
        res.status(503).json({ error: 'Database not available. Please try again.' });
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

// Seed default content — ALL content keys
let contentSeeded = false;
async function seedContent() {
    if (contentSeeded) return;
    const count = await Content.countDocuments();
    if (count > 0) { contentSeeded = true; return; }

    const defaults = [
        { key: 'navbar_brand', value: 'Love For You' },
        { key: 'home_title', value: 'Love For You ❤️' },
        { key: 'home_subtitle', value: 'This little corner of the internet was built with nothing but love, late nights, and a heart full of you.' },
        { key: 'home_cta', value: 'Start Our Journey 💕' },
        { key: 'home_taglines', value: JSON.stringify(['Every moment with you is a poem 🌸', 'You are my favourite daydream 💭', 'In your arms, I found my home 🏡', 'With you, every second sparkles ✨']) },
        {
            key: 'home_cards', value: JSON.stringify([
                { key: 'about', icon: '💌', title: 'Our Story', desc: 'How it all began…' },
                { key: 'gallery', icon: '📸', title: 'Gallery', desc: 'Moments frozen in time' },
                { key: 'memories', icon: '🌸', title: 'Memories', desc: "Dates we'll never forget" },
                { key: 'surprise', icon: '🎉', title: 'Surprise', desc: 'Something special awaits…' },
            ])
        },
        { key: 'about_title', value: 'Our Love Story 💕' },
        { key: 'about_subtitle', value: "Every great love story has a beginning. Here's ours — clumsy, beautiful, and completely unforgettable." },
        {
            key: 'about_blocks', value: JSON.stringify([
                { side: 'left', emoji: '🌷', title: 'How It Began', text: 'It started with something so simple — a glance, a smile, a "hey". Neither of us knew that tiny moment would change everything. The universe quietly conspired to bring two hearts together, and somehow, impossibly, it worked.' },
                { side: 'right', emoji: '💫', title: 'Falling Together', text: "We fell slowly, then all at once. Long late-night calls, silly memes, inside jokes that no one else would understand. We built a world just for us — warm, colourful, and wonderfully chaotic." },
                { side: 'left', emoji: '🌸', title: 'What You Mean to Me', text: "You are the calm in my storm, the answer to questions I hadn't yet asked. Every day with you is a reminder that the best things in life are never planned." },
                { side: 'right', emoji: '❤️', title: 'Our Future', text: 'Adventures unplanned, sunsets unshared, laughter yet to echo — so much still to come. Together, we are unstoppable. This is just the beginning.' },
            ])
        },
        {
            key: 'about_milestones', value: JSON.stringify([
                { icon: '👀', date: 'Day One', text: 'The moment our eyes met — the world slowed down.' },
                { icon: '💬', date: 'First Texts', text: "Messages that started casual and turned into something magical." },
                { icon: '☕', date: 'First Date', text: "Coffee, butterflies, and smiles that wouldn't stop." },
                { icon: '🤝', date: 'Together', text: "We decided to be each other's person — forever." },
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
            ])
        },
        { key: 'memories_title', value: 'Our Memories 🌸' },
        { key: 'memories_subtitle', value: 'A timeline of the moments that stitched our hearts together.' },
        {
            key: 'memories_items', value: JSON.stringify([
                { date: 'The First Hello', emoji: '👋', color: '#ffdce8', border: '#ff85a9', title: 'It Started With a Smile', desc: 'A nervous smile, a bold hello — and suddenly the world felt different. I didn\'t know it yet, but that was the moment my life changed forever.' },
                { date: 'First Coffee Date', emoji: '☕', color: '#f0e6ff', border: '#c084fc', title: 'Two Hours That Felt Like Minutes', desc: 'We talked about everything and nothing. The coffee went cold. We didn\'t care. That afternoon, something beautiful began.' },
                { date: 'First Movie Night', emoji: '🍿', color: '#fff0f5', border: '#ff85a9', title: 'We Barely Watched the Movie', desc: 'Blanket forts, terrible popcorn, and so much laughter. It wasn\'t about the movie. It was about being together.' },
                { date: 'First "I Love You"', emoji: '❤️', color: '#ffdce8', border: '#e83e6c', title: 'Three Words, Infinite Weight', desc: 'It slipped out quietly, somewhere between a laugh and a breath. And just like that, everything changed.' },
                { date: 'Our First Trip', emoji: '✈️', color: '#f0e6ff', border: '#a855f7', title: 'Adventures With You Are Home', desc: 'New city, new memories, same goofy us. That trip proved we could survive anything together.' },
                { date: 'Today & Always', emoji: '🌟', color: '#fff0f5', border: '#ffb3cc', title: 'Every Day With You', desc: 'The story is still being written. Here\'s to forever. 💕' },
            ])
        },
        { key: 'surprise_title', value: 'Our forever is just beginning… ❤️' },
        { key: 'surprise_message', value: "No matter how many pages, songs, or years pass — I will choose you every single time. You are my beginning, my middle, and every beautiful ending I dare to imagine. This isn't just a website. This is my heart, dressed up in pixels, whispering: I love you." },
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
                "If I could write a letter to the universe,",
                'I\'d simply say: "Thank you for giving me them."', '',
                'Forever and without conditions —', '',
                'Yours, completely. 💕',
            ])
        },
        { key: 'footer_text', value: 'Made with 💕 and infinite love · 2026' },
    ];

    await Content.insertMany(defaults);
    contentSeeded = true;
    console.log('📝 Content seeded!');
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
    console.log('🔮 Future items seeded!');
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
        res.status(500).json({ error: 'Login failed. Please try again.' });
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
        if (message.length > 2000) return res.status(400).json({ error: 'Message too long (max 2000 characters).' });

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
// PUBLIC CONTENT ROUTES (read-only for authenticated users)
// ═══════════════════════════════════════════════

app.get('/api/public/content', protect, async (req, res) => {
    try {
        await seedContent();
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

app.get('/api/health', async (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
        status: 'ok',
        message: '💕 Love For You API is running!',
        database: dbStatus,
        timestamp: new Date().toISOString(),
    });
});

// ── 404 handler ───────────────────────────────────────────────
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found.' });
});

// ── Export for Vercel ─────────────────────────────────────────
export default app;
