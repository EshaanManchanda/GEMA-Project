import mongoose from "mongoose";
import Certificate, {
  ICertificate,
  CertificateStatus,
  Template,
  SerialCounter,
  AuditLog,
  CertificateRequest,
} from "../../../models/Certificate";
import Student from "../../../models/Student";
import { certificateQueue } from "../../../config/queue";
import { QueueService } from "../../../services/queue.service";
import { buildCertEmailHtml } from "../../../workers/certificate.worker";
import { AppError } from "../../../middleware/index";
import logger from "../../../config/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateCertificateInput {
  templateId?: string;
  certificateTypeSlug?: string;
  eventId: string;
  userId: string;
  reviewId?: string;
  recipient: { name: string; email: string; meta?: Record<string, any> };
  context?: { courseId?: string; studentId?: string; customRef?: string };
  data?: Record<string, any>;
  issuedBy?: string;
}

export interface QueueGenerationOpts {
  templateId?: string;
  recipient: { name: string; email: string };
  data: Record<string, any>;
  requestId?: string;
  options?: { sendEmail?: boolean };
}

export interface BulkCreateInput {
  recipientName: string;
  recipientEmail: string;
  userId?: string;
  data?: Record<string, any>;
}

export interface IssueForEventOpts {
  eventId: string;
  userId: string;
  reviewId?: string;
  recipient: { name: string; email: string };
  templateId?: string;
  certificateTypeSlug?: string;
  data?: Record<string, any>;
  issuedBy?: string;
  sendEmail?: boolean;
}

export interface BulkIssueOpts {
  templateId: string;
  eventId: string;
  inputs: BulkCreateInput[];
  options?: { sendEmail?: boolean };
  createdBy?: string;
}

export interface ImportCSVOpts {
  csv: string;
  eventId: string;
  templateId?: string;
  certificateTypeSlug?: string;
  sendEmail?: boolean;
  issuedBy?: string;
}

type EventCertType = {
  name: string;
  slug: string;
  templateId?: mongoose.Types.ObjectId;
  isDefault?: boolean;
};

// Fields not forwarded as certificate data from CSV imports
const SKIP_CSV_FIELDS = new Set([
  "student_name",
  "name",
  "first_name",
  "firstname",
  "last_name",
  "lastname",
  "email",
  "issue_date",
  "certificate_type",
  "consent",
  "pay_receipt",
  "paste_url_of_robotics_project_code_if_you_have_used_coding_in_your_project",
  "upload_zip_file_of_robotics_project_code_if_you_have_used_coding_in_your_project",
]);

// ─── Service ──────────────────────────────────────────────────────────────────

class CertificateService {
  // ─── Serial Numbers ──────────────────────────────────────────────────────

  async generateSerialNumber(): Promise<string> {
    const counter = await SerialCounter.findOneAndUpdate(
      { key: "global" },
      { $inc: { next: 1 } },
      { upsert: true, new: true },
    );
    const seq = String(counter.next).padStart(6, "0");
    const year = new Date().getFullYear();
    return `${counter.prefix || "CERT"}-${year}-${seq}`;
  }

  // ─── Template Selection ──────────────────────────────────────────────────

  findMatchingTemplate(
    certificateTypes: EventCertType[],
    slug?: string,
  ): EventCertType | null {
    if (!certificateTypes?.length) return null;
    if (slug) return certificateTypes.find(ct => ct.slug === slug) ?? null;
    return certificateTypes.find(ct => ct.isDefault) ?? certificateTypes[0];
  }

  async selectTemplate(
    eventId: string,
    certificateTypeSlug?: string,
  ): Promise<{ templateId?: string; certTypeSlug?: string; eventTitle?: string }> {
    // Dynamic import to avoid circular dependency with Event model barrel
    const Event = (await import("../../../models/Event")).default;
    const event = await Event.findById(eventId)
      .select("certificateTypes title")
      .lean<{ certificateTypes?: EventCertType[]; title?: string }>();
    if (!event) throw new AppError("Event not found", 404);

    const match = this.findMatchingTemplate(event.certificateTypes ?? [], certificateTypeSlug);
    if (!match?.templateId) return { certTypeSlug: certificateTypeSlug, eventTitle: event.title };

    return {
      templateId: match.templateId.toString(),
      certTypeSlug: match.slug,
      eventTitle: event.title,
    };
  }

