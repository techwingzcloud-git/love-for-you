import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HeartAnimation from '../components/HeartAnimation';
import { useContent } from '../context/ContentContext';
import './About.css';

const DEFAULT_BLOCKS = [
    { side: 'left', emoji: '🌷', title: 'How It Began', text: 'It started with something so simple — a glance, a smile, a "hey". Neither of us knew that tiny moment would change everything.' },
    { side: 'right', emoji: '💫', title: 'Falling Together', text: 'We fell slowly, then all at once. Long late-night calls, silly memes, inside jokes that no one else would understand.' },
    { side: 'left', emoji: '🌸', title: 'What You Mean to Me', text: 'You are the calm in my storm, the answer to questions I hadn\'t yet asked.' },
    { side: 'right', emoji: '❤️', title: 'Our Future', text: 'Adventures unplanned, sunsets unshared, laughter yet to echo — so much still to come.' },
];

const DEFAULT_MILESTONES = [
    { icon: '👀', date: 'Day One', text: 'The moment our eyes met — the world slowed down.' },
    { icon: '💬', date: 'First Texts', text: 'Messages that started casual and turned into something magical.' },
    { icon: '☕', date: 'First Meet', text: 'A Sodabottle and waterbottle that smiles wouldn\'t stop.' },
    { icon: '🤝', date: 'Together', text: 'We decided to be each other\'s person — forever.' },
    { icon: '🌟', date: 'Every Day', text: 'And every single day since then has been a blessing.' },
];

const expandVariants = {
    hidden: { opacity: 0, height: 0, overflow: 'hidden' },
    visible: { opacity: 1, height: 'auto', overflow: 'visible', transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
    exit: { opacity: 0, height: 0, overflow: 'hidden', transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
};

export default function About() {
    const [expanded, setExpanded] = useState(false);
    const { getText, getJSON } = useContent();

    const title = getText('about_title', 'Our Love Story 💕');
    const subtitle = getText('about_subtitle', 'Every great love story has a beginning. Here\'s ours — clumsy, beautiful, and completely unforgettable.');
    const allBlocks = getJSON('about_blocks', DEFAULT_BLOCKS);
    const milestones = getJSON('about_milestones', DEFAULT_MILESTONES);

    const previewBlocks = allBlocks.slice(0, 2);
    const moreBlocks = allBlocks.slice(2);

    return (
        <div className="about page-wrapper bg-lav-dream">
            <HeartAnimation count={12} />

            <div className="about__hero container">
                <motion.span className="about__sparkle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>✨</motion.span>
                <motion.h1
                    className="heading-hero"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                >
                    {title}
                </motion.h1>
                <motion.p
                    className="text-soft about__sub"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                >
                    {subtitle}
                </motion.p>
            </div>

            <div className="about__content container">
                <div className="about__story">
                    {/* ── Always-visible preview blocks ─── */}
                    {previewBlocks.map((s, i) => (
                        <motion.div
                            key={i}
                            className={`about__block about__block--${s.side} card-soft`}
                            initial={{ opacity: 0, x: s.side === 'left' ? -50 : 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.65, delay: i * 0.12 }}
                        >
                            <span className="about__block-emoji animate-float">{s.emoji}</span>
                            <div>
                                <h3 className="about__block-title">{s.title}</h3>
                                <p className="text-soft">{s.text}</p>
                            </div>
                        </motion.div>
                    ))}

                    {/* ── Expandable section ─── */}
                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                variants={expandVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="about__expand-section"
                            >
                                {moreBlocks.map((s, i) => (
                                    <div
                                        key={i}
                                        className={`about__block about__block--${s.side} card-soft`}
                                        style={{ marginBottom: '1.5rem' }}
                                    >
                                        <span className="about__block-emoji animate-float">{s.emoji}</span>
                                        <div>
                                            <h3 className="about__block-title">{s.title}</h3>
                                            <p className="text-soft">{s.text}</p>
                                        </div>
                                    </div>
                                ))}

                                {/* Milestones inside expanded section */}
                                <div className="about__milestones">
                                    <h2 className="heading-script" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                        Milestones 🌟
                                    </h2>
                                    <div className="about__milestone-grid">
                                        {milestones.map((m, i) => (
                                            <motion.div
                                                key={i}
                                                className="milestone-card card-soft"
                                                initial={{ opacity: 0, scale: 0.85 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * 0.08, type: 'spring', stiffness: 120 }}
                                                whileHover={{ y: -6, boxShadow: '0 12px 40px rgba(232,62,108,0.2)' }}
                                            >
                                                <span className="milestone-icon animate-pulse-heart">{m.icon}</span>
                                                <strong className="milestone-date">{m.date}</strong>
                                                <p className="text-soft milestone-text">{m.text}</p>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Toggle button ─── */}
                    <div className="view-more-wrapper">
                        <motion.button
                            className={expanded ? 'btn-ghost' : 'btn-primary'}
                            onClick={() => setExpanded(v => !v)}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            id="about-view-more-btn"
                        >
                            {expanded ? '💨 Show Less' : '❤️ View More'}
                        </motion.button>
                    </div>
                </div>
            </div>
        </div>
    );
}
