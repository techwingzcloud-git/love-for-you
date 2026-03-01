/* ============================================================
   Content Management Routes — Love For You ❤️
   Admin-only CMS for managing site content
   Uses file-based DB (no MongoDB needed!)
   ============================================================ */
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import fileDB from '../config/fileDB.js';
import { protect } from './authRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer config for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only image files are allowed.'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// Admin-only middleware
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
};

// All content routes require authentication + admin
router.use(protect);
router.use(adminOnly);

// ── GET /api/content — Get all site content ──
router.get('/', (req, res) => {
    try {
        const content = fileDB.find('content');
        // Return as key-value map
        const contentMap = {};
        content.forEach(c => { contentMap[c.key] = c; });
        res.json(contentMap);
    } catch (error) {
        console.error('Error fetching content:', error);
        res.status(500).json({ error: 'Failed to fetch content.' });
    }
});

// ── PUT /api/content/:key — Update a content block ──
router.put('/:key', (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (value === undefined) {
            return res.status(400).json({ error: 'Value is required.' });
        }

        const existing = fileDB.findOne('content', { key });
        if (existing) {
            const updated = fileDB.updateOne('content', { key }, { value });
            return res.json(updated);
        }

        const created = fileDB.create('content', { key, value });
        res.status(201).json(created);
    } catch (error) {
        console.error('Error updating content:', error);
        res.status(500).json({ error: 'Failed to update content.' });
    }
});

// ── POST /api/content/upload — Upload an image ──
router.post('/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided.' });
        }
        const imageUrl = `/api/uploads/${req.file.filename}`;
        res.json({ url: imageUrl, filename: req.file.filename });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Failed to upload image.' });
    }
});

// ── GET /api/content/future — Get Our Future page items ──
router.get('/future', (req, res) => {
    try {
        const items = fileDB.find('future');
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch future items.' });
    }
});

// ── POST /api/content/future — Add a future item ──
router.post('/future', (req, res) => {
    try {
        const { type, title, description, emoji, enabled } = req.body;
        if (!type || !title) {
            return res.status(400).json({ error: 'Type and title are required.' });
        }
        const item = fileDB.create('future', {
            type, // 'game', 'dare', 'surprise'
            title,
            description: description || '',
            emoji: emoji || '✨',
            enabled: enabled !== false,
        });
        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create future item.' });
    }
});

// ── PUT /api/content/future/:id — Update a future item ──
router.put('/future/:id', (req, res) => {
    try {
        const item = fileDB.findById('future', req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found.' });

        const updated = fileDB.updateOne('future', { _id: req.params.id }, req.body);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update future item.' });
    }
});

// ── DELETE /api/content/future/:id — Delete a future item ──
router.delete('/future/:id', (req, res) => {
    try {
        const item = fileDB.findById('future', req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found.' });
        fileDB.deleteById('future', req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete future item.' });
    }
});

export default router;
