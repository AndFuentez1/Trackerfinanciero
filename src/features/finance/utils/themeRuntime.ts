import { calculateProportionalTheme } from './themeCalculations';

export const DEFAULT_BASE_COLOR = '#64748b';
export const THEME_STORAGE_KEY = 'theme-base-color';
export const THEME_STORAGE_USER_KEY = 'theme-base-color-user-id';

export function getStoredThemeBaseColor(userId?: string | null): string | null {
    if (typeof window === 'undefined' || !userId) {
        return null;
    }

    const storedColor = localStorage.getItem(THEME_STORAGE_KEY);
    const storedUserId = localStorage.getItem(THEME_STORAGE_USER_KEY);

    if (!storedColor || storedUserId !== userId) {
        return null;
    }

    return storedColor;
}

export function persistThemeBaseColor(baseColor: string, userId?: string | null) {
    if (typeof window === 'undefined' || !userId) {
        return;
    }

    localStorage.setItem(THEME_STORAGE_KEY, baseColor);
    localStorage.setItem(THEME_STORAGE_USER_KEY, userId);
}

export function clearStoredThemeBaseColor() {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(THEME_STORAGE_USER_KEY);
}

export function applyThemeToDocument(baseColor: string) {
    if (typeof document === 'undefined') {
        return calculateProportionalTheme(baseColor);
    }

    const theme = calculateProportionalTheme(baseColor);
    const root = document.documentElement;

    for (const [key, value] of Object.entries(theme)) {
        root.style.setProperty(key, value);
    }

    return theme;
}
