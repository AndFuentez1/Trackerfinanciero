/**
 * useTheme Hook
 * 
 * Manages application theme state and CSS variable injection.
 * Extracted from useFinanceDataLogic.ts for better separation of concerns.
 */

import { useState, useEffect, useLayoutEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { THEME_OPTIONS, MASTER_PALETTE } from '../constants/themeConstants';
import { calculateProportionalTheme } from '../utils/themeCalculations';
import {
    DEFAULT_BASE_COLOR,
    applyThemeToDocument,
    persistThemeBaseColor,
} from '../utils/themeRuntime';

/**
 * Hook to manage application theme
 * @param initialColor - Initial base color (from user profile)
 * @returns Theme state and setters
 */
export function useTheme(initialColor?: string | null) {
    const { user } = useAuth();
    // NOTE: Always start with DEFAULT_BASE_COLOR — no localStorage read on init.
    // The useEffect below (Sync with initialColor from profile) overwrites this from
    // Supabase profile.base_color in ms, eliminating the Flash of Old Theme (FLOT).
    const [baseColor, setBaseColor] = useState(initialColor ?? DEFAULT_BASE_COLOR);

    const [themeVars, setThemeVars] = useState<Record<string, string>>(() =>
        calculateProportionalTheme(baseColor)
    );

    // Sync with initialColor from profile
    useEffect(() => {
        if (initialColor === undefined) { return; }

        const resolvedColor = initialColor ?? DEFAULT_BASE_COLOR;

        // Only update if the color is actually different
        if (resolvedColor !== baseColor) {
            setBaseColor(resolvedColor);
        }
    }, [initialColor, baseColor]);

    // Calculate and apply theme when baseColor changes
    useLayoutEffect(() => {
        const theme = applyThemeToDocument(baseColor);
        setThemeVars(theme);

        // Persist to localStorage
        persistThemeBaseColor(baseColor, user?.id);
    }, [baseColor, user?.id]);

    return {
        baseColor,
        setBaseColor,
        themeVars,
        themeOptions: THEME_OPTIONS,
        masterPalette: MASTER_PALETTE,
    };
}
