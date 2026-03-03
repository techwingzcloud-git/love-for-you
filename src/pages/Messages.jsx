import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { messagesApi, authApi, SOCKET_URL } from '../api/messageApi';
import './Messages.css';

// Only import socket.io-client dynamically to avoid issues in production
const isProduction = typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

// Polling interval for production (Vercel doesn't support WebSockets)
const POLL_INTERVAL = isProduction ? 3000 : null;

// Available avatar emojis for profile customisation
const AVATAR_OPTIONS = ['💕', '🥰', '😍', '💖', '💗', '💓', '💞', '💝', '😘', '🌹', '🌸', '💌', '✨', '🦋', '🌙', '⭐', '🎀', '🫶', '💫', '🌷'];

export default function Messages() {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [inputVal, setInputVal] = useState('');
    const [partner, setPartner] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [partnerOnline, setPartnerOnline] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Profile edit modal state
    const [profileOpen, setProfileOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editAvatar, setEditAvatar] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState('');

    const endRef = useRef(null);
    const inputRef = useRef(null);
    const socketRef = useRef(null);
    const typingTimeout = useRef(null);

    // Normalize ID to string for safe comparison (handles ObjectId / string)
    const normalizeId = (id) => {
        if (!id) return '';
        if (typeof id === 'object' && id._id) return String(id._id);
        return String(id);
    };

    // Scroll to bottom
    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
    }, []);

    // Load partner info and messages
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [partnerRes, messagesRes] = await Promise.all([
                    authApi.getPartner(),
                    messagesApi.getAll(),
                ]);
                setPartner(partnerRes.data);
                setMessages(messagesRes.data);
                await messagesApi.markRead().catch(() => { });
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load messages. Make sure the server is running.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Socket.IO connection (only in development — Vercel doesn't support WebSockets)
    useEffect(() => {
        if (isProduction) return; // Skip socket in production
        const token = localStorage.getItem('lfyToken');
        if (!token) return;

        let socket;
        const connectSocket = async () => {
            try {
                const { io } = await import('socket.io-client');
                socket = io(SOCKET_URL, {
                    auth: { token },
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionAttempts: 10,
                    reconnectionDelay: 1000,
                });

                socketRef.current = socket;

                socket.on('connect', () => {
                    console.log('💬 Connected to real-time chat');
                });

                socket.on('message:new', (message) => {
                    setMessages(prev => {
                        if (prev.some(m => m._id === message._id)) return prev;
                        return [...prev, message];
                    });
                    if (message.receiverId?._id === user?.id || message.receiverId === user?.id) {
                        messagesApi.markRead().catch(() => { });
                    }
                });

                socket.on('message:read_ack', ({ messageIds }) => {
                    setMessages(prev => prev.map(m =>
                        messageIds.includes(m._id) ? { ...m, readStatus: true } : m
                    ));
                });

                socket.on('message:delivered', ({ messageId }) => {
                    setMessages(prev => prev.map(m =>
                        m._id === messageId ? { ...m, delivered: true } : m
                    ));
                });

                socket.on('message:deleted', ({ messageId }) => {
                    setMessages(prev => prev.filter(m => m._id !== messageId));
                });

                socket.on('typing:show', () => setIsTyping(true));
                socket.on('typing:hide', () => setIsTyping(false));

                socket.on('user:online', ({ userId, online }) => {
                    if (userId !== user?.id) setPartnerOnline(online);
                });

                socket.on('connect_error', (err) => {
                    console.log('Socket connection issue:', err.message);
                });

                socket.on('message:error', ({ error: errMsg }) => {
                    setError(errMsg);
                    setSending(false);
                });
            } catch (err) {
                console.log('Socket.IO not available, using HTTP polling');
            }
        };

        connectSocket();

        return () => {
            socket?.disconnect();
        };
    }, [user?.id]);

    // Polling fallback for production (fetches new messages every 3s)
    useEffect(() => {
        if (!POLL_INTERVAL) return;
        const interval = setInterval(async () => {
            try {
                const { data } = await messagesApi.getAll();
                setMessages(prev => {
                    if (data.length !== prev.length) return data;
                    const lastNew = data[data.length - 1]?._id;
                    const lastOld = prev[prev.length - 1]?._id;
                    if (lastNew !== lastOld) return data;
                    return prev;
                });
            } catch { /* silently fail */ }
        }, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Open profile modal — init with current values
    useEffect(() => {
        if (profileOpen) {
            setEditName(user?.name || '');
            setEditAvatar(user?.avatar || '💕');
            setProfileMsg('');
        }
    }, [profileOpen, user]);

    // ── Send via HTTP API (always works) + Socket.IO bonus ──
    const sendMessage = async () => {
        const text = inputVal.trim();
        if (!text || !partner || sending) return;

        setSending(true);
        setInputVal('');
        inputRef.current?.focus();

        try {
            // Primary: Send via HTTP API (works on Vercel + localhost)
            const { data } = await messagesApi.send(partner.id, text);
            // Add to local state immediately
            setMessages(prev => {
                if (prev.some(m => m._id === data._id)) return prev;
                return [...prev, data];
            });
            // Bonus: Also emit via socket for instant delivery to partner (dev only)
            if (socketRef.current?.connected) {
                socketRef.current.emit('message:send', {
                    receiverId: partner.id,
                    message: text,
                });
            }
        } catch (err) {
            setError('Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    // ── Delete a message (own messages for all; any message for admin) ──
    const deleteMessage = async (msgId, senderId) => {
        const myId = normalizeId(user?.id);
        const senderNorm = normalizeId(senderId);
        const canDelete = senderNorm === myId || user?.role === 'admin';
        if (!canDelete) return;

        setDeletingId(msgId);
        try {
            await messagesApi.delete(msgId);
            setMessages(prev => prev.filter(m => m._id !== msgId));
            // Notify partner via socket
            if (socketRef.current?.connected) {
                socketRef.current.emit('message:delete', { messageId: msgId });
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete message.');
        } finally {
            setDeletingId(null);
        }
    };

    // ── Clear all messages (admin only, frontend-only view) ──
    const clearAllMessages = () => {
        if (!window.confirm('Clear all displayed messages? This will delete them from the server.')) return;
        // Delete each message one by one (admin can delete any)
        const ids = messages.map(m => m._id);
        ids.forEach(async (id) => {
            try { await messagesApi.delete(id); } catch { /* ignore */ }
        });
        setMessages([]);
    };

    // ── Update profile (name + avatar) ──
    const saveProfile = async () => {
        if (!editName.trim()) { setProfileMsg('Name cannot be empty.'); return; }
        setProfileSaving(true);
        setProfileMsg('');
        try {
            const { data } = await authApi.updateProfile({ name: editName.trim(), avatar: editAvatar });
            // Update local user state + storage
            const updatedUser = { ...user, name: data.name, avatar: data.avatar };
            localStorage.setItem('lfyUser', JSON.stringify(updatedUser));
            if (typeof setUser === 'function') setUser(updatedUser);
            setProfileMsg('✅ Profile updated!');
            setTimeout(() => { setProfileOpen(false); setProfileMsg(''); }, 1200);
        } catch (err) {
            setProfileMsg(err.response?.data?.error || 'Failed to update profile.');
        } finally {
            setProfileSaving(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleTyping = () => {
        if (!partner) return;
        socketRef.current?.emit('typing:start', { receiverId: partner.id });
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            socketRef.current?.emit('typing:stop', { receiverId: partner.id });
        }, 1500);
    };

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return 'Today';
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Group messages by date
    const groupedMessages = messages.reduce((acc, msg) => {
        const dateKey = new Date(msg.createdAt).toDateString();
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(msg);
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="messages-page page-wrapper bg-pink-dream flex-col-center">
                <div className="messages-loading">
                    <span className="animate-pulse-heart" style={{ fontSize: '2.5rem' }}>💬</span>
                    <p className="text-soft">Loading your messages…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="messages-page page-wrapper bg-pink-dream">
            <div className="dm-container">
                {/* ── Header ── */}
                <div className="dm-header card-soft">
                    <button className="dm-back" onClick={() => navigate('/')} aria-label="Go back">
                        ← Back
                    </button>
                    <div className="dm-partner">
                        <div className="dm-avatar">
                            <span>{partner?.avatar || '💕'}</span>
                            <span className={`dm-status-dot ${partnerOnline ? 'dm-status-dot--online' : ''}`} />
                        </div>
                        <div>
                            <div className="dm-name">{partner?.name || 'My Love'}</div>
                            <div className="dm-status">
                                {isTyping ? (
                                    <span className="dm-typing">typing…</span>
                                ) : partnerOnline ? (
                                    '🟢 Online'
                                ) : (
                                    '⚫ Offline'
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right side: current user info + edit profile + admin clear */}
                    <div className="dm-header-actions">
                        {user?.role === 'admin' && messages.length > 0 && (
                            <button
                                className="dm-clear-btn"
                                onClick={clearAllMessages}
                                title="Clear all messages (Admin)"
                                id="dm-clear-all-btn"
                            >
                                🗑️
                            </button>
                        )}
                        <button
                            className="dm-header-you dm-profile-btn"
                            onClick={() => setProfileOpen(true)}
                            title="Edit your profile"
                            id="dm-edit-profile-btn"
                        >
                            <span className="dm-my-avatar">{user?.avatar || '💕'}</span>
                            <span className="dm-my-name">{user?.name}</span>
                            <span className="dm-edit-icon">✏️</span>
                        </button>
                    </div>
                </div>

                {/* ── Error banner ─── */}
                {error && (
                    <div className="dm-error" role="alert">
                        💔 {error}
                        <button onClick={() => setError('')} className="dm-error-close">✕</button>
                    </div>
                )}

                {/* ── Messages area ─── */}
                <div className="dm-messages" id="dm-messages-area">
                    {messages.length === 0 && !error && (
                        <div className="dm-empty">
                            <span style={{ fontSize: '2.5rem' }}>💌</span>
                            <p>No messages yet. Say something sweet!</p>
                        </div>
                    )}

                    {Object.entries(groupedMessages).map(([dateKey, msgs]) => (
                        <div key={dateKey}>
                            <div className="dm-date-divider">
                                <span>{formatDate(msgs[0].createdAt)}</span>
                            </div>
                            <AnimatePresence initial={false}>
                                {msgs.map(msg => {
                                    const senderId = normalizeId(msg.senderId);
                                    const myId = normalizeId(user?.id);
                                    const isMe = senderId === myId;
                                    const canDelete = isMe || user?.role === 'admin';

                                    return (
                                        <motion.div
                                            key={msg._id}
                                            className={`dm-bubble-wrap ${isMe ? 'dm-bubble-wrap--me' : 'dm-bubble-wrap--them'}`}
                                            initial={{ opacity: 0, y: 12, scale: 0.92 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.85, y: -6 }}
                                            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                                        >
                                            {/* Avatar only on receiver (left) side */}
                                            {!isMe && (
                                                <div className="dm-avatar-small" title={partner?.name}>
                                                    {partner?.avatar || '💕'}
                                                </div>
                                            )}
                                            <div className="dm-bubble-content">
                                                <div className={`dm-bubble ${isMe ? 'dm-bubble--me' : 'dm-bubble--them'}`}>
                                                    {msg.message}
                                                    {/* Delete button — appears on hover */}
                                                    {canDelete && (
                                                        <button
                                                            className={`dm-delete-btn ${isMe ? 'dm-delete-btn--me' : 'dm-delete-btn--them'}`}
                                                            onClick={() => deleteMessage(msg._id, msg.senderId)}
                                                            disabled={deletingId === msg._id}
                                                            title="Delete message"
                                                            aria-label="Delete this message"
                                                        >
                                                            {deletingId === msg._id ? '⏳' : '🗑️'}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className={`dm-time ${isMe ? 'dm-time--me' : 'dm-time--them'}`}>
                                                    {formatTime(msg.createdAt)}
                                                    {isMe && (
                                                        <span className="dm-read-status">
                                                            {msg.readStatus ? ' ✓✓' : ' ✓'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Avatar on sender (right) side */}
                                            {isMe && (
                                                <div className="dm-avatar-small dm-avatar-small--me" title={user?.name}>
                                                    {user?.avatar || '💕'}
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="dm-typing-indicator">
                            <div className="dm-avatar-small">{partner?.avatar || '💕'}</div>
                            <div className="dm-typing-dots">
                                <span /><span /><span />
                            </div>
                        </div>
                    )}

                    <div ref={endRef} />
                </div>

                {/* ── Input bar ─── */}
                <div className="dm-input-bar">
                    <input
                        ref={inputRef}
                        type="text"
                        id="dm-input"
                        className="dm-input"
                        placeholder="Type something sweet… 💌"
                        value={inputVal}
                        onChange={(e) => {
                            setInputVal(e.target.value);
                            handleTyping();
                        }}
                        onKeyDown={handleKey}
                        autoComplete="off"
                        aria-label="Message input"
                    />
                    <motion.button
                        className="dm-send-btn btn-primary"
                        id="dm-send-btn"
                        onClick={sendMessage}
                        disabled={!inputVal.trim() || sending}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.92 }}
                        aria-label="Send message"
                    >
                        💌 Send
                    </motion.button>
                </div>
            </div>

            {/* ── Profile Edit Modal ─── */}
            <AnimatePresence>
                {profileOpen && (
                    <motion.div
                        className="profile-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setProfileOpen(false)}
                    >
                        <motion.div
                            className="profile-modal card-soft"
                            initial={{ scale: 0.88, y: 30, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.88, y: 30, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="profile-modal__header">
                                <h2 className="profile-modal__title">✏️ Edit Profile</h2>
                                <button
                                    className="profile-modal__close"
                                    onClick={() => setProfileOpen(false)}
                                    aria-label="Close profile editor"
                                >✕</button>
                            </div>

                            {/* Current avatar preview */}
                            <div className="profile-modal__avatar-preview">
                                <span>{editAvatar}</span>
                            </div>

                            {/* Name field */}
                            <div className="profile-modal__field">
                                <label className="profile-modal__label" htmlFor="edit-name">Display Name</label>
                                <input
                                    id="edit-name"
                                    type="text"
                                    className="dm-input"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    placeholder="Your name…"
                                    maxLength={32}
                                />
                            </div>

                            {/* Avatar picker */}
                            <div className="profile-modal__field">
                                <label className="profile-modal__label">Choose Avatar</label>
                                <div className="profile-modal__avatars">
                                    {AVATAR_OPTIONS.map(av => (
                                        <button
                                            key={av}
                                            className={`profile-modal__avatar-opt ${editAvatar === av ? 'profile-modal__avatar-opt--active' : ''}`}
                                            onClick={() => setEditAvatar(av)}
                                            aria-label={`Avatar ${av}`}
                                        >
                                            {av}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Feedback */}
                            {profileMsg && (
                                <p className={`profile-modal__msg ${profileMsg.startsWith('✅') ? 'profile-modal__msg--ok' : 'profile-modal__msg--err'}`}>
                                    {profileMsg}
                                </p>
                            )}

                            {/* Actions */}
                            <div className="profile-modal__actions">
                                <button
                                    className="btn-ghost"
                                    onClick={() => setProfileOpen(false)}
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    className="btn-primary"
                                    onClick={saveProfile}
                                    disabled={profileSaving}
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.95 }}
                                    id="dm-save-profile-btn"
                                >
                                    {profileSaving ? '⏳ Saving…' : '💾 Save Changes'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
