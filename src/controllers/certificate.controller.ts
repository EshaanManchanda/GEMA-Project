import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Certificate, { Template, TemplateVersion, SerialCounter, CertificateRequest, AuditLog } from "../models/Certificate";
import Event from "../models/Event";
import { AppError } from "../middleware/index";
import { AuthRequest } from "../types/index";
import { certificateQueue } from "../config/queue";
import { QueueService } from "../services/queue.service";
import { renderCertificate, buildCertEmailHtml } from "../workers/certificate.worker";
import logger from "../config/logger";

// ─── Templates ───────────────────────────────────────────────────────────────

export const createTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, slug, description, html, css, defaultOptions } = req.body;
    const userId = req.user?._id || req.user?.id;

    const template = await Template.create({
      name,
      slug,
      description,
      html,
      css,
      defaultOptions,
      createdBy: userId,
    });

    res.status(201).json({ success: true, data: { template } });
  } catch (error) {
    next(error);
  }
};

export const listTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await Template.find({ active: true }).select("name slug description mode html css defaultOptions createdAt");
    res.status(200).json({ success: true, data: { templates } });
  } catch (error) {
    next(error);
  }
};

export const getTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return next(new AppError("Template not found", 404));
    res.status(200).json({ success: true, data: { template } });
  } catch (error) {
    next(error);
  }
};

export const updateTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { html, css, ...rest } = req.body;
    const userId = req.user?._id || req.user?.id;

    const existing = await Template.findById(id);
    if (!existing) return next(new AppError("Template not found", 404));

    // Snapshot existing version before update
    if (html || css) {
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

    const template = await Template.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: { template } });
  } catch (error) {
    next(error);
  }
};

export const previewTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { data = {} } = req.body;

    const template = await Template.findById(id);
    if (!template) return next(new AppError("Template not found", 404));

    if (template.mode !== "visual" && !template.html) {
      return next(new AppError("Template has no HTML content. Edit the template and add HTML before previewing.", 400));
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
      ...data,
    };

    const url = await renderCertificate(template, sampleData);
    res.status(200).json({ success: true, data: { previewUrl: url } });
  } catch (error) {
    next(error);
  }
};

// ─── Certificate Generation ───────────────────────────────────────────────────

export const triggerGeneration = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { templateId, recipient, data, eventId, userId, reviewId, options } = req.body;

    if (!recipient?.name || !recipient?.email) {
      return next(new AppError("recipient.name and recipient.email are required", 400));
    }

    const serialNumber = await allocateSerial();

    const certificate = await Certificate.create({
      serialNumber,
      templateId,
      eventId,
      userId,
      reviewId,
      recipient,
      data: data || {},
      status: "pending",
      history: [{ event: "created", at: new Date() }],
    });

    if (certificateQueue) {
      await certificateQueue.add(
        "generate-certificate",
        {
          certificateId: certificate._id.toString(),
          templateId,
          recipient,
          data,
          options: options || {},
        },
        { attempts: 3, backoff: { type: "exponential", delay: 3000 } },
      );
    } else {
      logger.warn("Certificate queue unavailable — certificate marked pending");
    }

    res.status(201).json({ success: true, data: { certificate } });
  } catch (error) {
    next(error);
  }
};

export const getCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const certificate = await Certificate.findById(id)
      .populate("templateId", "name slug")
      .populate("eventId", "title")
      .populate("userId", "firstName lastName email");

    if (!certificate) return next(new AppError("Certificate not found", 404));

    res.status(200).json({ success: true, data: { certificate } });
  } catch (error) {
    next(error);
  }
};

export const listCertificates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId, userId, status, page = 1, limit = 20 } = req.query;

    const filter: Record<string, any> = {};
    if (eventId) filter.eventId = eventId;
    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [certificates, total] = await Promise.all([
      Certificate.find(filter)
        .populate("eventId", "title")
        .populate("userId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Certificate.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        certificates,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { serialNumber } = req.params;

    const certificate = await Certificate.findOne({ serialNumber, status: { $ne: "revoked" } })
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
  } catch (error) {
    next(error);
  }
};

export const revokeCertificate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const actorId = req.user?._id || req.user?.id;

    const certificate = await Certificate.findByIdAndUpdate(
      id,
      {
        status: "revoked",
        $push: { history: { event: "revoked", actor: actorId, at: new Date() } },
      },
      { new: true },
    );

    if (!certificate) return next(new AppError("Certificate not found", 404));

    await AuditLog.create({
      action: "certificate.revoked",
      entityType: "Certificate",
      entityId: id,
      actor: actorId,
    });

    res.status(200).json({ success: true, data: { certificate } });
  } catch (error) {
    next(error);
  }
};

