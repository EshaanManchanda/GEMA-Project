/**
 * Environment configuration — single source of truth
 * Uses Vite built-ins: import.meta.env.DEV/PROD/MODE
 * No manual .env config needed for environment detection
 */

export const env = {
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE as 'development' | 'production',
  enableDevtools: import.meta.env.DEV,
  logLevel: (import.meta.env.DEV
    ? 'debug'
    : 'error') as 'debug' | 'info' | 'warn' | 'error',
  get isDebugMode() { return this.isDev; },
} as const;
