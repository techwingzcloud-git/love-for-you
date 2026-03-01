import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { publicApi } from '../api/messageApi';
import HeartAnimation from '../components/HeartAnimation';
import './OurFuture.css';

const TYPE_META = {
    game: { label: 'Games', icon: '🎯', color: '#ff85a9', bg: 'rgba(255, 133, 169, 0.08)' },
    dare: { label: 'Love Dares', icon: '💪', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.08)' },
    surprise: { label: 'Surprises', icon: '🎁', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
};

export default function OurFuture() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        const loadItems = async () => {
            try {
                const { data } = await publicApi.getFuture();
                setItems(data);
            } catch {
                // silently fail
            } finally {
                setLoading(false);
            }
        };
        loadItems();
    }, []);

    const filteredItems = activeFilter === 'all'
        ? items
        : items.filter(item => item.type === activeFilter);

    const typeCounts = {
        all: items.length,
        game: items.filter(i => i.type === 'game').length,
        dare: items.filter(i => i.type === 'dare').length,
        surprise: items.filter(i => i.type === 'surprise').length,
    };

    if (loading) {
        return (
            <div className="future-page page-wrapper bg-pink-dream flex-col-center">
                <div className="messages-loading">
                    <span className="animate-pulse-heart" style={{ fontSize: '2.5rem' }}>🔮</span>
                    <p className="text-soft">Loading our future…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="future-page page-wrapper bg-pink-dream">
            <HeartAnimation count={10} />

            <div className="future-container container">
                {/* ── Header ─── */}
                <div className="future-header">
                    <button className="dm-back" onClick={() => navigate('/')} aria-label="Go back">
                        ← Back
                    </button>
                    <motion.h1
                        className="heading-hero future-title"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        Our Future 🔮
                    </motion.h1>
                    <motion.p
                        className="text-soft future-subtitle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        Adventures, games, dares, and surprises that await us. Our story has endless chapters! 💕
                    </motion.p>
                </div>

                {/* ── Filter tabs ─── */}
                <div className="future-filters">
                    {[
                        { key: 'all', label: '✨ All' },
                        { key: 'game', label: '🎯 Games' },
                        { key: 'dare', label: '💪 Dares' },
                        { key: 'surprise', label: '🎁 Surprises' },
                    ].map(f => (
                        <button
                            key={f.key}
                            className={`future-filter ${activeFilter === f.key ? 'future-filter--active' : ''}`}
                            onClick={() => setActiveFilter(f.key)}
                        >
                            {f.label}
                            <span className="future-filter__count">{typeCounts[f.key]}</span>
                        </button>
                    ))}
                </div>

                {/* ── Items grid ─── */}
                <div className="future-grid">
                    <AnimatePresence mode="popLayout">
                        {filteredItems.map((item, i) => {
                            const meta = TYPE_META[item.type] || TYPE_META.game;
                            const isExpanded = expandedId === item._id;

                            return (
                                <motion.div
                                    key={item._id}
                                    className={`future-card card-soft ${isExpanded ? 'future-card--expanded' : ''}`}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: i * 0.05, duration: 0.4 }}
                                    whileHover={{ y: -4, boxShadow: '0 10px 35px rgba(232, 62, 108, 0.15)' }}
                                    onClick={() => setExpandedId(isExpanded ? null : item._id)}
                                    style={{ cursor: 'pointer' }}
                                    layout
                                >
                                    <div className="future-card__header">
                                        <span className="future-card__emoji">{item.emoji}</span>
                                        <div className="future-card__meta">
                                            <span
                                                className="future-card__type"
                                                style={{ color: meta.color, background: meta.bg }}
                                            >
                                                {meta.icon} {meta.label}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="future-card__title">{item.title}</h3>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="future-card__body"
                                            >
                                                <p className="text-soft">{item.description}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <span className="future-card__expand-hint">
                                        {isExpanded ? '▲ Less' : '▼ More'}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {filteredItems.length === 0 && (
                    <div className="future-empty">
                        <span style={{ fontSize: '2.5rem' }}>🔮</span>
                        <p className="text-soft">No items in this category yet. Our future is still being written! 💕</p>
                    </div>
                )}
            </div>
        </div>
    );
}
