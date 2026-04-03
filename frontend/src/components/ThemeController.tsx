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
                root.style.setProperty('--color-primary-DEFAULT', hexToRgb(theme.colors.DEFAULT));
                root.style.setProperty('--color-primary-dark', hexToRgb(theme.colors.dark || theme.colors[600]));

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

// Helper to convert hex to space-separated RGB for Tailwind opacity modifier support
// e.g. #f8962b -> "248 150 43"
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
        : '0 0 0'; // Fallback
};
