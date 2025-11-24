/**
 * Production-safe console wrapper
 * Only logs in development, suppresses in production
 */

const isDevelopment = import.meta.env.VITE_MODE === 'development';

export const console = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      window.console.log(...args);
    }
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      window.console.warn(...args);
    }
  },

  error: (...args: any[]) => {
    // Always log errors, even in production
    window.console.error(...args);
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      window.console.info(...args);
    }
  },

  debug: (...args: any[]) => {
    if (isDevelopment) {
      window.console.debug(...args);
    }
  },

  table: (...args: any[]) => {
    if (isDevelopment) {
      window.console.table(...args);
    }
  },

  group: (...args: any[]) => {
    if (isDevelopment) {
      window.console.group(...args);
    }
  },

  groupEnd: () => {
    if (isDevelopment) {
      window.console.groupEnd();
    }
  },
};

export default console;