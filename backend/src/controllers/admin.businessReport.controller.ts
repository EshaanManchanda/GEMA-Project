import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Job } from "bullmq";
import { AuthRequest } from "../types/index";
import { AppError } from "../middleware/error";
import Vendor from "../models/Vendor";
import VendorBusinessSnapshot, {
  IAuditTrailEntry,
} from "../models/VendorBusinessSnapshot";
import VendorPromotionInput from "../models/VendorPromotionInput";
import {
  generateSnapshot,
  previousPeriod,
  periodOfDate,
} from "../services/businessReport.service";
import { analyticsQueue } from "../config/queue";
import { invalidateBusinessReportCaches } from "../utils/cache.utils";
import { periodToUtcRange } from "../utils/dateHelpers";
import {
  checkPromotionInput,
  checkPeriodOutliers,
  PromotionInputSignal,
} from "../services/promotionInputQuality.service";
import { classifyVendorSegments } from "../services/businessHealth.service";
import { ReportGenerationTrigger } from "../models/ReportGenerationLog";
import { verifySnapshot } from "../services/snapshotIntegrity.service";
import { config } from "../config/env";
import logger from "../config/logger";

/**
 * Legacy `filter` query values map onto the new segment predicates so
 * existing frontend links (and any bookmarked admin URLs) keep working —
 * "low_performers" (plural, historical) is now `low_performer` under the
 * hood. See businessHealth.service.ts classifyVendorSegments.
 */
const LEGACY_FILTER_MAP: Record<string, string> = {
  low_performers: "low_performer",
  declining: "declining",
  inactive: "inactive",
};

// ─── Overview / leaderboard ─────────────────────────────────────────────────

