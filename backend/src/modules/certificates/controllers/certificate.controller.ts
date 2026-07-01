import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { validationResult } from "express-validator";
import Certificate, {
  Template,
  TemplateVersion,
  CertificateRequest,
  AuditLog,
} from "../../../models/Certificate";
import Student from "../../../models/Student";
import MediaAsset from "../../../models/MediaAsset";
import { AppError } from "../../../middleware/index";
import { AuthRequest } from "../../../types/index";
import { certificateService } from "../services/certificate.service";
import { renderCertificate } from "../../../workers/certificate.worker";
import { certificateQueue } from "../../../config/queue";
import { MediaService } from "../../../services/media.service";
import logger from "../../../config/logger";
import { toCsv, safeReportFilename } from "../../../utils/csv.utils";

// ─── Guards ───────────────────────────────────────────────────────────────────

function validate(req: Request, next: NextFunction): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next(new AppError(errors.array()[0].msg, 400));
    return false;
  }
  return true;
}

// ─── Shared filter builder ────────────────────────────────────────────────────
// Used by both listCertificates and exportCertificates so identical query
// params always return identical rows from both endpoints.

export interface CertificateFilterQuery {
  eventId?: string;
  userId?: string;
  studentId?: string;
  recipientEmail?: string;
  status?: string;
  type?: string;        // maps to certificateTypeSlug
  issuedFrom?: string;  // ISO date string — start of issuedAt range
  issuedTo?: string;    // ISO date string — end of issuedAt range
}

export function buildCertificateFilter(q: CertificateFilterQuery): Record<string, any> {
  const filter: Record<string, any> = {};
  if (q.eventId)        filter.eventId = q.eventId;
  if (q.userId)         filter.userId = q.userId;
  if (q.studentId)      filter["context.studentId"] = q.studentId;
  if (q.recipientEmail) filter["recipient.email"] = q.recipientEmail.toLowerCase();
  if (q.status)         filter.status = q.status;
  if (q.type)           filter.certificateTypeSlug = q.type;

  if (q.issuedFrom || q.issuedTo) {
    filter.issuedAt = {};
    if (q.issuedFrom) {
      const start = new Date(q.issuedFrom);
      start.setUTCHours(0, 0, 0, 0);
      filter.issuedAt.$gte = start;
    }
    if (q.issuedTo) {
      const end = new Date(q.issuedTo);
      end.setUTCHours(23, 59, 59, 999);
      filter.issuedAt.$lte = end;
    }
  }

  return filter;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export const createTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const { name, slug, description, html, css, defaultOptions, mode, backgroundImageUrl, canvasWidth, canvasHeight, fields } = req.body;
    const template = await Template.create({
      name, slug, description, html, css, defaultOptions,
      mode: mode || "html",
      backgroundImageUrl, canvasWidth, canvasHeight, fields,
      createdBy: req.user?._id || req.user?.id,
    });
    res.status(201).json({ success: true, data: { template } });
  } catch (error) { next(error); }
};

export const listTemplates = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await Template.find()
      .select("name slug description mode html css defaultOptions canvasWidth canvasHeight fields createdAt active");
    res.status(200).json({ success: true, data: { templates } });
  } catch (error) { next(error); }
};

export const getTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const template = await Template.findById(req.params.id);
    if (!template) return next(new AppError("Template not found", 404));
    res.status(200).json({ success: true, data: { template } });
  } catch (error) { next(error); }
};

export const updateTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const { id } = req.params;
    const { html, css, backgroundImageUrl, canvasWidth, canvasHeight, fields, defaultOptions, ...rest } = req.body;
    const userId = req.user?._id || req.user?.id;

    const existing = await Template.findById(id);
    if (!existing) return next(new AppError("Template not found", 404));

    if (existing.mode !== "visual" && (html || css)) {
      await TemplateVersion.create({
        templateId: id,
        html: existing.html,
        css: existing.css,
        version: existing.version,
        createdBy: userId,
      });
    }

    const updates: Record<string, any> = { ...rest };
    if (html) { updates.html = html; updates.$inc = { version: 1 }; }
    if (css !== undefined) updates.css = css;
    if (backgroundImageUrl !== undefined) updates.backgroundImageUrl = backgroundImageUrl;
    if (canvasWidth !== undefined) updates.canvasWidth = canvasWidth;
    if (canvasHeight !== undefined) updates.canvasHeight = canvasHeight;
    if (fields !== undefined) updates.fields = fields;
    if (defaultOptions !== undefined) updates.defaultOptions = defaultOptions;
    if (typeof req.body.active === 'boolean') updates.active = req.body.active;

    const template = await Template.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: { template } });
  } catch (error) { next(error); }
};

