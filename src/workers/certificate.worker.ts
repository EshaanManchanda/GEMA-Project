import { Worker, Job } from "bullmq";
import Handlebars from "handlebars";
import QRCode from "qrcode";
import { QUEUE_NAMES, bullMQConnection, areQueuesEnabled } from "../config/queue";
import Certificate, { Template, AuditLog, CertificateRequest, ITemplate, ITemplateField } from "../models/Certificate";
import { QueueService } from "../services/queue.service";
import logger from "../config/logger";

export interface CertificateJobData {
  certificateId: string;
  requestId?: string;
  templateId?: string;
  recipient: { name: string; email: string };
  data: Record<string, any>;
  options?: { sendEmail?: boolean };
}

// ─── Handlebars helpers ───────────────────────────────────────────────────────

Handlebars.registerHelper("upper", (str: string) => String(str ?? "").toUpperCase());
Handlebars.registerHelper("lower", (str: string) => String(str ?? "").toLowerCase());
Handlebars.registerHelper("date", (d: string | Date) => {
  const date = d ? new Date(d) : new Date();
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
});
Handlebars.registerHelper("year", () => new Date().getFullYear());
Handlebars.registerHelper("default", (val: any, fallback: string) => val ?? fallback);

// ─── Worker ───────────────────────────────────────────────────────────────────

const certificateWorker = areQueuesEnabled
  ? new Worker(
      QUEUE_NAMES.CERTIFICATE_GENERATION,
      async (job: Job<CertificateJobData>) => {
        const { certificateId, requestId, templateId, recipient, data, options } = job.data;

        logger.info(`Processing certificate job ${job.id}`, { certificateId });

        await Certificate.findByIdAndUpdate(certificateId, {
          status: "generating",
          $push: { history: { event: "generation_started", at: new Date() } },
        });

        // Increment request progress counter
        if (requestId) {
          await CertificateRequest.findByIdAndUpdate(requestId, {
            status: "in_progress",
          });
        }

        try {
          if (!templateId) {
            throw new Error("No templateId provided — cannot generate certificate");
          }

          const template = await Template.findById(templateId);
          if (!template) throw new Error("Certificate template not found");

          // Build QR verification URL and generate QR image
          const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
          const cert = await Certificate.findById(certificateId).select("serialNumber");
          let qrData: string | undefined;
          let qrCodeUrl: string | undefined;

          if (cert?.serialNumber) {
            qrData = `${baseUrl}/certificates/verify/${cert.serialNumber}`;
            qrCodeUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });
          }

          const pdfUrl = await renderCertificate(template, {
            ...data,
            recipientName: recipient.name,
            recipientEmail: recipient.email,
            issuedDate: new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            qrCode: qrCodeUrl || "",
            qrData: qrData || "",
            serialNumber: cert?.serialNumber || "",
          });

          if (!pdfUrl) throw new Error("Certificate rendering produced no URL");

          await Certificate.findByIdAndUpdate(certificateId, {
            status: "generated",
            pdfUrl,
            qrData,
            qrCodeUrl,
            issuedAt: new Date(),
            $push: { history: { event: "generation_complete", at: new Date() } },
          });

          // Audit log
          await AuditLog.create({
            action: "certificate.generated",
            entityType: "Certificate",
            entityId: certificateId,
            meta: { templateId, recipientEmail: recipient.email },
          });

          // Update request progress
          if (requestId) {
            await CertificateRequest.findByIdAndUpdate(requestId, {
              $inc: { "progress.processed": 1 },
            });
          }

          if (options?.sendEmail) {
            const certDoc = await Certificate.findById(certificateId).populate("eventId", "title");
            const eventTitle = (certDoc?.eventId as any)?.title || "Event";

            await QueueService.addEmailJob({
              type: "generic",
              to: recipient.email,
              subject: `Your Certificate — ${eventTitle}`,
              html: buildCertEmailHtml(recipient.name, eventTitle, cert?.serialNumber, pdfUrl, qrData),
            });

            await Certificate.findByIdAndUpdate(certificateId, {
              status: "email_queued",
              $push: { history: { event: "email_queued", at: new Date() } },
            });

            await AuditLog.create({
              action: "certificate.email_queued",
              entityType: "Certificate",
              entityId: certificateId,
              meta: { to: recipient.email },
            });
          }

          logger.info(`Certificate job ${job.id} complete`, { certificateId });
        } catch (err: any) {
          logger.error(`Certificate job ${job.id} failed`, { certificateId, error: err.message });

          await Certificate.findByIdAndUpdate(certificateId, {
            status: "failed",
            failureReason: err.message,
            $push: { history: { event: "generation_failed", meta: { error: err.message }, at: new Date() } },
          });

          await AuditLog.create({
            action: "certificate.failed",
            entityType: "Certificate",
            entityId: certificateId,
            meta: { error: err.message },
          });

          if (requestId) {
            await CertificateRequest.findByIdAndUpdate(requestId, {
              $inc: { "progress.failed": 1 },
            });
          }

          throw err;
        }
      },
      { connection: bullMQConnection!, concurrency: 3 },
    )
  : null;

