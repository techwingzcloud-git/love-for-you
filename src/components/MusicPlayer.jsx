import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './MusicPlayer.css';

/* ─── Royalty-free romantic piano — served via free CDN ─── */
const TRACKS = [
    {
        label: 'Romantic Piano',
        /* Free audio from the Internet Archive / freely usable sources */
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    },
];

export default function MusicPlayer() {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(0.3);
    const [showVol, setShowVol] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = volume;
        audio.loop = true;
        const onCanPlay = () => setReady(true);
        audio.addEventListener('canplaythrough', onCanPlay);
        return () => audio.removeEventListener('canplaythrough', onCanPlay);
    }, []);

    const toggle = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (playing) {
            audio.pause();
            setPlaying(false);
        } else {
            audio.play().catch(() => { });
            setPlaying(true);
        }
    };

    const handleVolume = e => {
        const v = parseFloat(e.target.value);
        setVolume(v);
        if (audioRef.current) audioRef.current.volume = v;
    };

    return (
        <div className="music-player" id="music-player">
            <audio ref={audioRef} src={TRACKS[0].url} preload="auto" crossOrigin="anonymous" />

            <AnimatePresence>
                {showVol && (
                    <motion.div
                        className="volume-panel"
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 15 }}
                    >
                        <span className="vol-label">🎵 Volume</span>
                        <input
                            type="range"
                            min="0" max="1" step="0.05"
                            value={volume}
                            onChange={handleVolume}
                            className="vol-slider"
                            aria-label="Volume control"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                className="music-btn vol-btn"
                onClick={() => setShowVol(v => !v)}
                title="Volume"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                id="music-volume-btn"
            >
                🔊
            </motion.button>

            <motion.button
                className={`music-btn play-btn ${playing ? 'playing' : ''}`}
                onClick={toggle}
                title={playing ? 'Pause music' : 'Play music'}
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.88 }}
                id="music-toggle-btn"
            >
                {playing ? '⏸️' : '🎵'}
                <span className="music-label">
                    {playing ? 'Pause' : 'Music'}
                </span>
            </motion.button>
        </div>
    );
}
