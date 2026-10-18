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
    // En la app móvil (Capacitor) el origen es https://localhost o capacitor://localhost
    const origin = typeof window !== 'undefined' ? window.location?.origin ?? '' : '';
    if (origin.includes('github.io') || origin === 'https://localhost' || origin === 'capacitor://localhost') {
        return 'https://trackerfinanciero-utg1.onrender.com';
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }

    return 'http://localhost:3001';
}

/**
 * Cabeceras autenticadas para el backend: incluye el JWT de la sesión de Supabase.
 * El backend identifica al usuario únicamente por este token.
 */
export async function getAuthHeaders(
    extra: Record<string, string> = {}
): Promise<Record<string, string>> {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

/** fetch con timeout (evita cuelgues por cold start de Render) y cabeceras autenticadas. */
export async function backendFetch(
    url: string,
    init: RequestInit = {},
    timeoutMs = 20000
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const headers = await getAuthHeaders((init.headers as Record<string, string> | undefined) ?? {});
        return await fetch(url, { ...init, headers, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}