// ─── Render ───────────────────────────────────────────────────────────────────

export async function renderCertificate(
  template: ITemplate,
  data: Record<string, any>,
): Promise<string | undefined> {
  const inlined =
    template.mode === "visual"
      ? buildVisualHtml(template, data)
      : buildHtmlTemplate(template.html || "", template.css, data);

  if (!inlined) throw new Error("Certificate rendering produced empty content");

  try {
    const { v2: cloudinary } = await import("cloudinary");
    const buf = Buffer.from(inlined, "utf-8");

    return await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "raw", folder: "certificates", format: "html" },
        (error, result) => {
          if (error || !result) reject(error ?? new Error("No result from Cloudinary"));
          else resolve(result.secure_url);
        },
      );
      stream.end(buf);
    });
  } catch (err) {
    logger.warn("Cloudinary upload failed for certificate:", err);
    throw err;
  }
}

function buildHtmlTemplate(html: string, css: string | undefined, data: Record<string, any>): string {
  const compiled = Handlebars.compile(html, { noEscape: true });
  if (!css) return compiled(data);
  return html.includes("</head>")
    ? compiled({ ...data, __css: css }).replace("</head>", `<style>${css}</style></head>`)
    : `<style>${css}</style>${compiled(data)}`;
}

function buildVisualHtml(template: ITemplate, data: Record<string, any>): string {
  const { backgroundImageUrl, canvasWidth = 1240, canvasHeight = 877, fields = [] } = template;

  const fieldHtml = fields
    .map((f: ITemplateField) => {
      const value = resolveFieldValue(f, data);
      const styles = [
        `position:absolute`,
        `left:${f.x}%`,
        `top:${f.y}%`,
        f.width ? `width:${f.width}%` : "",
        f.fontSize ? `font-size:${f.fontSize}px` : "font-size:16px",
        f.fontWeight ? `font-weight:${f.fontWeight}` : "",
        f.color ? `color:${f.color}` : "color:#000",
        f.fontFamily ? `font-family:${f.fontFamily}` : "",
        f.textAlign ? `text-align:${f.textAlign}` : "",
        `line-height:1.2`,
      ]
        .filter(Boolean)
        .join(";");

      if (f.type === "qr") {
        const qrSize = f.width ? `${f.width}%` : "80px";
        return `<img src="${value}" style="${styles};width:${qrSize};height:auto" alt="QR Code" />`;
      }
      return `<div style="${styles}">${escapeHtml(String(value ?? ""))}</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${canvasWidth}px;height:${canvasHeight}px;overflow:hidden}
  .canvas{position:relative;width:${canvasWidth}px;height:${canvasHeight}px;overflow:hidden}
  .bg{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover}
</style>
</head>
<body>
<div class="canvas">
  ${backgroundImageUrl ? `<img class="bg" src="${backgroundImageUrl}" alt="" />` : ""}
  ${fieldHtml}
</div>
</body>
</html>`;
}

function resolveFieldValue(field: ITemplateField, data: Record<string, any>): any {
  const keyMap: Record<string, string> = {
    recipientName: data.recipientName,
    studentName: data.studentName || data.recipientName,
    schoolName: data.schoolName,
    serialNumber: data.serialNumber,
    issuedDate: data.issuedDate,
    qrCode: data.qrCode,
    eventTitle: data.eventTitle,
  };
  if (field.type === "qr") return data.qrCode || "";
  return keyMap[field.key] ?? data[field.key] ?? field.label;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ─── Email HTML ───────────────────────────────────────────────────────────────

export function buildCertEmailHtml(
  name: string,
  eventTitle: string,
  serial?: string,
  url?: string,
  verifyUrl?: string,
): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#4f46e5">Congratulations, ${name}!</h2>
      <p>Thank you for participating in <strong>${eventTitle}</strong> and for leaving a review.</p>
      ${serial ? `<p><strong>Certificate Serial:</strong> <code>${serial}</code></p>` : ""}
      ${url ? `<p><a href="${url}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">View Your Certificate</a></p>` : ""}
      ${verifyUrl ? `<p style="font-size:13px;color:#6b7280">Verify authenticity: <a href="${verifyUrl}">${verifyUrl}</a></p>` : ""}
      <p style="color:#9ca3af;font-size:12px;margin-top:24px">This certificate was issued automatically by the GEMA platform.</p>
    </div>
  `;
}

export default certificateWorker;