  // ─── Certificate CRUD ────────────────────────────────────────────────────

  async createCertificate(input: CreateCertificateInput): Promise<ICertificate> {
    const serialNumber = await this.generateSerialNumber();

    return Certificate.create({
      serialNumber,
      templateId: input.templateId,
      certificateTypeSlug: input.certificateTypeSlug,
      eventId: input.eventId,
      userId: input.userId,
      reviewId: input.reviewId,
      recipient: input.recipient,
      context: input.context,
      data: input.data ?? {},
      status: "pending" as CertificateStatus,
      issuedBy: input.issuedBy,
      history: [{ event: "created", at: new Date() }],
    });
  }

  // ─── Queue ───────────────────────────────────────────────────────────────

  async queuePDFGeneration(certificateId: string, opts: QueueGenerationOpts): Promise<void> {
    if (!certificateQueue) {
      logger.warn(`Certificate queue unavailable — cert ${certificateId} stays pending`);
      return;
    }

    await certificateQueue.add(
      "generate-certificate",
      {
        certificateId,
        requestId: opts.requestId,
        templateId: opts.templateId,
        recipient: opts.recipient,
        data: opts.data,
        options: opts.options ?? {},
      },
      { attempts: 3, backoff: { type: "exponential", delay: 3000 } },
    );
  }

  // ─── Email ───────────────────────────────────────────────────────────────

  async sendCertificateEmail(certificateId: string, actorId?: string): Promise<void> {
    const certificate = await Certificate.findById(certificateId).populate("eventId", "title");
    if (!certificate) throw new AppError("Certificate not found", 404);
    if (!certificate.pdfUrl) throw new AppError("Certificate PDF not ready", 400);

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

    await Certificate.findByIdAndUpdate(certificateId, {
      $push: { history: { event: "email_resent", actor: actorId, at: new Date() } },
    });

    await AuditLog.create({
      action: "certificate.email_resent",
      entityType: "Certificate",
      entityId: certificateId,
      actor: actorId,
      meta: { to: certificate.recipient.email },
    });
  }

  // ─── Composite: single issue ─────────────────────────────────────────────

  /**
   * End-to-end: resolve template from event → create cert → queue PDF.
   * Used by the review-triggered certificate flow.
   */
  async issueForEvent(opts: IssueForEventOpts): Promise<ICertificate> {
    let resolvedTemplateId = opts.templateId;
    let resolvedSlug = opts.certificateTypeSlug;
    let eventTitle: string | undefined;

    if (!resolvedTemplateId) {
      const resolved = await this.selectTemplate(opts.eventId, opts.certificateTypeSlug);
      resolvedTemplateId = resolved.templateId;
      resolvedSlug = resolved.certTypeSlug;
      eventTitle = resolved.eventTitle;
    }

    // Always include eventTitle in cert data so template fields resolve correctly
    const enrichedData: Record<string, any> = {
      ...(eventTitle ? { eventTitle } : {}),
      ...opts.data,
    };

    const certificate = await this.createCertificate({
      templateId: resolvedTemplateId,
      certificateTypeSlug: resolvedSlug,
      eventId: opts.eventId,
      userId: opts.userId,
      reviewId: opts.reviewId,
      recipient: opts.recipient,
      data: enrichedData,
      issuedBy: opts.issuedBy,
    });

    await this.queuePDFGeneration(certificate._id.toString(), {
      templateId: resolvedTemplateId,
      recipient: opts.recipient,
      data: enrichedData,
      options: { sendEmail: opts.sendEmail },
    });

    return certificate;
  }

  // ─── Composite: bulk issue ────────────────────────────────────────────────

  async bulkIssue(opts: BulkIssueOpts): Promise<{ requestId: string; total: number }> {
    const certRequest = await CertificateRequest.create({
      type: opts.inputs.length === 1 ? "single" : "bulk",
      templateId: opts.templateId,
      eventId: opts.eventId,
      inputs: opts.inputs,
      options: opts.options ?? {},
      status: "queued",
      progress: { total: opts.inputs.length, processed: 0, failed: 0 },
      createdBy: opts.createdBy,
    });

    const CHUNK = 50;
    for (let i = 0; i < opts.inputs.length; i += CHUNK) {
      const chunk = opts.inputs.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map(async (input) => {
          const certificate = await this.createCertificate({
            templateId: opts.templateId,
            eventId: opts.eventId,
            userId: input.userId ?? new mongoose.Types.ObjectId().toString(),
            recipient: { name: input.recipientName, email: input.recipientEmail },
            data: input.data,
          });

          await this.queuePDFGeneration(certificate._id.toString(), {
            templateId: opts.templateId,
            recipient: { name: input.recipientName, email: input.recipientEmail },
            data: input.data ?? {},
            requestId: certRequest._id.toString(),
            options: opts.options,
          });
        }),
      );
    }

