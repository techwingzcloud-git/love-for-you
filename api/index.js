/* ============================================================
   Vercel Serverless API — Love For You ❤️
   Auth, Messages, Content CMS, Our Future, OTP Recovery
   MongoDB Atlas · bcrypt · JWT · OTP SMS
   ============================================================ */
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'crypto';

const app = express();

// ── MongoDB connection (cached for serverless) ────────────────
let isConnected = false;

async function connectDB() {
    if (isConnected && mongoose.connection.readyState === 1) return;
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('MONGODB_URI environment variable is not set');
    try {
        mongoose.set('bufferCommands', false);
        await mongoose.connect(uri);
        isConnected = true;
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
    mobileNumber: { type: String, default: '' },
    otpCode: { type: String, default: '', select: false },
    otpExpiry: { type: Date, default: null, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    otpVerified: { type: Boolean, default: false },
    otpLastRequest: { type: Date, default: null, select: false },
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
const JWT_SECRET = process.env.JWT_SECRET || 'love-for-you-default-secret';
const generateToken = (userId) => jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });

const protect = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Not authorized. Please log in.' });
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ error: 'User not found.' });
        req.user = user;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
    next();
};

// ── OTP Helpers ───────────────────────────────────────────────
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

async function hashOTP(otp) {
    return bcrypt.hash(otp, 10);
}

async function verifyOTP(plainOtp, hashedOtp) {
    return bcrypt.compare(plainOtp, hashedOtp);
}

