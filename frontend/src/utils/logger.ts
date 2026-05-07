// Frontend Logger Utility
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
  context?: string;
}

class Logger {
  private isDebug: boolean;
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  constructor() {
    this.isDebug = !!import.meta.env.VITE_DEV && ((import.meta.env.VITE_ENABLE_LOGS as any) === 'true');
  }

  /**
   * General purpose log (alias for debug)
   */
  log(...args: any[]): void {
    if (this.isDebug) {
      console.log('[DEBUG]', ...args);
    }
    this.addToStore('debug', args[0], args.slice(1));
  }

  debug(message: string, data?: any, context?: string): void {
    this.logInternal('debug', message, data, context);
  }

  info(message: string, data?: any, context?: string): void {
    this.logInternal('info', message, data, context);
  }

  warn(message: string, data?: any, context?: string): void {
    this.logInternal('warn', message, data, context);
  }

  error(message: string, data?: any, context?: string): void {
    this.logInternal('error', message, data, context);
  }

  /**
   * Log data in table format
   */
  table(data: any): void {
    if (this.isDebug) {
      console.table(data);
    }
  }

  /**
   * Start a console group
   */
  group(label: string): void {
    if (this.isDebug) {
      console.group(label);
    }
  }

  /**
   * End console group
   */
  groupEnd(): void {
    if (this.isDebug) {
      console.groupEnd();
    }
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled(): boolean {
    return this.isDebug;
  }

  private logInternal(level: LogLevel, message: string, data?: any, context?: string): void {
    this.addToStore(level, message, data, context);

    // Console output when debug mode enabled
    if (this.isDebug) {
      const prefix = context ? `[${context}] ` : '';
      const logMessage = `${prefix}${message}`;

      switch (level) {
        case 'debug':
          console.debug(logMessage, data);
          break;
        case 'info':
          console.info(logMessage, data);
          break;
        case 'warn':
          console.warn(logMessage, data);
          break;
        case 'error':
          console.error(logMessage, data);
          break;
      }
    }
  }

  private addToStore(level: LogLevel, message: string, data?: any, context?: string): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
      context
    };

    // Add to internal log store
    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const logger = new Logger();
export default logger;