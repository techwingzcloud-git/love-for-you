/* ============================================================
   Content Context — Love For You ❤️
   Fetches all site content from API once, shares across pages
   All text/images are data-driven — zero hardcoded content
   ============================================================ */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { publicApi } from '../api/messageApi';
import { useAuth } from './AuthContext';

const ContentContext = createContext(null);

// Helper to safely parse JSON values from content
function parseJSON(val, fallback) {
    if (!val) return fallback;
    try {
        return JSON.parse(val);
    } catch {
        return fallback;
    }
}

export function ContentProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const [content, setContent] = useState({});
    const [loading, setLoading] = useState(true);

    const loadContent = useCallback(async () => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data } = await publicApi.getContent();
            setContent(data);
        } catch {
            // silently fail — pages will use fallbacks
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        loadContent();
    }, [loadContent]);

    // Get a simple text value with fallback
    const getText = useCallback((key, fallback = '') => {
        return content[key] || fallback;
    }, [content]);

    // Get a JSON-parsed value with fallback
    const getJSON = useCallback((key, fallback = []) => {
        return parseJSON(content[key], fallback);
    }, [content]);

    // Refresh content (called after admin saves)
    const refresh = useCallback(() => {
        loadContent();
    }, [loadContent]);

    return (
        <ContentContext.Provider value={{
            content,
            loading,
            getText,
            getJSON,
            refresh,
        }}>
            {children}
        </ContentContext.Provider>
    );
}

export function useContent() {
    const ctx = useContext(ContentContext);
    if (!ctx) throw new Error('useContent must be used within <ContentProvider>');
    return ctx;
}

export default ContentContext;
