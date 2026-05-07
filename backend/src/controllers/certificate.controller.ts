import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Certificate, { Template, TemplateVersion, SerialCounter, CertificateRequest, AuditLog } from "../models/Certificate";
import Student from "../models/Student";
import { AppError } from "../middleware/index";
import { AuthRequest } from "../types/index";
import { certificateQueue } from "../config/queue";
import { QueueService } from "../services/queue.service";
import { renderCertificate, buildCertEmailHtml } from "../workers/certificate.worker";
import logger from "../config/logger";

// ─── Templates ───────────────────────────────────────────────────────────────

export const createTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, slug, description, html, css, defaultOptions, mode, backgroundImageUrl, canvasWidth, canvasHeight, fields } = req.body;
    const userId = req.user?._id || req.user?.id;

    const template = await Template.create({
      name,
      slug,
      description,
      html,
      css,
      defaultOptions,
      mode: mode || "html",
      backgroundImageUrl,
      canvasWidth,
      canvasHeight,
      fields,
      createdBy: userId,
    });

    res.status(201).json({ success: true, data: { template } });
  } catch (error) {
    next(error);
  }
};

export const deleteTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const template = await Template.findById(id);
    if (!template) return next(new AppError("Template not found", 404));
    await Template.findByIdAndDelete(id);
    res.status(200).json({ success: true, data: { message: "Template deleted" } });
  } catch (error) {
    next(error);
  }
};

export const listTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await Template.find({ active: true }).select("name slug description mode html css defaultOptions canvasWidth canvasHeight fields createdAt");
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
  } catch (error: any) {
    const msg = error?.message || "";
    if (msg.includes("executablePath") || msg.includes("CHROME") || msg.includes("chrome") || msg.includes("chromium")) {
      return next(new AppError(`Chrome not found. Set CHROME_PATH env var (current: ${process.env.CHROME_PATH || "unset"}). ${msg}`, 500));
    }
    if (msg.includes("net::ERR") || msg.includes("CORS") || msg.includes("cross-origin")) {
      return next(new AppError(`Preview failed — image asset blocked by CORS or unreachable URL. Use public Cloudinary URLs in your template. ${msg}`, 500));
    }
    next(error);
  }
};

// ─── Certificate Generation ───────────────────────────────────────────────────

