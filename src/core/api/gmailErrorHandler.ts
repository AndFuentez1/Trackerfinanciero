import { toast } from 'sonner';

// Store original fetch
const originalFetch = window.fetch;

// Global fetch wrapper to handle Gmail token expiration
window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    // Clone response to read body without consuming it
    const clonedResponse = response.clone();

    // Check for 401 errors with TOKEN_EXPIRED code
    if (response.status === 401) {
        try {
            const data = await clonedResponse.json();

            if (data.code === 'TOKEN_EXPIRED' || data.requiresReauth) {
                toast.error('Tu sesión de Gmail expiró', {
                    description: 'Haz clic en "Reconectar" para continuar',
                    duration: 10000,
                    action: {
                        label: 'Ir a Configuración',
                        onClick: () => {
                            window.location.href = '/configuracion';
                        }
                    }
                });
            }
        } catch (e) {
            // Not JSON or other error, ignore
        }
    }

    return response;
};

export function setupGmailErrorHandler() {
    // Handler is set up when this module is imported
}
