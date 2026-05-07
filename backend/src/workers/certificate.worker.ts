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
          let pdfUrl: string | undefined;
          let qrData: string | undefined;
          let qrCodeUrl: string | undefined;

          // Build QR verification URL and generate QR image
          const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
          const cert = await Certificate.findById(certificateId).select("serialNumber");
          if (cert?.serialNumber) {
            qrData = `${baseUrl}/certificates/verify/${cert.serialNumber}`;
            qrCodeUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });
          }

          if (templateId) {
            const template = await Template.findById(templateId);
            if (!template) throw new Error("Certificate template not found");

            pdfUrl = await renderCertificate(template, {
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
          }

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
              status: "emailed",
              $push: { history: { event: "email_sent", at: new Date() } },
            });

            await AuditLog.create({
              action: "certificate.emailed",
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
      { connection: bullMQConnection!, concurrency: 1 },
    )
  : null;

// ─── Singleton Puppeteer browser (reuse across requests) ─────────────────────

let _browserPromise: Promise<import("puppeteer-core").Browser> | null = null;

async function getBrowser(): Promise<import("puppeteer-core").Browser> {
  if (!_browserPromise) {
    const puppeteer = await import("puppeteer-core");
    _browserPromise = puppeteer.default.launch({
      executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
      headless: true,
    });
    _browserPromise.then((b) =>
      b.on("disconnected", () => {
        _browserPromise = null;
      }),
    );
  }
  return _browserPromise;
}

// ─── Render ───────────────────────────────────────────────────────────────────

export async function renderCertificate(
  template: ITemplate,
  data: Record<string, any>,
): Promise<string | undefined> {
  const html =
    template.mode === "visual"
      ? buildVisualHtml(template, data)
      : buildHtmlTemplate(template.html || "", template.css, data);

  if (!html) throw new Error("Certificate rendering produced empty content");

  const orientation = template.defaultOptions?.orientation ?? 'landscape';
  const pdfBuf = await htmlToPdf(html, template.canvasWidth ?? 1240, template.canvasHeight ?? 877, orientation);

  try {
    const { v2: cloudinary } = await import("cloudinary");

    return await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "raw", folder: "certificates", format: "pdf" },
        (error, result) => {
          if (error || !result) reject(error ?? new Error("No result from Cloudinary"));
          else resolve(result.secure_url);
        },
      );
      stream.end(pdfBuf);
    });
  } catch (err) {
    logger.warn("Cloudinary upload failed for certificate:", err);
    throw err;
  }
}

async function htmlToPdf(html: string, widthPx: number, heightPx: number, orientation?: 'portrait' | 'landscape'): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: widthPx, height: heightPx });
    // domcontentloaded avoids hanging on slow/external image loads
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 });
    // Wait for all <img> elements to settle before capturing
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise<void>((resolve) => {
                img.onload = img.onerror = () => resolve();
              }),
          ),
      ),
    );

    const pdfOptions: any = {
      width: `${widthPx}px`,
      height: `${heightPx}px`,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    };

    // Handle orientation
    if (orientation === 'portrait') {
      // Swap dimensions for portrait - PDF output dimensions are swapped
      pdfOptions.width = `${heightPx}px`;
      pdfOptions.height = `${widthPx}px`;
      pdfOptions.pageOrientation = 'portrait';
    } else {
      pdfOptions.pageOrientation = 'landscape';
    }

    const pdf = await page.pdf(pdfOptions);
    return Buffer.from(pdf);
  } finally {
    await page.close();
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
  const { backgroundImageUrl, canvasWidth = 1240, canvasHeight = 877, fields = [], defaultOptions } = template;
  const orientation = defaultOptions?.orientation ?? 'landscape';

  // Swap dimensions for portrait orientation
  const effectiveWidth = orientation === 'portrait' ? canvasHeight : canvasWidth;
  const effectiveHeight = orientation === 'portrait' ? canvasWidth : canvasHeight;

  // Define font family mappings for web-safe fonts
  const fontFamilyMap: Record<string, string> = {
    'serif': 'Georgia, "Times New Roman", Times, serif',
    'sans-serif': 'Arial, Helvetica, sans-serif',
    'monospace': '"Courier New", Courier, monospace',
    'Georgia, serif': 'Georgia, serif',
    "'Times New Roman', serif": '"Times New Roman", Times, serif',
    'Arial, sans-serif': 'Arial, sans-serif',
  };

  const fieldHtml = fields
    .map((f: ITemplateField) => {
      const value = resolveFieldValue(f, data);
      const qrSize = f.width || 80;

      if (f.type === "qr") {
        const styles = [
          `position:absolute`,
          `left:${f.x}%`,
          `top:${f.y}%`,
          `transform:translate(-50%,-50%)`,
          `width:${qrSize}px`,
          `height:${qrSize}px`,
        ].join(";");
        return `<img src="${value}" style="${styles}" alt="QR Code" />`;
      }

      // Get font family with proper fallback
      const fontFamily = f.fontFamily ? (fontFamilyMap[f.fontFamily] || f.fontFamily) : '';

      // Get text alignment - ensure it's valid CSS
      const textAlign = f.textAlign || 'center';

      // Get font weight - ensure it's valid CSS
      const fontWeight = f.fontWeight === 'bold' ? 'bold' : 'normal';

      // Get color with fallback
      const color = f.color || '#000000';

      // Get font size with fallback
      const fontSize = f.fontSize || 24;

      const styles = [
        `position:absolute`,
        `left:${f.x}%`,
        `top:${f.y}%`,
        `transform:translate(-50%,-50%)`,
        `font-size:${fontSize}px`,
        `font-weight:${fontWeight}`,
        `color:${color}`,
        fontFamily ? `font-family:${fontFamily}` : '',
        `text-align:${textAlign}`,
        `white-space:nowrap`,
        `line-height:1.2`,
        `width:auto`,
        `max-width:300px`,
      ]
        .filter(Boolean)
        .join("; ");

      return `<div style="${styles}">${escapeHtml(String(value ?? ""))}</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${effectiveWidth}px;height:${effectiveHeight}px;overflow:hidden;background:#fff;margin:0;padding:0}
  .canvas{position:relative;width:${effectiveWidth}px;height:${effectiveHeight}px;overflow:hidden;margin:0;padding:0}
  .bg{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block}
  .field{transform:translate(-50%,-50%)}
</style>
</head>
<body>
<div class="canvas">
  ${backgroundImageUrl ? `<img class="bg" src="${backgroundImageUrl}" alt="" crossorigin="anonymous" />` : ""}
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
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
