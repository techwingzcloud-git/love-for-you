import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './LoveLetter.css';

const ALL_LINES = [
    'My Dearest Love,',
    '',
    'I have tried a thousand times to find the right words —',
    'words worthy of what you mean to me.',
    'None of them are quite enough.',
    '',
    'You are the reason mornings feel like magic.',
    'The reason I smile at absolutely nothing.',
    'The reason I believe in beautiful, impossible things.',
    '',
    'You walked into my life as if you had always belonged there,',
    'and quietly rearranged everything — in the most wonderful way.',
    '',
    'I love the way you laugh until your eyes crinkle.',
    'The way you say my name.',
    'The way you make the whole world feel softer somehow.',
    '',
    'If I could write a letter to the universe,',
    'I\'d simply say: "Thank you for giving me them."',
    '',
    'Forever and without conditions —',
    '',
    'Yours, completely. 💕',
];

const PREVIEW_LINE_COUNT = 6;
const SPARKLES = ['✨', '🌸', '💖', '⭐', '🌟', '💫', '🌷', '💕'];

export default function LoveLetter() {
    const [expanded, setExpanded] = useState(false);
    const [visibleLines, setVisibleLines] = useState(0);
    const [started, setStarted] = useState(false);
    const [sparkles, setSparkles] = useState([]);

    const activeLines = expanded ? ALL_LINES : ALL_LINES.slice(0, PREVIEW_LINE_COUNT);

    // type line by line — reset when expanded/collapsed
    useEffect(() => {
        if (!started) return;
        setVisibleLines(0);
    }, [expanded]);

    useEffect(() => {
        if (!started) return;
        if (visibleLines >= activeLines.length) return;
        const delay = activeLines[visibleLines] === '' ? 350 : 820;
        const t = setTimeout(() => setVisibleLines(v => v + 1), delay);
        return () => clearTimeout(t);
    }, [started, visibleLines, activeLines]);

    // sparkle generator
    useEffect(() => {
        const interval = setInterval(() => {
            const sp = { id: Date.now(), x: `${10 + Math.random() * 80}%`, y: `${10 + Math.random() * 80}%`, emoji: SPARKLES[Math.floor(Math.random() * SPARKLES.length)], duration: 1.2 + Math.random() };
            setSparkles(prev => [...prev.slice(-14), sp]);
        }, 700);
        return () => clearInterval(interval);
    }, []);

    const handleStart = () => {
        setStarted(true);
        setVisibleLines(0);
    };

    const handleToggle = () => {
        setExpanded(v => !v);
        setVisibleLines(0);
    };

    return (
        <div className="letter-page page-wrapper">
            <div className="letter-sparkles" aria-hidden="true">
                {sparkles.map(sp => (
                    <motion.span
                        key={sp.id}
                        className="letter-sparkle"
                        style={{ left: sp.x, top: sp.y, fontSize: `${0.9 + Math.random()}rem` }}
                        initial={{ opacity: 0, scale: 0, rotate: 0 }}
                        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0], rotate: 180 }}
                        transition={{ duration: sp.duration }}
                    >
                        {sp.emoji}
                    </motion.span>
                ))}
            </div>

            <div className="letter-wrapper container">
                <motion.div
                    className="letter-card"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, type: 'spring', stiffness: 90 }}
                >
                    <div className="letter-ribbon">✉️ A letter from the heart</div>

                    <div className="letter-lines">
                        {activeLines.slice(0, visibleLines).map((line, i) => (
                            <motion.p
                                key={`${expanded}-${i}`}
                                className={`letter-line ${line === '' ? 'letter-line--empty' : ''} ${i === 0 ? 'letter-line--greeting' : ''} ${i === ALL_LINES.length - 1 && expanded ? 'letter-line--sign' : ''}`}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                {line}
                            </motion.p>
                        ))}

                        {visibleLines < activeLines.length && started && (
                            <span className="letter-cursor" aria-hidden="true">|</span>
                        )}

                        {/* Preview fade indicator */}
                        {!expanded && visibleLines >= PREVIEW_LINE_COUNT && (
                            <div className="letter-fade-hint">…</div>
                        )}
                    </div>

                    {!started ? (
                        <motion.button className="btn-primary letter-start-btn" id="read-letter-btn" onClick={handleStart} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
                            ✉️ Read the Letter
                        </motion.button>
                    ) : (
                        <div className="letter-actions">
                            <motion.button
                                className={expanded ? 'btn-ghost' : 'btn-primary'}
                                onClick={handleToggle}
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                id="letter-view-more-btn"
                            >
                                {expanded ? '💨 Show Less' : '❤️ View Full Letter'}
                            </motion.button>
                        </div>
                    )}

                    {expanded && visibleLines >= ALL_LINES.length && (
                        <motion.p className="letter-done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                            💕 Written with every piece of my heart 💕
                        </motion.p>
                    )}

                    <div className="letter-footer">
                        <span className="letter-seal animate-pulse-heart">💌</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
