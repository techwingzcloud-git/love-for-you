import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContent } from '../context/ContentContext';
import './Gallery.css';

const DEFAULT_PHOTOS = [
    { src: 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=600&q=80', caption: 'Where it all began 🌸', category: 'moments' },
    { src: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80', caption: 'Dancing in the rain 🌧️', category: 'adventures' },
    { src: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80', caption: 'Your smile ✨', category: 'portraits' },
    { src: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=600&q=80', caption: 'Golden hour moments 🌅', category: 'moments' },
    { src: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=600&q=80', caption: 'Holding hands forever 🤝', category: 'moments' },
    { src: 'https://images.unsplash.com/photo-1516589091380-5d8e87df6999?w=600&q=80', caption: 'Starry night with you 🌠', category: 'adventures' },
    { src: 'https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=600&q=80', caption: 'Coffee & conversations ☕', category: 'dates' },
    { src: 'https://images.unsplash.com/photo-1488392359661-cd4e0f6963ba?w=600&q=80', caption: 'Cherry blossoms 🌸', category: 'moments' },
    { src: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=600&q=80', caption: 'Adventures ahead 🗺️', category: 'adventures' },
    { src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80', caption: 'Night drives together 🚗', category: 'dates' },
    { src: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&q=80', caption: 'Love in bloom 🌷', category: 'moments' },
    { src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80', caption: 'Your laughter 😄', category: 'portraits' },
];

const CATEGORIES = [
    { key: 'all', label: '💕 All' },
    { key: 'moments', label: '🌸 Moments' },
    { key: 'adventures', label: '🗺️ Adventures' },
    { key: 'dates', label: '☕ Dates' },
    { key: 'portraits', label: '✨ Portraits' },
];

const PREVIEW_COUNT = 6;

export default function Gallery() {
    const [expanded, setExpanded] = useState(false);
    const [lightbox, setLightbox] = useState(null);
    const [activeCategory, setActiveCategory] = useState('all');
    const { getText, getJSON } = useContent();

    const title = getText('gallery_title', 'Our Gallery 📸');
    const subtitle = getText('gallery_subtitle', 'Moments too beautiful to forget — each one a treasure.');
    const rawPhotos = getJSON('gallery_images', DEFAULT_PHOTOS);

    // Ensure each photo has a category (backwards-compat)
    const allPhotos = rawPhotos.map((p, i) => ({
        ...p,
        category: p.category || DEFAULT_PHOTOS[i % DEFAULT_PHOTOS.length]?.category || 'moments',
    }));

    const filteredPhotos = activeCategory === 'all'
        ? allPhotos
        : allPhotos.filter(p => p.category === activeCategory);

    const previewPhotos = filteredPhotos.slice(0, PREVIEW_COUNT);
    const morePhotos = filteredPhotos.slice(PREVIEW_COUNT);
    const hasMore = filteredPhotos.length > PREVIEW_COUNT;

    const handleCategoryChange = (cat) => {
        setActiveCategory(cat);
        setExpanded(false); // reset expand on filter switch
    };

    return (
        <div className="gallery page-wrapper bg-rose-dream">
            {/* ── Hero ─── */}
            <div className="gallery__hero container">
                <motion.h1
                    className="heading-hero"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                >
                    {title}
                </motion.h1>
                <motion.p
                    className="text-soft gallery__sub"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    {subtitle}
                </motion.p>
            </div>

            {/* ── Category Filter Navbar ─── */}
            <nav className="gallery__navbar" aria-label="Gallery filter">
                {CATEGORIES.map(cat => (
                    <motion.button
                        key={cat.key}
                        className={`gallery__navbar-btn${activeCategory === cat.key ? ' gallery__navbar-btn--active' : ''}`}
                        onClick={() => handleCategoryChange(cat.key)}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        aria-pressed={activeCategory === cat.key}
                        id={`gallery-filter-${cat.key}`}
                    >
                        {cat.label}
                    </motion.button>
                ))}
            </nav>

            {/* ── Photo Grid ─── */}
            <div className="gallery__grid container">
                <AnimatePresence initial={false}>
                    {/* Always-visible preview */}
                    {previewPhotos.map((photo, i) => (
                        <motion.div
                            key={photo.src + i}
                            className="gallery__item"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={{ delay: i * 0.06, duration: 0.45 }}
                            onClick={() => setLightbox(photo)}
                        >
                            <img src={photo.src} alt={photo.caption} loading="lazy" />
                            <div className="gallery__caption"><span>{photo.caption}</span></div>
                        </motion.div>
                    ))}

                    {/* Expanded section — same AnimatePresence pattern as About section */}
                    {expanded && morePhotos.map((photo, i) => (
                        <motion.div
                            key={photo.src + 'more' + i}
                            className="gallery__item"
                            initial={{ opacity: 0, scale: 0.88 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.88 }}
                            transition={{ delay: i * 0.07, duration: 0.45, type: 'spring', stiffness: 140 }}
                            onClick={() => setLightbox(photo)}
                        >
                            <img src={photo.src} alt={photo.caption} loading="lazy" />
                            <div className="gallery__caption"><span>{photo.caption}</span></div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Empty state */}
                {filteredPhotos.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#9b6b8a' }}
                    >
                        <span style={{ fontSize: '2.5rem' }}>📷</span>
                        <p style={{ marginTop: '0.6rem', fontSize: '0.9rem' }}>No photos in this category yet.</p>
                    </motion.div>
                )}
            </div>

            {/* ── "View More" — same style as About section ─── */}
            {hasMore && (
                <div className="view-more-wrapper">
                    <motion.button
                        className={expanded ? 'btn-ghost' : 'btn-primary'}
                        onClick={() => setExpanded(v => !v)}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        id="gallery-view-more-btn"
                    >
                        {expanded
                            ? '💨 Show Less'
                            : `📷 View More (${morePhotos.length} more)`}
                    </motion.button>
                </div>
            )}

            {/* ── Lightbox ─── */}
            <AnimatePresence>
                {lightbox && (
                    <motion.div
                        className="lightbox"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setLightbox(null)}
                    >
                        <motion.div
                            className="lightbox__inner"
                            initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 40 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <img src={lightbox.src} alt={lightbox.caption} />
                            <p className="lightbox__caption">{lightbox.caption}</p>
                            <button className="lightbox__close btn-ghost" onClick={() => setLightbox(null)}>✕ Close</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
