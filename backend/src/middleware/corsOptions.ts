import { CorsOptions } from "cors";
import { config, logger } from "../config/index";

// A bare Error became a 500 "Server Error" (the error handler answers
// err.statusCode || 500). A 403 is the honest answer, and still stops the request
// before any handler runs, which `callback(null, false)` would NOT do.
const originNotAllowed = () =>
  Object.assign(new Error("Not allowed by CORS"), { statusCode: 403 });

/**
 * CORS policy for the API. The allowlist is built entirely from env at request
 * time (no domains hardcoded in source), so it also works in tests.
 */
export const corsOptions: CorsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      config.frontendUrl,
      ...(process.env.ALLOWED_ORIGINS?.split(",").map((u) => u.trim()) || []),
      ...(process.env.ADDITIONAL_ALLOWED_ORIGINS?.split(",").map((u) => u.trim()) || []),
    ].filter(Boolean);

    // Development: allow common localhost ports
    if (config.nodeEnv === "development") {
      allowedOrigins.push(
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
      );
    }

    if (process.env.DEBUG_CORS === "true") {
      logger.debug("CORS Check - Origin:", origin, "| Allowed:", allowedOrigins);
    }

    // No-origin: unsafe methods are blocked by requireOriginForStateChanges; safe methods pass through
    if (!origin) {
      return callback(null, true);
    }

    // Reject Origin: "null" — sent by sandboxed iframes, file://, some redirects
    if (origin === "null") {
      logger.warn("[CORS] Rejected null origin");
      return callback(originNotAllowed());
    }

    // Preview deployments: only allowed outside production, scoped to this project
    if (
      config.nodeEnv !== "production" &&
      /^https:\/\/kidrove-frontend-[a-z0-9-]+\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }

    // Strict allowlist — trailing slash normalised
    const isAllowed = allowedOrigins.some(
      (allowed) => origin === allowed || origin === allowed.replace(/\/$/, ""),
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn("[CORS] Origin rejected:", origin);
      callback(originNotAllowed());
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cookie", "X-CSRF-Token"],
  exposedHeaders: ["Set-Cookie", "Content-Disposition", "X-Report-Omitted-Sections"],
  preflightContinue: false,
  optionsSuccessStatus: 200,
};