export const triggerGeneration = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { templateId, recipient, data, eventId, userId, reviewId, options, certificateTypeSlug } = req.body;

    if (!recipient?.name || !recipient?.email) {
      return next(new AppError("recipient.name and recipient.email are required", 400));
    }

    const serialNumber = await allocateSerial();

    const certificate = await Certificate.create({
      serialNumber,
      templateId,
      certificateTypeSlug: certificateTypeSlug || undefined,
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
      studentMap = Object.fromEntries(students.map(s => [(s._id as mongoose.Types.ObjectId).toString(), s]));
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

export const retryCertificate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const certificate = await Certificate.findById(id);
    if (!certificate) return next(new AppError("Certificate not found", 404));

    if (!["pending", "failed"].includes(certificate.status)) {
      return next(new AppError(`Cannot retry certificate with status '${certificate.status}'`, 400));
    }

    await Certificate.findByIdAndUpdate(id, {
      status: "pending",
      failureReason: undefined,
      $push: { history: { event: "retry_requested", at: new Date() } },
    });

    if (certificateQueue) {
      await certificateQueue.add(
        "generate-certificate",
        {
          certificateId: id,
          templateId: certificate.templateId?.toString(),
          recipient: certificate.recipient,
          data: certificate.data || {},
          options: {},
        },
        { attempts: 3, backoff: { type: "exponential", delay: 3000 } },
      );
    } else {
      logger.warn("Certificate queue unavailable — attempting synchronous generation");
      try {
        const { renderCertificate } = await import("../workers/certificate.worker");
        const template = await (await import("../models/Certificate")).Template.findById(certificate.templateId);
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

        const updated = await Certificate.findById(id);
        return res.status(200).json({ success: true, data: { certificate: updated } });
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

export const bulkImportCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId, certificateTypeSlug, templateId, sendEmail = false, csv } = req.body;
    const actorId = req.user?._id || req.user?.id;

    if (!csv?.trim()) return next(new AppError("csv is required", 400));

    const rawLines = (csv as string).trim().split("\n").map((l: string) => l.trimEnd()).filter(Boolean);
    if (rawLines.length < 2) return next(new AppError("CSV must have a header row and at least one data row", 400));

    const headers = parseCSVRow(rawLines[0]).map(h => h.toLowerCase().trim().replace(/\s+/g, "_"));
    const dataLines = rawLines.slice(1);

    if (dataLines.length > 500) return next(new AppError("Maximum 500 rows per import", 400));

    const SKIP_FIELDS = new Set([
      "student_name", "name", "first_name", "firstname", "last_name", "lastname",
      "email", "issue_date", "certificate_type", "consent",
      "pay_receipt", "paste_url_of_robotics_project_code_if_you_have_used_coding_in_your_project",
      "upload_zip_file_of_robotics_project_code_if_you_have_used_coding_in_your_project",
    ]);

    const results: Array<{ serial: string; recipientName: string; email: string; studentLinked: boolean }> = [];
    const failedRows: Array<{ row: number; email?: string; error: string }> = [];

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const cols = parseCSVRow(dataLines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = (cols[idx] || "").trim(); });

        const recipientName = (
          row["student_name"] || row["name"] ||
          `${row["first_name"] || row["firstname"] || ""} ${row["last_name"] || row["lastname"] || ""}`.trim()
        );
        const email = row["email"] || "";
        const schoolName = row["school_name"] || row["school"] || "";
        const issueDate = row["issue_date"] || "";
        const rowCertType = row["certificate_type"] || "";

        if (!recipientName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          failedRows.push({ row: i + 1, email, error: "Missing student_name or invalid email" });
          continue;
        }

        const student = await Student.findOne({ email: email.toLowerCase() }).select("_id grade rollNumber").lean();

        const certData: Record<string, any> = {};
        headers.forEach(h => {
          if (!SKIP_FIELDS.has(h) && row[h]) certData[h] = row[h];
        });
        if (schoolName) certData.school = schoolName;
        if (issueDate) certData.issueDate = issueDate;
        if (student?.grade && !certData.grade) certData.grade = student.grade;

        const effectiveCertTypeSlug = rowCertType || certificateTypeSlug || undefined;
        const serialNumber = await allocateSerial();

        const cert = await Certificate.create({
          serialNumber,
          templateId: templateId || undefined,
          certificateTypeSlug: effectiveCertTypeSlug,
          eventId,
          userId: actorId,
          recipient: { name: recipientName, email: email.toLowerCase() },
          context: student ? { studentId: (student._id as mongoose.Types.ObjectId).toString() } : undefined,
          data: certData,
          status: "pending",
          issuedBy: actorId,
          history: [{ event: "created", at: new Date() }],
        });

        if (certificateQueue && templateId) {
          await certificateQueue.add(
            "generate-certificate",
            {
              certificateId: cert._id.toString(),
              templateId,
              recipient: { name: recipientName, email: email.toLowerCase() },
              data: certData,
              options: { sendEmail },
            },
            { attempts: 3, backoff: { type: "exponential", delay: 3000 } },
          );
        } else if (!templateId) {
          logger.warn(`Bulk import row ${i + 1}: no templateId — cert created pending without PDF job`);
        }

        results.push({ serial: serialNumber, recipientName, email: email.toLowerCase(), studentLinked: !!student });
      } catch (err: any) {
        failedRows.push({ row: i + 1, error: err.message || "Failed to issue certificate" });
      }
    }

    res.status(201).json({
      success: true,
      data: { processed: results.length, failed: failedRows.length, results, failedRows },
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

// ─── Public: Student Certificate Lookup ──────────────────────────────────────

export const listCertificatesByEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.query;
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return next(new AppError("Valid email required", 400));
    }

    const certificates = await Certificate.find({
      "recipient.email": email.toLowerCase(),
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
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Update / Delete Certificate ──────────────────────────────────────

export const updateCertificate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

export const deleteCertificate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const actorId = req.user?._id || req.user?.id;

    const cert = await Certificate.findByIdAndDelete(id);
    if (!cert) return next(new AppError("Certificate not found", 404));

    await AuditLog.create({
      action: "certificate.deleted",
      entityType: "Certificate",
      entityId: id,
      actor: actorId,
    });

    res.status(200).json({ success: true, data: { message: "Certificate deleted" } });
  } catch (error) {
    next(error);
  }
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (i === line.length) break;
    if (line[i] === '"') {
      i++;
      let field = "";
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') { field += '"'; i += 2; }
          else { i++; break; }
        } else {
          field += line[i++];
        }
      }
      result.push(field.trim());
      if (i < line.length && line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) { result.push(line.slice(i).trim()); break; }
      result.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return result;
}

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
