/**
 * Lightweight Express app for integration tests.
 * Mirrors the real server middleware stack but strips out:
 *  - server.listen (supertest handles binding)
 *  - Redis / BullMQ queues (mocked)
 *  - Firebase (mocked)
 *  - Cron jobs / background workers
 *  - Seed scripts
 */
import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import authRoutes from "../../../routes/auth.routes";
import eventRoutes from "../../../routes/event.routes";
import adminEventRoutes from "../../../routes/admin.event.routes";
import { errorHandler, notFound } from "../../../middleware/index";

// Ensure required env vars exist before middleware imports try to read them
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key-32chars!!";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "test-jwt-refresh-secret-32chars!";
process.env.JWT_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.NODE_ENV = "test";
process.env.ADMIN_SECRET_KEY = "test-admin-secret";
process.env.BCRYPT_SALT_ROUNDS = "4"; // Low rounds = fast hashing in tests
process.env.SESSION_SECRET = "test-session-secret";

export const createTestApp = (): Application => {
  const app = express();

  app.set("trust proxy", 1);

  // Core security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );
  app.use(mongoSanitize());
  app.use(hpp());

  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Mount routes
  app.use("/api/auth", authRoutes);
  app.use("/api/events", eventRoutes);
  app.use("/api/admin/events", adminEventRoutes);

  // Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // 404 + global error handler
  app.use(notFound);
  app.use(errorHandler);

  return app;
};
