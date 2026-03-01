import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContent } from '../context/ContentContext';
import './Memories.css';

const DEFAULT_MEMORIES = [
    { date: 'The First Hello', emoji: '👋', color: '#ffdce8', border: '#ff85a9', title: 'It Started With a Smile', desc: 'A nervous smile, a bold hello — and suddenly the world felt different.' },
    { date: 'First Coffee Date', emoji: '☕', color: '#f0e6ff', border: '#c084fc', title: 'Two Hours That Felt Like Minutes', desc: 'We talked about everything and nothing. The coffee went cold.' },
    { date: 'First Movie Night', emoji: '🍿', color: '#fff0f5', border: '#ff85a9', title: 'We Barely Watched the Movie', desc: 'Blanket forts, terrible popcorn, and so much laughter.' },
    { date: 'First "I Love You"', emoji: '❤️', color: '#ffdce8', border: '#e83e6c', title: 'Three Words, Infinite Weight', desc: 'It slipped out quietly, somewhere between a laugh and a breath.' },
    { date: 'Our First Trip', emoji: '✈️', color: '#f0e6ff', border: '#a855f7', title: 'Adventures With You Are Home', desc: 'New city, new memories, same goofy us.' },
    { date: 'Today & Always', emoji: '🌟', color: '#fff0f5', border: '#ffb3cc', title: 'Every Day With You', desc: 'The story is still being written. Here\'s to forever. 💕' },
];

const PREVIEW_COUNT = 3;

export default function Memories() {
    const [expanded, setExpanded] = useState(false);
    const { getText, getJSON } = useContent();

    const title = getText('memories_title', 'Our Memories 🌸');
    const subtitle = getText('memories_subtitle', 'A timeline of the moments that stitched our hearts together.');
    const allMemories = getJSON('memories_items', DEFAULT_MEMORIES);

    const displayed = expanded ? allMemories : allMemories.slice(0, PREVIEW_COUNT);

    return (
        <div className="memories page-wrapper bg-pink-dream">
            <div className="memories__hero container">
                <motion.h1
                    className="heading-hero"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                >
                    {title}
                </motion.h1>
                <motion.p
                    className="text-soft memories__sub"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                >
                    {subtitle}
                </motion.p>
            </div>

            <div className="timeline container">
                <AnimatePresence>
                    {displayed.map((m, i) => (
                        <motion.div
                            key={m.date}
                            className={`timeline__item ${i % 2 === 0 ? 'timeline__item--left' : 'timeline__item--right'}`}
                            initial={{ opacity: 0, x: i % 2 === 0 ? -60 : 60 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.6, delay: i < PREVIEW_COUNT ? 0.1 : 0 }}
                        >
                            <div className="timeline__dot" style={{ borderColor: m.border }}>
                                <span className="animate-pulse-heart">{m.emoji}</span>
                            </div>
                            <div
                                className="timeline__card card-soft"
                                style={{ background: m.color, borderColor: m.border }}
                            >
                                <span className="timeline__date" style={{ color: m.border }}>{m.date}</span>
                                <h3 className="timeline__title">{m.title}</h3>
                                <p className="text-soft">{m.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                <div className="timeline__line" />
            </div>

            <div className="view-more-wrapper container" style={{ marginTop: '0', paddingBottom: '4rem' }}>
                <motion.button
                    className={expanded ? 'btn-ghost' : 'btn-primary'}
                    onClick={() => setExpanded(v => !v)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    id="memories-view-more-btn"
                >
                    {expanded ? '💨 Show Less' : '❤️ View More Memories'}
                </motion.button>
            </div>
        </div>
    );
}
