import { logger } from "../config/index";

type GalleryItem = {
  image?: string;
  caption?: string;
};

export interface BookingSummaryPdfInput {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  bookingDate: Date;
  orderTotal: number;
  currency: string;
  event: {
    title?: string;
    description?: string;
    shortDescription?: string;
    type?: string;
    eventType?: string;
    venueType?: string;
    meetingLink?: string;
    meetingPassword?: string;
    location?: {
      city?: string;
      address?: string;
      country?: string;
    };
    images?: string[];
    imageAssets?: Array<{
      url?: string;
      thumbnailUrl?: string;
      secureUrl?: string;
    }>;
    pastEventMemories?: GalleryItem[];
  };
  items: Array<{
    eventTitle: string;
    quantity: number;
    price: number;
    date: Date;
  }>;
}

let browserPromise: Promise<import("puppeteer-core").Browser> | null = null;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatCurrency = (amount: number, currency: string): string =>
  `${currency} ${Number(amount || 0).toFixed(2)}`;

const formatDate = (d: Date): string =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

async function getBrowser(): Promise<import("puppeteer-core").Browser> {
  if (!browserPromise) {
    const puppeteer = await import("puppeteer-core");
    browserPromise = puppeteer.default.launch({
      executablePath:
        process.env.CHROME_PATH ||
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        "/usr/bin/google-chrome",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
      headless: true,
    });

    browserPromise.then((browser) => {
      browser.on("disconnected", () => {
        browserPromise = null;
      });
    });
  }

  return browserPromise;
}

function collectGalleryUrls(event: BookingSummaryPdfInput["event"]): string[] {
  const fromAssets = (event.imageAssets || []).map(
    (img) => img.secureUrl || img.url || img.thumbnailUrl,
  );
  const fromLegacy = event.images || [];
  const fromMemories = (event.pastEventMemories || []).map((m) => m.image);

  const merged = [...fromAssets, ...fromLegacy, ...fromMemories]
    .filter((url): url is string => !!url)
    .map((url) => url.trim())
    .filter((url) =>
      /^(https?:\/\/|data:image\/|\/uploads\/|uploads\/)/i.test(url),
    );

  return Array.from(new Set(merged)).slice(0, 8);
}

function buildHtml(input: BookingSummaryPdfInput): string {
  const eventTitle = escapeHtml(input.event.title || input.items[0]?.eventTitle || "Event");
  const eventType = escapeHtml(input.event.eventType || input.event.type || "Event");
  const venueType = escapeHtml(input.event.venueType || "Offline");
  const description = escapeHtml(
    input.event.description || input.event.shortDescription || "No description provided.",
  );
  const bookingDate = formatDate(input.bookingDate);

  const locationLine = [
    input.event.location?.address,
    input.event.location?.city,
    input.event.location?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const safeLocation = escapeHtml(
    locationLine || (venueType.toLowerCase() === "online" ? "Online event" : "Location not specified"),
  );

  const rows = input.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.eventTitle)}</td>
          <td>${formatDate(item.date)}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.price, input.currency)}</td>
          <td>${formatCurrency(item.price * item.quantity, input.currency)}</td>
        </tr>
      `,
    )
    .join("");

  const galleryUrls = collectGalleryUrls(input.event);
  const galleryHtml =
    galleryUrls.length > 0
      ? `
      <h2>Event Gallery</h2>
      <div class="gallery">
        ${galleryUrls
          .map(
            (url) =>
              `<div class="gallery-item"><img src="${escapeHtml(url)}" alt="Event gallery image" /></div>`,
          )
          .join("")}
      </div>
    `
      : "";

  const onlineSection =
    venueType.toLowerCase() === "online" && input.event.meetingLink
      ? `
      <div class="meta-card">
        <h3>Online Access</h3>
        <p><strong>Meeting Link:</strong> ${escapeHtml(input.event.meetingLink)}</p>
        ${input.event.meetingPassword ? `<p><strong>Password:</strong> ${escapeHtml(input.event.meetingPassword)}</p>` : ""}
      </div>
    `
      : "";

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Booking Summary - ${eventTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; padding: 24px; }
          .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 14px; margin-bottom: 20px; }
          .title { font-size: 24px; margin: 0; color: #0f766e; }
          .subtitle { color: #6b7280; margin-top: 6px; }
          .meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
          .meta-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
          .meta-card h3 { margin: 0 0 8px; font-size: 14px; color: #111827; }
          .meta-card p { margin: 4px 0; font-size: 13px; }
          h2 { margin: 20px 0 10px; font-size: 18px; color: #111827; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          th { background: #f3f4f6; }
          .total { margin-top: 12px; text-align: right; font-size: 16px; font-weight: bold; color: #065f46; }
          .gallery { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
          .gallery-item { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; min-height: 140px; display: flex; align-items: center; justify-content: center; }
          .gallery-item img { max-width: 100%; max-height: 220px; object-fit: cover; display: block; }
          .description { white-space: pre-wrap; line-height: 1.6; font-size: 13px; color: #374151; }
          .footer { margin-top: 20px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">Booking Summary</h1>
          <div class="subtitle">Order #${escapeHtml(input.orderNumber)} | Generated on ${bookingDate}</div>
        </div>

        <div class="meta-grid">
          <div class="meta-card">
            <h3>Customer</h3>
            <p><strong>Name:</strong> ${escapeHtml(input.customerName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(input.customerEmail)}</p>
            <p><strong>Booking Date:</strong> ${bookingDate}</p>
          </div>
          <div class="meta-card">
            <h3>Event</h3>
            <p><strong>Title:</strong> ${eventTitle}</p>
            <p><strong>Type:</strong> ${eventType}</p>
            <p><strong>Venue:</strong> ${venueType}</p>
            <p><strong>Location:</strong> ${safeLocation}</p>
          </div>
        </div>

        <h2>Event Description</h2>
        <div class="description">${description}</div>

        ${onlineSection}

        <h2>Booking Details</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Date</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="total">Total: ${formatCurrency(input.orderTotal, input.currency)}</div>

        ${galleryHtml}

        <div class="footer">
          This PDF is generated automatically as part of your booking confirmation.
        </div>
      </body>
    </html>
  `;
}

export class BookingSummaryPdfService {
  static async generate(input: BookingSummaryPdfInput): Promise<Buffer> {
    const html = buildHtml(input);
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 1240, height: 1754 });
      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

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

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "18px",
          right: "18px",
          bottom: "18px",
          left: "18px",
        },
      });

      return Buffer.from(pdf);
    } catch (error: any) {
      logger.error("Failed to generate booking summary PDF", {
        error: error?.message,
        orderNumber: input.orderNumber,
      });
      throw error;
    } finally {
      await page.close();
    }
  }
}
