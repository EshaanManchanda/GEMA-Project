import express, { Application } from "express";

// Bulk imports post whole CSV/JSON datasets as JSON, so they keep a 10 MB limit.
export const LARGE_BODY_PATHS = [
  "/api/admin/bulk-import",
  "/api/vendors/bookings/import",
  "/api/teachers/bookings/import",
];

/**
 * Body parsers shared by server.ts and the integration test app.
 * Webhooks get the raw body (signature checks). Everything else is capped at
 * 1 MB, which is plenty for normal JSON because files go through multer.
 * Larger bodies get a 413. The first parser to run wins, so order matters.
 */
export const applyBodyParsers = (app: Application) => {
  app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
  app.use("/api/webhooks/cunnekt", express.raw({ type: "application/json" }));
  app.use(LARGE_BODY_PATHS, express.json({ limit: "10mb" }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
};