export const deleteTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const template = await Template.findById(req.params.id);
    if (!template) return next(new AppError("Template not found", 404));
    await Template.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: { message: "Template deleted" } });
  } catch (error) { next(error); }
};

export const previewTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const template = await Template.findById(req.params.id);
    if (!template) return next(new AppError("Template not found", 404));

    if (template.mode !== "visual" && !template.html) {
      return next(new AppError("Template has no HTML content. Add HTML before previewing.", 400));
    }

    const sampleData = {
      recipientName: "Jane Doe",
      recipientEmail: "jane@example.com",
      studentName: "Jane Doe",
      schoolName: "Example School",
      issuedDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      serialNumber: "CERT-2025-000001",
      qrCode: "",
      qrData: "",
      ...(req.body.data ?? {}),
    };

    const url = await renderCertificate(template, sampleData);
    res.status(200).json({ success: true, data: { previewUrl: url } });
  } catch (error: any) {
    const msg = error?.message || "";
    if (msg.includes("executablePath") || msg.includes("CHROME") || msg.includes("chrome")) {
      return next(new AppError(`Chrome not found. Set CHROME_PATH env var (current: ${process.env.CHROME_PATH || "unset"}). ${msg}`, 500));
    }
    if (msg.includes("net::ERR") || msg.includes("CORS") || msg.includes("cross-origin")) {
      return next(new AppError(`Preview failed — image asset blocked by CORS. Use public Cloudinary URLs. ${msg}`, 500));
    }
    next(error);
  }
};

export const listTemplateVersions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const versions = await TemplateVersion.find({ templateId: req.params.id })
      .populate("createdBy", "firstName lastName")
      .sort({ version: -1 })
      .select("version createdAt createdBy");
    res.status(200).json({ success: true, data: { versions } });
  } catch (error) { next(error); }
};

export const rollbackTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const { id, versionNumber } = req.params;
    const userId = req.user?._id || req.user?.id;

    const versionDoc = await TemplateVersion.findOne({ templateId: id, version: parseInt(versionNumber) });
    if (!versionDoc) return next(new AppError("Template version not found", 404));

    const existing = await Template.findById(id);
    if (!existing) return next(new AppError("Template not found", 404));

    await TemplateVersion.create({
      templateId: id,
      html: existing.html,
      css: existing.css,
      version: existing.version,
      createdBy: userId,
    });

    const template = await Template.findByIdAndUpdate(
      id,
      { html: versionDoc.html, css: versionDoc.css, $inc: { version: 1 } },
      { new: true },
    );
    res.status(200).json({ success: true, data: { template } });
  } catch (error) { next(error); }
};

// ─── Certificate Generation ───────────────────────────────────────────────────

export const triggerGeneration = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const { templateId, recipient, data, eventId, userId, reviewId, options, certificateTypeSlug } = req.body;

    const certificate = await certificateService.issueForEvent({
      templateId,
      certificateTypeSlug,
      eventId,
      userId: userId || req.user?._id?.toString() || req.user?.id,
      reviewId,
      recipient,
      data,
      issuedBy: (req.user?._id || req.user?.id)?.toString(),
      sendEmail: options?.sendEmail,
    });

    res.status(201).json({ success: true, data: { certificate } });
  } catch (error) { next(error); }
};

export const getCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const certificate = await Certificate.findById(req.params.id)
      .populate("templateId", "name slug")
      .populate("eventId", "title")
      .populate("userId", "firstName lastName email");
    if (!certificate) return next(new AppError("Certificate not found", 404));
    res.status(200).json({ success: true, data: { certificate } });
  } catch (error) { next(error); }
};

