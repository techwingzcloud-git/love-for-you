import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import { contentApi } from '../api/messageApi';
import './AdminPanel.css';

const TABS = [
    { key: 'text', label: '✏️ Text Content', icon: '✏️' },
    { key: 'structured', label: '📋 Sections', icon: '📋' },
    { key: 'future', label: '🔮 Our Future', icon: '🔮' },
    { key: 'images', label: '📸 Images', icon: '📸' },
];

// Simple text fields — direct key-value editing
const TEXT_FIELDS = [
    { key: 'navbar_brand', label: 'Navbar Brand Name', type: 'text' },
    { key: 'home_title', label: 'Home Page Title', type: 'text' },
    { key: 'home_subtitle', label: 'Home Page Subtitle', type: 'textarea' },
    { key: 'home_cta', label: 'Home CTA Button Text', type: 'text' },
    { key: 'about_title', label: 'About Section Title', type: 'text' },
    { key: 'about_subtitle', label: 'About Section Subtitle', type: 'textarea' },
    { key: 'gallery_title', label: 'Gallery Title', type: 'text' },
    { key: 'gallery_subtitle', label: 'Gallery Subtitle', type: 'textarea' },
    { key: 'memories_title', label: 'Memories Title', type: 'text' },
    { key: 'memories_subtitle', label: 'Memories Subtitle', type: 'textarea' },
    { key: 'surprise_title', label: 'Surprise Page Title', type: 'text' },
    { key: 'surprise_subtitle', label: 'Surprise Page Subtitle', type: 'textarea' },
    { key: 'surprise_message', label: 'Surprise Full Message', type: 'textarea' },
    { key: 'footer_text', label: 'Footer Text', type: 'text' },
];

// JSON/structured fields
const STRUCTURED_FIELDS = [
    { key: 'home_taglines', label: 'Home Taglines (JSON array of strings)', type: 'textarea-large' },
    { key: 'home_cards', label: 'Home Feature Cards (JSON array)', type: 'textarea-large' },
    { key: 'letter_content', label: 'Love Letter Lines (JSON array of strings)', type: 'textarea-large' },
    { key: 'about_blocks', label: 'About Story Blocks (JSON array)', type: 'textarea-large' },
    { key: 'about_milestones', label: 'About Milestones (JSON array)', type: 'textarea-large' },
    { key: 'gallery_images', label: 'Gallery Images (JSON array with src & caption)', type: 'textarea-large' },
    { key: 'memories_items', label: 'Memories Timeline Items (JSON array)', type: 'textarea-large' },
];

