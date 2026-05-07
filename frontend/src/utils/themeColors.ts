export type ColorScale = {
    DEFAULT: string;
    dark?: string;
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
};

// Start Week on Sunday as per some locales, or just index 0 = Sunday, 1 = Monday...
// JS Date.getDay() returns 0 for Sunday, 1 for Monday, etc.

export const dailyThemes: Record<number, { name: string; colors: ColorScale }> = {
    // Sunday: Blue (Calm/Professional)
    0: {
        name: 'Sunday Blue',
        colors: {
            DEFAULT: '#3b82f6',
            dark: '#2563eb',
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
            950: '#172554',
        },
    },
    // Monday: Orange (Energy/New Week - Matches original brand)
    1: {
        name: 'Monday Orange',
        colors: {
            DEFAULT: '#f8962b',
            dark: '#e07d14',
            50: '#fff8f0',
            100: '#fff0db',
            200: '#ffddb3',
            300: '#ffc580',
            400: '#faa94d',
            500: '#f8962b',
            600: '#e07d14',
            700: '#bb6210',
            800: '#964e0d',
            900: '#7a3f0b',
            950: '#462105',
        },
    },
    // Tuesday: Red (Passion/Action - UAE Flag Red)
    2: {
        name: 'Tuesday Red',
        colors: {
            DEFAULT: '#ef4444',
            dark: '#dc2626',
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#ef4444',
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d',
            950: '#450a0a',
        },
    },
    // Wednesday: Green (Growth/Balance - UAE Flag Green)
    3: {
        name: 'Wednesday Green',
        colors: {
            DEFAULT: '#22c55e',
            dark: '#16a34a',
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
            950: '#052e16',
        },
    },
    // Thursday: Teal/Cyan (Refreshing/Pre-weekend)
    4: {
        name: 'Thursday Teal',
        colors: {
            DEFAULT: '#14b8a6',
            dark: '#0d9488',
            50: '#f0fdfa',
            100: '#ccfbf1',
            200: '#99f6e4',
            300: '#5eead4',
            400: '#2dd4bf',
            500: '#14b8a6',
            600: '#0d9488',
            700: '#0f766e',
            800: '#115e59',
            900: '#134e4a',
            950: '#042f2e',
        },
    },
    // Friday: Gold/Amber (Celebration/Holy Day)
    5: {
        name: 'Friday Gold',
        colors: {
            DEFAULT: '#f59e0b',
            dark: '#d97706',
            50: '#fffbeb',
            100: '#fef3c7',
            200: '#fde68a',
            300: '#fcd34d',
            400: '#fbbf24',
            500: '#f59e0b',
            600: '#d97706',
            700: '#b45309',
            800: '#92400e',
            900: '#78350f',
            950: '#451a03',
        },
    },
    // Saturday: Purple (Luxury/Fun)
    6: {
        name: 'Saturday Purple',
        colors: {
            DEFAULT: '#a855f7',
            dark: '#9333ea',
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff',
            300: '#d8b4fe',
            400: '#c084fc',
            500: '#a855f7',
            600: '#9333ea',
            700: '#7e22ce',
            800: '#6b21a8',
            900: '#581c87',
            950: '#3b0764',
        },
    },
};

export const getThemeForDay = (date: Date = new Date()) => {
    const day = date.getDay();
    return dailyThemes[day];
};
