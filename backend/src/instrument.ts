import * as path from "path";
import * as dotenv from "dotenv";
import * as Sentry from "@sentry/node";

// Must run before any other module is imported so Sentry's auto-instrumentation
// can hook http/express/mongodb at load time. dotenv is re-loaded here (not just
// in config/env.ts) because this file is imported before config/env.ts runs.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  });
}
