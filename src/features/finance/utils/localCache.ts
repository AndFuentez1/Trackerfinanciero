const FINANCE_CACHE_PREFIX = 'finance-cache';
const FINANCE_CACHE_VERSION = 1;

type CachedPayload<T> = {
    version: number;
    savedAt: number;
    value: T;
};

export function buildFinanceCacheKey(scope: string, userId: string) {
    return `${FINANCE_CACHE_PREFIX}:${scope}:${userId}`;
}

export function readFinanceCache<T>(key: string, maxAgeMs: number): T | undefined {
    if (typeof window === 'undefined') {
        return undefined;
    }

    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            return undefined;
        }

        const parsed = JSON.parse(raw) as CachedPayload<T>;
        if (parsed.version !== FINANCE_CACHE_VERSION) {
            localStorage.removeItem(key);
            return undefined;
        }

        if (Date.now() - parsed.savedAt > maxAgeMs) {
            localStorage.removeItem(key);
            return undefined;
        }

        return parsed.value;
    } catch {
        localStorage.removeItem(key);
        return undefined;
    }
}

export function writeFinanceCache<T>(key: string, value: T) {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const payload: CachedPayload<T> = {
            version: FINANCE_CACHE_VERSION,
            savedAt: Date.now(),
            value,
        };

        localStorage.setItem(key, JSON.stringify(payload));
    } catch {
        // Ignore quota and serialization errors. Cache is only an optimization layer.
    }
}

const FINANCE_CACHE_SCOPES = [
    'budgets',
    'categories',
    'payment-methods',
    'profile',
    'savings-accounts',
    'savings-transactions',
] as const;

/** Elimina todas las claves finance-cache de un usuario (p. ej. tras reset de perfil). */
export function clearFinanceCacheForUser(userId: string) {
    if (typeof window === 'undefined') {
        return;
    }

    for (const scope of FINANCE_CACHE_SCOPES) {
        localStorage.removeItem(buildFinanceCacheKey(scope, userId));
    }
}
