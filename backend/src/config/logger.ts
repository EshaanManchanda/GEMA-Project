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

const positiveInt = (value: string | undefined, fallback: number): number => {
  const n = parseInt(value || "", 10);
  return n > 0 ? n : fallback;
};

/**
 * Disk budget for each kind of log (combined, error). A file rotates when it reaches
 * LOG_MAX_FILE_MB or at midnight, and only the newest LOG_MAX_FILES are kept: older ones
 * are deleted, so a runaway error loop can never fill the disk. The defaults (50 MB x 20
 * files x 2 kinds) are at most 2 GB, and rotated files are gzipped so real use is far lower.
 */
export const logRotation = (env: NodeJS.ProcessEnv = process.env) => ({
  maxSize: `${positiveInt(env.LOG_MAX_FILE_MB, 50)}m`,
  maxFiles: positiveInt(env.LOG_MAX_FILES, 20),
});

// PM2 sets `name` per app, so the API and worker rotate their own files and
// audit JSON instead of pruning each other's.
export const rotatingFile = (
  dir: string,
  kind: string,
  level?: string,
  env: NodeJS.ProcessEnv = process.env,
) =>
  new DailyRotateFile({
    dirname: dir,
    filename: `${process.env.name ? `${process.env.name}-` : ""}${kind}-%DATE%.log`,
    datePattern: "YYYY-MM-DD",
    level,
    zippedArchive: true,
    ...logRotation(env),
    // Owner + group only: logs contain emails/IPs.
    options: { flags: "a", mode: 0o640 },
  });

// Winston's npm levels. An unknown LOG_LEVEL (e.g. "warning") would leave the
// logger with no valid threshold and silently drop everything, errors included.
const LOG_LEVELS = ["error", "warn", "info", "http", "verbose", "debug", "silly"];

/** LOG_LEVEL when it is a valid level, otherwise info in production and debug elsewhere. */
export const resolveLogLevel = (requested: string | undefined, nodeEnv: string): string => {
  const level = (requested || "").trim().toLowerCase();
  if (LOG_LEVELS.includes(level)) return level;
  return nodeEnv === "production" ? "info" : "debug";
};

// Create the logger instance
const logger = winston.createLogger({
  level: resolveLogLevel(process.env.LOG_LEVEL, config.nodeEnv),
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  defaultMeta: { service: "gema-backend" },
  transports: [
    rotatingFile(logsDir, "error", "error"),
    rotatingFile(logsDir, "combined"),
  ],
});

if (process.env.LOG_LEVEL && !LOG_LEVELS.includes(process.env.LOG_LEVEL.trim().toLowerCase())) {
  logger.warn(`Ignoring invalid LOG_LEVEL "${process.env.LOG_LEVEL}", using "${logger.level}". Valid: ${LOG_LEVELS.join(", ")}`);
}

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
