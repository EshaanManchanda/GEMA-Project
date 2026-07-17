import { Worker, Job } from "bullmq";
import Handlebars from "handlebars";
import QRCode from "qrcode";
import {
  QUEUE_NAMES,
  bullMQConnection,
  areQueuesEnabled,
} from "../config/queue";
import { WORKER_TUNING } from "../config/workerTuning";
import Certificate, {
  Template,
  AuditLog,
  CertificateRequest,
  ITemplate,
  ITemplateField,
} from "../models/Certificate";
import { emailService } from "../services/email.service";
import { MediaService } from "../services/media.service";
import logger from "../config/logger";
import {
  downloadFileAsAttachment,
  safePdfFilename,
} from "../utils/emailAttachment.util";

export interface CertificateJobData {
  certificateId: string;
  requestId?: string;
  templateId?: string;
  recipient: { name: string; email: string };
  data: Record<string, any>;
  options?: { sendEmail?: boolean };
}

// ─── Handlebars helpers ───────────────────────────────────────────────────────

Handlebars.registerHelper("upper", (str: string) =>
  String(str ?? "").toUpperCase(),
);
Handlebars.registerHelper("lower", (str: string) =>
  String(str ?? "").toLowerCase(),
);
Handlebars.registerHelper("date", (d: string | Date) => {
  const date = d ? new Date(d) : new Date();
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
});
Handlebars.registerHelper("year", () => new Date().getFullYear());
Handlebars.registerHelper(
  "default",
  (val: any, fallback: string) => val ?? fallback,
);

// ─── Worker ───────────────────────────────────────────────────────────────────

const certificateWorker = areQueuesEnabled
  ? new Worker(
      QUEUE_NAMES.CERTIFICATE_GENERATION,
      async (job: Job<CertificateJobData>) => {
        const {
          certificateId,
          requestId,
          templateId,
          recipient,
          data,
          options,
        } = job.data;

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
            throw new Error(
              "No templateId provided — cannot generate certificate",
            );
          }

          const template = await Template.findById(templateId);
          if (!template) throw new Error("Certificate template not found");

          // Build QR verification URL and generate QR image
          const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
          const cert =
            await Certificate.findById(certificateId).select("serialNumber");
          let qrData: string | undefined;
          let qrCodeUrl: string | undefined;

          if (cert?.serialNumber) {
            qrData = `${baseUrl}/certificates/verify/${cert.serialNumber}`;
            qrCodeUrl = await QRCode.toDataURL(qrData, {
              width: 200,
              margin: 1,
            });
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
            $push: {
              history: { event: "generation_complete", at: new Date() },
            },
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
            const certDoc = await Certificate.findById(certificateId).populate(
              "eventId",
              "title",
            );
            const eventTitle = (certDoc?.eventId as any)?.title || "Event";

            try {
              const pdfFilename = safePdfFilename(
                recipient.name,
                cert?.serialNumber,
              );
              const attachment = pdfUrl
                ? await downloadFileAsAttachment(pdfUrl, pdfFilename, {
                    expectedType: "application/pdf",
                  })
                : null;

              const messageId = await emailService.sendEmail({
                to: recipient.email,
                subject: `Your Certificate — ${eventTitle}`,
                html: buildCertEmailHtml(
                  recipient.name,
                  eventTitle,
                  cert?.serialNumber,
                  pdfUrl,
                  qrData,
                ),
                attachments: attachment ? [attachment] : undefined,
              });

              if (
                typeof messageId === "string" &&
                messageId.startsWith("dev-email-")
              ) {
                throw new Error(
                  "SMTP delivery failed (dev fallback active). Check email host/user/password and from address.",
                );
              }

              await Certificate.findByIdAndUpdate(certificateId, {
                status: "emailed",
                $push: { history: { event: "email_sent", at: new Date() } },
              });

              await AuditLog.create({
                action: "certificate.emailed",
                entityType: "Certificate",
                entityId: certificateId,
                meta: { to: recipient.email, messageId },
              });
            } catch (emailErr: any) {
              // Keep certificate as generated if PDF succeeded; record email failure separately.
              logger.error("Certificate email send failed", {
                certificateId,
                to: recipient.email,
                error: emailErr?.message || String(emailErr),
              });

              await Certificate.findByIdAndUpdate(certificateId, {
                $push: {
                  history: {
                    event: "email_failed",
                    meta: { error: emailErr?.message || String(emailErr) },
                    at: new Date(),
                  },
                },
              });

              await AuditLog.create({
                action: "certificate.email_failed",
                entityType: "Certificate",
                entityId: certificateId,
                meta: {
                  to: recipient.email,
                  error: emailErr?.message || String(emailErr),
                },
              });
            }
          }

          logger.info(`Certificate job ${job.id} complete`, { certificateId });
        } catch (err: any) {
          logger.error(`Certificate job ${job.id} failed`, {
            certificateId,
            error: err.message,
          });

          await Certificate.findByIdAndUpdate(certificateId, {
            status: "failed",
            failureReason: err.message,
            $push: {
              history: {
                event: "generation_failed",
                meta: { error: err.message },
                at: new Date(),
              },
            },
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
      {
        connection: bullMQConnection!,
        concurrency: WORKER_TUNING.CERTIFICATE_GENERATION.CONCURRENCY,
      },
    )
  : null;

// ─── Puppeteer browser lifecycle ─────────────────────────────────────────────
// Launching Chromium per job costs ~1-2s; since concurrency is 1 there's no
// contention, so one browser instance is kept alive across jobs and only
// relaunched if it crashes or disconnects.

let sharedBrowser: import("puppeteer").Browser | null = null;

async function launchBrowser(): Promise<import("puppeteer").Browser> {
  const puppeteer = await import("puppeteer");
  return puppeteer.default.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
    headless: true,
  });
}