// Send OTP via Twilio SMS (or console fallback)
async function sendOTPviaSMS(mobileNumber, otp) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
        // Fallback: log OTP to console (for development/testing)
        console.log(`📱 OTP for ${mobileNumber}: ${otp}`);
        console.log('⚠️  Twilio not configured — OTP logged to console');
        return { success: true, method: 'console' };
    }

    try {
        const formattedNumber = mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}`;
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const body = new URLSearchParams({
            To: formattedNumber,
            From: fromNumber,
            Body: `💕 Love For You — Your OTP is: ${otp}. Valid for 5 minutes. Do not share.`,
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        if (!response.ok) {
            const errData = await response.json();
            console.error('Twilio error:', errData);
            return { success: false, error: 'SMS delivery failed' };
        }
        return { success: true, method: 'sms' };
    } catch (err) {
        console.error('SMS sending error:', err.message);
        return { success: false, error: err.message };
    }
}

// Global middleware — keep small limit for all routes except upload
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
// Use a larger limit globally so the upload route can receive base64 images
// Vercel's hard limit is 4.5 MB per serverless invocation
app.use(express.json({ limit: '4.5mb' }));
app.use(express.urlencoded({ extended: true, limit: '4.5mb' }));

// Connect DB before each request, then auto-seed on first boot
app.use(async (req, res, next) => {
    try {
        await connectDB();
        // Fire-and-forget seed (won't block request)
        autoSeed().catch(e => console.error('Seed error:', e.message));
        next();
    } catch {
        res.status(503).json({ error: 'Database not available. Please try again.' });
    }
});

// Simple rate-limiter for OTP (in-memory, resets on cold start)
const otpRateLimit = new Map();
function checkOTPRateLimit(key) {
    const now = Date.now();
    const record = otpRateLimit.get(key);
    if (record && now - record.timestamp < 60000) {
        // Max 1 request per 60 seconds per phone
        return false;
    }
    otpRateLimit.set(key, { timestamp: now });
    return true;
}

// ── Auto-seed ─────────────────────────────────────────────────
let seeded = false;
async function autoSeed() {
    if (seeded) return;
    const count = await User.countDocuments();
    if (count >= 2) { seeded = true; return; }

    await User.deleteMany({});
    await User.create({
        name: process.env.ADMIN_NAME || 'Mohamed Salif',
        email: process.env.ADMIN_EMAIL || 'mhdsalif@love.com',
        password: process.env.ADMIN_PASSWORD || 'mhdsalif@love2022',
        role: 'admin',
        avatar: '🥰',
        mobileNumber: process.env.OTP_MOBILE || '9790558017',
    });
    await User.create({
        name: process.env.USER_NAME || 'Nasrin Ayisha Rani',
        email: process.env.USER_EMAIL || 'nasrinayisha@love.com',
        password: process.env.USER_PASSWORD || 'nasrinayisha@love2022',
        role: 'user',
        avatar: '💕',
        mobileNumber: process.env.OTP_MOBILE || '9790558017',
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
                { side: 'left', emoji: '🌷', title: 'How It Began', text: 'It started with something so simple — a glance, a smile, a "hey". Neither of us knew that tiny moment would change everything.' },
                { side: 'right', emoji: '💫', title: 'Falling Together', text: 'We fell slowly, then all at once. Long late-night calls, silly memes, inside jokes that no one else would understand.' },
                { side: 'left', emoji: '🌸', title: 'What You Mean to Me', text: "You are the calm in my storm, the answer to questions I hadn't yet asked." },
                { side: 'right', emoji: '❤️', title: 'Our Future', text: 'Adventures unplanned, sunsets unshared, laughter yet to echo — so much still to come.' },
            ])
        },
        {
            key: 'about_milestones', value: JSON.stringify([
                { icon: '👀', date: 'Day One', text: 'The moment our eyes met — the world slowed down.' },
                { icon: '💬', date: 'First Texts', text: 'Messages that started casual and turned into something magical.' },
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
                { date: 'The First Hello', emoji: '👋', color: '#ffdce8', border: '#ff85a9', title: 'It Started With a Smile', desc: 'A nervous smile, a bold hello — and suddenly the world felt different.' },
                { date: 'First Coffee Date', emoji: '☕', color: '#f0e6ff', border: '#c084fc', title: 'Two Hours That Felt Like Minutes', desc: 'We talked about everything and nothing. The coffee went cold.' },
                { date: 'First Movie Night', emoji: '🍿', color: '#fff0f5', border: '#ff85a9', title: 'We Barely Watched the Movie', desc: 'Blanket forts, terrible popcorn, and so much laughter.' },
                { date: 'First "I Love You"', emoji: '❤️', color: '#ffdce8', border: '#e83e6c', title: 'Three Words, Infinite Weight', desc: 'It slipped out quietly. And everything changed.' },
                { date: 'Our First Trip', emoji: '✈️', color: '#f0e6ff', border: '#a855f7', title: 'Adventures With You Are Home', desc: 'New city, new memories, same goofy us.' },
                { date: 'Today & Always', emoji: '🌟', color: '#fff0f5', border: '#ffb3cc', title: 'Every Day With You', desc: "The story is still being written. Here's to forever. 💕" },
            ])
        },
        { key: 'surprise_title', value: 'Our forever is just beginning… ❤️' },
        { key: 'surprise_message', value: "No matter how many pages, songs, or years pass — I will choose you every single time." },
        {
            key: 'letter_content', value: JSON.stringify([
                'My Dearest Love,', '',
                'I have tried a thousand times to find the right words —',
                'words worthy of what you mean to me.', '',
                'You are the reason mornings feel like magic.',
                'The reason I smile at absolutely nothing.', '',
                'I love the way you laugh until your eyes crinkle.',
                'The way you say my name.', '',
                'Forever and without conditions —', '',
                'Yours, completely. 💕',
            ])
        },
        { key: 'footer_text', value: 'Made with 💕 and infinite love · 2026' },
    ];
    await Content.insertMany(defaults);
    contentSeeded = true;
}

// Seed future items
let futureSeeded = false;
async function seedFuture() {
    if (futureSeeded) return;
    const count = await Future.countDocuments();
    if (count > 0) { futureSeeded = true; return; }
    await Future.insertMany([
        { type: 'game', title: 'Love Quiz', description: 'How well do you know each other?', emoji: '🎯', enabled: true },
        { type: 'game', title: 'Truth or Dare', description: 'Romantic truth or dare!', emoji: '🎲', enabled: true },
        { type: 'dare', title: 'Write a Poem', description: 'Write a 4-line love poem right now!', emoji: '✍️', enabled: true },
        { type: 'dare', title: 'Surprise Call', description: 'Call and say the sweetest thing!', emoji: '📞', enabled: true },
        { type: 'surprise', title: 'Mystery Date Night', description: 'Plan a surprise date!', emoji: '🌙', enabled: true },
        { type: 'surprise', title: 'Love Jar', description: 'Write 10 reasons why you love them!', emoji: '🫙', enabled: true },
    ]);
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

        // Password OK — require OTP before issuing token
        const mobileNumber = user.mobileNumber || process.env.OTP_MOBILE || '9790558017';
        const masked = '****' + mobileNumber.slice(-4);
        res.json({
            requiresOtp: true,
            userId: user._id,
            maskedMobile: masked,
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// ── POST /api/auth/send-login-otp — Send OTP after password verified ──
app.post('/api/auth/send-login-otp', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId required.' });

        const user = await User.findById(userId).select('+otpCode +otpExpiry +otpAttempts +otpLastRequest');
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const mobileNumber = user.mobileNumber || process.env.OTP_MOBILE || '9790558017';
        const cleanMobile = mobileNumber.replace(/[^0-9]/g, '');

        // Rate limit: 1 OTP per 60 seconds
        if (!checkOTPRateLimit('login_' + userId)) {
            return res.status(429).json({ error: 'Please wait 60 seconds before requesting another OTP.' });
        }

        const otp = generateOTP();
        const hashedOtp = await hashOTP(otp);

        user.otpCode = hashedOtp;
        user.otpExpiry = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
        user.otpAttempts = 0;
        user.otpVerified = false;
        user.otpLastRequest = new Date();
        await user.save();

        const result = await sendOTPviaSMS(cleanMobile, otp);
        if (!result.success) {
            return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
        }

        res.json({
            success: true,
            message: `OTP sent to ****${cleanMobile.slice(-4)}`,
            method: result.method,
        });
    } catch (err) {
        console.error('Send login OTP error:', err);
        res.status(500).json({ error: 'Failed to send OTP.' });
    }
});

// ── POST /api/auth/verify-login-otp — Verify OTP and issue JWT ──
app.post('/api/auth/verify-login-otp', async (req, res) => {
    try {
        const { userId, otp } = req.body;
        if (!userId || !otp) return res.status(400).json({ error: 'userId and OTP are required.' });

        const user = await User.findById(userId).select('+otpCode +otpExpiry +otpAttempts');
        if (!user) return res.status(404).json({ error: 'User not found.' });

        // Check expiry
        if (!user.otpExpiry || new Date() > user.otpExpiry) {
            user.otpCode = ''; user.otpExpiry = null; user.otpAttempts = 0;
            await user.save();
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }

        // Check max attempts
        if (user.otpAttempts >= 3) {
            user.otpCode = ''; user.otpExpiry = null; user.otpAttempts = 0;
            await user.save();
            return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
        }

        const isValid = await verifyOTP(otp.toString(), user.otpCode);
        if (!isValid) {
            user.otpAttempts += 1;
            await user.save();
            const remaining = 3 - user.otpAttempts;
            return res.status(400).json({ error: `Invalid OTP. ${remaining} attempt(s) remaining.` });
        }

        // OTP verified — clear it and issue token
        user.otpCode = ''; user.otpExpiry = null; user.otpAttempts = 0; user.otpVerified = false;
        await user.save();

        res.json({
            token: generateToken(user._id),
            user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
        });
    } catch (err) {
        console.error('Verify login OTP error:', err);
        res.status(500).json({ error: 'OTP verification failed.' });
    }
});

app.get('/api/auth/me', protect, (req, res) => {
    res.json({ id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role, avatar: req.user.avatar });
});

app.get('/api/auth/partner', protect, async (req, res) => {
    const partner = await User.findOne({ _id: { $ne: req.user._id } });
    if (!partner) return res.status(404).json({ error: 'Partner not found.' });
    res.json({ id: partner._id, name: partner.name, avatar: partner.avatar });
});

// ── PATCH /api/auth/profile — Update display name & avatar ──
app.patch('/api/auth/profile', protect, async (req, res) => {
    try {
        const { name, avatar } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required.' });
        const trimmedName = name.trim().substring(0, 32);
        const safeAvatar = avatar && avatar.length <= 4 ? avatar : req.user.avatar;
        const updated = await User.findByIdAndUpdate(
            req.user._id,
            { name: trimmedName, avatar: safeAvatar },
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'User not found.' });
        res.json({ id: updated._id, name: updated.name, email: updated.email, role: updated.role, avatar: updated.avatar });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
});

// ═══════════════════════════════════════════════
// OTP RECOVERY ROUTES
// ═══════════════════════════════════════════════

// Step 1: Request OTP — user provides mobile number + recovery type
app.post('/api/auth/request-otp', async (req, res) => {
    try {
        await autoSeed();
        const { mobileNumber, type } = req.body; // type: 'forgot-email' | 'forgot-password'
        if (!mobileNumber) return res.status(400).json({ error: 'Mobile number is required.' });
        if (!['forgot-email', 'forgot-password'].includes(type)) {
            return res.status(400).json({ error: 'Invalid recovery type.' });
        }

        // Sanitize mobile number
        const cleanMobile = mobileNumber.replace(/[^0-9]/g, '');
        if (cleanMobile.length < 10) return res.status(400).json({ error: 'Invalid mobile number.' });

        // Rate limit: 1 OTP per 60 seconds per number
        if (!checkOTPRateLimit(cleanMobile)) {
            return res.status(429).json({ error: 'Please wait 60 seconds before requesting another OTP.' });
        }

        // Find user by mobile number
        const user = await User.findOne({ mobileNumber: cleanMobile }).select('+otpCode +otpExpiry +otpAttempts +otpLastRequest');
        if (!user) return res.status(404).json({ error: 'No account found with this mobile number.' });

        // Generate OTP
        const otp = generateOTP();
        const hashedOtp = await hashOTP(otp);

        // Store hashed OTP with 5-minute expiry
        user.otpCode = hashedOtp;
        user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        user.otpAttempts = 0;
        user.otpVerified = false;
        user.otpLastRequest = new Date();
        await user.save();

        // Send OTP
        const result = await sendOTPviaSMS(cleanMobile, otp);
        if (!result.success) {
            return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
        }

        // Mask info for response
        const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
        const maskedName = user.name.split(' ')[0];

        res.json({
            success: true,
            message: `OTP sent to ****${cleanMobile.slice(-4)}`,
            userId: user._id,
            maskedName,
            maskedEmail: type === 'forgot-password' ? maskedEmail : undefined,
            method: result.method,
        });
    } catch (err) {
        console.error('OTP request error:', err);
        res.status(500).json({ error: 'Failed to process request.' });
    }
});

// Step 2: Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { userId, otp, type } = req.body;
        if (!userId || !otp) return res.status(400).json({ error: 'User ID and OTP are required.' });

        const user = await User.findById(userId).select('+otpCode +otpExpiry +otpAttempts +password');
        if (!user) return res.status(404).json({ error: 'User not found.' });

        // Check if OTP has expired
        if (!user.otpExpiry || new Date() > user.otpExpiry) {
            user.otpCode = '';
            user.otpExpiry = null;
            user.otpAttempts = 0;
            await user.save();
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }

        // Check max attempts (3)
        if (user.otpAttempts >= 3) {
            user.otpCode = '';
            user.otpExpiry = null;
            user.otpAttempts = 0;
            await user.save();
            return res.status(400).json({ error: 'Maximum attempts exceeded. Please request a new OTP.' });
        }

        // Verify OTP
        const isValid = await verifyOTP(otp.toString(), user.otpCode);
        if (!isValid) {
            user.otpAttempts += 1;
            await user.save();
            const remaining = 3 - user.otpAttempts;
            return res.status(400).json({ error: `Invalid OTP. ${remaining} attempt(s) remaining.` });
        }

        // OTP verified — clear it
        user.otpCode = '';
        user.otpExpiry = null;
        user.otpAttempts = 0;
        user.otpVerified = true;
        await user.save();

        // Generate a temporary reset token (valid 10 minutes)
        const resetToken = jwt.sign({ id: user._id, purpose: 'reset' }, JWT_SECRET, { expiresIn: '10m' });

        // Response based on type
        if (type === 'forgot-email') {
            return res.json({
                success: true,
                email: user.email,
                name: user.name,
                message: 'Email retrieved successfully.',
            });
        }

        // For forgot-password, return reset token
        res.json({
            success: true,
            resetToken,
            message: 'OTP verified. You can now reset your password.',
        });
    } catch (err) {
        console.error('OTP verify error:', err);
        res.status(500).json({ error: 'Verification failed.' });
    }
});

// Step 3: Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        if (!resetToken || !newPassword) return res.status(400).json({ error: 'Reset token and new password required.' });
        if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

        // Verify reset token
        let decoded;
        try {
            decoded = jwt.verify(resetToken, JWT_SECRET);
        } catch {
            return res.status(400).json({ error: 'Reset link has expired. Please start over.' });
        }

        if (decoded.purpose !== 'reset') return res.status(400).json({ error: 'Invalid reset token.' });

        const user = await User.findById(decoded.id).select('+password');
        if (!user) return res.status(404).json({ error: 'User not found.' });
        if (!user.otpVerified) return res.status(400).json({ error: 'OTP verification required first.' });

        // Update password (pre-save hook will hash it)
        user.password = newPassword;
        user.otpVerified = false;
        await user.save();

        res.json({ success: true, message: 'Password reset successfully! You can now log in.' });
    } catch (err) {
        console.error('Password reset error:', err);
        res.status(500).json({ error: 'Password reset failed.' });
    }
});

// ═══════════════════════════════════════════════
// MESSAGE ROUTES
// ═══════════════════════════════════════════════

app.get('/api/messages', protect, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
        }).sort({ createdAt: 1 }).limit(500)
            .populate('senderId', 'name avatar')
            .populate('receiverId', 'name avatar');
        res.json(messages);
    } catch { res.status(500).json({ error: 'Failed to fetch messages.' }); }
});

app.post('/api/messages', protect, async (req, res) => {
    try {
        const { receiverId, message } = req.body;
        if (!receiverId || !message) return res.status(400).json({ error: 'receiverId and message required.' });
        if (message.length > 2000) return res.status(400).json({ error: 'Message too long.' });
        const newMsg = await Message.create({ senderId: req.user._id, receiverId, message: message.trim() });
        const populated = await newMsg.populate([
            { path: 'senderId', select: 'name avatar' },
            { path: 'receiverId', select: 'name avatar' },
        ]);
        res.status(201).json(populated);
    } catch { res.status(500).json({ error: 'Failed to send message.' }); }
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
    try {
        const msg = await Message.findById(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Message not found.' });
        // Admins can delete any message; users can only delete their own
        const isAdmin = req.user.role === 'admin';
        if (!isAdmin && msg.senderId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'You can only delete your own messages.' });
        }
        await Message.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete message.' });
    }
});

// ═══════════════════════════════════════════════
// ADMIN CONTENT ROUTES
// ═══════════════════════════════════════════════

app.get('/api/content', protect, adminOnly, async (req, res) => {
    try {
        await seedContent();
        const content = await Content.find();
        const map = {}; content.forEach(c => { map[c.key] = c; });
        res.json(map);
    } catch { res.status(500).json({ error: 'Failed to fetch content.' }); }
});

app.put('/api/content/:key', protect, adminOnly, async (req, res) => {
    try {
        const { value } = req.body;
        if (value === undefined) return res.status(400).json({ error: 'Value required.' });
        const updated = await Content.findOneAndUpdate({ key: req.params.key }, { value }, { upsert: true, new: true });
        res.json(updated);
    } catch { res.status(500).json({ error: 'Failed to update.' }); }
});

// ── POST /api/content/upload — Upload image as base64, stored in MongoDB ──
app.post('/api/content/upload', protect, adminOnly, async (req, res) => {
    try {
        const { base64, name } = req.body;
        if (!base64) return res.status(400).json({ error: 'base64 image data required.' });
        // Guard: max ~4MB base64 string (≈3MB actual image)
        if (base64.length > 4.5 * 1024 * 1024) {
            return res.status(413).json({ error: 'Image too large. Please use an image under 3MB.' });
        }
        // Validate it’s a data URL
        if (!base64.startsWith('data:image/')) {
            return res.status(400).json({ error: 'Invalid image format. Must be a data URL.' });
        }
        // Generate unique key
        const imgKey = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
        await Content.findOneAndUpdate(
            { key: imgKey },
            { key: imgKey, value: base64 },
            { upsert: true, new: true }
        );
        const url = `/api/content/image/${imgKey}`;
        res.json({ url, key: imgKey, name: name || imgKey });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Upload failed. Please try again.' });
    }
});

// ── GET /api/content/image/:key — Serve a stored image from MongoDB ──
app.get('/api/content/image/:key', async (req, res) => {
    try {
        await connectDB();
        const item = await Content.findOne({ key: req.params.key });
        if (!item) return res.status(404).json({ error: 'Image not found.' });
        const base64Data = item.value;
        if (typeof base64Data !== 'string' || !base64Data.startsWith('data:image/')) {
            return res.status(400).json({ error: 'Not an image record.' });
        }
        // Parse data URL: data:<mime>;base64,<data>
        const commaIdx = base64Data.indexOf(',');
        const header = base64Data.substring(5, commaIdx); // e.g. 'image/jpeg;base64'
        const mimeType = header.split(';')[0];             // e.g. 'image/jpeg'
        const imageBuffer = Buffer.from(base64Data.substring(commaIdx + 1), 'base64');
        res.set('Content-Type', mimeType);
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
        res.set('X-Content-Type-Options', 'nosniff');
        res.send(imageBuffer);
    } catch (err) {
        console.error('Image serve error:', err);
        res.status(500).json({ error: 'Failed to serve image.' });
    }
});

// ═══════════════════════════════════════════════
// ADMIN FUTURE ROUTES
// ═══════════════════════════════════════════════

app.get('/api/content/future', protect, adminOnly, async (req, res) => {
    try { await seedFuture(); res.json(await Future.find().sort({ createdAt: -1 })); }
    catch { res.status(500).json({ error: 'Failed.' }); }
});
app.post('/api/content/future', protect, adminOnly, async (req, res) => {
    try {
        const { type, title, description, emoji, enabled } = req.body;
        if (!type || !title) return res.status(400).json({ error: 'Type and title required.' });
        res.status(201).json(await Future.create({ type, title, description, emoji, enabled }));
    } catch { res.status(500).json({ error: 'Failed.' }); }
});
app.put('/api/content/future/:id', protect, adminOnly, async (req, res) => {
    try {
        const item = await Future.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!item) return res.status(404).json({ error: 'Not found.' });
        res.json(item);
    } catch { res.status(500).json({ error: 'Failed.' }); }
});
app.delete('/api/content/future/:id', protect, adminOnly, async (req, res) => {
    try {
        const item = await Future.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ error: 'Not found.' });
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Failed.' }); }
});

// ═══════════════════════════════════════════════
// PUBLIC CONTENT ROUTES
// ═══════════════════════════════════════════════

app.get('/api/public/content', protect, async (req, res) => {
    try {
        await seedContent();
        const content = await Content.find();
        const map = {}; content.forEach(c => { map[c.key] = c.value; });
        res.json(map);
    } catch { res.status(500).json({ error: 'Failed.' }); }
});

app.get('/api/public/future', protect, async (req, res) => {
    try {
        await seedFuture();
        res.json(await Future.find({ enabled: true }).sort({ createdAt: -1 }));
    } catch { res.status(500).json({ error: 'Failed.' }); }
});

// ── Health & Init ─────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    try {
        const userCount = await User.countDocuments();
        res.json({ status: 'ok', db: dbStatus, users: userCount, timestamp: new Date().toISOString() });
    } catch {
        res.json({ status: 'ok', db: dbStatus, timestamp: new Date().toISOString() });
    }
});

// Public init endpoint — seeds users + content on demand
app.post('/api/init', async (req, res) => {
    try {
        const before = await User.countDocuments();
        await User.deleteMany({});
        await User.create({
            name: process.env.ADMIN_NAME || 'Mohamed Salif',
            email: process.env.ADMIN_EMAIL || 'mhdsalif@love.com',
            password: process.env.ADMIN_PASSWORD || 'mhdsalif@love2022',
            role: 'admin', avatar: '🥰',
            mobileNumber: process.env.OTP_MOBILE || '9790558017',
        });
        await User.create({
            name: process.env.USER_NAME || 'Nasrin Ayisha Rani',
            email: process.env.USER_EMAIL || 'nasrinayisha@love.com',
            password: process.env.USER_PASSWORD || 'nasrinayisha@love2022',
            role: 'user', avatar: '💕',
            mobileNumber: process.env.OTP_MOBILE || '9790558017',
        });
        seeded = true;
        await seedContent();
        const after = await User.countDocuments();
        res.json({ success: true, message: '✅ Users seeded!', before, after });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use('/api/*', (req, res) => { res.status(404).json({ error: 'API route not found.' }); });

export default app;
