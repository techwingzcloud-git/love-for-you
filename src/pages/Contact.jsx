import { useState } from 'react';
import { motion } from 'framer-motion';
import HeartAnimation from '../components/HeartAnimation';
import './Contact.css';

const contactItems = [
    { icon: '📧', label: 'Email', value: 'loveforyou@sweetheart.com', href: 'mailto:loveforyou@sweetheart.com', color: '#ff85a9' },
    { icon: '📱', label: 'Phone', value: '+91 98765 43210', href: 'tel:+919876543210', color: '#c084fc' },
    { icon: '💌', label: 'Instagram', value: '@love.for.you', href: 'https://instagram.com', color: '#f472b6' },
    { icon: '🎵', label: 'Spotify', value: 'Our Playlist', href: 'https://spotify.com', color: '#a855f7' },
];

const socialLinks = [
    { icon: '📸', label: 'Instagram', href: 'https://instagram.com', color: '#e1306c' },
    { icon: '🐦', label: 'Twitter', href: 'https://twitter.com', color: '#1da1f2' },
    { icon: '📘', label: 'Facebook', href: 'https://facebook.com', color: '#4267b2' },
    { icon: '▶️', label: 'YouTube', href: 'https://youtube.com', color: '#ff0000' },
    { icon: '💬', label: 'WhatsApp', href: 'https://whatsapp.com', color: '#25d366' },
];

export default function Contact() {
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const [sent, setSent] = useState(false);

    const handleSubmit = e => {
        e.preventDefault();
        setSent(true);
    };

    return (
        <div className="contact page-wrapper bg-pink-dream">
            <HeartAnimation count={10} />

            <div className="contact__hero container">
                <motion.h1
                    className="heading-hero"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                >
                    Say Hello 💌
                </motion.h1>
                <motion.p
                    className="text-soft contact__sub"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    Every word from you is a gift. Reach out anytime — the door is always open.
                </motion.p>
            </div>

            <div className="contact__body container">
                {/* ── Contact cards ─── */}
                <motion.div
                    className="contact__cards"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.7 }}
                >
                    {contactItems.map((c, i) => (
                        <motion.a
                            key={i}
                            href={c.href}
                            className="contact__card card-soft"
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ y: -6, scale: 1.02, boxShadow: `0 14px 40px ${c.color}40` }}
                            whileTap={{ scale: 0.97 }}
                            style={{ '--c-color': c.color }}
                            id={`contact-card-${c.label.toLowerCase()}`}
                        >
                            <span className="contact__card-icon">{c.icon}</span>
                            <div>
                                <strong className="contact__card-label" style={{ color: c.color }}>{c.label}</strong>
                                <p className="contact__card-value">{c.value}</p>
                            </div>
                        </motion.a>
                    ))}
                </motion.div>

                <div className="contact__divider">
                    <span className="contact__divider-heart">💕</span>
                </div>

                {/* ── Social links ─── */}
                <motion.div
                    className="contact__social-section"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <h2 className="heading-script" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        Find Me Here 🌸
                    </h2>
                    <div className="contact__social-row">
                        {socialLinks.map((s, i) => (
                            <motion.a
                                key={i}
                                href={s.href}
                                className="social-pill"
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ scale: 1.1, y: -3 }}
                                whileTap={{ scale: 0.93 }}
                                style={{ '--s-color': s.color }}
                            >
                                <span>{s.icon}</span>
                                <span>{s.label}</span>
                            </motion.a>
                        ))}
                    </div>
                </motion.div>

                <div className="contact__divider">
                    <span className="contact__divider-heart">✨</span>
                </div>

                {/* ── Message form ─── */}
                {!sent ? (
                    <motion.form
                        className="contact__form card-soft"
                        onSubmit={handleSubmit}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <h2 className="heading-script" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                            Send a Love Note 💌
                        </h2>
                        <div className="contact__form-grid">
                            <div className="form-group">
                                <label htmlFor="contact-name">Your Name</label>
                                <input
                                    id="contact-name"
                                    type="text"
                                    placeholder="What shall I call you? 🌸"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="contact-email">Your Email</label>
                                <input
                                    id="contact-email"
                                    type="email"
                                    placeholder="your@email.com 💌"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label htmlFor="contact-msg">Your Message</label>
                            <textarea
                                id="contact-msg"
                                placeholder="Write something sweet… ✨"
                                rows={5}
                                value={form.message}
                                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                required
                            />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <motion.button
                                type="submit"
                                className="btn-primary"
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                id="contact-send-btn"
                            >
                                💌 Send with Love
                            </motion.button>
                        </div>
                    </motion.form>
                ) : (
                    <motion.div
                        className="contact__success card-soft"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 120 }}
                    >
                        <span className="contact__success-emoji animate-bounce">💕</span>
                        <h3 className="heading-script">Message Sent!</h3>
                        <p className="text-soft">Your love note is on its way. Thank you for reaching out — it means the world. 🌸</p>
                        <button className="btn-ghost" onClick={() => { setSent(false); setForm({ name: '', email: '', message: '' }); }}>
                            ✉️ Send Another
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
