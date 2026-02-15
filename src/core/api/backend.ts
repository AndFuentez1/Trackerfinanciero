export function getBackendUrl(): string {
    const raw = import.meta.env.VITE_BACKEND_URL;
    if (raw && raw.trim()) {
        return raw.replace(/\/$/, '');
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }

    // Fallback for non-browser contexts
    return 'http://localhost:3001';
}
