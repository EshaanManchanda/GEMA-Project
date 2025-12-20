/**
 * Application configuration
 * Centralizes environment variables and app settings
 */

export const config = {
  // API Configuration
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  apiTimeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,

  // App Configuration
  appName: import.meta.env.VITE_APP_NAME || 'Gema',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  appUrl: import.meta.env.VITE_APP_URL || 'http://localhost:5173',

  // Development
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  enableDevtools: import.meta.env.VITE_ENABLE_DEVTOOLS === 'true',
  logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',

  // Debug mode
  get isDebugMode() {
    return this.isDevelopment || this.logLevel === 'debug';
  },
} as const;

/**
 * Logger utility respecting debug mode
 */
export const logger = {
  debug: (...args: any[]) => {
    if (config.isDebugMode) {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (config.isDebugMode || config.logLevel === 'info') {
      console.info('[INFO]', ...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
};
