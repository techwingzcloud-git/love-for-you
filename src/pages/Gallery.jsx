import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContent } from '../context/ContentContext';
import './Gallery.css';

const DEFAULT_PHOTOS = [
    { src: 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=600&q=80', caption: 'Where it all began 🌸' },
    { src: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80', caption: 'Dancing in the rain 🌧️' },
    { src: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80', caption: 'Your smile ✨' },
    { src: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=600&q=80', caption: 'Golden hour moments 🌅' },
    { src: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=600&q=80', caption: 'Holding hands forever 🤝' },
    { src: 'https://images.unsplash.com/photo-1516589091380-5d8e87df6999?w=600&q=80', caption: 'Starry night with you 🌠' },
    { src: 'https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=600&q=80', caption: 'Coffee & conversations ☕' },
    { src: 'https://images.unsplash.com/photo-1488392359661-cd4e0f6963ba?w=600&q=80', caption: 'Cherry blossoms 🌸' },
    { src: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=600&q=80', caption: 'Adventures ahead 🗺️' },
    { src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80', caption: 'Night drives together 🚗' },
    { src: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&q=80', caption: 'Love in bloom 🌷' },
    { src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80', caption: 'Your laughter 😄' },
];

const PREVIEW_COUNT = 6;

export default function Gallery() {
    const [expanded, setExpanded] = useState(false);
    const [lightbox, setLightbox] = useState(null);
    const { getText, getJSON } = useContent();

    const title = getText('gallery_title', 'Our Gallery 📸');
    const subtitle = getText('gallery_subtitle', 'Moments too beautiful to forget — each one a treasure.');
    const allPhotos = getJSON('gallery_images', DEFAULT_PHOTOS);

    const displayed = expanded ? allPhotos : allPhotos.slice(0, PREVIEW_COUNT);

    return (
        <div className="gallery page-wrapper bg-rose-dream">
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

            <div className="gallery__grid container">
                <AnimatePresence>
                    {displayed.map((photo, i) => (
                        <motion.div
                            key={photo.src + i}
                            className="gallery__item"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={{ delay: i < PREVIEW_COUNT ? i * 0.06 : (i - PREVIEW_COUNT) * 0.07, duration: 0.5 }}
                            onClick={() => setLightbox(photo)}
                        >
                            <img src={photo.src} alt={photo.caption} loading="lazy" />
                            <div className="gallery__caption"><span>{photo.caption}</span></div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {allPhotos.length > PREVIEW_COUNT && (
                <div className="view-more-wrapper container">
                    <motion.button
                        className={expanded ? 'btn-ghost' : 'btn-primary'}
                        onClick={() => setExpanded(v => !v)}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        id="gallery-view-more-btn"
                    >
                        {expanded ? '💨 Show Less' : `❤️ View More (${allPhotos.length - PREVIEW_COUNT} more)`}
                    </motion.button>
                </div>
            )}

            {/* ── Lightbox ─── */}
            <AnimatePresence>
                {lightbox && (
                    <motion.div
                        className="lightbox"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightbox(null)}
                    >
                        <motion.div
                            className="lightbox__inner"
                            initial={{ scale: 0.8, y: 40 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 40 }}
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
