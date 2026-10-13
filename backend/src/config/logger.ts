import * as winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { config } from "./env";
import * as fs from "fs";
import * as path from "path";
import * as util from "util";

// Ensure logs directory exists
const logsDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true, mode: 0o750 });
}

// Safe stringify that handles circular structures
function safeStringify(obj: any): string {
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (_key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }
      return value;
    }, 2);
  } catch (e) {
    // Fallback to util.inspect for complex objects
    return util.inspect(obj, { depth: 4, colors: false });
  }
}

// Define log format
const logFormat = winston.format.printf(
  ({ level, message, timestamp, ...meta }) => {
    return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? safeStringify(meta) : ""}`;
  },
);

// One file per day, gzipped once rotated, deleted after the retention window.
// Override with LOG_RETENTION_DAYS / ERROR_LOG_RETENTION_DAYS (whole days).
const retentionDays = (envVar: string, fallback: number): number => {
  const n = parseInt(process.env[envVar] || "", 10);
  return n > 0 ? n : fallback;
};
// PM2 sets `name` per app, so the API and worker rotate their own files and
// audit JSON instead of pruning each other's.
const filePrefix = process.env.name ? `${process.env.name}-` : "";
const rotatingFile = (kind: string, days: number, level?: string) =>
  new DailyRotateFile({
    dirname: logsDir,
    filename: `${filePrefix}${kind}-%DATE%.log`,
    datePattern: "YYYY-MM-DD",
    level,
    zippedArchive: true,
    maxFiles: `${days}d`,
    // Owner + group only: logs contain emails/IPs.
    options: { flags: "a", mode: 0o640 },
  });

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
    rotatingFile("error", retentionDays("ERROR_LOG_RETENTION_DAYS", 30), "error"),
    rotatingFile("combined", retentionDays("LOG_RETENTION_DAYS", 15)),
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
      const msg = args.map(a => (typeof a === "object" ? safeStringify(a) : String(a))).join(" ");
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