export const listCertificates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const { page = 1, limit = 20 } = req.query;

    const filter = buildCertificateFilter({
      eventId:        req.query.eventId as string | undefined,
      userId:         req.query.userId as string | undefined,
      studentId:      req.query.studentId as string | undefined,
      recipientEmail: req.query.recipientEmail as string | undefined,
      status:         req.query.status as string | undefined,
      type:           req.query.type as string | undefined,
      issuedFrom:     req.query.issuedFrom as string | undefined,
      issuedTo:       req.query.issuedTo as string | undefined,
    });

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [certificates, total] = await Promise.all([
      Certificate.find(filter)
        .populate("eventId", "title")
        .populate("userId", "firstName lastName email")
        .populate("templateId", "name slug")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Certificate.countDocuments(filter),
    ]);

    const studentIds = certificates.map(c => c.context?.studentId).filter(Boolean) as string[];
    let studentMap: Record<string, { firstName: string; lastName: string; grade?: string }> = {};
    if (studentIds.length > 0) {
      const students = await Student.find({ _id: { $in: studentIds } }).select("firstName lastName grade").lean();
      studentMap = Object.fromEntries(
        students.map(s => [(s._id as mongoose.Types.ObjectId).toString(), s]),
      );
    }

    const enriched = certificates.map(cert => {
      const raw = cert.toObject();
      const sid = raw.context?.studentId;
      return sid && studentMap[sid] ? { ...raw, studentInfo: studentMap[sid] } : raw;
    });

    res.status(200).json({
      success: true,
      data: {
        certificates: enriched,
        pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total },
      },
    });
  } catch (error) { next(error); }
};

export const verifyCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const certificate = await Certificate.findOne({
      serialNumber: req.params.serialNumber,
      status: { $ne: "revoked" },
    })
      .populate("eventId", "title")
      .select("serialNumber recipient status issuedAt eventId");

    if (!certificate) {
      return res.status(200).json({ success: true, data: { valid: false } });
    }

    res.status(200).json({
      success: true,
      data: {
        valid: true,
        serialNumber: certificate.serialNumber,
        recipientName: certificate.recipient.name,
        eventTitle: (certificate.eventId as any)?.title,
        issuedAt: certificate.issuedAt,
        status: certificate.status,
      },
    });
  } catch (error) { next(error); }
};

export const revokeCertificate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const actorId = req.user?._id || req.user?.id;

    const certificate = await Certificate.findByIdAndUpdate(
      req.params.id,
      { status: "revoked", $push: { history: { event: "revoked", actor: actorId, at: new Date() } } },
      { new: true },
    );
    if (!certificate) return next(new AppError("Certificate not found", 404));

    await AuditLog.create({
      action: "certificate.revoked",
      entityType: "Certificate",
      entityId: req.params.id,
      actor: actorId,
    });

    res.status(200).json({ success: true, data: { certificate } });
  } catch (error) { next(error); }
};

export const retryCertificate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const { id } = req.params;

    const certificate = await Certificate.findById(id);
    if (!certificate) return next(new AppError("Certificate not found", 404));
    if (!["pending", "failed"].includes(certificate.status)) {
      return next(new AppError(`Cannot retry certificate with status '${certificate.status}'`, 400));
    }

    await Certificate.findByIdAndUpdate(id, {
      status: "generating",
      failureReason: undefined,
      $push: { history: { event: "retry_requested", at: new Date() } },
    });

    if (certificateQueue) {
      await certificateService.queuePDFGeneration(id, {
        templateId: certificate.templateId?.toString(),
        recipient: certificate.recipient,
        data: certificate.data || {},
      });
    } else {
      // Synchronous fallback when Redis is unavailable
      try {
        const template = await Template.findById(certificate.templateId);
        if (!template) return next(new AppError("Template not found for this certificate", 404));

        const pdfUrl = await renderCertificate(template, {
          recipientName: certificate.recipient.name,
          recipientEmail: certificate.recipient.email,
          ...(certificate.data || {}),
          issuedDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
        });

        await Certificate.findByIdAndUpdate(id, {
          status: "generated",
          pdfUrl,
          issuedAt: new Date(),
          $push: { history: { event: "generation_complete", at: new Date() } },
        });
      } catch (syncErr: any) {
        await Certificate.findByIdAndUpdate(id, {
          status: "failed",
          failureReason: syncErr.message,
          $push: { history: { event: "generation_failed", meta: { error: syncErr.message }, at: new Date() } },
        });
        return next(new AppError(`Generation failed: ${syncErr.message}`, 500));
      }
    }

    const updated = await Certificate.findById(id);
    res.status(200).json({ success: true, data: { certificate: updated } });
  } catch (error) { next(error); }
};

