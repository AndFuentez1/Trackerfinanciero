/**
 * Theme Calculation Utilities
 * 
 * Pure functions for color manipulation and theme generation.
 * Extracted from useFinanceDataLogic.ts for better maintainability.
 */

export type AppThemeKey = 'gray' | 'teal' | 'blue' | 'avocado' | 'violet' | 'rose';

export type ThemePreset = {
    label: string;
    swatch: string;
    vars: Record<string, string>;
};

/**
 * Convert hex color to HSL
 * @param hex - Hex color string (e.g., "#64748b")
 * @returns HSL object with h (0-360), s (0-100), l (0-100)
 */
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
    // Enforce valid hex format
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
        return { h: 220, s: 10, l: 40 }; // Fallback to gray
    }
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

/**
 * Parse HSL string to object
 * @param hsl - HSL string (e.g., "220 10% 60%" or "hsl(220, 10%, 60%)")
 * @returns HSL object
 */
export function parseHSLString(hsl: string): { h: number; s: number; l: number } {
    // Remove hsl() wrapper and commas if present
    const clean = hsl.replace(/hsl\(|\)|%/g, '').replace(/,/g, ' ');
    const parts = clean.trim().split(/\s+/);
    const h = parseInt(parts[0] ?? '0', 10);
    const s = parseInt(parts[1] ?? '0', 10);
    const l = parseInt(parts[2] ?? '0', 10);
    return { h, s, l };
}

/**
 * Convert HSL to hex
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns Hex color string
 */
export function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    const r = Math.round(f(0) * 255);
    const g = Math.round(f(8) * 255);
    const b = Math.round(f(4) * 255);
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert theme var value to hex
 * @param varValue - CSS variable value (e.g., "220 10% 60%")
 * @returns Hex color string
 */
export function themeVarToHex(varValue: string): string {
    const { h, s, l } = parseHSLString(varValue);
    return hslToHex(h, s, l);
}

/**
 * Clamp a value between min and max
 */
function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val));
}

/**
 * Calculate proportional theme based on a base color
 * @param baseColorHex - Base color in hex format
 * @returns Record of CSS variable names to HSL values
 */
