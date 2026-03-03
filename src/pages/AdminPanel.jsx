import { useState, useEffect, useCallback, useRef } from 'react';
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

    // Image upload states
    const [uploadedImages, setUploadedImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadPreview, setUploadPreview] = useState(null);
    const [replaceTarget, setReplaceTarget] = useState(null); // which uploaded image to replace
    const fileInputRef = useRef(null);
    const replaceInputRef = useRef(null);

    // New future item form
    const [newFuture, setNewFuture] = useState({ type: 'game', title: '', description: '', emoji: '✨' });

    // Load uploads list from content values
    const parseUploadedImages = (values) => {
        // Try to find uploaded images referenced in gallery_images
        try {
            const galleryJSON = values['gallery_images'] || '[]';
            const items = JSON.parse(galleryJSON);
            return items.filter(i => i.src && i.src.startsWith('/api/uploads/'));
        } catch {
            return [];
        }
    };

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
            setUploadedImages(parseUploadedImages(values));
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

    // Upload a new image
    const handleImageUpload = async (e, isReplace = false) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show preview
        const reader = new FileReader();
        reader.onload = (ev) => setUploadPreview(ev.target?.result);
        reader.readAsDataURL(file);

        const formData = new FormData();
        formData.append('image', file);

        setUploading(true);
        try {
            const { data } = await contentApi.upload(formData);
            const newUrl = data.url;

            if (isReplace && replaceTarget) {
                // Replace the old URL in gallery_images JSON
                try {
                    const galleryStr = editValues['gallery_images'] || '[]';
                    const galleryArr = JSON.parse(galleryStr);
                    const updated = galleryArr.map(img =>
                        img.src === replaceTarget.src ? { ...img, src: newUrl } : img
                    );
                    const newGalleryStr = JSON.stringify(updated, null, 2);
                    setEditValues(prev => ({ ...prev, gallery_images: newGalleryStr }));
                    // Auto-save gallery_images
                    await contentApi.update('gallery_images', newGalleryStr);
                    refresh();
                    setUploadedImages(parseUploadedImages({ ...editValues, gallery_images: newGalleryStr }));
                    setSuccess(`✅ Image replaced successfully! New URL: ${newUrl}`);
                } catch {
                    setSuccess(`Image uploaded! URL: ${newUrl}`);
                }
                setReplaceTarget(null);
            } else {
                setSuccess(`Image uploaded! URL: ${newUrl}  —  Copy this into the Gallery Images JSON.`);
            }

            setTimeout(() => { setSuccess(''); setUploadPreview(null); }, 6000);
        } catch {
            setError('Failed to upload image. Make sure the server is running.');
        } finally {
            setUploading(false);
            // Reset input so same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (replaceInputRef.current) replaceInputRef.current.value = '';
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
                        <h2 className="admin-section-title">📸 Upload & Manage Images</h2>
                        <p className="text-soft" style={{ marginBottom: '1rem' }}>
                            Upload new images or replace existing ones. Images are stored on the server and can be referenced in Gallery and other sections.
                        </p>

                        {/* Upload new image */}
                        <div className="admin-upload card-soft">
                            <h3 className="admin-subsection-title">⬆️ Upload New Image</h3>
                            <label className="admin-upload__label" htmlFor="admin-image-upload">
                                <span className="admin-upload__icon">
                                    {uploading ? '⏳' : uploadPreview ? '✅' : '📁'}
                                </span>
                                <span>
                                    {uploading ? 'Uploading…' : 'Choose an image (max 5MB)'}
                                </span>
                                <input
                                    ref={fileInputRef}
                                    id="admin-image-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, false)}
                                    className="admin-upload__input"
                                    disabled={uploading}
                                />
                            </label>
                            {uploadPreview && (
                                <div className="admin-upload__preview">
                                    <img src={uploadPreview} alt="Preview" style={{ maxHeight: 120, borderRadius: '0.75rem', marginTop: '0.5rem', boxShadow: '0 4px 16px rgba(180,80,120,0.18)' }} />
                                </div>
                            )}
                            <p className="text-soft" style={{ marginTop: '0.6rem', fontSize: '0.72rem' }}>
                                Supported: JPG, PNG, GIF, WebP, SVG
                            </p>
                        </div>

                        {/* Replace existing image */}
                        <div className="admin-upload card-soft" style={{ marginTop: '1rem' }}>
                            <h3 className="admin-subsection-title">🔄 Replace an Existing Image</h3>
                            <p className="text-soft" style={{ fontSize: '0.78rem', marginBottom: '0.8rem' }}>
                                Select an image from the gallery to replace, then upload a new file. The old file's URL in the gallery JSON will be updated automatically.
                            </p>
                            <div className="admin-field">
                                <label className="admin-field__label" htmlFor="replace-target-url">
                                    Old Image URL to Replace
                                </label>
                                <input
                                    id="replace-target-url"
                                    type="text"
                                    className="admin-field__input"
                                    placeholder="/api/uploads/your-old-file.jpg"
                                    value={replaceTarget?.src || ''}
                                    onChange={e => setReplaceTarget({ src: e.target.value })}
                                />
                            </div>
                            {replaceTarget?.src && (
                                <label className="admin-upload__label admin-upload__label--replace" htmlFor="admin-image-replace" style={{ marginTop: '0.6rem' }}>
                                    <span className="admin-upload__icon">{uploading ? '⏳' : '🔄'}</span>
                                    <span>{uploading ? 'Replacing…' : 'Choose replacement image'}</span>
                                    <input
                                        ref={replaceInputRef}
                                        id="admin-image-replace"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, true)}
                                        className="admin-upload__input"
                                        disabled={uploading || !replaceTarget?.src}
                                    />
                                </label>
                            )}
                        </div>

                        {/* How-to guide */}
                        <div className="admin-upload-help card-soft" style={{ marginTop: '1rem' }}>
                            <h3 className="admin-subsection-title">💡 How to add images to Gallery</h3>
                            <ol className="admin-help-list">
                                <li>Upload an image above and copy the returned URL from the success message</li>
                                <li>Go to the <strong>📋 Sections</strong> tab</li>
                                <li>Find <strong>Gallery Images</strong> field</li>
                                <li>Add a new object: <code>{`{"src": "/api/uploads/your-file.jpg", "caption": "Your caption 💕", "category": "moments"}`}</code></li>
                                <li>Save and the gallery updates immediately</li>
                            </ol>
                            <div style={{ marginTop: '0.8rem', padding: '0.6rem 1rem', background: 'rgba(232,62,108,0.06)', borderRadius: '0.6rem', fontSize: '0.74rem', color: '#9b6b8a' }}>
                                <strong>Categories:</strong> moments · adventures · dates · portraits
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
