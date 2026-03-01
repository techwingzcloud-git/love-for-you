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

export default function Messages() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [inputVal, setInputVal] = useState('');
    const [partner, setPartner] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [partnerOnline, setPartnerOnline] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const endRef = useRef(null);
    const inputRef = useRef(null);
    const socketRef = useRef(null);
    const typingTimeout = useRef(null);

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
                {/* ── Header ─── */}
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
                    <div className="dm-header-hearts animate-pulse-heart">💕</div>
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
                                    const isMe = msg.senderId?._id === user?.id || msg.senderId === user?.id;
                                    return (
                                        <motion.div
                                            key={msg._id}
                                            className={`dm-bubble-wrap ${isMe ? 'dm-bubble-wrap--me' : ''}`}
                                            initial={{ opacity: 0, y: 12, scale: 0.92 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                                        >
                                            {!isMe && (
                                                <div className="dm-avatar-small">
                                                    {partner?.avatar || '💕'}
                                                </div>
                                            )}
                                            <div>
                                                <div className={`dm-bubble ${isMe ? 'dm-bubble--me' : 'dm-bubble--them'}`}>
                                                    {msg.message}
                                                </div>
                                                <div className={`dm-time ${isMe ? 'dm-time--me' : ''}`}>
                                                    {formatTime(msg.createdAt)}
                                                    {isMe && (
                                                        <span className="dm-read-status">
                                                            {msg.readStatus ? ' ✓✓' : ' ✓'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
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
        </div>
    );
}
