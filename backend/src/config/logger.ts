import * as winston from "winston";
import { config } from "./env";
import * as fs from "fs";
import * as path from "path";

// Ensure logs directory exists
const logsDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.printf(
  ({ level, message, timestamp, ...meta }) => {
    return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
  },
);

// Create the logger instance
const logger = winston.createLogger({
  level: config.nodeEnv === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  defaultMeta: { service: "gema-backend" },
  transports: [
    // Write all logs with level 'error' and below to 'error.log'
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
    }),
    // Write all logs with level 'info' and below to 'combined.log'
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
    }),
  ],
});

// If we're not in production, also log to the console with a simpler format
if (config.nodeEnv !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        logFormat,
      ),
    }),
  );
}

const customLogger = Object.assign(logger, {
  /**
   * Log with a custom prefix for better categorization
   */
  tagged: (tag: string, ...args: any[]): void => {
    if (config.nodeEnv !== "production") {
      // Flatten all args into a single string so Winston doesn't treat
      // the second argument as a metadata object (which spreads strings
      // into {0:'h', 1:'t', ...} character-index objects).
      const msg = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
      logger.info(`[${tag}] ${msg}`);
    }
  },

  /**
   * Log API requests (development only)
   */
  api: (method: string, endpoint: string, data?: any): void => {
    if (config.nodeEnv !== "production") {
      logger.info(`[API] ${method.toUpperCase()} ${endpoint}`, data || "");
    }
  },

  /**
   * Log database operations (development only)
   */
  db: (operation: string, collection: string, data?: any): void => {
    if (config.nodeEnv !== "production") {
      logger.info(`[DB] ${operation} on ${collection}`, data || "");
    }
  },

  /**
   * Log authentication events (development only)
   */
  auth: (event: string, data?: any): void => {
    if (config.nodeEnv !== "production") {
      logger.info(`[AUTH] ${event}`, data || "");
    }
  },

  /**
   * Log payment events (development only)
   */
  payment: (event: string, data?: any): void => {
    if (config.nodeEnv !== "production") {
      logger.info(`[PAYMENT] ${event}`, data || "");
    }
  },

  /**
   * Check if logging is enabled
   */
  isEnabled: (): boolean => config.nodeEnv !== "production",
});

export default customLogger;
