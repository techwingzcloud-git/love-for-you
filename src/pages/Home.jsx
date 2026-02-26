import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import HeartAnimation from '../components/HeartAnimation';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const taglines = [
    'Every moment with you is a poem 🌸',
    'You are my favourite daydream 💭',
    'In your arms, I found my home 🏡',
    'With you, every second sparkles ✨',
];

export default function Home({ scrollTo }) {
    const [tagline, setTagline] = useState(0);
    const { user } = useAuth();

    useEffect(() => {
        const timer = setInterval(() => {
            setTagline(i => (i + 1) % taglines.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="home page-wrapper bg-pink-dream">
            <HeartAnimation count={22} />

            <div className="home__hero flex-col-center container">
                <motion.div
                    className="home__badge"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, type: 'spring' }}
                >
                    💕 Welcome back, {user?.name || 'sweetheart'}
                </motion.div>

                <motion.h1
                    className="heading-hero home__title animate-glow"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    Love For You ❤️
                </motion.h1>

                <motion.div
                    key={tagline}
                    className="home__tagline"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.6 }}
                >
                    {taglines[tagline]}
                </motion.div>

                <motion.p
                    className="home__intro text-soft"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.9 }}
                >
                    This little corner of the internet was built with nothing but love,
                    late nights, and a heart full of you. Every pixel here whispers your
                    name. &nbsp;🌷
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1, type: 'spring', stiffness: 140 }}
                >
                    <button onClick={() => scrollTo('about')} className="btn-primary home__cta animate-bounce" id="start-journey-btn">
                        Start Our Journey 💕
                    </button>
                </motion.div>

                <motion.div
                    className="home__scroll-hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.6 }}
                >
                    ↓ scroll to discover ↓
                </motion.div>
            </div>

            {/* ── Feature cards — no Contact, no Letter (moved to Surprise) ── */}
            <motion.div
                className="home__cards container"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.8 }}
            >
                {[
                    { key: 'about', icon: '💌', title: 'Our Story', desc: 'How it all began…' },
                    { key: 'gallery', icon: '📸', title: 'Gallery', desc: 'Moments frozen in time' },
                    { key: 'memories', icon: '🌸', title: 'Memories', desc: 'Dates we\'ll never forget' },
                    { key: 'surprise', icon: '🎉', title: 'Surprise', desc: 'Something special awaits…' },
                ].map((c, i) => (
                    <button key={c.key} onClick={() => scrollTo(c.key)} className="home__card card-soft" id={`home-card-${i}`}>
                        <span className="home__card-icon animate-float">{c.icon}</span>
                        <strong>{c.title}</strong>
                        <span>{c.desc}</span>
                    </button>
                ))}
            </motion.div>
        </div>
    );
}
