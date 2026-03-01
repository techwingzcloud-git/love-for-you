import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import './Footer.css';

const scrollLinks = [
    { key: 'home', label: '🏠 Home' },
    { key: 'about', label: '💌 About' },
    { key: 'gallery', label: '📸 Gallery' },
    { key: 'memories', label: '🌸 Memories' },
    { key: 'surprise', label: '🎉 Surprise' },
];

export default function Footer({ scrollTo }) {
    const { isAuthenticated } = useAuth();
    const { getText } = useContent();
    const navigate = useNavigate();

    const footerText = getText('footer_text', 'Made with 💕 and infinite love · 2026');

    if (!isAuthenticated) return null;

    return (
        <footer className="footer" role="contentinfo">
            <div className="footer__inner container">
                <p className="footer__brand">
                    <span className="animate-pulse-heart">❤️</span>
                    &nbsp;{getText('navbar_brand', 'Love For You')}&nbsp;
                    <span className="animate-pulse-heart">❤️</span>
                </p>
                <nav className="footer__nav" aria-label="Footer navigation">
                    {scrollLinks.map(l => (
                        <button
                            key={l.key}
                            className="footer__link"
                            onClick={() => scrollTo(l.key)}
                        >
                            {l.label}
                        </button>
                    ))}
                    <button
                        className="footer__link footer__link--future"
                        onClick={() => navigate('/our-future')}
                    >
                        🔮 Future
                    </button>
                    <button
                        className="footer__link footer__link--dm"
                        onClick={() => navigate('/messages')}
                    >
                        💬 Messages
                    </button>
                </nav>
                <p className="footer__copy">
                    {footerText}
                </p>
            </div>
        </footer>
    );
}
