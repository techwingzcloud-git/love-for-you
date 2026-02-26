import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const scrollLinks = [
    { key: 'home', label: '🏠 Home' },
    { key: 'about', label: '💌 About' },
    { key: 'gallery', label: '📸 Gallery' },
    { key: 'memories', label: '🌸 Memories' },
    { key: 'surprise', label: '🎉 Surprise' },
];

export default function Navbar({ scrollTo, isMessagesPage }) {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [active, setActive] = useState('home');
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (isMessagesPage) return;
        const onScroll = () => {
            setScrolled(window.scrollY > 20);
            const sections = scrollLinks.map(l => document.getElementById(l.key));
            for (let i = sections.length - 1; i >= 0; i--) {
                const el = sections[i];
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (rect.top <= 120) {
                        setActive(scrollLinks[i].key);
                        break;
                    }
                }
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [isMessagesPage]);

    const handleClick = (key) => {
        setActive(key);
        setOpen(false);
        if (isMessagesPage) {
            navigate('/');
            // After navigation, scroll after a brief delay
            setTimeout(() => {
                document.getElementById(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        } else {
            scrollTo?.(key);
        }
    };

    const handleMessages = () => {
        setOpen(false);
        navigate('/messages');
    };

    const handleLogout = () => {
        setOpen(false);
        logout();
        navigate('/login');
    };

    if (!isAuthenticated) return null;

    return (
        <motion.nav
            className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}
            initial={{ y: -80 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            role="navigation"
            aria-label="Main navigation"
        >
            <div className="navbar__inner">
                <button
                    className="navbar__brand"
                    onClick={() => handleClick('home')}
                    aria-label="Love For You — Go to home"
                >
                    <span className="brand-heart animate-pulse-heart">❤️</span>
                    <span className="brand-text">Love For You</span>
                </button>

                <button
                    className="navbar__hamburger"
                    onClick={() => setOpen(v => !v)}
                    aria-label="Toggle menu"
                    aria-expanded={open}
                    id="navbar-hamburger"
                >
                    <span className={`ham-line ${open ? 'open' : ''}`} />
                    <span className={`ham-line ${open ? 'open' : ''}`} />
                    <span className={`ham-line ${open ? 'open' : ''}`} />
                </button>

                <ul className="navbar__links">
                    {scrollLinks.map(l => (
                        <li key={l.key}>
                            <button
                                className={`navbar__link ${!isMessagesPage && active === l.key ? 'navbar__link--active' : ''}`}
                                onClick={() => handleClick(l.key)}
                            >
                                {l.label}
                            </button>
                        </li>
                    ))}
                    <li>
                        <button
                            className={`navbar__link navbar__link--dm ${isMessagesPage ? 'navbar__link--active' : ''}`}
                            onClick={handleMessages}
                        >
                            💬 Messages
                        </button>
                    </li>
                    <li className="navbar__user-area">
                        <span className="navbar__avatar">{user?.avatar || '💕'}</span>
                        <button className="navbar__link navbar__link--logout" onClick={handleLogout}>
                            Logout
                        </button>
                    </li>
                </ul>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.ul
                        className="navbar__mobile-menu"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {scrollLinks.map(l => (
                            <li key={l.key}>
                                <button
                                    className={`navbar__link ${!isMessagesPage && active === l.key ? 'navbar__link--active' : ''}`}
                                    onClick={() => handleClick(l.key)}
                                >
                                    {l.label}
                                </button>
                            </li>
                        ))}
                        <li>
                            <button
                                className={`navbar__link navbar__link--dm ${isMessagesPage ? 'navbar__link--active' : ''}`}
                                onClick={handleMessages}
                            >
                                💬 Messages
                            </button>
                        </li>
                        <li className="navbar__mobile-user">
                            <span>{user?.avatar} {user?.name}</span>
                            <button className="btn-ghost navbar__logout-btn" onClick={handleLogout}>
                                🚪 Logout
                            </button>
                        </li>
                    </motion.ul>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}