export const downloadCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const certificate = await Certificate.findById(id).select("pdfUrl status recipient");
    if (!certificate) return next(new AppError("Certificate not found", 404));
    if (!certificate.pdfUrl) return next(new AppError("Certificate PDF not yet generated", 404));

    res.status(200).json({ success: true, data: { pdfUrl: certificate.pdfUrl } });
  } catch (error) {
    next(error);
  }
};

export const resendCertificateEmail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const actorId = req.user?._id || req.user?.id;

    const certificate = await Certificate.findById(id).populate("eventId", "title");
    if (!certificate) return next(new AppError("Certificate not found", 404));
    if (!certificate.pdfUrl) return next(new AppError("Certificate PDF not ready", 400));

    const eventTitle = (certificate.eventId as any)?.title || "Event";

    await QueueService.addEmailJob({
      type: "generic",
      to: certificate.recipient.email,
      subject: `Your Certificate — ${eventTitle}`,
      html: buildCertEmailHtml(
        certificate.recipient.name,
        eventTitle,
        certificate.serialNumber,
        certificate.pdfUrl,
        certificate.qrData,
      ),
    });

    await Certificate.findByIdAndUpdate(id, {
      $push: { history: { event: "email_resent", actor: actorId, at: new Date() } },
    });

    await AuditLog.create({
      action: "certificate.email_resent",
      entityType: "Certificate",
      entityId: id,
      actor: actorId,
      meta: { to: certificate.recipient.email },
    });

    res.status(200).json({ success: true, message: "Email queued for resend" });
  } catch (error) {
    next(error);
  }
};

export const bulkGenerate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { templateId, eventId, inputs, options = {} } = req.body;
    const actorId = req.user?._id || req.user?.id;

    if (!Array.isArray(inputs) || inputs.length === 0) {
      return next(new AppError("inputs array is required and must not be empty", 400));
    }

    if (inputs.length > 500) {
      return next(new AppError("Maximum 500 certificates per bulk request", 400));
    }

    const certRequest = await CertificateRequest.create({
      type: inputs.length === 1 ? "single" : "bulk",
      templateId,
      eventId,
      inputs,
      options,
      status: "queued",
      progress: { total: inputs.length, processed: 0, failed: 0 },
      createdBy: actorId,
    });

    // Enqueue individual certificate jobs in chunks of 50
    const CHUNK = 50;
    for (let i = 0; i < inputs.length; i += CHUNK) {
      const chunk = inputs.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map(async (input: any) => {
          const serialNumber = await allocateSerial();
          const cert = await Certificate.create({
            serialNumber,
            templateId,
            eventId,
            userId: input.userId || new mongoose.Types.ObjectId(),
            recipient: { name: input.recipientName, email: input.recipientEmail },
            data: input.data || {},
            status: "pending",
            history: [{ event: "created", at: new Date() }],
          });

          if (certificateQueue) {
            await certificateQueue.add(
              "generate-certificate",
              {
                certificateId: cert._id.toString(),
                requestId: certRequest._id.toString(),
                templateId,
                recipient: { name: input.recipientName, email: input.recipientEmail },
                data: input.data || {},
                options,
              },
              { attempts: 3, backoff: { type: "exponential", delay: 3000 } },
            );
          }
        }),
      );
    }

    await CertificateRequest.findByIdAndUpdate(certRequest._id, { status: "in_progress" });

    res.status(202).json({
      success: true,
      data: {
        requestId: certRequest._id,
        total: inputs.length,
        message: `${inputs.length} certificate(s) queued for generation`,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getBulkRequestStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requestId } = req.params;
    const certRequest = await CertificateRequest.findById(requestId).select("status progress type createdAt updatedAt");
    if (!certRequest) return next(new AppError("Certificate request not found", 404));
    res.status(200).json({ success: true, data: { request: certRequest } });
  } catch (error) {
    next(error);
  }
};

// ─── Bulk Import CSV ───────────────────────────────────────────────────────────────

