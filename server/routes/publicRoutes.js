/* ============================================================
   Public Content Routes — Love For You ❤️
   Read-only content endpoints for authenticated users
   ============================================================ */
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import fileDB from '../config/fileDB.js';
import { protect } from './authRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// All public content routes require authentication
router.use(protect);

// ── GET /api/public/content — Get all site content (read-only) ──
router.get('/content', (req, res) => {
    try {
        const content = fileDB.find('content');
        const contentMap = {};
        content.forEach(c => { contentMap[c.key] = c.value; });
        res.json(contentMap);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch content.' });
    }
});

// ── GET /api/public/future — Get Our Future page items ──
router.get('/future', (req, res) => {
    try {
        const items = fileDB.find('future').filter(item => item.enabled !== false);
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch future items.' });
    }
});

// ── Serve uploaded images ──
router.get('/uploads/:filename', (req, res) => {
    const filePath = path.join(__dirname, '..', 'data', 'uploads', req.params.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found.' });
    }
    res.sendFile(filePath);
});

export default router;
