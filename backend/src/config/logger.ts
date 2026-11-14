import * as winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { config } from "./env";
import * as fs from "fs";
import * as path from "path";
import * as util from "util";

const PRODUCTION_LOG_DIR = "/var/log/GEMA-Project/backend";

const productionLogDirError = (configured: string | undefined, reason: string): Error =>
  new Error(
    `[logger] LOG_FILE_PATH=${configured || "(unset)"} cannot be used in production: ${reason}. ` +
      `Set LOG_FILE_PATH to a writable absolute folder (ecosystem.config.js uses ${PRODUCTION_LOG_DIR}).`,
  );

/**
 * Where the application log files go: LOG_FILE_PATH (production sets /var/log/GEMA-Project/backend
 * in ecosystem.config.js), default ./logs.
 *
 * Development and tests: relative paths are under the working directory, and a folder that cannot
 * be created or written falls back to ./logs with a note on stderr, so a typo never blocks work.
 *
 * Production: the path must be absolute and writable, otherwise this throws and the process stops
 * with a clear message. It never falls back to ./logs: logs quietly written into the app folder
 * are the ones nobody watches, and they fill the disk the release lives on.
 */
export const resolveLogDir = (
  configured: string | undefined,
  cwd: string = process.cwd(),
  production = false,
): string => {
  if (production) {
    const requested = configured?.trim();
    if (!requested || !path.isAbsolute(requested)) {
      throw productionLogDirError(requested, "it must be an absolute path outside the application folder");
    }
    try {
      fs.mkdirSync(requested, { recursive: true, mode: 0o750 });
      fs.accessSync(requested, fs.constants.W_OK);
    } catch (err) {
      throw productionLogDirError(requested, (err as Error).message);
    }
    return path.resolve(requested);
  }

  const dir = path.resolve(cwd, configured?.trim() || "logs");
  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o750 });
    fs.accessSync(dir, fs.constants.W_OK);
    return dir;
  } catch (err) {
    const fallback = path.resolve(cwd, "logs");
    if (fallback === dir) throw err;
    process.stderr.write(
      `[logger] cannot use log directory ${dir} (${(err as Error).message}); falling back to ${fallback}\n`,
    );
    fs.mkdirSync(fallback, { recursive: true, mode: 0o750 });
    return fallback;
  }
};

export const logsDir = resolveLogDir(config.logging.filePath, process.cwd(), config.nodeEnv === "production");

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

// ---- Sanitizer: nothing sensitive or huge reaches a log file ----------------------------------
// Keys that END in one of these words are replaced (accessToken, x-api-key, set-cookie, JWT_SECRET...).
// Ends-with, not contains, so counters and flags (tokenCount, otpSent) stay readable.
const SENSITIVE_KEY = /(password|passwd|secret|token|authorization|cookie|api[-_]?key|otp)$/i;
const MAX_LOG_STRING = 8 * 1024;
const MAX_LOG_DEPTH = 6;
const MAX_LOG_ARRAY = 100;

/**
 * Returns a copy of `value` that is safe to write: sensitive keys redacted, strings over 8 KB cut,
 * Buffers and ioredis command arguments reduced to a size/count (an ioredis error used to carry a
 * whole Lua script into the log, 1,600 lines per error), arrays capped, depth capped, circular
 * references marked. It never throws.
 */
export const sanitizeLogValue = (
  value: unknown,
  key = "",
  depth = 0,
  ancestors: WeakSet<object> = new WeakSet(),
): unknown => {
  if (value === null || value === undefined) return value;
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "string") {
    return value.length > MAX_LOG_STRING
      ? `${value.slice(0, MAX_LOG_STRING)}…[+${value.length - MAX_LOG_STRING} chars]`
      : value;
  }
  if (typeof value !== "object") return value;
  if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`;

  // Dates, ObjectIds and Mongoose documents have no useful own keys: serialise them the way JSON would.
  const toJSON = (value as { toJSON?: unknown }).toJSON;
  if (typeof toJSON === "function") {
    try {
      const plain = toJSON.call(value);
      if (plain !== value) return sanitizeLogValue(plain, key, depth, ancestors);
    } catch {
      return "[Unserializable]";
    }
  }

  if (ancestors.has(value)) return "[Circular]";
  if (depth >= MAX_LOG_DEPTH) return "[Truncated]";
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const items = value.slice(0, MAX_LOG_ARRAY).map((v) => sanitizeLogValue(v, "", depth + 1, ancestors));
      if (value.length > MAX_LOG_ARRAY) items.push(`[+${value.length - MAX_LOG_ARRAY} more]`);
      return items;
    }
    const isCommand = typeof (value as { name?: unknown }).name === "string";
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value)) {
      const v = (value as Record<string, unknown>)[k];
      out[k] =
        k === "args" && isCommand && Array.isArray(v)
          ? `[${v.length} args]`
          : sanitizeLogValue(v, k, depth + 1, ancestors);
    }
    return out;
  } catch {
    return "[Unserializable]";
  } finally {
    ancestors.delete(value);
  }
};

// Mutates the info object in place so winston's Symbol keys (level, message, splat) survive.
export const sanitizeFormat = winston.format((info) => {
  for (const key of Object.keys(info)) {
    info[key] = sanitizeLogValue(info[key], key);
  }
  return info;
});

/** The format chain behind every log file: timestamp, error stacks, %s splat, sanitizer, JSON. */
export const fileLogFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  sanitizeFormat(),
  winston.format.json(),
);

// Create the logger instance
const logger = winston.createLogger({
  level: resolveLogLevel(process.env.LOG_LEVEL, config.nodeEnv),
  format: fileLogFormat,
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