export const bulkImportCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId, certificateTypeSlug } = req.body;
    const actorId = req.user?._id || req.user?.id;

    if (!req.file) {
      return next(new AppError("CSV file is required", 400));
    }

    const csvContent = req.file.buffer.toString("utf-8");
    const lines = csvContent.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return next(new AppError("CSV must have header row and at least one data row", 400));
    }

    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIdx = header.indexOf("name");
    const emailIdx = header.indexOf("email");
    const typeIdx = header.indexOf("certificatetype");

    if (nameIdx === -1 || emailIdx === -1) {
      return next(new AppError("CSV must have 'name' and 'email' columns", 400));
    }

    const event = await mongoose.model("Event").findById(eventId).select("certificateTypes");
    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    const certTypes = event.certificateTypes || [];
    const defaultType = certTypes.find((ct) => ct.isDefault) || certTypes[0];

    const inputs: Array<{ recipientName: string; recipientEmail: string; certificateTypeSlug?: string; data?: Record<string, any> }> = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      if (cols.length < 2 || !cols[nameIdx] || !cols[emailIdx]) continue;

      const rowType = typeIdx !== -1 ? cols[typeIdx]?.trim() : "";
      const resolvedType = rowType || certificateTypeSlug || defaultType?.slug || "";

      inputs.push({
        recipientName: cols[nameIdx],
        recipientEmail: cols[emailIdx],
        certificateTypeSlug: resolvedType,
        data: { importedAt: new Date().toISOString() },
      });
    }

    if (inputs.length === 0) {
      return next(new AppError("No valid rows found in CSV", 400));
    }

    if (inputs.length > 500) {
      return next(new AppError("Maximum 500 certificates per import", 400));
    }

    const certRequest = await CertificateRequest.create({
      type: "bulk",
      eventId,
      templateId: defaultType?.templateId,
      inputs,
      options: { sendEmail: false },
      status: "queued",
      progress: { total: inputs.length, processed: 0, failed: 0 },
      createdBy: actorId,
    });

    for (const input of inputs) {
      const certType = certTypes.find((ct) => ct.slug === input.certificateTypeSlug);
      const templateId = certType?.templateId || defaultType?.templateId;

      const serialNumber = await allocateSerial();
      const userId = new mongoose.Types.ObjectId();

      const cert = await Certificate.create({
        serialNumber,
        templateId,
        certificateTypeSlug: input.certificateTypeSlug,
        eventId,
        userId,
        recipient: { name: input.recipientName, email: input.recipientEmail },
        data: input.data || {},
        status: "pending",
        history: [{ event: "imported", at: new Date(), actor: actorId }],
      });

      if (certificateQueue) {
        await certificateQueue.add(
          "generate-certificate",
          {
            certificateId: cert._id.toString(),
            requestId: certRequest._id.toString(),
            templateId,
            recipient: { name: input.recipientName, email: input.recipientEmail },
            data: input.data || {},
          },
          { attempts: 3, backoff: { type: "exponential", delay: 3000 } },
        );
      }
    }

    await CertificateRequest.findByIdAndUpdate(certRequest._id, { status: "in_progress" });

    res.status(202).json({
      success: true,
      data: {
        requestId: certRequest._id,
        total: inputs.length,
        message: `${inputs.length} certificate(s) queued for generation from CSV`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Audit Log ───────────────────────────────────────────────────────────────

export const listAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

// ─── Template Versions ────────────────────────────────────────────────────────

export const listTemplateVersions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const versions = await TemplateVersion.find({ templateId: id })
      .populate("createdBy", "firstName lastName")
      .sort({ version: -1 })
      .select("version createdAt createdBy");

    res.status(200).json({ success: true, data: { versions } });
  } catch (error) {
    next(error);
  }
};

export const rollbackTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id, versionNumber } = req.params;
    const userId = req.user?._id || req.user?.id;

    const versionDoc = await TemplateVersion.findOne({ templateId: id, version: parseInt(versionNumber) });
    if (!versionDoc) return next(new AppError("Template version not found", 404));

    const existing = await Template.findById(id);
    if (!existing) return next(new AppError("Template not found", 404));

    // Snapshot current version before rollback
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
  } catch (error) {
    next(error);
  }
};

// ─── Sample CSV ───────────────────────────────────────────────────────────────

export const getSampleCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId).select("certificateTypes");
    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    const certTypes = event.certificateTypes || [];
    const firstType = certTypes.find((ct) => ct.isDefault) || certTypes[0];
    const defaultSlug = firstType?.slug || "participation";

    const csvRows = ["name,email,certificateType"];

    const sampleNames = ["John Doe", "Jane Smith", "Michael Johnson", "Emily Brown", "David Wilson"];
    const sampleEmails = [
      "john@example.com",
      "jane@example.com",
      "michael@example.com",
      "emily@example.com",
      "david@example.com",
    ];

    certTypes.forEach((type, idx) => {
      csvRows.push(`${sampleNames[idx % sampleNames.length]},${sampleEmails[idx % sampleEmails.length]},${type.slug}`);
    });

    if (certTypes.length === 0) {
      csvRows.push(`John Doe,john@example.com,${defaultSlug}`);
      csvRows.push(`Jane Smith,jane@example.com,${defaultSlug}`);
    }

    const csv = csvRows.join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=certificate-import-sample.csv");
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// ─── Helper ───────────────────────────────────────────────────────────────────

async function allocateSerial(): Promise<string> {
  const counter = await SerialCounter.findOneAndUpdate(
    { key: "global" },
    { $inc: { next: 1 } },
    { upsert: true, new: true },
  );
  const seq = String(counter.next).padStart(6, "0");
  const year = new Date().getFullYear();
  return `${counter.prefix || "CERT"}-${year}-${seq}`;
}
