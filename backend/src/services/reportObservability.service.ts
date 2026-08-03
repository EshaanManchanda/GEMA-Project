/**
 * Report Generation Observability (KBOS hardening, item 002).
 *
 * One function, swallow-and-log exactly like utils/cache.utils.ts's
 * invalidate* helpers: writing an observability record must never fail the
 * operation it's observing. Callers await it (so ordering in tests is
 * predictable) but a write failure here only logs — it never rethrows.
 */

import logger from "../config/logger";
import ReportGenerationLog, {
  IReportGenerationLog,
} from "../models/ReportGenerationLog";

export type ReportGenerationEntry = Omit<
  IReportGenerationLog,
  keyof import("mongoose").Document | "createdAt"
>;

export async function logReportGeneration(
  entry: ReportGenerationEntry,
): Promise<void> {
  try {
    await ReportGenerationLog.create(entry);
  } catch (error) {
    logger.error("Error writing report generation log:", error);
  }
}