export const downloadCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const certificate = await Certificate.findById(req.params.id).select("pdfUrl status recipient");
    if (!certificate) return next(new AppError("Certificate not found", 404));
    if (!certificate.pdfUrl) return next(new AppError("Certificate PDF not yet generated", 404));
    res.status(200).json({ success: true, data: { pdfUrl: certificate.pdfUrl } });
  } catch (error) { next(error); }
};

export const resendCertificateEmail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    await certificateService.sendCertificateEmail(req.params.id, {
      actorId: (req.user?._id || req.user?.id)?.toString(),
      historyEvent: "email_resent",
    });
    res.status(200).json({ success: true, message: "Email queued for resend" });
  } catch (error) { next(error); }
};

export const bulkGenerate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const { templateId, eventId, inputs, options = {} } = req.body;

    if (inputs.length > 500) {
      return next(new AppError("Maximum 500 certificates per bulk request", 400));
    }

    const result = await certificateService.bulkIssue({
      templateId,
      eventId,
      inputs,
      options,
      createdBy: (req.user?._id || req.user?.id)?.toString(),
    });

    res.status(202).json({
      success: true,
      data: { ...result, message: `${result.total} certificate(s) queued for generation` },
    });
  } catch (error) { next(error); }
};

export const bulkImportCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const { eventId, certificateTypeSlug, templateId, sendEmail = false, csv } = req.body;
    const issuedBy = (req.user?._id || req.user?.id)?.toString();

    const result = await certificateService.importCSV({
      csv,
      eventId,
      templateId,
      certificateTypeSlug,
      sendEmail,
      issuedBy,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const getBulkRequestStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const certRequest = await CertificateRequest.findById(req.params.requestId)
      .select("status progress type createdAt updatedAt");
    if (!certRequest) return next(new AppError("Certificate request not found", 404));
    res.status(200).json({ success: true, data: { request: certRequest } });
  } catch (error) { next(error); }
};

export const updateCertificate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const { id } = req.params;
    const { recipient, data, status, certificateTypeSlug } = req.body;
    const actorId = req.user?._id || req.user?.id;

    const cert = await Certificate.findById(id);
    if (!cert) return next(new AppError("Certificate not found", 404));

    const $set: Record<string, any> = {};
    if (recipient?.name) $set["recipient.name"] = recipient.name;
    if (recipient?.email) $set["recipient.email"] = recipient.email.toLowerCase();
    if (data !== undefined) $set.data = data;
    if (status) $set.status = status;
    if (certificateTypeSlug !== undefined) $set.certificateTypeSlug = certificateTypeSlug || null;

    const updated = await Certificate.findByIdAndUpdate(
      id,
      { $set, $push: { history: { event: "updated", actor: actorId, at: new Date() } } },
      { new: true, runValidators: true },
    )
      .populate("eventId", "title")
      .populate("userId", "firstName lastName email");

    await AuditLog.create({
      action: "certificate.updated",
      entityType: "Certificate",
      entityId: id,
      actor: actorId,
      meta: { fields: Object.keys($set) },
    });

    res.status(200).json({ success: true, data: { certificate: updated } });
  } catch (error) { next(error); }
};

export const deleteCertificate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const actorId = req.user?._id || req.user?.id;

    const cert = await Certificate.findByIdAndDelete(req.params.id);
    if (!cert) return next(new AppError("Certificate not found", 404));

    await cleanupCertificateMedia(cert.pdfUrl);

    await AuditLog.create({
      action: "certificate.deleted",
      entityType: "Certificate",
      entityId: req.params.id,
      actor: actorId,
    });

    res.status(200).json({ success: true, data: { message: "Certificate deleted" } });
  } catch (error) { next(error); }
};

