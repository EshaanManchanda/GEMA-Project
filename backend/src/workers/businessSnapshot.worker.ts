import mongoose from "mongoose";
import { Worker, Job } from "bullmq";
import {
  QUEUE_NAMES,
  bullMQConnection,
  analyticsQueue,
  areQueuesEnabled,
} from "../config/queue";
import { WORKER_TUNING } from "../config/workerTuning";
import logger from "../config/logger";
import Vendor from "../models/Vendor";
import VendorBusinessSnapshot from "../models/VendorBusinessSnapshot";
import {
  generateSnapshot,
  refreshVendorStats,
  periodOfDate,
  previousPeriod,
} from "../services/businessReport.service";
import { logReportGeneration } from "../services/reportObservability.service";
import {
  ReportGenerationOperation,
  ReportGenerationStatus,
  ReportGenerationTrigger,
} from "../models/ReportGenerationLog";

/**
 * Generates VendorBusinessSnapshot data (never PDFs — see plan risk notes,
 * this deliberately avoids a Puppeteer-launch burst on the 1st of the
 * month). Handles two job types on the shared `analyticsQueue`:
 *
 *  - "monthly-snapshot": self-scheduled, generates last month's snapshot
 *    for every active vendor and refreshes Vendor.stats while iterating.
 *  - "bulk-generate": admin-triggered via POST /admin/business-reports/
 *    bulk-generate, generates a snapshot for an explicit list of vendors
 *    and period, reporting progress via job.updateProgress.
 *
 * Both skip vendors whose snapshot for the target period is already
 * "locked" (§6) rather than failing the whole batch.
 */

interface BulkGenerateJobData {
  vendorIds: string[];
  period: string;
  actorId?: string;
}

interface VendorJobResult {
  vendorId: string;
  status: "generated" | "skipped_locked" | "failed";
  error?: string;
}

async function generateForVendor(
  vendorId: string,
  period: string,
  generatedBy: "manual" | "scheduled",
  trigger: ReportGenerationTrigger,
  actorId?: string,
): Promise<VendorJobResult> {
  try {
    const existing = await VendorBusinessSnapshot.findOne({ vendorId, period })
      .select("status")
      .lean();
    if (existing?.status === "locked") {
      return { vendorId, status: "skipped_locked" };
    }

    // generateSnapshot already writes its own per-vendor
    // ReportGenerationLog row (SNAPSHOT_GENERATE) — no separate log here to
    // avoid double-counting per-vendor outcomes. The WORKER_BATCH row
    // written by the caller covers the aggregate.
    await generateSnapshot(vendorId, period, { generatedBy, actorId, trigger });
    await refreshVendorStats(vendorId);
    return { vendorId, status: "generated" };
  } catch (error) {
    logger.error(`business-snapshot: failed for vendor ${vendorId}`, error);
    return { vendorId, status: "failed", error: (error as Error).message };
  }
}

function batchCounts(results: VendorJobResult[]) {
  return {
    total: results.length,
    generated: results.filter((r) => r.status === "generated").length,
    skippedLocked: results.filter((r) => r.status === "skipped_locked").length,
    failed: results.filter((r) => r.status === "failed").length,
  };
}

async function processMonthlySnapshot(): Promise<{
  results: VendorJobResult[];
}> {
  const batchStart = Date.now();
  // Runs at 04:00 on the 1st — the period that just closed is last month's.
  const period = previousPeriod(periodOfDate());

  const vendors = await Vendor.find({
    isActive: true,
    isDeleted: { $ne: true },
  })
    .select("_id")
    .lean();

  const results: VendorJobResult[] = [];
  for (const vendor of vendors) {
    results.push(
      await generateForVendor(
        vendor._id.toString(),
        period,
        "scheduled",
        ReportGenerationTrigger.SCHEDULED,
      ),
    );
  }

  const failed = results.filter((r) => r.status === "failed");
  if (failed.length > 0) {
    logger.error(
      `business-snapshot: ${failed.length}/${results.length} vendor(s) failed for ${period}`,
      failed,
    );
  }
  logger.info(
    `business-snapshot: monthly run for ${period} — ${results.filter((r) => r.status === "generated").length} generated, ${results.filter((r) => r.status === "skipped_locked").length} skipped (locked), ${failed.length} failed`,
  );

  await logReportGeneration({
    operation: ReportGenerationOperation.WORKER_BATCH,
    status:
      failed.length > 0
        ? ReportGenerationStatus.FAILED
        : ReportGenerationStatus.SUCCEEDED,
    trigger: ReportGenerationTrigger.SCHEDULED,
    period,
    durationMs: Date.now() - batchStart,
    batch: batchCounts(results),
  });

  return { results };
}

async function processBulkGenerate(
  job: Job<BulkGenerateJobData>,
): Promise<{ results: VendorJobResult[] }> {
  const batchStart = Date.now();
  const { vendorIds, period, actorId } = job.data;
  const results: VendorJobResult[] = [];

  for (let i = 0; i < vendorIds.length; i++) {
    results.push(
      await generateForVendor(
        vendorIds[i],
        period,
        "manual",
        ReportGenerationTrigger.BULK,
        actorId,
      ),
    );
    await job.updateProgress(Math.round(((i + 1) / vendorIds.length) * 100));
  }

  const failed = results.filter((r) => r.status === "failed");
  await logReportGeneration({
    operation: ReportGenerationOperation.WORKER_BATCH,
    status:
      failed.length > 0
        ? ReportGenerationStatus.FAILED
        : ReportGenerationStatus.SUCCEEDED,
    trigger: ReportGenerationTrigger.BULK,
    period,
    actorId: actorId ? new mongoose.Types.ObjectId(actorId) : undefined,
    jobId: job.id?.toString(),
    durationMs: Date.now() - batchStart,
    batch: batchCounts(results),
  });

  return { results };
}

const processBusinessSnapshotJob = async (job: Job) => {
  if (job.name === "bulk-generate") {
    return processBulkGenerate(job as Job<BulkGenerateJobData>);
  }
  // Default / "monthly-snapshot"
  return processMonthlySnapshot();
};

const businessSnapshotWorker = areQueuesEnabled
  ? new Worker(QUEUE_NAMES.ANALYTICS, processBusinessSnapshotJob, {
      connection: bullMQConnection!,
      concurrency: WORKER_TUNING.BUSINESS_SNAPSHOT.CONCURRENCY,
    })
  : null;

if (businessSnapshotWorker) {
  businessSnapshotWorker.on("completed", (job, result) => {
    logger.debug(
      `business-snapshot job ${job.id} (${job.name}) completed`,
      result,
    );
  });
  businessSnapshotWorker.on("failed", (job, err) => {
    logger.error(`business-snapshot job ${job?.id} (${job?.name}) failed`, err);
  });
}

// Schedule the recurring monthly run once (idempotent — BullMQ deduplicates
// by jobId). Cron pattern: 04:00 on the 1st of every month, server time —
// one hour after the Search Console sync to avoid contending for the same
// low-concurrency window.
if (analyticsQueue) {
  analyticsQueue
    .add(
      "monthly-snapshot",
      {},
      {
        jobId: "business-snapshot-monthly",
        repeat: { pattern: "0 4 1 * *" },
      },
    )
    .catch((err) =>
      logger.error("business-snapshot: failed to schedule monthly job", err),
    );
}

export default businessSnapshotWorker;
