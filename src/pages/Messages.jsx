import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { messagesApi, authApi, SOCKET_URL } from '../api/messageApi';
import './Messages.css';

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
    const endRef = useRef(null);
    const inputRef = useRef(null);
    const socketRef = useRef(null);
    const typingTimeout = useRef(null);

    // Scroll to bottom
    const scrollToBottom = useCallback(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
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
                // Mark messages as read
                await messagesApi.markRead().catch(() => { });
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load messages. Make sure the server is running.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Socket.IO connection
    useEffect(() => {
        const token = localStorage.getItem('lfyToken');
        if (!token) return;

        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('💬 Connected to chat');
        });

        socket.on('message:receive', (message) => {
            setMessages(prev => [...prev, message]);
            // Mark as read immediately
            messagesApi.markRead().catch(() => { });
        });

        socket.on('typing:show', () => setIsTyping(true));
        socket.on('typing:hide', () => setIsTyping(false));

        socket.on('user:online', ({ userId, online }) => {
            if (userId !== user?.id) {
                setPartnerOnline(online);
            }
        });

        socket.on('connect_error', () => {
            console.log('Socket connection failed — real-time disabled');
        });

        return () => {
            socket.disconnect();
        };
    }, [user?.id]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const sendMessage = async () => {
        const text = inputVal.trim();
        if (!text || !partner) return;

        try {
            const { data } = await messagesApi.send(partner.id, text);
            setMessages(prev => [...prev, data]);
            setInputVal('');
            inputRef.current?.focus();

            // Emit via socket for real-time
            socketRef.current?.emit('message:send', {
                receiverId: partner.id,
                message: data,
            });
        } catch (err) {
            setError('Failed to send message.');
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
                    <span className="animate-pulse-heart" style={{ fontSize: '3rem' }}>💬</span>
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
                            <span style={{ fontSize: '3rem' }}>💌</span>
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
                                            initial={{ opacity: 0, y: 16, scale: 0.9 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 160, damping: 20 }}
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
                        disabled={!inputVal.trim()}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label="Send message"
                    >
                        💌 Send
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