export default function AdminPanel() {
    const { user } = useAuth();
    const { refresh } = useContent();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('text');
    const [editValues, setEditValues] = useState({});
    const [futureItems, setFutureItems] = useState([]);
    const [saving, setSaving] = useState({});
    const [saved, setSaved] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // New future item form
    const [newFuture, setNewFuture] = useState({ type: 'game', title: '', description: '', emoji: '✨' });

    // Load content
    const loadContent = useCallback(async () => {
        try {
            setLoading(true);
            const [contentRes, futureRes] = await Promise.all([
                contentApi.getAll(),
                contentApi.getFuture(),
            ]);
            const contentData = contentRes.data;
            // Initialize edit values from the content map
            const values = {};
            Object.entries(contentData).forEach(([key, item]) => {
                values[key] = item.value || '';
            });
            setEditValues(values);
            setFutureItems(futureRes.data);
        } catch {
            setError('Failed to load content. Make sure you are logged in as admin.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user?.role !== 'admin') {
            navigate('/');
            return;
        }
        loadContent();
    }, [user, navigate, loadContent]);

    // Save a text field
    const saveField = async (key) => {
        try {
            setSaving(prev => ({ ...prev, [key]: true }));
            await contentApi.update(key, editValues[key] || '');
            setSaved(prev => ({ ...prev, [key]: true }));
            refresh(); // Refresh content context so all pages update
            setTimeout(() => setSaved(prev => ({ ...prev, [key]: false })), 2000);
        } catch {
            setError(`Failed to save ${key}`);
        } finally {
            setSaving(prev => ({ ...prev, [key]: false }));
        }
    };

    // Upload image
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const { data } = await contentApi.upload(formData);
            setSuccess(`Image uploaded! URL: ${data.url}`);
            setTimeout(() => setSuccess(''), 5000);
        } catch {
            setError('Failed to upload image.');
        }
    };

    // Add future item
    const addFutureItem = async () => {
        if (!newFuture.title.trim()) {
            setError('Title is required.');
            return;
        }
        try {
            const { data } = await contentApi.addFuture(newFuture);
            setFutureItems(prev => [...prev, data]);
            setNewFuture({ type: 'game', title: '', description: '', emoji: '✨' });
            setSuccess('Future item added!');
            setTimeout(() => setSuccess(''), 3000);
        } catch {
            setError('Failed to add future item.');
        }
    };

    // Toggle future item enabled/disabled
    const toggleFutureItem = async (id, enabled) => {
        try {
            await contentApi.updateFuture(id, { enabled: !enabled });
            setFutureItems(prev => prev.map(item =>
                item._id === id ? { ...item, enabled: !enabled } : item
            ));
        } catch {
            setError('Failed to update item.');
        }
    };

    // Delete future item
    const deleteFutureItem = async (id) => {
        try {
            await contentApi.deleteFuture(id);
            setFutureItems(prev => prev.filter(item => item._id !== id));
        } catch {
            setError('Failed to delete item.');
        }
    };

    const renderField = (field) => (
        <div key={field.key} className="admin-field card-soft">
            <label className="admin-field__label">{field.label}</label>
            {field.type === 'text' ? (
                <input
                    type="text"
                    className="admin-field__input"
                    value={editValues[field.key] || ''}
                    onChange={e => setEditValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                />
            ) : (
                <textarea
                    className={`admin-field__textarea ${field.type === 'textarea-large' ? 'admin-field__textarea--large' : ''}`}
                    value={editValues[field.key] || ''}
                    onChange={e => setEditValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    rows={field.type === 'textarea-large' ? 8 : 3}
                />
            )}
            <div className="admin-field__actions">
                <button
                    className="btn-primary admin-save-btn"
                    onClick={() => saveField(field.key)}
                    disabled={saving[field.key]}
                >
                    {saving[field.key] ? '⏳ Saving…' : saved[field.key] ? '✅ Saved!' : '💾 Save'}
                </button>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="admin-page page-wrapper bg-lav-dream flex-col-center">
                <div className="messages-loading">
                    <span className="animate-pulse-heart" style={{ fontSize: '2.5rem' }}>🛠️</span>
                    <p className="text-soft">Loading admin panel…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page page-wrapper bg-lav-dream">
            <div className="admin-container">
                {/* ── Header ─── */}
                <div className="admin-header">
                    <div className="admin-header__left">
                        <button className="dm-back" onClick={() => navigate('/')} aria-label="Go back">
                            ← Back
                        </button>
                        <h1 className="admin-title">🛡️ Admin Panel</h1>
                    </div>
                    <span className="admin-user">{user?.avatar} {user?.name}</span>
                </div>

                {/* ── Alerts ─── */}
                <AnimatePresence>
                    {error && (
                        <motion.div className="admin-alert admin-alert--error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            💔 {error}
                            <button onClick={() => setError('')}>✕</button>
                        </motion.div>
                    )}
                    {success && (
                        <motion.div className="admin-alert admin-alert--success" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            ✅ {success}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Tabs ─── */}
                <div className="admin-tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            className={`admin-tab ${activeTab === tab.key ? 'admin-tab--active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Text Content Tab ─── */}
                {activeTab === 'text' && (
                    <div className="admin-section">
                        <h2 className="admin-section-title">📝 Edit Website Text</h2>
                        <p className="text-soft" style={{ marginBottom: '1rem' }}>
                            Change any text on the website. Click "Save" after editing each field.
                        </p>
                        <div className="admin-fields">
                            {TEXT_FIELDS.map(renderField)}
                        </div>
                    </div>
                )}

                {/* ── Structured Content Tab ─── */}
                {activeTab === 'structured' && (
                    <div className="admin-section">
                        <h2 className="admin-section-title">📋 Edit Section Data</h2>
                        <p className="text-soft" style={{ marginBottom: '1rem' }}>
                            Edit structured data (JSON format). Be careful with the format — use valid JSON arrays.
                        </p>
                        <div className="admin-fields">
                            {STRUCTURED_FIELDS.map(renderField)}
                        </div>
                    </div>
                )}

                {/* ── Future Tab ─── */}
                {activeTab === 'future' && (
                    <div className="admin-section">
                        <h2 className="admin-section-title">🔮 Our Future — Manage Items</h2>
                        <p className="text-soft" style={{ marginBottom: '1rem' }}>
                            Add games, love dares, and future surprises. Toggle to enable/disable.
                        </p>

                        {/* Add new item */}
                        <div className="admin-add-future card-soft">
                            <h3 className="admin-subsection-title">➕ Add New Item</h3>
                            <div className="admin-future-form">
                                <select
                                    className="admin-field__input"
                                    value={newFuture.type}
                                    onChange={e => setNewFuture(prev => ({ ...prev, type: e.target.value }))}
                                >
                                    <option value="game">🎯 Game</option>
                                    <option value="dare">💪 Love Dare</option>
                                    <option value="surprise">🎁 Surprise</option>
                                </select>
                                <input
                                    type="text"
                                    className="admin-field__input"
                                    placeholder="Title"
                                    value={newFuture.title}
                                    onChange={e => setNewFuture(prev => ({ ...prev, title: e.target.value }))}
                                />
                                <input
                                    type="text"
                                    className="admin-field__input"
                                    placeholder="Description"
                                    value={newFuture.description}
                                    onChange={e => setNewFuture(prev => ({ ...prev, description: e.target.value }))}
                                />
                                <input
                                    type="text"
                                    className="admin-field__input admin-field__input--emoji"
                                    placeholder="Emoji"
                                    value={newFuture.emoji}
                                    onChange={e => setNewFuture(prev => ({ ...prev, emoji: e.target.value }))}
                                    maxLength={4}
                                />
                                <button className="btn-primary" onClick={addFutureItem}>
                                    ➕ Add
                                </button>
                            </div>
                        </div>

                        {/* Existing items */}
                        <div className="admin-future-list">
                            {futureItems.map(item => (
                                <motion.div
                                    key={item._id}
                                    className={`admin-future-item card-soft ${!item.enabled ? 'admin-future-item--disabled' : ''}`}
                                    layout
                                >
                                    <div className="admin-future-item__info">
                                        <span className="admin-future-item__emoji">{item.emoji}</span>
                                        <div>
                                            <strong>{item.title}</strong>
                                            <span className="admin-future-item__type">{item.type}</span>
                                            <p className="text-soft">{item.description}</p>
                                        </div>
                                    </div>
                                    <div className="admin-future-item__actions">
                                        <button
                                            className={`admin-toggle-btn ${item.enabled ? 'admin-toggle-btn--on' : 'admin-toggle-btn--off'}`}
                                            onClick={() => toggleFutureItem(item._id, item.enabled)}
                                        >
                                            {item.enabled ? '✅ On' : '❌ Off'}
                                        </button>
                                        <button
                                            className="admin-delete-btn"
                                            onClick={() => deleteFutureItem(item._id)}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                            {futureItems.length === 0 && (
                                <p className="text-soft" style={{ textAlign: 'center', padding: '2rem' }}>
                                    No future items yet. Add your first one above! 🔮
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Images Tab ─── */}
                {activeTab === 'images' && (
                    <div className="admin-section">
                        <h2 className="admin-section-title">📸 Upload Images</h2>
                        <p className="text-soft" style={{ marginBottom: '1rem' }}>
                            Upload images to use in gallery, homepage, or other sections. Copy the URL after uploading and paste it into the gallery_images JSON.
                        </p>
                        <div className="admin-upload card-soft">
                            <label className="admin-upload__label">
                                <span className="admin-upload__icon">📁</span>
                                <span>Choose an image (max 5MB)</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="admin-upload__input"
                                />
                            </label>
                            <p className="text-soft" style={{ marginTop: '0.6rem', fontSize: '0.72rem' }}>
                                Supported: JPG, PNG, GIF, WebP, SVG
                            </p>
                        </div>

                        <div className="admin-upload-help card-soft" style={{ marginTop: '1rem' }}>
                            <h3 className="admin-subsection-title">💡 How to add images to Gallery</h3>
                            <ol className="admin-help-list">
                                <li>Upload an image above and copy the returned URL</li>
                                <li>Go to the <strong>📋 Sections</strong> tab</li>
                                <li>Find <strong>Gallery Images</strong> field</li>
                                <li>Add a new object: <code>{`{"src": "/api/uploads/your-file.jpg", "caption": "Your caption 💕"}`}</code></li>
                                <li>Save and refresh</li>
                            </ol>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
