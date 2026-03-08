const LAST_UPDATED_STORAGE_KEY = 'finance-last-updated';
const LAST_UPDATED_USER_STORAGE_KEY = 'finance-last-updated-user';

export function readStoredLastUpdated(userId?: string | null): Date | null {
    if (typeof window === 'undefined' || !userId) {
        return null;
    }

    const storedUserId = localStorage.getItem(LAST_UPDATED_USER_STORAGE_KEY);
    const storedValue = localStorage.getItem(LAST_UPDATED_STORAGE_KEY);

    if (!storedValue || storedUserId !== userId) {
        return null;
    }

    const parsed = new Date(storedValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function writeStoredLastUpdated(date: Date, userId?: string | null) {
    if (typeof window === 'undefined' || !userId) {
        return;
    }

    localStorage.setItem(LAST_UPDATED_STORAGE_KEY, date.toISOString());
    localStorage.setItem(LAST_UPDATED_USER_STORAGE_KEY, userId);
}

export function clearStoredLastUpdated() {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.removeItem(LAST_UPDATED_STORAGE_KEY);
    localStorage.removeItem(LAST_UPDATED_USER_STORAGE_KEY);
}