export const purgeAllCertificates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const actorId = req.user?._id || req.user?.id;
    const { eventId, mode } = req.query;
    const storageOnly = mode === "storage-only";

    const filter: Record<string, any> = {};
    if (eventId) filter.eventId = eventId;

    const certs = await Certificate.find(filter).select("pdfUrl").lean();
    const pdfUrls = certs.map(c => c.pdfUrl).filter(Boolean) as string[];

    const mediaService = new MediaService();
    let storageCleanedCount = 0;
    for (const url of pdfUrls) {
      try {
        const uuid = extractUuidFromMediaUrl(url);
        if (!uuid) continue;
        const asset = await MediaAsset.findOne({ uuid });
        if (asset) {
          await mediaService.deleteMedia(asset._id.toString(), true);
          storageCleanedCount++;
        }
      } catch (err: any) {
        logger.warn(`Failed to clean up media for cert PDF: ${url}`, { error: err.message });
      }
    }

    let deletedCount = 0;

    if (storageOnly) {
      // Keep certificate records but clear pdfUrl — verification still works, just no download
      const result = await Certificate.updateMany(
        { ...filter, pdfUrl: { $exists: true, $ne: null } },
        { $unset: { pdfUrl: "" }, $push: { history: { event: "storage_purged", at: new Date() } } },
      );
      deletedCount = result.modifiedCount;
    } else {
      const result = await Certificate.deleteMany(filter);
      deletedCount = result.deletedCount ?? 0;
      await CertificateRequest.deleteMany(filter.eventId ? { eventId: filter.eventId } : {});
    }

    const action = storageOnly ? "certificate.purge_storage" : "certificate.purge_all";
    await AuditLog.create({
      action,
      entityType: "Certificate",
      actor: actorId,
      meta: { affectedCertificates: deletedCount, storageCleanedCount, eventId: eventId || "all", mode: storageOnly ? "storage-only" : "full" },
    });

    const verb = storageOnly ? "Cleared storage for" : "Purged";
    res.status(200).json({
      success: true,
      data: {
        message: `${verb} ${deletedCount} certificate(s), cleaned ${storageCleanedCount} stored file(s)`,
        affectedCertificates: deletedCount,
        storageCleanedCount,
        mode: storageOnly ? "storage-only" : "full",
      },
    });
  } catch (error) { next(error); }
};

function extractUuidFromMediaUrl(url: string): string | null {
  const match = url.match(/\/api\/media\/file\/([a-f0-9-]{36})/i);
  return match?.[1] ?? null;
}

async function cleanupCertificateMedia(pdfUrl?: string): Promise<void> {
  if (!pdfUrl) return;
  const uuid = extractUuidFromMediaUrl(pdfUrl);
  if (!uuid) return;
  try {
    const asset = await MediaAsset.findOne({ uuid });
    if (asset) {
      await new MediaService().deleteMedia(asset._id.toString(), true);
    }
  } catch (err: any) {
    logger.warn(`Failed to clean up certificate media: ${pdfUrl}`, { error: err.message });
  }
}

export const listCertificatesByEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const email = (req.query.email as string).toLowerCase();

    const certificates = await Certificate.find({
      "recipient.email": email,
      status: { $ne: "revoked" },
    })
      .populate("eventId", "title")
      .select("serialNumber recipient status issuedAt pdfUrl certificateTypeSlug eventId createdAt")
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      data: {
        certificates: certificates.map(c => ({
          _id: c._id,
          serialNumber: c.serialNumber,
          recipientName: c.recipient.name,
          eventTitle: (c.eventId as any)?.title,
          status: c.status,
          issuedAt: c.issuedAt,
          pdfUrl: c.pdfUrl,
          certificateTypeSlug: c.certificateTypeSlug,
        })),
      },
    });
  } catch (error) { next(error); }
};

export const listAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!validate(req, next)) return;
    const { entityId, action, page = 1, limit = 50 } = req.query;

    const filter: Record<string, any> = { entityType: "Certificate" };
    if (entityId) filter.entityId = entityId;
    if (action) filter.action = action;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("actor", "firstName lastName email")
        .sort({ at: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: { logs, pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total } },
    });
  } catch (error) { next(error); }
};

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * GET /certificates/export
 * Returns a CSV with all certificate + full student information.
 * Fetches certs with eventId/userId populated, then joins Student records
 * via context.studentId to include every available student field.
 * Also flattens the certificate's `data` mixed field (template merge values
 * like school name, grade, custom fields filled at issuance time).
 */
