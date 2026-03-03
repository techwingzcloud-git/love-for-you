import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import { contentApi } from '../api/messageApi';
import './AdminPanel.css';

const TABS = [
    { key: 'text', label: '✏️ Text Content' },
    { key: 'structured', label: '📋 Sections' },
    { key: 'future', label: '🔮 Our Future' },
    { key: 'images', label: '📸 Images' },
];

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

const STRUCTURED_FIELDS = [
    { key: 'home_taglines', label: 'Home Taglines (JSON array of strings)', type: 'textarea-large' },
    { key: 'home_cards', label: 'Home Feature Cards (JSON array)', type: 'textarea-large' },
    { key: 'letter_content', label: 'Love Letter Lines (JSON array of strings)', type: 'textarea-large' },
    { key: 'about_blocks', label: 'About Story Blocks (JSON array)', type: 'textarea-large' },
    { key: 'about_milestones', label: 'About Milestones (JSON array)', type: 'textarea-large' },
    { key: 'gallery_images', label: 'Gallery Images (JSON array with src & caption)', type: 'textarea-large' },
    { key: 'memories_items', label: 'Memories Timeline Items (JSON array)', type: 'textarea-large' },
];

// Read a File as a base64 data URL
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

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

    // ── Image upload state ──
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadPreview, setUploadPreview] = useState(null);
    const [uploadedUrl, setUploadedUrl] = useState('');
    const [addCaption, setAddCaption] = useState('');
    const [addCategory, setAddCategory] = useState('moments');
    const [replaceTarget, setReplaceTarget] = useState('');
    const fileInputRef = useRef(null);
    const replaceInputRef = useRef(null);

    // ── Future item form ──
    const [newFuture, setNewFuture] = useState({ type: 'game', title: '', description: '', emoji: '✨' });

    // Load content from API
    const loadContent = useCallback(async () => {
        try {
            setLoading(true);
            const [contentRes, futureRes] = await Promise.all([
                contentApi.getAll(),
                contentApi.getFuture(),
            ]);
            const values = {};
            Object.entries(contentRes.data).forEach(([key, item]) => {
                values[key] = item.value || '';
            });
            setEditValues(values);
            setFutureItems(futureRes.data);
        } catch {
            setError('Failed to load content.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user?.role !== 'admin') { navigate('/'); return; }
        loadContent();
    }, [user, navigate, loadContent]);

    // Save a single text/JSON content field
    const saveField = async (key) => {
        try {
            setSaving(prev => ({ ...prev, [key]: true }));
            await contentApi.update(key, editValues[key] || '');
            setSaved(prev => ({ ...prev, [key]: true }));
            refresh();
            setTimeout(() => setSaved(prev => ({ ...prev, [key]: false })), 2000);
        } catch {
            setError(`Failed to save "${key}". Try again.`);
        } finally {
            setSaving(prev => ({ ...prev, [key]: false }));
        }
    };

    // ── Read & preview picked file ──
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadedUrl('');
        setUploadProgress(0);
        try {
            const b64 = await readFileAsBase64(file);
            setUploadPreview(b64);
        } catch {
            setError('Failed to read image file.');
        }
    };

    // ── Upload to API (base64 → MongoDB) ──
    const handleUpload = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file || !uploadPreview) { setError('Please select an image first.'); return; }
        if (uploadPreview.length > 4.5 * 1024 * 1024) {
            setError('Image is too large (max ~3MB). Please compress it first.');
            return;
        }
        setUploading(true);
        setUploadProgress(30);
        try {
            setUploadProgress(60);
            const { data } = await contentApi.upload(uploadPreview, file.name);
            setUploadProgress(100);
            setUploadedUrl(data.url);
            setSuccess('✅ Photo uploaded successfully!');
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            setError(err.response?.data?.error || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
            setTimeout(() => setUploadProgress(0), 800);
        }
    };

    // ── Add uploaded photo to the gallery_images JSON & save ──
    const addToGallery = async () => {
        if (!uploadedUrl) { setError('Upload a photo first.'); return; }
        try {
            const galleryStr = editValues['gallery_images'] || '[]';
            let arr = [];
            try { arr = JSON.parse(galleryStr); } catch { arr = []; }
            arr.push({
                src: uploadedUrl,
                caption: addCaption.trim() || '💕 Our Photo',
                category: addCategory,
            });
            const newStr = JSON.stringify(arr, null, 2);
            await contentApi.update('gallery_images', newStr);
            setEditValues(prev => ({ ...prev, gallery_images: newStr }));
            refresh();
            setSuccess('✅ Photo added to gallery!');
            setUploadedUrl(''); setUploadPreview(null); setAddCaption(''); setAddCategory('moments');
            if (fileInputRef.current) fileInputRef.current.value = '';
            setTimeout(() => setSuccess(''), 4000);
        } catch {
            setError('Failed to save photo to gallery.');
        }
    };

    // ── Replace an existing gallery photo ──
    const handleReplaceUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !replaceTarget.trim()) return;
        setUploading(true);
        setUploadProgress(30);
        try {
            const b64 = await readFileAsBase64(file);
            if (b64.length > 4.5 * 1024 * 1024) {
                setError('Replacement image too large (max ~3MB).');
                return;
            }
            setUploadProgress(60);
            const { data } = await contentApi.upload(b64, file.name);
            setUploadProgress(90);
            const galleryStr = editValues['gallery_images'] || '[]';
            let arr = [];
            try { arr = JSON.parse(galleryStr); } catch { arr = []; }
            const updated = arr.map(img =>
                img.src === replaceTarget.trim() ? { ...img, src: data.url } : img
            );
            const newStr = JSON.stringify(updated, null, 2);
            setUploadProgress(100);
            await contentApi.update('gallery_images', newStr);
            setEditValues(prev => ({ ...prev, gallery_images: newStr }));
            refresh();
            setSuccess(`✅ Photo replaced! New URL: ${data.url}`);
            setReplaceTarget('');
            if (replaceInputRef.current) replaceInputRef.current.value = '';
            setTimeout(() => setSuccess(''), 6000);
        } catch (err) {
            setError(err.response?.data?.error || 'Replace failed.');
        } finally {
            setUploading(false);
            setTimeout(() => setUploadProgress(0), 800);
        }
    };

    // ── Remove a photo from gallery ──
    const removeFromGallery = async (src) => {
        if (!window.confirm('Remove this photo from the gallery?')) return;
        try {
            const galleryStr = editValues['gallery_images'] || '[]';
            let arr = [];
            try { arr = JSON.parse(galleryStr); } catch { arr = []; }
            const filtered = arr.filter(img => img.src !== src);
            const newStr = JSON.stringify(filtered, null, 2);
            await contentApi.update('gallery_images', newStr);
            setEditValues(prev => ({ ...prev, gallery_images: newStr }));
            refresh();
            setSuccess('✅ Photo removed.');
            setTimeout(() => setSuccess(''), 3000);
        } catch { setError('Failed to remove photo.'); }
    };

    const getGalleryImages = () => {
        try { return JSON.parse(editValues['gallery_images'] || '[]'); } catch { return []; }
    };

    // ── Future item helpers ──
    const addFutureItem = async () => {
        if (!newFuture.title.trim()) { setError('Title is required.'); return; }
        try {
            const { data } = await contentApi.addFuture(newFuture);
            setFutureItems(prev => [...prev, data]);
            setNewFuture({ type: 'game', title: '', description: '', emoji: '✨' });
            setSuccess('Future item added!');
            setTimeout(() => setSuccess(''), 3000);
        } catch { setError('Failed to add item.'); }
    };

    const toggleFutureItem = async (id, enabled) => {
        try {
            await contentApi.updateFuture(id, { enabled: !enabled });
            setFutureItems(prev => prev.map(item =>
                item._id === id ? { ...item, enabled: !enabled } : item
            ));
        } catch { setError('Failed to update item.'); }
    };

    const deleteFutureItem = async (id) => {
        try {
            await contentApi.deleteFuture(id);
            setFutureItems(prev => prev.filter(item => item._id !== id));
        } catch { setError('Failed to delete item.'); }
    };

    const renderField = (field) => (
        <div key={field.key} className="admin-field card-soft">
            <label className="admin-field__label">{field.label}</label>
            {field.type === 'text'
                ? <input type="text" className="admin-field__input" value={editValues[field.key] || ''} onChange={e => setEditValues(prev => ({ ...prev, [field.key]: e.target.value }))} />
                : <textarea className={`admin-field__textarea ${field.type === 'textarea-large' ? 'admin-field__textarea--large' : ''}`} value={editValues[field.key] || ''} onChange={e => setEditValues(prev => ({ ...prev, [field.key]: e.target.value }))} rows={field.type === 'textarea-large' ? 8 : 3} />
            }
            <div className="admin-field__actions">
                <button className="btn-primary admin-save-btn" onClick={() => saveField(field.key)} disabled={saving[field.key]}>
                    {saving[field.key] ? '⏳ Saving…' : saved[field.key] ? '✅ Saved!' : '💾 Save'}
                </button>
            </div>
        </div>
    );

    if (loading) return (
        <div className="admin-page page-wrapper bg-lav-dream flex-col-center">
            <div className="messages-loading">
                <span className="animate-pulse-heart" style={{ fontSize: '2.5rem' }}>🛠️</span>
                <p className="text-soft">Loading admin panel…</p>
            </div>
        </div>
    );

    const galleryImages = getGalleryImages();

    return (
        <div className="admin-page page-wrapper bg-lav-dream">
            <div className="admin-container">

                {/* ── Header ─── */}
                <div className="admin-header">
                    <div className="admin-header__left">
                        <button className="dm-back" onClick={() => navigate('/')}>← Back</button>
                        <h1 className="admin-title">🛡️ Admin Panel</h1>
                    </div>
                    <span className="admin-user">{user?.avatar} {user?.name}</span>
                </div>

                {/* ── Alerts ─── */}
                <AnimatePresence>
                    {error && (
                        <motion.div className="admin-alert admin-alert--error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            💔 {error}<button onClick={() => setError('')}>✕</button>
                        </motion.div>
                    )}
                    {success && (
                        <motion.div className="admin-alert admin-alert--success" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            {success}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Tabs ─── */}
                <div className="admin-tabs">
                    {TABS.map(tab => (
                        <button key={tab.key} className={`admin-tab ${activeTab === tab.key ? 'admin-tab--active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ════════════════ TEXT ════════════════ */}
                {activeTab === 'text' && (
                    <div className="admin-section">
                        <h2 className="admin-section-title">📝 Edit Website Text</h2>
                        <p className="text-soft" style={{ marginBottom: '1rem' }}>Change any text. Click "Save" after each field.</p>
                        <div className="admin-fields">{TEXT_FIELDS.map(renderField)}</div>
                    </div>
                )}

                {/* ════════════════ STRUCTURED ════════════════ */}
                {activeTab === 'structured' && (
                    <div className="admin-section">
                        <h2 className="admin-section-title">📋 Edit Section Data</h2>
                        <p className="text-soft" style={{ marginBottom: '1rem' }}>Edit JSON data — use valid JSON arrays.</p>
                        <div className="admin-fields">{STRUCTURED_FIELDS.map(renderField)}</div>
                    </div>
                )}

                {/* ════════════════ FUTURE ════════════════ */}
                {activeTab === 'future' && (
                    <div className="admin-section">
                        <h2 className="admin-section-title">🔮 Our Future — Items</h2>
                        <div className="admin-add-future card-soft">
                            <h3 className="admin-subsection-title">➕ Add New Item</h3>
                            <div className="admin-future-form">
                                <select className="admin-field__input" value={newFuture.type} onChange={e => setNewFuture(p => ({ ...p, type: e.target.value }))}>
                                    <option value="game">🎯 Game</option>
                                    <option value="dare">💪 Love Dare</option>
                                    <option value="surprise">🎁 Surprise</option>
                                </select>
                                <input type="text" className="admin-field__input" placeholder="Title" value={newFuture.title} onChange={e => setNewFuture(p => ({ ...p, title: e.target.value }))} />
                                <input type="text" className="admin-field__input" placeholder="Description" value={newFuture.description} onChange={e => setNewFuture(p => ({ ...p, description: e.target.value }))} />
                                <input type="text" className="admin-field__input admin-field__input--emoji" placeholder="Emoji" value={newFuture.emoji} onChange={e => setNewFuture(p => ({ ...p, emoji: e.target.value }))} maxLength={4} />
                                <button className="btn-primary" onClick={addFutureItem}>➕ Add</button>
                            </div>
                        </div>
                        <div className="admin-future-list">
                            {futureItems.map(item => (
                                <motion.div key={item._id} className={`admin-future-item card-soft ${!item.enabled ? 'admin-future-item--disabled' : ''}`} layout>
                                    <div className="admin-future-item__info">
                                        <span className="admin-future-item__emoji">{item.emoji}</span>
                                        <div>
                                            <strong>{item.title}</strong><span className="admin-future-item__type">{item.type}</span>
                                            <p className="text-soft">{item.description}</p>
                                        </div>
                                    </div>
                                    <div className="admin-future-item__actions">
                                        <button className={`admin-toggle-btn ${item.enabled ? 'admin-toggle-btn--on' : 'admin-toggle-btn--off'}`} onClick={() => toggleFutureItem(item._id, item.enabled)}>
                                            {item.enabled ? '✅ On' : '❌ Off'}
                                        </button>
                                        <button className="admin-delete-btn" onClick={() => deleteFutureItem(item._id)}>🗑️</button>
                                    </div>
                                </motion.div>
                            ))}
                            {futureItems.length === 0 && <p className="text-soft" style={{ textAlign: 'center', padding: '2rem' }}>No items yet. 🔮</p>}
                        </div>
                    </div>
                )}

                {/* ════════════════ IMAGES ════════════════ */}
                {activeTab === 'images' && (
                    <div className="admin-section">
                        <h2 className="admin-section-title">📸 Upload & Manage Photos</h2>

                        {/* ── How it works ─── */}
                        <div className="admin-cloudinary-notice" style={{ marginBottom: '1rem' }}>
                            <div className="admin-cloudinary-notice__icon">💡</div>
                            <div className="admin-cloudinary-notice__body">
                                <strong>Direct Upload — No External Service Needed!</strong>
                                <p>Photos are uploaded directly to your database and served via the API. Works instantly on Vercel — no setup required.</p>
                                <p style={{ marginTop: '0.3rem', color: '#a855f7', fontSize: '0.73rem' }}>📦 Max size per photo: ~3 MB &nbsp;·&nbsp; Supported: JPG, PNG, GIF, WebP</p>
                            </div>
                        </div>

                        {/* ── Upload New Photo ─── */}
                        <div className="admin-upload card-soft">
                            <h3 className="admin-subsection-title">⬆️ Upload New Photo</h3>

                            <label className="admin-upload__label" htmlFor="admin-image-upload">
                                <span className="admin-upload__icon">{uploading ? '⏳' : uploadPreview ? '✅' : '📁'}</span>
                                <span>{uploading ? `Uploading… ${uploadProgress}%` : uploadPreview ? 'Image selected — ready to upload' : 'Click to choose a photo from your device'}</span>
                                <input ref={fileInputRef} id="admin-image-upload" type="file" accept="image/*" onChange={handleFileChange} className="admin-upload__input" disabled={uploading} />
                            </label>

                            {/* Progress bar */}
                            {(uploading || uploadProgress > 0) && (
                                <div className="admin-upload-progress">
                                    <div className="admin-upload-progress__bar" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            )}

                            {/* Preview */}
                            {uploadPreview && (
                                <div className="admin-upload__preview">
                                    <img src={uploadPreview} alt="Preview" />
                                </div>
                            )}

                            {/* Upload button — only show when preview ready but not uploaded yet */}
                            {uploadPreview && !uploadedUrl && !uploading && (
                                <motion.button
                                    className="btn-primary"
                                    style={{ marginTop: '0.8rem', width: '100%' }}
                                    onClick={handleUpload}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    id="admin-upload-btn"
                                >
                                    ☁️ Upload to Server
                                </motion.button>
                            )}

                            {/* After upload — caption + category + Add to Gallery */}
                            {uploadedUrl && (
                                <motion.div className="admin-upload-success" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                                    <div className="admin-upload-success__url">
                                        <span>🔗</span>
                                        <input type="text" readOnly value={uploadedUrl} className="admin-field__input" onClick={e => e.target.select()} title="Click to select URL" />
                                    </div>
                                    <div className="admin-upload-success__meta">
                                        <div>
                                            <label className="admin-field__label">Caption</label>
                                            <input type="text" className="admin-field__input" placeholder="e.g. Our first date ☕" value={addCaption} onChange={e => setAddCaption(e.target.value)} id="admin-caption-input" />
                                        </div>
                                        <div>
                                            <label className="admin-field__label">Category</label>
                                            <select className="admin-field__input" value={addCategory} onChange={e => setAddCategory(e.target.value)} id="admin-category-select">
                                                <option value="moments">🌸 Moments</option>
                                                <option value="adventures">🗺️ Adventures</option>
                                                <option value="dates">☕ Dates</option>
                                                <option value="portraits">✨ Portraits</option>
                                            </select>
                                        </div>
                                    </div>
                                    <motion.button
                                        className="btn-primary"
                                        style={{ width: '100%' }}
                                        onClick={addToGallery}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.97 }}
                                        id="admin-add-gallery-btn"
                                    >
                                        📸 Add to Gallery
                                    </motion.button>
                                </motion.div>
                            )}
                        </div>

                        {/* ── Replace Existing Photo ─── */}
                        <div className="admin-upload card-soft" style={{ marginTop: '1rem' }}>
                            <h3 className="admin-subsection-title">🔄 Replace an Existing Photo</h3>
                            <p className="text-soft" style={{ fontSize: '0.75rem', marginBottom: '0.6rem' }}>
                                Click 🔄 on any photo below to auto-fill the URL, then pick a replacement.
                            </p>
                            <input
                                type="text"
                                className="admin-field__input"
                                placeholder="Paste or click 🔄 below to fill the URL…"
                                value={replaceTarget}
                                onChange={e => setReplaceTarget(e.target.value)}
                                id="admin-replace-url-input"
                            />
                            {replaceTarget.trim() && (
                                <label className="admin-upload__label admin-upload__label--replace" style={{ marginTop: '0.6rem' }} htmlFor="admin-image-replace">
                                    <span className="admin-upload__icon">{uploading ? '⏳' : '🔄'}</span>
                                    <span>{uploading ? `Replacing… ${uploadProgress}%` : 'Choose replacement photo'}</span>
                                    <input ref={replaceInputRef} id="admin-image-replace" type="file" accept="image/*" onChange={handleReplaceUpload} className="admin-upload__input" disabled={uploading} />
                                </label>
                            )}
                        </div>

                        {/* ── Current Gallery Grid ─── */}
                        {galleryImages.length > 0 && (
                            <div className="admin-upload card-soft" style={{ marginTop: '1rem' }}>
                                <h3 className="admin-subsection-title">🖼️ Gallery Photos ({galleryImages.length})</h3>
                                <p className="text-soft" style={{ fontSize: '0.72rem', marginBottom: '0.7rem' }}>
                                    Hover a photo → click 🔄 to fill replace URL, 🗑️ to remove.
                                </p>
                                <div className="admin-gallery-grid">
                                    {galleryImages.map((img, i) => (
                                        <div key={i} className="admin-gallery-thumb">
                                            <img src={img.src} alt={img.caption} loading="lazy" />
                                            <div className="admin-gallery-thumb__overlay">
                                                <span className="admin-gallery-thumb__caption">{img.caption}</span>
                                                <div className="admin-gallery-thumb__actions">
                                                    <button className="admin-gallery-thumb__btn" onClick={() => setReplaceTarget(img.src)} title="Use this URL for replace">🔄</button>
                                                    <button className="admin-gallery-thumb__btn admin-gallery-thumb__btn--del" onClick={() => removeFromGallery(img.src)} title="Remove from gallery">🗑️</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
