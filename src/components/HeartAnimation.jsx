import { useMemo } from 'react';
import './HeartAnimation.css';

const HEART_EMOJIS = ['❤️', '🩷', '💕', '💖', '💗', '💓', '🌸', '✨'];

export default function HeartAnimation({ count = 18 }) {
    const hearts = useMemo(() =>
        Array.from({ length: count }, (_, i) => ({
            id: i,
            left: `${Math.random() * 96}%`,
            size: `${1 + Math.random() * 2.2}rem`,
            delay: `${Math.random() * 8}s`,
            duration: `${7 + Math.random() * 9}s`,
            emoji: HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)],
        })),
        [count]);

    return (
        <div className="hearts-bg" aria-hidden="true">
            {hearts.map(h => (
                <span
                    key={h.id}
                    className="heart-particle"
                    style={{
                        left: h.left,
                        fontSize: h.size,
                        animationDelay: h.delay,
                        animationDuration: h.duration,
                    }}
                >
                    {h.emoji}
                </span>
            ))}
        </div>
    );
}
