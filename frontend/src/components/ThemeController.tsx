import { useEffect } from 'react';
import { getThemeForDay } from '../utils/themeColors';
import logger from '../utils/logger';

export const ThemeController = () => {
    useEffect(() => {
        const applyTheme = () => {
            const today = new Date();
            const theme = getThemeForDay(today);
            const root = document.documentElement;

            if (theme) {
                // Set basic colors
                // The primary colour is used as text on white and as a background
                // behind white text, so it must reach WCAG AA (4.5:1) on white.
                // Most daily palettes' DEFAULT doesn't; use the first shade that does.
                const shades = ACCESSIBLE_ORDER.map((k) => theme.colors[k as keyof typeof theme.colors]).filter(Boolean) as string[];
                const i = Math.max(0, shades.findIndex((hex) => contrastOnWhite(hex) >= 4.5));
                root.style.setProperty('--color-primary-DEFAULT', hexToRgb(shades[i]));
                root.style.setProperty('--color-primary-dark', hexToRgb(shades[i + 1] || shades[i]));

                // Set shade colors
                Object.entries(theme.colors).forEach(([key, value]) => {
                    if (key !== 'DEFAULT' && key !== 'dark') {
                        root.style.setProperty(`--color-primary-${key}`, hexToRgb(value));
                    }
                });

                logger.debug('Applied daily theme', { theme: theme.name });
            }
        };

        applyTheme();

        // Optional: Re-check theme if the app stays open overnight?
        // For now, simpler is better.
    }, []);

    return null;
};

const ACCESSIBLE_ORDER = ['DEFAULT', '600', '700', '800', '900'];

// WCAG 2.1 relative luminance → contrast ratio against white
const contrastOnWhite = (hex: string) => {
    const [r, g, b] = hexToRgb(hex).split(' ').map((v) => {
        const c = Number(v) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
};

// Helper to convert hex to space-separated RGB for Tailwind opacity modifier support
// e.g. #f8962b -> "248 150 43"
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
        : '0 0 0'; // Fallback
};
