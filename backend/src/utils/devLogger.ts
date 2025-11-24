/**
 * Development Logger Utility
 * Only displays logs when MODE=development in .env
 */

const isDevelopment = process.env.MODE === 'development';

/**
 * Development-only logger
 * Logs are only displayed when MODE=development
 */
export const devLog = {
  /**
   * Log general information (development only)
   */
  log: (...args: any[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log informational messages (development only)
   */
  info: (...args: any[]): void => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Log debug information (development only)
   */
  debug: (...args: any[]): void => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Log warnings (always shown, regardless of environment)
   */
  warn: (...args: any[]): void => {
    console.warn(...args);
  },

  /**
   * Log errors (always shown, regardless of environment)
   */
  error: (...args: any[]): void => {
    console.error(...args);
  },

  /**
   * Log with a custom prefix for better categorization
   */
  tagged: (tag: string, ...args: any[]): void => {
    if (isDevelopment) {
      console.log(`[${tag}]`, ...args);
    }
  },

  /**
   * Log API requests (development only)
   */
  api: (method: string, endpoint: string, data?: any): void => {
    if (isDevelopment) {
      console.log(`🔵 [API] ${method.toUpperCase()} ${endpoint}`, data || '');
    }
  },

  /**
   * Log database operations (development only)
   */
  db: (operation: string, collection: string, data?: any): void => {
    if (isDevelopment) {
      console.log(`🗄️  [DB] ${operation} on ${collection}`, data || '');
    }
  },

  /**
   * Log authentication events (development only)
   */
  auth: (event: string, data?: any): void => {
    if (isDevelopment) {
      console.log(`🔐 [AUTH] ${event}`, data || '');
    }
  },

  /**
   * Log payment events (development only)
   */
  payment: (event: string, data?: any): void => {
    if (isDevelopment) {
      console.log(`💳 [PAYMENT] ${event}`, data || '');
    }
  },

  /**
   * Check if logging is enabled
   */
  isEnabled: (): boolean => isDevelopment
};

/**
 * Simple wrapper for quick migration
 * Usage: Replace console.log with devLogger.log
 */
export const devLogger = devLog;

export default devLog;
