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

// ─── Guards ───────────────────────────────────────────────────────────────────

function validate(req: Request, next: NextFunction): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next(new AppError(errors.array()[0].msg, 400));
    return false;
  }
  return true;
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
    const { eventId, userId, studentId, recipientEmail, status, page = 1, limit = 20 } = req.query;

    const filter: Record<string, any> = {};
    if (eventId) filter.eventId = eventId;
    if (userId) filter.userId = userId;
    if (studentId) filter["context.studentId"] = studentId as string;
    if (recipientEmail) filter["recipient.email"] = (recipientEmail as string).toLowerCase();
    if (status) filter.status = status;

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
