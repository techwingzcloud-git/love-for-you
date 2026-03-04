import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContent } from '../context/ContentContext';
import './Surprise.css';

const CHAR_EMOJIS = ['❤️', '💕', '🩷', '💖', '💗', '🌸', '✨', '💫', '🌷', '🎉', '🎊', '⭐'];
const SPARKLES = ['✨', '🌸', '💖', '⭐', '🌟', '💫', '🌷', '💕'];

const DEFAULT_LETTER = [
    'My Dearest Love,', '',
    'I have tried a thousand times to find the right words —',
    'words worthy of what you mean to me.',
    'None of them are quite enough.', '',
    'You are the reason mornings feel like magic.',
    'The reason I smile at absolutely nothing.',
    'The reason I believe in beautiful, impossible things.', '',
    'You walked into my life as if you had always belonged there,',
    'and quietly rearranged everything — in the most wonderful way.', '',
    'I love the way you laugh until your eyes crinkle.',
    'The way you say my name.',
    'The way you make the whole world feel softer somehow.', '',
    'If I could write a letter to the universe,',
    'I\'d simply say: "Thank you for giving me them."', '',
    'Forever and without conditions —', '',
    'Yours, completely. 💕',
];

function generateConfetti(count = 80) {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: `${Math.random() * 100}vw`,
        emoji: CHAR_EMOJIS[Math.floor(Math.random() * CHAR_EMOJIS.length)],
        size: `${1 + Math.random() * 1.8}rem`,
        delay: `${Math.random() * 3}s`,
        duration: `${3 + Math.random() * 4}s`,
    }));
}

export default function Surprise({ scrollTo }) {
    const [confetti] = useState(() => generateConfetti(80));
    const [showMsg, setShowMsg] = useState(false);
    const [heartBurst, setHeartBurst] = useState(false);
    const [showLetter, setShowLetter] = useState(false);
    const [visibleLines, setVisibleLines] = useState(0);
    const [letterStarted, setLetterStarted] = useState(false);
    const [sparkles, setSparkles] = useState([]);
    const { getText, getJSON } = useContent();

    const surpriseTitle = getText('surprise_title', 'Our forever is just beginning… ❤️');
    const surpriseMessage = getText('surprise_message', 'No matter how many pages, songs, or years pass — I will choose you every single time. You are my beginning, my middle, and every beautiful ending I dare to imagine. This isn\'t just a website. This is my heart, dressed up in pixels, whispering: I love you.');
    const letterLines = getJSON('letter_content', DEFAULT_LETTER);

    useEffect(() => {
        const t1 = setTimeout(() => setShowMsg(true), 500);
        const t2 = setTimeout(() => setHeartBurst(true), 1000);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    // Letter typewriter effect
    useEffect(() => {
        if (!letterStarted) return;
        if (visibleLines >= letterLines.length) return;
        const delay = letterLines[visibleLines] === '' ? 350 : 750;
        const t = setTimeout(() => setVisibleLines(v => v + 1), delay);
        return () => clearTimeout(t);
    }, [letterStarted, visibleLines, letterLines]);

    // Sparkle generator for letter
    useEffect(() => {
        if (!showLetter) return;
        const interval = setInterval(() => {
            const sp = {
                id: Date.now(),
                x: `${10 + Math.random() * 80}%`,
                y: `${10 + Math.random() * 80}%`,
                emoji: SPARKLES[Math.floor(Math.random() * SPARKLES.length)],
                duration: 1.2 + Math.random(),
            };
            setSparkles(prev => [...prev.slice(-14), sp]);
        }, 700);
        return () => clearInterval(interval);
    }, [showLetter]);

    const handleReadLetter = () => {
        setShowLetter(true);
        setVisibleLines(0);
        setLetterStarted(true);
    };

    const handleCloseLetter = () => {
        setShowLetter(false);
        setLetterStarted(false);
        setVisibleLines(0);
    };

    return (
        <div className="surprise page-wrapper bg-pink-dream">
            {/* ── Confetti ─── */}
            <div className="surprise-confetti" aria-hidden="true">
                {confetti.map(c => (
                    <span
                        key={c.id}
                        className="confetti-piece"
                        style={{
                            left: c.x,
                            fontSize: c.size,
                            animationDelay: c.delay,
                            animationDuration: c.duration,
                        }}
                    >
                        {c.emoji}
                    </span>
                ))}
            </div>

            <div className="surprise__content flex-col-center container">
                <motion.div
                    className={`surprise__big-heart ${heartBurst ? 'heart-burst' : ''}`}
                    animate={heartBurst
                        ? { scale: [1, 1.4, 1.15, 1.3, 1], rotate: [0, -8, 8, -4, 0] }
                        : {}
                    }
                    transition={{ duration: 1, type: 'spring' }}
                >
                    ❤️
                </motion.div>

                {showMsg && (
                    <>
                        <motion.p
                            className="surprise__intro"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7 }}
                        >
                            You made it to the end 🎉
                        </motion.p>

                        <motion.h1
                            className="heading-hero surprise__heading animate-glow"
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.25, type: 'spring', stiffness: 100 }}
                        >
                            {surpriseTitle}
                        </motion.h1>

                        <motion.p
                            className="surprise__message text-soft"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.55, duration: 0.8 }}
                        >
                            {surpriseMessage}
                        </motion.p>

                        <motion.div
                            className="surprise__hearts-row"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.9 }}
                        >
                            {['💖', '🌸', '💕', '✨', '💗', '🌷', '💫', '❤️'].map((e, i) => (
                                <motion.span
                                    key={i}
                                    className="surprise__heart-item"
                                    animate={{ y: [0, -14, 0] }}
                                    transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
                                >
                                    {e}
                                </motion.span>
                            ))}
                        </motion.div>

                        <motion.div
                            className="surprise__buttons"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.2 }}
                        >
                            <button onClick={handleReadLetter} className="btn-primary" id="read-letter-btn">
                                ✉️ Read the Love Letter
                            </button>
                            <button onClick={() => scrollTo('home')} className="btn-ghost" id="back-home-btn">
                                🏠 Back to Top
                            </button>
                        </motion.div>
                    </>
                )}
            </div>

            {/* ── Love Letter overlay ─── */}
            <AnimatePresence>
                {showLetter && (
                    <motion.div
                        className="letter-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {/* Sparkles */}
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

                        <motion.div
                            className="letter-card"
                            initial={{ opacity: 0, y: 60, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 60, scale: 0.9 }}
                            transition={{ duration: 0.6, type: 'spring', stiffness: 80 }}
                        >
                            <button className="letter-close" onClick={handleCloseLetter} aria-label="Close letter">
                                ✕
                            </button>
                            <div className="letter-ribbon">✉️ A letter from the heart</div>

                            <div className="letter-lines">
                                {letterLines.slice(0, visibleLines).map((line, i) => (
                                    <motion.p
                                        key={i}
                                        className={`letter-line ${line === '' ? 'letter-line--empty' : ''} ${i === 0 ? 'letter-line--greeting' : ''} ${i === letterLines.length - 1 ? 'letter-line--sign' : ''}`}
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.4 }}
                                    >
                                        {line}
                                    </motion.p>
                                ))}

                                {visibleLines < letterLines.length && letterStarted && (
                                    <span className="letter-cursor" aria-hidden="true">|</span>
                                )}
                            </div>

                            {visibleLines >= letterLines.length && (
                                <motion.p
                                    className="letter-done"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    💕 Written with every piece of my heart 💕
                                </motion.p>
                            )}

                            <div className="letter-footer">
                                <span className="letter-seal animate-pulse-heart">💌</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
