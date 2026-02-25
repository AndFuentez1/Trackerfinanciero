/**
 * useTheme Hook
 * 
 * Manages application theme state and CSS variable injection.
 * Extracted from useFinanceDataLogic.ts for better separation of concerns.
 */

import { useState, useEffect, useLayoutEffect } from 'react';
import { calculateProportionalTheme } from '../utils/themeCalculations';
import { THEME_OPTIONS, MASTER_PALETTE } from '../constants/themeConstants';

const DEFAULT_BASE_COLOR = '#64748b'; // Slate Gray (System Neutral)

/**
 * Hook to manage application theme
 * @param initialColor - Initial base color (from user profile)
 * @returns Theme state and setters
 */
export function useTheme(initialColor?: string) {
    const [baseColor, setBaseColor] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('theme-base-color');
            const hasSession = Object.keys(localStorage).some(k => k.includes('supabase') || k.startsWith('sb-'));

            // If we have a session and a stored color, use it.
            // If no session, go to default (Neutral Gray).
            if (hasSession && stored) return stored;
            return DEFAULT_BASE_COLOR;
        }
        return initialColor || DEFAULT_BASE_COLOR;
    });

    const [themeVars, setThemeVars] = useState<Record<string, string>>(() =>
        calculateProportionalTheme(baseColor)
    );

    // Sync with initialColor from profile
    useEffect(() => {
        if (!initialColor) return;

        // Only update if the color is actually different
        if (initialColor !== baseColor) {
            setBaseColor(initialColor);
        }
    }, [initialColor]);

    // Calculate and apply theme when baseColor changes
    useLayoutEffect(() => {
        const theme = calculateProportionalTheme(baseColor);
        setThemeVars(theme);

        // Inject CSS variables into document root
        const root = document.documentElement;
        for (const [key, value] of Object.entries(theme)) {
            root.style.setProperty(key, value);
        }

        // Persist to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('theme-base-color', baseColor);
        }
    }, [baseColor]);

    return {
        baseColor,
        setBaseColor,
        themeVars,
        themeOptions: THEME_OPTIONS,
        masterPalette: MASTER_PALETTE,
    };
}