    await CertificateRequest.findByIdAndUpdate(certRequest._id, { status: "in_progress" });

    return { requestId: certRequest._id.toString(), total: opts.inputs.length };
  }

  // ─── Composite: CSV import ────────────────────────────────────────────────

  async importCSV(opts: ImportCSVOpts): Promise<{
    processed: number;
    failed: number;
    results: { serial: string; recipientName: string; email: string; studentLinked: boolean }[];
    failedRows: { row: number; email?: string; error: string }[];
  }> {
    if (!opts.csv?.trim()) throw new AppError("csv is required", 400);

    const rawLines = opts.csv.trim().split("\n").map(l => l.trimEnd()).filter(Boolean);
    if (rawLines.length < 2) throw new AppError("CSV must have a header row and at least one data row", 400);
    if (rawLines.length - 1 > 500) throw new AppError("Maximum 500 rows per import", 400);

    const headers = this.parseCSVRow(rawLines[0]).map(h => h.toLowerCase().trim().replace(/\s+/g, "_"));
    const dataLines = rawLines.slice(1);

    const results: { serial: string; recipientName: string; email: string; studentLinked: boolean }[] = [];
    const failedRows: { row: number; email?: string; error: string }[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const cols = this.parseCSVRow(dataLines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = (cols[idx] || "").trim(); });

        const recipientName = (
          row["student_name"] ||
          row["name"] ||
          `${row["first_name"] || row["firstname"] || ""} ${row["last_name"] || row["lastname"] || ""}`.trim()
        );
        const email = row["email"] || "";

        if (!recipientName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          failedRows.push({ row: i + 1, email, error: "Missing student_name or invalid email" });
          continue;
        }

        const student = await Student.findOne({ email: email.toLowerCase() })
          .select("_id grade rollNumber")
          .lean<{ _id: mongoose.Types.ObjectId; grade?: string }>();

        const certData: Record<string, any> = {};
        const schoolName = row["school_name"] || row["school"] || "";
        const issueDate = row["issue_date"] || "";
        const rowCertType = row["certificate_type"] || "";

        headers.forEach(h => {
          if (!SKIP_CSV_FIELDS.has(h) && row[h]) certData[h] = row[h];
        });
        if (schoolName) certData.school = schoolName;
        if (issueDate) certData.issueDate = issueDate;
        if (student?.grade && !certData.grade) certData.grade = student.grade;

        const effectiveCertTypeSlug = rowCertType || opts.certificateTypeSlug;

        const certificate = await this.createCertificate({
          templateId: opts.templateId,
          certificateTypeSlug: effectiveCertTypeSlug,
          eventId: opts.eventId,
          userId: opts.issuedBy ?? new mongoose.Types.ObjectId().toString(),
          recipient: { name: recipientName, email: email.toLowerCase() },
          context: student ? { studentId: student._id.toString() } : undefined,
          data: certData,
          issuedBy: opts.issuedBy,
        });

        if (opts.templateId) {
          await this.queuePDFGeneration(certificate._id.toString(), {
            templateId: opts.templateId,
            recipient: { name: recipientName, email: email.toLowerCase() },
            data: certData,
            options: { sendEmail: opts.sendEmail },
          });
        } else {
          logger.warn(`CSV import row ${i + 1}: no templateId — cert created pending without PDF job`);
        }

        results.push({
          serial: certificate.serialNumber,
          recipientName,
          email: email.toLowerCase(),
          studentLinked: !!student,
        });
      } catch (err: any) {
        failedRows.push({ row: i + 1, error: err.message || "Failed to issue certificate" });
      }
    }

    return { processed: results.length, failed: failedRows.length, results, failedRows };
  }

  // ─── Utils ───────────────────────────────────────────────────────────────

  parseCSVRow(line: string): string[] {
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
}

export const certificateService = new CertificateService();
export default CertificateService;