export const exportCertificates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filter = buildCertificateFilter({
      eventId:        req.query.eventId as string | undefined,
      userId:         req.query.userId as string | undefined,
      studentId:      req.query.studentId as string | undefined,
      recipientEmail: req.query.recipientEmail as string | undefined,
      status:         req.query.status as string | undefined,
      type:           req.query.type as string | undefined,
      issuedFrom:     req.query.issuedFrom as string | undefined,
      issuedTo:       req.query.issuedTo as string | undefined,
    });

    // Fetch all matching certificates (up to 10k; adjust limit if needed)
    const certs = await Certificate.find(filter)
      .populate("eventId", "title")
      .populate("userId", "firstName lastName email phone role schoolName")
      .sort({ issuedAt: -1, createdAt: -1 })
      .limit(10_000)
      .lean<any[]>();

    // Secondary join: fetch Student records for any context.studentId values
    const studentIds = [...new Set(
      certs
        .map((c: any) => c.context?.studentId)
        .filter(Boolean)
    )];

    const studentMap: Record<string, any> = {};
    if (studentIds.length > 0) {
      const students = await Student.find({ _id: { $in: studentIds } })
        .select(
          "firstName lastName email dateOfBirth gender grade rollNumber phone " +
          "address guardianRelation emergencyContact medicalNotes status schoolId"
        )
        .lean<any[]>();
      for (const s of students) {
        studentMap[s._id.toString()] = s;
      }
    }

    // Build one flat row per certificate
    const rows: Record<string, unknown>[] = certs.map((cert: any) => {
      const student: any = studentMap[cert.context?.studentId?.toString?.()] ?? null;
      const eventTitle = (cert.eventId as any)?.title ?? "";
      const user = cert.userId as any;
      const certData: any = cert.data ?? {};

      const row: Record<string, unknown> = {
        // Certificate identifiers
        "Serial Number":         cert.serialNumber ?? "",
        "Certificate Type":      cert.certificateTypeSlug ?? "",
        "Status":                cert.status ?? "",
        "Issued At":             cert.issuedAt ? new Date(cert.issuedAt).toISOString().split("T")[0] : "",
        "Created At":            cert.createdAt ? new Date(cert.createdAt).toISOString().split("T")[0] : "",
        "Event":                 eventTitle,

        // Recipient (name/email at time of issuance — always present)
        "Recipient Name":        cert.recipient?.name ?? "",
        "Recipient Email":       cert.recipient?.email ?? "",

        // Linked user account (account holder who booked/owns the cert)
        "User First Name":       user?.firstName ?? "",
        "User Last Name":        user?.lastName ?? "",
        "User Email":            user?.email ?? "",
        "User Phone":            user?.phone ?? "",
        "User Role":             user?.role ?? "",
        "User School Name":      user?.schoolName ?? "",

        // School Name: sourced from cert data (set at issuance) → user profile → student record
        "School Name":           certData?.school ?? user?.schoolName ?? "",

        // Student profile fields (fully expanded)
        "Student First Name":    student?.firstName ?? "",
        "Student Last Name":     student?.lastName ?? "",
        "Student Email":         student?.email ?? "",
        "Student Phone":         student?.phone ?? "",
        "Date of Birth":         student?.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split("T")[0] : "",
        "Gender":                student?.gender ?? "",
        "Grade":                 student?.grade ?? "",
        "Roll Number":           student?.rollNumber ?? "",
        "School ID":             student?.schoolId?.toString() ?? "",
        "Guardian Relation":     student?.guardianRelation ?? "",
        "Student Status":        student?.status ?? "",
        "Address Line1":         student?.address?.line1 ?? "",
        "Address City":          student?.address?.city ?? "",
        "Address State":         student?.address?.state ?? "",
        "Address Country":       student?.address?.country ?? "",
        "Address Zip":           student?.address?.zip ?? "",
        "Emergency Contact Name":student?.emergencyContact?.name ?? "",
        "Emergency Contact Phone":student?.emergencyContact?.phone ?? "",
        "Emergency Contact Relation":student?.emergencyContact?.relation ?? "",
        "Medical Notes":         student?.medicalNotes ?? "",
      };

      // Flatten cert.data (template merge fields — may contain school name,
      // custom grade, course title, etc. filled at issuance time)
      if (certData && typeof certData === "object") {
        for (const [k, v] of Object.entries(certData)) {
          const colName = `Data: ${k}`;
          row[colName] = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
        }
      }

      return row;
    });

    const dateStamp = new Date().toISOString().split("T")[0];
    const filename = safeReportFilename("certificates-export", dateStamp) + ".csv";
    const csv = toCsv(rows);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);

    logger.info(
      `Certificate export by admin ${(req.user?._id || req.user?.id || "unknown").toString()}, ` +
      `filter: ${JSON.stringify(filter)}, rows: ${rows.length}`,
    );
  } catch (error) { next(error); }
};
