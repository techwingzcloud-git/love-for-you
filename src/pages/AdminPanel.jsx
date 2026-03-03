import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import { contentApi } from '../api/messageApi';
import './AdminPanel.css';

// ─── Cloudinary config ───────────────────────────────────────────
// Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET
// in your .env file OR in Vercel project environment variables.
// Create a FREE account at https://cloudinary.com — no credit card needed.
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
const cloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

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

// ─── Upload to Cloudinary directly from browser ──────────────────
async function uploadToCloudinary(file, onProgress) {
    if (!cloudinaryConfigured) {
        throw new Error('Cloudinary not configured. See setup instructions below.');
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'love-for-you');

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        });
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
        xhr.onload = () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                resolve(data.secure_url);
            } else {
                reject(new Error('Upload failed: ' + xhr.responseText));
            }
        };
        xhr.onerror = () => reject(new Error('Network error during upload.'));
        xhr.send(formData);
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

    // Image upload states
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadPreview, setUploadPreview] = useState(null);
    const [uploadedUrl, setUploadedUrl] = useState('');
    const [addCaption, setAddCaption] = useState('');
    const [addCategory, setAddCategory] = useState('moments');
    const [replaceTarget, setReplaceTarget] = useState('');
    const fileInputRef = useRef(null);
    const replaceInputRef = useRef(null);

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
        if (user?.role !== 'admin') { navigate('/'); return; }
        loadContent();
    }, [user, navigate, loadContent]);

    // Save a text field
    const saveField = async (key) => {
        try {
            setSaving(prev => ({ ...prev, [key]: true }));
            await contentApi.update(key, editValues[key] || '');
            setSaved(prev => ({ ...prev, [key]: true }));
            refresh();
            setTimeout(() => setSaved(prev => ({ ...prev, [key]: false })), 2000);
        } catch {
            setError(`Failed to save ${key}. Try again.`);
        } finally {
            setSaving(prev => ({ ...prev, [key]: false }));
        }
    };

    // Preview selected image
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setUploadPreview(ev.target?.result);
        reader.readAsDataURL(file);
        setUploadedUrl('');
        setUploadProgress(0);
    };

    // Upload new image to Cloudinary
    const handleUpload = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file) { setError('Please select an image first.'); return; }
        setUploading(true);
        setUploadProgress(0);
        try {
            const url = await uploadToCloudinary(file, setUploadProgress);
            setUploadedUrl(url);
            setSuccess('✅ Image uploaded to Cloudinary!');
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    // Add the uploaded image to gallery_images JSON and save
    const addToGallery = async () => {
        if (!uploadedUrl) { setError('Upload an image first.'); return; }
        try {
            const galleryStr = editValues['gallery_images'] || '[]';
            let galleryArr = [];
            try { galleryArr = JSON.parse(galleryStr); } catch { galleryArr = []; }
            const newEntry = {
                src: uploadedUrl,
                caption: addCaption.trim() || '💕 My Photo',
                category: addCategory,
            };
            galleryArr.push(newEntry);
            const newGalleryStr = JSON.stringify(galleryArr, null, 2);
            await contentApi.update('gallery_images', newGalleryStr);
            setEditValues(prev => ({ ...prev, gallery_images: newGalleryStr }));
            refresh();
            setSuccess('✅ Photo added to gallery!');
            // Reset upload state
            setUploadedUrl('');
            setUploadPreview(null);
            setAddCaption('');
            setAddCategory('moments');
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setTimeout(() => setSuccess(''), 4000);
        } catch {
            setError('Failed to add photo to gallery.');
        }
    };

    // Replace an existing image in gallery_images
    const handleReplaceUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !replaceTarget.trim()) return;
        setUploading(true);
        setUploadProgress(0);
        try {
            const newUrl = await uploadToCloudinary(file, setUploadProgress);
            const galleryStr = editValues['gallery_images'] || '[]';
            let galleryArr = [];
            try { galleryArr = JSON.parse(galleryStr); } catch { galleryArr = []; }
            const updated = galleryArr.map(img =>
                img.src === replaceTarget.trim() ? { ...img, src: newUrl } : img
            );
            const newGalleryStr = JSON.stringify(updated, null, 2);
            await contentApi.update('gallery_images', newGalleryStr);
            setEditValues(prev => ({ ...prev, gallery_images: newGalleryStr }));
            refresh();
            setSuccess(`✅ Image replaced! New URL: ${newUrl}`);
            setReplaceTarget('');
            if (replaceInputRef.current) replaceInputRef.current.value = '';
            setTimeout(() => setSuccess(''), 6000);
        } catch (err) {
            setError(err.message || 'Failed to replace image.');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    // Remove an image from gallery by src URL
    const removeFromGallery = async (srcToRemove) => {
        if (!window.confirm('Remove this photo from the gallery?')) return;
        try {
            const galleryStr = editValues['gallery_images'] || '[]';
            let galleryArr = [];
            try { galleryArr = JSON.parse(galleryStr); } catch { galleryArr = []; }
            const updated = galleryArr.filter(img => img.src !== srcToRemove);
            const newGalleryStr = JSON.stringify(updated, null, 2);
            await contentApi.update('gallery_images', newGalleryStr);
            setEditValues(prev => ({ ...prev, gallery_images: newGalleryStr }));
            refresh();
            setSuccess('✅ Photo removed from gallery.');
            setTimeout(() => setSuccess(''), 3000);
        } catch {
            setError('Failed to remove photo.');
        }
    };

    // Parse existing gallery images for the visual grid
    const getGalleryImages = () => {
        try {
            return JSON.parse(editValues['gallery_images'] || '[]');
        } catch {
            return [];
        }
    };

    // Add future item
    const addFutureItem = async () => {
        if (!newFuture.title.trim()) { setError('Title is required.'); return; }
        try {
            const { data } = await contentApi.addFuture(newFuture);
            setFutureItems(prev => [...prev, data]);
            setNewFuture({ type: 'game', title: '', description: '', emoji: '✨' });
            setSuccess('Future item added!');
            setTimeout(() => setSuccess(''), 3000);
        } catch { setError('Failed to add future item.'); }
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

    const galleryImages = getGalleryImages();

    return (
        <div className="admin-page page-wrapper bg-lav-dream">
            <div className="admin-container">
                {/* ── Header ─── */}
                <div className="admin-header">
                    <div className="admin-header__left">
                        <button className="dm-back" onClick={() => navigate('/')} aria-label="Go back">← Back</button>
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
                            {success}
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

                {/* ══════════════════════════════════════ */}
                {/* TEXT TAB */}
                {/* ══════════════════════════════════════ */}
                {activeTab === 'text' && (
                    <div className="admin-section">
                        <h2 className="admin-section-title">📝 Edit Website Text</h2>
                        <p className="text-soft" style={{ marginBottom: '1rem' }}>Change any text on the website. Click "Save" after each field.</p>
                        <div className="admin-fields">{TEXT_FIELDS.map(renderField)}</div>
                    </div>
                )}

                {/* ══════════════════════════════════════ */}
                {/* STRUCTURED TAB */}
                {/* ══════════════════════════════════════ */}
                {activeTab === 'structured' && (
                    <div className="admin-section">
                        <h2 className="admin-section-title">📋 Edit Section Data</h2>
                        <p className="text-soft" style={{ marginBottom: '1rem' }}>Edit structured JSON data. Double-check the format before saving.</p>
                        <div className="admin-fields">{STRUCTURED_FIELDS.map(renderField)}</div>
                    </div>
                )}

                {/* ══════════════════════════════════════ */}
                {/* FUTURE TAB */}
                {/* ══════════════════════════════════════ */}
                {activeTab === 'future' && (
                    <div className="admin-section">
                        <h2 className="admin-section-title">🔮 Our Future — Items</h2>
                        <div className="admin-add-future card-soft">
                            <h3 className="admin-subsection-title">➕ Add New Item</h3>
                            <div className="admin-future-form">
                                <select className="admin-field__input" value={newFuture.type} onChange={e => setNewFuture(prev => ({ ...prev, type: e.target.value }))}>
                                    <option value="game">🎯 Game</option>
                                    <option value="dare">💪 Love Dare</option>
                                    <option value="surprise">🎁 Surprise</option>
                                </select>
                                <input type="text" className="admin-field__input" placeholder="Title" value={newFuture.title} onChange={e => setNewFuture(prev => ({ ...prev, title: e.target.value }))} />
                                <input type="text" className="admin-field__input" placeholder="Description" value={newFuture.description} onChange={e => setNewFuture(prev => ({ ...prev, description: e.target.value }))} />
                                <input type="text" className="admin-field__input admin-field__input--emoji" placeholder="Emoji" value={newFuture.emoji} onChange={e => setNewFuture(prev => ({ ...prev, emoji: e.target.value }))} maxLength={4} />
                                <button className="btn-primary" onClick={addFutureItem}>➕ Add</button>
                            </div>
                        </div>
                        <div className="admin-future-list">
                            {futureItems.map(item => (
                                <motion.div key={item._id} className={`admin-future-item card-soft ${!item.enabled ? 'admin-future-item--disabled' : ''}`} layout>
                                    <div className="admin-future-item__info">
                                        <span className="admin-future-item__emoji">{item.emoji}</span>
                                        <div>
                                            <strong>{item.title}</strong>
                                            <span className="admin-future-item__type">{item.type}</span>
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

                {/* ══════════════════════════════════════ */}
                {/* IMAGES TAB */}
                {/* ══════════════════════════════════════ */}
                {activeTab === 'images' && (
                    <div className="admin-section">
                        <h2 className="admin-section-title">📸 Upload & Manage Photos</h2>

                        {/* ── Cloudinary Setup Notice ─── */}
                        {!cloudinaryConfigured && (
                            <motion.div className="admin-cloudinary-notice" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                                <div className="admin-cloudinary-notice__icon">☁️</div>
                                <div className="admin-cloudinary-notice__body">
                                    <strong>Setup Required — Cloudinary (Free Image Hosting)</strong>
                                    <p>Vercel serverless cannot store files. You need a free Cloudinary account to upload photos permanently.</p>
                                    <ol className="admin-help-list" style={{ marginTop: '0.6rem' }}>
                                        <li>Go to <a href="https://cloudinary.com" target="_blank" rel="noreferrer" className="admin-link">cloudinary.com</a> → Sign up free</li>
                                        <li>In your Dashboard, copy your <strong>Cloud Name</strong></li>
                                        <li>Go to <strong>Settings → Upload → Upload presets</strong></li>
                                        <li>Click <strong>"Add upload preset"</strong> → set Signing mode to <strong>Unsigned</strong> → Save</li>
                                        <li>Copy the preset name</li>
                                        <li>In Vercel → your project → <strong>Settings → Environment Variables</strong>, add:</li>
                                    </ol>
                                    <div className="admin-cloudinary-env">
                                        <code>VITE_CLOUDINARY_CLOUD_NAME = your_cloud_name</code>
                                        <code>VITE_CLOUDINARY_UPLOAD_PRESET = your_preset_name</code>
                                    </div>
                                    <p style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#9b6b8a' }}>After adding env vars, redeploy once and uploads will work! ✨</p>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Upload New Photo ─── */}
                        <div className="admin-upload card-soft" style={{ marginTop: '1rem' }}>
                            <h3 className="admin-subsection-title">⬆️ Upload New Photo to Cloudinary</h3>

                            {/* File picker */}
                            <label className="admin-upload__label" htmlFor="admin-image-upload">
                                <span className="admin-upload__icon">{uploading ? '⏳' : uploadPreview ? '✅' : '📁'}</span>
                                <span>{uploading ? `Uploading… ${uploadProgress}%` : 'Click to choose a photo'}</span>
                                <input
                                    ref={fileInputRef}
                                    id="admin-image-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="admin-upload__input"
                                    disabled={uploading}
                                />
                            </label>

                            {/* Progress bar */}
                            {uploading && (
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

                            {/* Upload button */}
                            {uploadPreview && !uploadedUrl && (
                                <motion.button
                                    className="btn-primary"
                                    style={{ marginTop: '0.8rem', width: '100%' }}
                                    onClick={handleUpload}
                                    disabled={uploading || !cloudinaryConfigured}
                                    whileHover={{ scale: cloudinaryConfigured ? 1.02 : 1 }}
                                    id="admin-upload-btn"
                                >
                                    {uploading ? `⏳ Uploading ${uploadProgress}%…` : '☁️ Upload to Cloudinary'}
                                </motion.button>
                            )}

                            {/* After upload — caption + category + Add to Gallery */}
                            {uploadedUrl && (
                                <motion.div className="admin-upload-success" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                                    <div className="admin-upload-success__url">
                                        <span>🔗 URL:</span>
                                        <input
                                            type="text"
                                            readOnly
                                            value={uploadedUrl}
                                            className="admin-field__input"
                                            onClick={e => e.target.select()}
                                        />
                                    </div>
                                    <div className="admin-upload-success__meta">
                                        <div>
                                            <label className="admin-field__label">Caption</label>
                                            <input
                                                type="text"
                                                className="admin-field__input"
                                                placeholder="e.g. Our first date ☕"
                                                value={addCaption}
                                                onChange={e => setAddCaption(e.target.value)}
                                                id="admin-caption-input"
                                            />
                                        </div>
                                        <div>
                                            <label className="admin-field__label">Category</label>
                                            <select
                                                className="admin-field__input"
                                                value={addCategory}
                                                onChange={e => setAddCategory(e.target.value)}
                                                id="admin-category-select"
                                            >
                                                <option value="moments">🌸 Moments</option>
                                                <option value="adventures">🗺️ Adventures</option>
                                                <option value="dates">☕ Dates</option>
                                                <option value="portraits">✨ Portraits</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        className="btn-primary"
                                        style={{ marginTop: '0.6rem', width: '100%' }}
                                        onClick={addToGallery}
                                        id="admin-add-gallery-btn"
                                    >
                                        📸 Add to Gallery
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {/* ── Replace Existing Photo ─── */}
                        <div className="admin-upload card-soft" style={{ marginTop: '1rem' }}>
                            <h3 className="admin-subsection-title">🔄 Replace an Existing Photo</h3>
                            <p className="text-soft" style={{ fontSize: '0.75rem', marginBottom: '0.6rem' }}>
                                Enter the URL of the photo you want to replace, then pick a new image.
                            </p>
                            <input
                                type="text"
                                className="admin-field__input"
                                placeholder="https://res.cloudinary.com/…  or paste URL from gallery below"
                                value={replaceTarget}
                                onChange={e => setReplaceTarget(e.target.value)}
                                id="admin-replace-url-input"
                            />
                            {replaceTarget.trim() && (
                                <label className="admin-upload__label admin-upload__label--replace" style={{ marginTop: '0.6rem' }} htmlFor="admin-image-replace">
                                    <span className="admin-upload__icon">{uploading ? '⏳' : '🔄'}</span>
                                    <span>{uploading ? `Replacing… ${uploadProgress}%` : 'Choose replacement image'}</span>
                                    <input
                                        ref={replaceInputRef}
                                        id="admin-image-replace"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleReplaceUpload}
                                        className="admin-upload__input"
                                        disabled={uploading}
                                    />
                                </label>
                            )}
                        </div>

                        {/* ── Current Gallery Grid ─── */}
                        {galleryImages.length > 0 && (
                            <div className="admin-upload card-soft" style={{ marginTop: '1rem' }}>
                                <h3 className="admin-subsection-title">🖼️ Current Gallery Photos ({galleryImages.length})</h3>
                                <p className="text-soft" style={{ fontSize: '0.73rem', marginBottom: '0.7rem' }}>
                                    Click a photo URL to copy it into the Replace field. Use 🗑️ to remove.
                                </p>
                                <div className="admin-gallery-grid">
                                    {galleryImages.map((img, i) => (
                                        <div key={i} className="admin-gallery-thumb">
                                            <img
                                                src={img.src}
                                                alt={img.caption}
                                                loading="lazy"
                                            />
                                            <div className="admin-gallery-thumb__overlay">
                                                <span className="admin-gallery-thumb__caption">{img.caption}</span>
                                                <div className="admin-gallery-thumb__actions">
                                                    <button
                                                        className="admin-gallery-thumb__btn"
                                                        onClick={() => setReplaceTarget(img.src)}
                                                        title="Use URL for replace"
                                                    >🔄</button>
                                                    <button
                                                        className="admin-gallery-thumb__btn admin-gallery-thumb__btn--del"
                                                        onClick={() => removeFromGallery(img.src)}
                                                        title="Remove from gallery"
                                                    >🗑️</button>
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