export const getOverview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(parseInt((req.query.page as string) ?? "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt((req.query.limit as string) ?? "20", 10), 1),
      100,
    );
    const period = (req.query.period as string) || periodOfDate();
    const sortBy = (req.query.sortBy as string) || "overall";
    const filter = req.query.filter as string | undefined;

    const vendors = await Vendor.find({
      isDeleted: { $ne: true },
      isActive: true,
    })
      .select("businessName logo verificationStatus createdAt")
      .lean();
    const vendorIds = vendors.map((v) => v._id);

    const [currentSnapshots, previousSnapshots] = await Promise.all([
      VendorBusinessSnapshot.find({
        vendorId: { $in: vendorIds },
        period,
        status: { $ne: "archived" },
      }).lean(),
      VendorBusinessSnapshot.find({
        vendorId: { $in: vendorIds },
        period: previousPeriod(period),
        status: { $ne: "archived" },
      }).lean(),
    ]);
    const currentByVendor = new Map(
      currentSnapshots.map((s) => [s.vendorId.toString(), s]),
    );
    const previousByVendor = new Map(
      previousSnapshots.map((s) => [s.vendorId.toString(), s]),
    );

    const asOf = new Date();

    let rows = vendors.map((v) => {
      const snap = currentByVendor.get(v._id.toString());
      const prev = previousByVendor.get(v._id.toString());
      const overallScore = snap?.scores.overall ?? null;
      const overallDelta =
        snap?.scores.overall !== null &&
        snap?.scores.overall !== undefined &&
        prev?.scores.overall !== null &&
        prev?.scores.overall !== undefined
          ? snap.scores.overall - prev.scores.overall
          : null;

      const segments = classifyVendorSegments({
        createdAt: v.createdAt,
        asOf,
        hasSnapshot: !!snap,
        overallScore,
        overallDelta,
        // Premium/Enterprise deliberately not wired here — no
        // VendorSubscription documents exist in this deployment yet. See
        // classifyVendorSegments's SegmentInput doc-comment.
      });

      return {
        vendorId: v._id,
        businessName: v.businessName,
        logo: v.logo,
        verificationStatus: v.verificationStatus,
        hasSnapshot: !!snap,
        snapshotId: snap?._id ?? null,
        snapshotStatus: snap?.status ?? null,
        scores: snap?.scores ?? null,
        confidence: snap?.confidence ?? null,
        overallDelta,
        segments,
      };
    });

    if (filter) {
      const predicate = LEGACY_FILTER_MAP[filter] ?? filter;
      rows = rows.filter((r) => r.segments.all.includes(predicate));
    }

    const sortKey = [
      "listing",
      "sales",
      "marketing",
      "customer",
      "operations",
    ].includes(sortBy)
      ? sortBy
      : "overall";
    rows.sort((a, b) => {
      const av = (a.scores as any)?.[sortKey] ?? -1;
      const bv = (b.scores as any)?.[sortKey] ?? -1;
      return bv - av;
    });

    const total = rows.length;
    const paged = rows.slice((page - 1) * limit, page * limit);

    res.status(200).json({
      success: true,
      message: "Business report overview retrieved successfully",
      data: { period, rows: paged, pagination: { page, limit, total } },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Promotion input ─────────────────────────────────────────────────────────

export const getPromotionInput = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { vendorId } = req.params;
    const period = (req.query.period as string) || periodOfDate();

    const input = await VendorPromotionInput.findOne({
      vendorId,
      period,
    }).lean();

    res.status(200).json({
      success: true,
      message: "Promotion input retrieved successfully",
      data: input ?? { vendorId, period },
    });
  } catch (error) {
    next(error);
  }
};

export const upsertPromotionInput = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { vendorId } = req.params;
    const period = (req.query.period as string) || periodOfDate();
    const actorId = (req.user?._id || req.user?.id)?.toString();

    const {
      socialReach,
      impressions,
      bannerPlacements,
      homepagePromotion,
      featuredListings,
      topPosts,
      offlineCampaigns,
      notes,
    } = req.body;

    const previousInput = await VendorPromotionInput.findOne({
      vendorId,
      period: previousPeriod(period),
    }).lean();

    const input = await VendorPromotionInput.findOneAndUpdate(
      { vendorId, period },
      {
        $set: {
          socialReach,
          impressions,
          bannerPlacements,
          homepagePromotion,
          featuredListings,
          topPosts,
          offlineCampaigns,
          notes,
          updatedBy: actorId,
        },
        $setOnInsert: { vendorId, period, createdBy: actorId },
      },
      { upsert: true, new: true, runValidators: true },
    );
    await invalidateBusinessReportCaches(vendorId, period);

    const { start: periodStart, end: periodEnd } = periodToUtcRange(period);
    const currentSignal: PromotionInputSignal = {
      socialReach: input.socialReach,
      impressions: input.impressions,
      bannerPlacements: input.bannerPlacements,
      featuredListings: input.featuredListings,
      topPosts: input.topPosts,
      offlineCampaigns: input.offlineCampaigns,
    };
    const previousSignal: PromotionInputSignal | null = previousInput
      ? {
          socialReach: previousInput.socialReach,
          impressions: previousInput.impressions,
          bannerPlacements: previousInput.bannerPlacements,
        }
      : null;
    const warnings = [
      ...checkPromotionInput(currentSignal, periodStart, periodEnd),
      ...checkPeriodOutliers(currentSignal, previousSignal),
    ];

    res.status(200).json({
      success: true,
      message: "Promotion input saved successfully",
      data: input,
      warnings,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Snapshot read ───────────────────────────────────────────────────────────

/**
 * Read-only fetch of the persisted snapshot for (vendor, period), or null.
 * Exists so the admin UI can load a snapshot's _id/status/notes to drive
 * lifecycle controls (lock/notes) without triggering a regenerate — POST
 * .../snapshot both creates AND mutates a draft, which is the wrong
 * operation for a page just trying to display current state.
 */
export const getSnapshot = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { vendorId } = req.params;
    const period = (req.query.period as string) || periodOfDate();

    const snapshot = await VendorBusinessSnapshot.findOne({ vendorId, period });

    const integrity = snapshot
      ? verifySnapshot(snapshot, config.reportIntegritySecret)
      : undefined;
    if (integrity?.status === "mismatch") {
      logger.error(
        `Business report snapshot integrity mismatch for vendor ${vendorId} (${period})`,
        integrity,
      );
    }

    res.status(200).json({
      success: true,
      message: "Snapshot retrieved successfully",
      data: snapshot,
      integrity,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Snapshot generation ────────────────────────────────────────────────────

export const generateSnapshotHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { vendorId } = req.params;
    const { period } = req.body;
    const actorId = (req.user?._id || req.user?.id)?.toString();

    const snapshot = await generateSnapshot(vendorId, period, {
      generatedBy: "manual",
      actorId,
      trigger: ReportGenerationTrigger.ADMIN_REQUEST,
    });

    res.status(200).json({
      success: true,
      message: "Business report snapshot generated successfully",
      data: snapshot,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Snapshot lifecycle ─────────────────────────────────────────────────────

const STATUS_ACTION_MAP: Record<
  "locked" | "reopened" | "archived",
  IAuditTrailEntry["action"]
> = {
  locked: "locked",
  reopened: "reopened",
  archived: "archived",
};

export const updateSnapshotStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body as {
      status: "locked" | "reopened" | "archived";
    };
    const actorId = (req.user?._id || req.user?.id)?.toString();

    const snapshot = await VendorBusinessSnapshot.findById(id);
    if (!snapshot) return next(new AppError("Snapshot not found", 404));

    const nextStatus = status === "reopened" ? "draft" : status;

    if (status === "locked" && snapshot.status === "locked") {
      return next(new AppError("Snapshot is already locked", 409));
    }
    if (status === "reopened" && snapshot.status !== "locked") {
      return next(new AppError("Only a locked snapshot can be reopened", 409));
    }

    snapshot.status = nextStatus as "draft" | "locked" | "archived";
    snapshot.auditTrail.push({
      action: STATUS_ACTION_MAP[status],
      actorId: actorId
        ? new mongoose.Types.ObjectId(actorId)
        : snapshot.vendorId,
      at: new Date(),
    });
    await snapshot.save();
    await invalidateBusinessReportCaches(
      snapshot.vendorId.toString(),
      snapshot.period,
    );

    res.status(200).json({
      success: true,
      message: `Snapshot ${status} successfully`,
      data: snapshot,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSnapshotNotes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { vendorVisible, internal } = req.body as {
      vendorVisible?: string;
      internal?: string;
    };
    const actorId = (req.user?._id || req.user?.id)?.toString();

    const snapshot = await VendorBusinessSnapshot.findById(id);
    if (!snapshot) return next(new AppError("Snapshot not found", 404));

    if (vendorVisible !== undefined)
      snapshot.notes.vendorVisible = vendorVisible;
    if (internal !== undefined) snapshot.notes.internal = internal;
    snapshot.auditTrail.push({
      action: "edited",
      actorId: actorId
        ? new mongoose.Types.ObjectId(actorId)
        : snapshot.vendorId,
      at: new Date(),
      detail: "notes updated",
    });
    await snapshot.save();
    await invalidateBusinessReportCaches(
      snapshot.vendorId.toString(),
      snapshot.period,
    );

    res.status(200).json({
      success: true,
      message: "Snapshot notes saved successfully",
      data: snapshot,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Bulk generation ─────────────────────────────────────────────────────────

export const bulkGenerate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!analyticsQueue) {
      return next(
        new AppError(
          "Background jobs are disabled on this server (Redis/queues unavailable). Generate snapshots individually instead.",
          503,
        ),
      );
    }

    const { vendorIds, period } = req.body as {
      vendorIds: string[];
      period: string;
    };
    const actorId = (req.user?._id || req.user?.id)?.toString();

    const job = await analyticsQueue.add("bulk-generate", {
      vendorIds,
      period,
      actorId,
    });

    res.status(202).json({
      success: true,
      message: "Bulk snapshot generation queued",
      data: { jobId: job.id, vendorCount: vendorIds.length, period },
    });
  } catch (error) {
    next(error);
  }
};

export const getBulkGenerateProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!analyticsQueue) {
      return next(
        new AppError("Background jobs are disabled on this server", 503),
      );
    }

    const { jobId } = req.params;
    const job = await Job.fromId(analyticsQueue, jobId);
    if (!job) return next(new AppError("Job not found", 404));

    const state = await job.getState();

    res.status(200).json({
      success: true,
      message: "Job progress retrieved successfully",
      data: {
        jobId: job.id,
        state,
        progress: job.progress,
        returnValue: job.returnvalue,
        failedReason: job.failedReason,
      },
    });
  } catch (error) {
    next(error);
  }
};