export function calculateProportionalTheme(baseColorHex: string): Record<string, string> {
    const baseHSL = hexToHSL(baseColorHex);
    const { h, s, l } = baseHSL;
    const themeVars: Record<string, string> = {};

    // Fondos y superficies NEUTROS (constantes)
    themeVars['--background'] = '0 0% 100%'; // blanco
    themeVars['--foreground'] = '220 15% 15%';
    themeVars['--container'] = '220 15% 97%';
    themeVars['--card'] = '0 0% 100%';
    themeVars['--card-foreground'] = '220 15% 15%';
    themeVars['--border'] = '220 13% 90%';
    themeVars['--muted'] = '220 15% 96%';
    themeVars['--muted-foreground'] = '220 10% 40%'; // Improved contrast (was 45%)
    themeVars['--input'] = '0 0% 100%';

    // Accent tokens premium
    // Accent fuerte: para CTA, pill, estado activo
    const accentPrimaryS = Math.min(s, 45);
    const accentPrimaryL = Math.max(l, 48);
    themeVars['--accent-primary'] = `${h} ${accentPrimaryS}% ${accentPrimaryL}%`;
    themeVars['--primary'] = themeVars['--accent-primary'];

    // Dynamic Primary Foreground based on L (Level AA safety)
    // If lightness is high (> 65%), use dark text
    themeVars['--primary-foreground'] = accentPrimaryL > 65 ? '220 15% 15%' : '0 0% 100%';

    // Accent soft: para hover, focus, iconos activos, tabs activos
    const accentSoftS = Math.round(accentPrimaryS * 0.4);
    const accentSoftL = Math.min(accentPrimaryL + 10, 96);
    themeVars['--accent-soft'] = `${h} ${accentSoftS}% ${accentSoftL}%`;

    // Accent soft bg: para fondos sutiles de hover/focus
    const accentSoftBgS = Math.round(accentPrimaryS * 0.25);
    const accentSoftBgL = Math.min(accentPrimaryL + 16, 98);
    themeVars['--accent-soft-bg'] = `${h} ${accentSoftBgS}% ${accentSoftBgL}%`;

    // Accent soft border: para bordes activos
    const accentSoftBorderS = Math.round(accentPrimaryS * 0.35);
    const accentSoftBorderL = Math.min(accentPrimaryL + 4, 92);
    themeVars['--accent-soft-border'] = `${h} ${accentSoftBorderS}% ${accentSoftBorderL}%`;

    // Accent disabled: para estados deshabilitados
    const accentDisabledS = Math.round(accentPrimaryS * 0.18);
    const accentDisabledL = Math.min(accentPrimaryL + 24, 98);
    themeVars['--accent-disabled'] = `${h} ${accentDisabledS}% ${accentDisabledL}%`;

    // Accent general para compatibilidad
    themeVars['--accent'] = themeVars['--accent-soft'];
    themeVars['--accent-foreground'] = '220 15% 15%';
    themeVars['--ring'] = themeVars['--accent-primary'];

    // Secondary, Destructive, Popover
    themeVars['--secondary'] = '220 15% 96%';
    themeVars['--secondary-foreground'] = '220 15% 15%';
    themeVars['--destructive'] = '0 84% 60%';
    themeVars['--destructive-foreground'] = '0 0% 100%';
    themeVars['--popover'] = '0 0% 100%';
    themeVars['--popover-foreground'] = '220 15% 15%';

    // Variables personalizadas del sistema
    themeVars['--bg-app'] = themeVars['--background'];
    themeVars['--bg-container'] = themeVars['--container'];

    // Semantic Layers
    themeVars['--border-card'] = themeVars['--border'];
    themeVars['--border-form'] = themeVars['--border'];
    themeVars['--border-table'] = themeVars['--border'];
    themeVars['--border-button'] = themeVars['--border'];
    themeVars['--border-container'] = themeVars['--border'];

    // Backgrounds
    themeVars['--bg-card'] = themeVars['--card'];
    themeVars['--bg-card-inner'] = themeVars['--card'];
    themeVars['--bg-input'] = themeVars['--input'];

    // --- ALIASES FOR TAILWIND CONFIG COMPATIBILITY ---
    themeVars['--color-background'] = themeVars['--background'];
    themeVars['--color-foreground'] = themeVars['--foreground'];
    themeVars['--color-primary'] = themeVars['--primary'];
    themeVars['--color-primary-foreground'] = themeVars['--primary-foreground'];
    themeVars['--color-secondary'] = themeVars['--secondary'];
    themeVars['--color-secondary-foreground'] = themeVars['--secondary-foreground'];
    themeVars['--color-muted'] = themeVars['--muted'];
    themeVars['--color-muted-foreground'] = themeVars['--muted-foreground'];
    themeVars['--color-accent'] = themeVars['--accent'];
    themeVars['--color-accent-foreground'] = themeVars['--accent-foreground'];
    themeVars['--color-popover'] = themeVars['--popover'];
    themeVars['--color-popover-foreground'] = themeVars['--popover-foreground'];
    themeVars['--color-card'] = themeVars['--card'];
    themeVars['--color-card-foreground'] = themeVars['--card-foreground'];
    themeVars['--color-border'] = themeVars['--border'];
    themeVars['--color-input'] = themeVars['--input'];

    // Income/Expense/Savings
    themeVars['--income'] = '152 60% 42%';
    themeVars['--expense'] = '0 84% 60%';
    themeVars['--savings'] = themeVars['--primary'];

    return themeVars;
}

/**
 * Calculate relative luminance for WCAG contrast calculation
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map(val => {
        const v = val / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate WCAG contrast ratio between two colors
 * Returns ratio and WCAG level (AAA, AA, or FAIL)
 */
export function getContrastRatio(
    foregroundHex: string,
    backgroundHex: string
): { ratio: number; level: 'AAA' | 'AA' | 'FAIL' } {
    // Parse hex colors
    const fgHex = foregroundHex.replace('#', '');
    const bgHex = backgroundHex.replace('#', '');

    const fg = {
        r: parseInt(fgHex.substring(0, 2), 16),
        g: parseInt(fgHex.substring(2, 4), 16),
        b: parseInt(fgHex.substring(4, 6), 16),
    };

    const bg = {
        r: parseInt(bgHex.substring(0, 2), 16),
        g: parseInt(bgHex.substring(2, 4), 16),
        b: parseInt(bgHex.substring(4, 6), 16),
    };

    const lFg = getLuminance(fg.r, fg.g, fg.b);
    const lBg = getLuminance(bg.r, bg.g, bg.b);

    const lighter = Math.max(lFg, lBg);
    const darker = Math.min(lFg, lBg);

    const ratio = (lighter + 0.05) / (darker + 0.05);

    // WCAG levels: AAA >= 7, AA >= 4.5
    const level = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'FAIL';

    return { ratio: Math.round(ratio * 100) / 100, level };
}
