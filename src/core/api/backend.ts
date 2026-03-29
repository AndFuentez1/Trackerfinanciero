export function getBackendUrl(): string {
    const raw = import.meta.env.VITE_BACKEND_URL;

    if (raw && raw.trim()) {
        return raw.replace(/\/$/, '');
    }

    // En desarrollo local (Vite proxy o ejecución directa)
    if (import.meta.env.DEV) {
        return '';
    }

    // Fallback para producción si no se definió VITE_BACKEND_URL
    // En GitHub Pages window.location.origin no es el backend, así que esto es un aviso
    if (typeof window !== 'undefined' && window.location?.origin?.includes('github.io')) {
        return 'https://trackerfinanciero-utg1.onrender.com';
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }

    return 'http://localhost:3001';
}