async function getBrowser(): Promise<import("puppeteer").Browser> {
  if (sharedBrowser && sharedBrowser.connected) {
    return sharedBrowser;
  }
  sharedBrowser = await launchBrowser();
  sharedBrowser.on("disconnected", () => {
    sharedBrowser = null;
  });
  return sharedBrowser;
}

export async function closeCertificateBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close().catch(() => {});
    sharedBrowser = null;
  }
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

  const orientation = template.defaultOptions?.orientation ?? "landscape";
  const pdfBuf = await htmlToPdf(
    html,
    template.canvasWidth ?? 1240,
    template.canvasHeight ?? 877,
    orientation,
  );

  if (!pdfBuf?.length) {
    throw new Error("Generated certificate PDF is empty — aborting upload");
  }

  const mockFile: Express.Multer.File = {
    fieldname: "file",
    originalname: "certificate.pdf",
    encoding: "7bit",
    mimetype: "application/pdf",
    size: pdfBuf.length,
    buffer: pdfBuf,
    destination: "",
    filename: "",
    path: "",
    stream: null as any,
  };

  const mediaAsset = await new MediaService().uploadMedia(mockFile, {
    category: "document",
    folder: "certificates",
    tags: ["certificate"],
  });

  return mediaAsset.url;
}

async function htmlToPdf(
  html: string,
  widthPx: number,
  heightPx: number,
  orientation?: "portrait" | "landscape",
): Promise<Buffer> {
  const renderOnce = async (): Promise<Buffer> => {
    let page: any = null;
    try {
      const browser = await getBrowser();
      page = await browser.newPage();
      await page.setViewport({ width: widthPx, height: heightPx });
      // domcontentloaded avoids hanging on slow/external image loads
      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
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
      if (orientation === "portrait") {
        // Swap dimensions for portrait - PDF output dimensions are swapped
        pdfOptions.width = `${heightPx}px`;
        pdfOptions.height = `${widthPx}px`;
        pdfOptions.pageOrientation = "portrait";
      } else {
        pdfOptions.pageOrientation = "landscape";
      }

      const pdf = await page.pdf(pdfOptions);
      return Buffer.from(pdf);
    } finally {
      if (page) {
        await page.close().catch(() => {});
      }
    }
  };

  try {
    return await renderOnce();
  } catch (error: any) {
    const message = error?.message || String(error || "");
    if (
      /connection closed|page has been closed|target closed|protocol error/i.test(
        message,
      )
    ) {
      return await renderOnce();
    }

    throw error;
  }
}

function buildHtmlTemplate(
  html: string,
  css: string | undefined,
  data: Record<string, any>,
): string {
  const compiled = Handlebars.compile(html, { noEscape: true });
  if (!css) return compiled(data);
  return html.includes("</head>")
    ? compiled({ ...data, __css: css }).replace(
        "</head>",
        `<style>${css}</style></head>`,
      )
    : `<style>${css}</style>${compiled(data)}`;
}

