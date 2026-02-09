/**
 * Theme Constants and Presets
 * 
 * Predefined theme configurations for the application.
 * Extracted from useFinanceDataLogic.ts for better organization.
 */

import type { AppThemeKey, ThemePreset } from '../utils/themeCalculations';
import { parseHSLString, hslToHex } from '../utils/themeCalculations';

export const APP_THEME_PRESETS: Record<AppThemeKey, ThemePreset> = {
    gray: {
        label: 'Gris',
        swatch: '220 10% 60%',
        vars: {
            '--primary': '220 10% 60%',
            '--primary-foreground': '0 0% 100%',
            '--secondary': '220 10% 96%',
            '--secondary-foreground': '220 10% 10%',
            '--muted': '220 5% 96%',
            '--muted-foreground': '220 5% 45%',
            '--accent': '220 10% 94%',
            '--accent-foreground': '220 10% 10%',
            '--card': '0 0% 100%',
            '--card-soft': '220 5% 98%',
            '--card-bg-light': '220 5% 99%',
            '--border': '220 10% 90%',
            '--input': '220 10% 92%',
            '--ring': '220 10% 60%',
            '--sidebar-background': '0 0% 98%',
            '--sidebar-foreground': '220 5% 40%',
            '--sidebar-primary': '220 10% 60%',
            '--sidebar-primary-foreground': '0 0% 100%',
            '--sidebar-accent': '220 10% 94%',
            '--sidebar-accent-foreground': '220 10% 10%',
            '--sidebar-border': '220 10% 90%',
            '--sidebar-ring': '220 10% 60%',
            '--income': '152 60% 42%',
            '--expense': '0 84% 60%',
            '--savings': '220 10% 60%',
        },
    },
    teal: {
        label: 'Teal',
        swatch: '175 75% 40%',
        vars: {
            '--primary': '175 75% 40%',
            '--primary-foreground': '0 0% 100%',
            '--secondary': '175 25% 96%',
            '--secondary-foreground': '175 40% 20%',
            '--muted': '175 15% 96%',
            '--muted-foreground': '175 10% 45%',
            '--accent': '175 20% 94%',
            '--accent-foreground': '175 40% 20%',
            '--card': '0 0% 100%',
            '--card-soft': '175 15% 98%',
            '--card-bg-light': '175 10% 99%',
            '--border': '175 20% 90%',
            '--input': '175 20% 92%',
            '--ring': '175 75% 45%',
            '--sidebar-background': '0 0% 98%',
            '--sidebar-foreground': '175 15% 35%',
            '--sidebar-primary': '175 75% 40%',
            '--sidebar-primary-foreground': '0 0% 100%',
            '--sidebar-accent': '175 15% 94%',
            '--sidebar-accent-foreground': '175 40% 20%',
            '--sidebar-border': '175 20% 90%',
            '--sidebar-ring': '175 75% 45%',
            '--income': '152 60% 42%',
            '--expense': '0 84% 60%',
            '--savings': '175 75% 40%',
        },
    },
    blue: {
        label: 'Azul',
        swatch: '220 85% 55%',
        vars: {
            '--primary': '220 85% 55%',
            '--primary-foreground': '0 0% 100%',
            '--secondary': '220 20% 96%',
            '--secondary-foreground': '220 50% 20%',
            '--muted': '220 10% 96%',
            '--muted-foreground': '220 10% 45%',
            '--accent': '220 20% 94%',
            '--accent-foreground': '220 50% 20%',
            '--card': '0 0% 100%',
            '--card-soft': '220 10% 98%',
            '--card-bg-light': '220 10% 99%',
            '--border': '220 15% 90%',
            '--input': '220 15% 92%',
            '--ring': '220 85% 55%',
            '--sidebar-background': '0 0% 98%',
            '--sidebar-foreground': '220 10% 40%',
            '--sidebar-primary': '220 85% 55%',
            '--sidebar-primary-foreground': '0 0% 100%',
            '--sidebar-accent': '220 15% 94%',
            '--sidebar-accent-foreground': '220 50% 20%',
            '--sidebar-border': '220 15% 90%',
            '--sidebar-ring': '220 85% 55%',
            '--income': '152 60% 42%',
            '--expense': '0 84% 60%',
            '--savings': '220 85% 55%',
        },
    },
    avocado: {
        label: 'Aguacate',
        swatch: '88 50% 53%',
        vars: {
            '--primary': '88 50% 53%',
            '--primary-foreground': '0 0% 100%',
            '--secondary': '88 20% 96%',
            '--secondary-foreground': '88 40% 20%',
            '--muted': '88 10% 96%',
            '--muted-foreground': '88 10% 45%',
            '--accent': '88 20% 94%',
            '--accent-foreground': '88 40% 20%',
            '--card': '0 0% 100%',
            '--card-soft': '88 10% 98%',
            '--card-bg-light': '88 10% 99%',
            '--border': '88 15% 90%',
            '--input': '88 15% 92%',
            '--ring': '88 50% 53%',
            '--sidebar-background': '0 0% 98%',
            '--sidebar-foreground': '88 10% 40%',
            '--sidebar-primary': '88 50% 53%',
            '--sidebar-primary-foreground': '0 0% 100%',
            '--sidebar-accent': '88 15% 94%',
            '--sidebar-accent-foreground': '88 40% 20%',
            '--sidebar-border': '88 15% 90%',
            '--sidebar-ring': '88 50% 53%',
            '--income': '152 60% 42%',
            '--expense': '0 84% 60%',
            '--savings': '88 50% 53%',
        },
    },
    violet: {
        label: 'Violeta',
        swatch: '265 85% 60%',
        vars: {
            '--primary': '265 85% 60%',
            '--primary-foreground': '0 0% 100%',
            '--secondary': '265 20% 96%',
            '--secondary-foreground': '265 40% 20%',
            '--muted': '265 10% 96%',
            '--muted-foreground': '265 10% 45%',
            '--accent': '265 20% 94%',
            '--accent-foreground': '265 40% 20%',
            '--card': '0 0% 100%',
            '--card-soft': '265 10% 98%',
            '--card-bg-light': '265 10% 99%',
            '--border': '265 15% 90%',
            '--input': '265 15% 92%',
            '--ring': '265 85% 60%',
            '--sidebar-background': '0 0% 98%',
            '--sidebar-foreground': '265 10% 40%',
            '--sidebar-primary': '265 85% 60%',
            '--sidebar-primary-foreground': '0 0% 100%',
            '--sidebar-accent': '265 15% 94%',
            '--sidebar-accent-foreground': '265 40% 20%',
            '--sidebar-border': '265 15% 90%',
            '--sidebar-ring': '265 85% 60%',
            '--income': '152 60% 42%',
            '--expense': '0 84% 60%',
            '--savings': '265 85% 60%',
        },
    },
    rose: {
        label: 'Rosa',
        swatch: '330 80% 60%',
        vars: {
            '--primary': '330 80% 60%',
            '--primary-foreground': '0 0% 100%',
            '--secondary': '330 20% 96%',
            '--secondary-foreground': '330 40% 20%',
            '--muted': '330 10% 96%',
            '--muted-foreground': '330 5% 45%',
            '--accent': '330 20% 94%',
            '--accent-foreground': '330 40% 20%',
            '--card': '0 0% 100%',
            '--card-soft': '330 10% 98%',
            '--card-bg-light': '330 10% 99%',
            '--border': '330 10% 90%',
            '--input': '330 10% 92%',
            '--ring': '330 80% 60%',
            '--sidebar-background': '0 0% 98%',
            '--sidebar-foreground': '330 5% 40%',
            '--sidebar-primary': '330 80% 60%',
            '--sidebar-primary-foreground': '0 0% 100%',
            '--sidebar-accent': '330 10% 94%',
            '--sidebar-accent-foreground': '330 40% 20%',
            '--sidebar-border': '330 10% 90%',
            '--sidebar-ring': '330 80% 60%',
            '--income': '152 60% 42%',
            '--expense': '0 84% 60%',
            '--savings': '330 80% 60%',
        },
    },
};

