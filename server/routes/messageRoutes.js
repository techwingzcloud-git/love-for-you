/* ============================================================
   Message API Routes — Love For You ❤️
   Protected CRUD for private messages
   Uses file-based DB (no MongoDB needed!)
   ============================================================ */
import express from 'express';
import fileDB from '../config/fileDB.js';
import { protect } from './authRoutes.js';

const router = express.Router();

// All message routes require authentication
router.use(protect);

// ── GET /api/messages — Get conversation between the two users ──
router.get('/', (req, res) => {
    try {
        const allMessages = fileDB.find('messages');

        // Filter messages involving the current user
        const userMessages = allMessages.filter(m =>
            m.senderId === req.user._id || m.receiverId === req.user._id
        );

        // Sort by createdAt ascending
        userMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        // Populate sender/receiver info
        const populated = userMessages.map(m => {
            const sender = fileDB.findById('users', m.senderId);
            const receiver = fileDB.findById('users', m.receiverId);
            return {
                ...m,
                senderId: sender ? { _id: sender._id, name: sender.name, avatar: sender.avatar } : { _id: m.senderId },
                receiverId: receiver ? { _id: receiver._id, name: receiver.name, avatar: receiver.avatar } : { _id: m.receiverId },
            };
        });

        res.json(populated);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages.' });
    }
});

// ── POST /api/messages — Send a new message ──
router.post('/', (req, res) => {
    try {
        const { receiverId, message } = req.body;

        if (!receiverId || !message) {
            return res.status(400).json({ error: 'receiverId and message are required.' });
        }

        if (message.length > 2000) {
            return res.status(400).json({ error: 'Message cannot exceed 2000 characters.' });
        }

        const newMessage = fileDB.create('messages', {
            senderId: req.user._id,
            receiverId,
            message: message.trim(),
            readStatus: false,
        });

        // Populate sender/receiver info
        const sender = fileDB.findById('users', newMessage.senderId);
        const receiver = fileDB.findById('users', newMessage.receiverId);

        const populated = {
            ...newMessage,
            senderId: sender ? { _id: sender._id, name: sender.name, avatar: sender.avatar } : { _id: newMessage.senderId },
            receiverId: receiver ? { _id: receiver._id, name: receiver.name, avatar: receiver.avatar } : { _id: newMessage.receiverId },
        };

        res.status(201).json(populated);
    } catch (error) {
        console.error('Error creating message:', error);
        res.status(500).json({ error: 'Failed to send message.' });
    }
});

// ── PATCH /api/messages/read — Mark all unread messages as read ──
router.patch('/read', (req, res) => {
    try {
        const allMessages = fileDB.find('messages');
        let count = 0;

        allMessages.forEach(m => {
            if (m.receiverId === req.user._id && !m.readStatus) {
                fileDB.updateOne('messages', { _id: m._id }, { readStatus: true });
                count++;
            }
        });

        res.json({ success: true, count });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Failed to update messages.' });
    }
});

// ── GET /api/messages/unread — Get unread count ──
router.get('/unread', (req, res) => {
    try {
        const allMessages = fileDB.find('messages');
        const count = allMessages.filter(m =>
            m.receiverId === req.user._id && !m.readStatus
        ).length;
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get unread count.' });
    }
});

// ── DELETE /api/messages/:id — Delete own message ──
router.delete('/:id', (req, res) => {
    try {
        const msg = fileDB.findById('messages', req.params.id);
        if (!msg) {
            return res.status(404).json({ error: 'Message not found.' });
        }
        if (msg.senderId !== req.user._id) {
            return res.status(403).json({ error: 'You can only delete your own messages.' });
        }
        fileDB.deleteById('messages', req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete message.' });
    }
});

export default router;