function buildVisualHtml(
  template: ITemplate,
  data: Record<string, any>,
): string {
  const {
    backgroundImageUrl,
    canvasWidth = 1240,
    canvasHeight = 877,
    fields = [],
    defaultOptions,
  } = template;
  const orientation = defaultOptions?.orientation ?? "landscape";

  // Swap dimensions for portrait orientation
  const effectiveWidth =
    orientation === "portrait" ? canvasHeight : canvasWidth;
  const effectiveHeight =
    orientation === "portrait" ? canvasWidth : canvasHeight;

  // Define font family mappings for web-safe fonts
  const fontFamilyMap: Record<string, string> = {
    serif: 'Georgia, "Times New Roman", Times, serif',
    "sans-serif": "Arial, Helvetica, sans-serif",
    monospace: '"Courier New", Courier, monospace',
    "Georgia, serif": "Georgia, serif",
    "'Times New Roman', serif": '"Times New Roman", Times, serif',
    "Arial, sans-serif": "Arial, sans-serif",
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
      const fontFamily = f.fontFamily
        ? fontFamilyMap[f.fontFamily] || f.fontFamily
        : "";

      // Get text alignment - ensure it's valid CSS
      const textAlign = f.textAlign || "center";

      // Get font weight - ensure it's valid CSS
      const fontWeight = f.fontWeight === "bold" ? "bold" : "normal";

      // Get color with fallback
      const color = f.color || "#000000";

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
        fontFamily ? `font-family:${fontFamily}` : "",
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

function resolveFieldValue(
  field: ITemplateField,
  data: Record<string, any>,
): any {
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
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1.0">
      <title>Your Certificate</title>
    </head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b;background:#f8fafc;margin:0;padding:0;">
      <div style="max-width:600px;margin:0 auto;padding:24px;">
        <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);color:white;padding:28px 24px;text-align:center;border-radius:12px 12px 0 0;">
          <h1 style="margin:0;font-size:26px;">🏆 Congratulations!</h1>
          <p style="margin:8px 0 0;opacity:0.9;font-size:15px;">You've earned a new certificate</p>
        </div>
        <div style="background:white;padding:28px 24px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <p style="font-size:17px;">Hi <strong>${name}</strong>!</p>
          <p>We are absolutely thrilled to present you with this certificate for your participation in <strong>${eventTitle}</strong>.</p>
          <p>Your dedication, effort, and enthusiasm are truly appreciated. Thank you for being a wonderful part of this event, and for taking the time to share your review!</p>
          
          <div style="background:#f8fafc;border-radius:8px;padding:20px;margin:24px 0;border:1px solid #e2e8f0;">
            <p style="margin:0 0 8px;font-weight:700;font-size:15px;color:#4f46e5;">Certificate Details</p>
            <table style="width:100%;font-size:14px;color:#475569;">
              <tr><td style="padding:4px 0;font-weight:600;width:120px;">Event:</td><td>${eventTitle}</td></tr>
              ${serial ? `<tr><td style="padding:4px 0;font-weight:600;">Serial #:</td><td style="font-family:monospace;">${serial}</td></tr>` : ""}
            </table>
          </div>

          <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:20px 0;border-left:4px solid #16a34a;">
            <p style="margin:0;font-size:15px;color:#166534;font-weight:600;">
              📎 Your official certificate has been attached to this email as a PDF document.
            </p>
          </div>

          ${
            url
              ? `<div style="text-align:center;margin:24px 0;">
            <a href="${url}" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 4px 6px -1px rgba(79, 70, 229, 0.2);">Download Backup Copy</a>
          </div>`
              : ""
          }
          
          ${
            verifyUrl
              ? `<div style="margin-top:24px;padding-top:16px;border-top:1px dashed #e2e8f0;font-size:13px;color:#64748b;">
            <p style="margin:0 0 4px;font-weight:600;">Verify authenticity:</p>
            <a href="${verifyUrl}" style="color:#4f46e5;word-break:break-all;">${verifyUrl}</a>
          </div>`
              : ""
          }
        </div>
        <div style="text-align:center;margin-top:20px;color:#94a3b8;font-size:13px;">
          <p>The GEMA Platform Team</p>
          <p>This certificate was issued automatically.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default certificateWorker;