export const APP_THEME_OPTIONS: { key: AppThemeKey; label: string; swatch: string }[] =
    (Object.entries(APP_THEME_PRESETS) as [AppThemeKey, ThemePreset][]).map(([key, preset]) => ({
        key,
        label: preset.label,
        swatch: preset.swatch,
    }));

export const THEME_OPTIONS = APP_THEME_OPTIONS.map(opt => {
    const { h, s, l } = parseHSLString(opt.swatch);
    return {
        label: opt.label,
        hex: hslToHex(h, s, l),
    };
});

/**
 * Master color palette for categories and visual elements
 */
export const MASTER_PALETTE = [
    '#EF4444', // red-500
    '#F97316', // orange-500
    '#F59E0B', // amber-500
    '#EAB308', // yellow-500
    '#84CC16', // lime-500
    '#10B981', // emerald-500
    '#14B8A6', // teal-500
    '#06B6D4', // cyan-500
    '#3B82F6', // blue-500
    '#8B5CF6', // violet-500
    '#A855F7', // purple-500
    '#EC4899', // pink-500
    '#F43F5E', // rose-500
    '#FB923C', // orange-400
    '#FBBF24', // amber-400
    '#FCD34D', // yellow-400
    '#A3E635', // lime-400
    '#34D399', // emerald-400
    '#2DD4BF', // teal-400
    '#22D3EE', // cyan-400
    '#60A5FA', // blue-400
    '#A78BFA', // violet-400
    '#C084FC', // purple-400
    '#F472B6', // pink-400
    '#FB7185', // rose-400
    '#DC2626', // red-600
    '#EA580C', // orange-600
    '#D97706', // amber-600
    '#CA8A04', // yellow-600
    '#65A30D', // lime-600
    '#059669', // emerald-600
    '#0D9488', // teal-600
    '#0891B2', // cyan-600
    '#2563EB', // blue-600
    '#7C3AED', // violet-600
    '#9333EA', // purple-600
    '#DB2777', // pink-600
    '#E11D48', // rose-600
    '#64748B', // slate-500
    '#6B7280', // gray-500
];
