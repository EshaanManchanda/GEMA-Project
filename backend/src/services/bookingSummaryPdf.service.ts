import { logger } from "../config/index";
import { getBrandConfig } from "../utils/brandConfig";

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
  paymentStatus?: string;
  paymentMethod?: string;
  qrCodeDataUri?: string;
  ticketNumber?: string;
  organizer?: string;
  event: {
    title?: string;
    description?: string;
    shortDescription?: string;
    category?: string;
    type?: string;
    eventType?: string;
    venueType?: string;
    startDate?: Date;
    timezone?: string;
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

// ─── Puppeteer browser singleton ──────────────────────────────────────────────
let browserPromise: Promise<import("puppeteer-core").Browser> | null = null;

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safe = (v: any): string => escapeHtml(String(v || ""));

const formatCurrency = (amount: number, currency: string): string =>
  `${currency} ${Number(amount || 0).toFixed(2)}`;

const formatDate = (d: Date | string | undefined, opts?: Intl.DateTimeFormatOptions): string => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", opts || {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (d: Date | string | undefined): string => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function getBannerUrl(event: BookingSummaryPdfInput["event"]): string | null {
  const assets = event.imageAssets || [];
  for (const a of assets) {
    const url = a.secureUrl || a.url || a.thumbnailUrl;
    if (url && /^https?:\/\//i.test(url)) return url;
  }
  const imgs = event.images || [];
  for (const url of imgs) {
    if (url && /^https?:\/\//i.test(url)) return url;
  }
  return null;
}

// ─── HTML Builder ─────────────────────────────────────────────────────────────
function buildHtml(input: BookingSummaryPdfInput): string {
  const brand = getBrandConfig();
  const frontendUrl = process.env.FRONTEND_URL || "https://kidrove.com";
  const supportEmail = brand.contactEmail;

  const eventTitle = safe(input.event.title || input.items[0]?.eventTitle || "Event");
  const venueType = input.event.venueType || "Offline";
  const isOnline = venueType.toLowerCase() === "online";
  const category = safe(input.event.category || input.event.eventType || input.event.type || "");
  const organizer = safe(input.organizer || brand.appName);
  const ticketNumber = safe(input.ticketNumber || input.orderNumber);
  const paymentStatus = (input.paymentStatus || "paid").toLowerCase();
  const paymentMethod = safe(input.paymentMethod || "");
  const timezone = safe(input.event.timezone || "");

  // Event date — prefer items[0].date, then event.startDate
  const eventDate = input.items[0]?.date || input.event.startDate;

  // Location / meeting
  const locationParts = [
    input.event.location?.address,
    input.event.location?.city,
    input.event.location?.country,
  ].filter(Boolean);
  const locationLine = safe(locationParts.join(", ") || (isOnline ? "Online Event" : "To be confirmed"));

  // Total quantity
  const totalQty = input.items.reduce((s, i) => s + (i.quantity || 1), 0);

  // Paid badge color
  const badgeBg = paymentStatus === "paid" ? "#dcfce7" : "#fef3c7";
  const badgeColor = paymentStatus === "paid" ? "#15803d" : "#92400e";
  const badgeText = paymentStatus === "paid" ? "✓ PAID" : paymentStatus.toUpperCase();

  // Banner image
  const bannerUrl = getBannerUrl(input.event);
  const bannerSection = bannerUrl
    ? `<div style="margin:0 0 28px;border-radius:10px;overflow:hidden;max-height:200px;">
        <img src="${escapeHtml(bannerUrl)}" alt="Event Banner"
          style="width:100%;object-fit:cover;display:block;max-height:200px;" />
       </div>`
    : "";

  // Meeting link section (only for online)
  const meetingSection = isOnline && input.event.meetingLink
    ? `<tr>
        <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;width:130px;">Meeting Link</td>
        <td style="padding:8px 0;font-size:13px;">
          <a href="${escapeHtml(input.event.meetingLink)}"
            style="color:#3b82f6;word-break:break-all;">${escapeHtml(input.event.meetingLink)}</a>
        </td>
       </tr>
       ${input.event.meetingPassword ? `
       <tr>
         <td style="padding:8px 0;color:#64748b;font-size:13px;">Password</td>
         <td style="padding:8px 0;font-size:13px;">
           <code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-weight:700;">${safe(input.event.meetingPassword)}</code>
         </td>
       </tr>` : ""}`
    : "";

  // QR code section
  const qrSection = input.qrCodeDataUri
    ? `<div style="text-align:center;padding:24px 20px;border:2px dashed #10b981;border-radius:12px;background:#f0fdf4;margin-bottom:28px;">
        <p style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:1px;color:#15803d;text-transform:uppercase;">🎫 Entry QR Code</p>
        <img src="${input.qrCodeDataUri}" alt="QR Code"
          style="width:180px;height:180px;border-radius:8px;border:2px solid #e2e8f0;" />
        <p style="margin:14px 0 4px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Ticket Number</p>
        <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:14px;font-weight:700;color:#1e293b;letter-spacing:2px;">${ticketNumber}</p>
        <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;">Scan at venue entrance for verification</p>
       </div>`
    : `<div style="text-align:center;padding:24px 20px;border:2px dashed #e2e8f0;border-radius:12px;background:#f8fafc;margin-bottom:28px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#475569;">Ticket Number</p>
        <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:18px;font-weight:700;color:#1e293b;letter-spacing:2px;">${ticketNumber}</p>
       </div>`;

  // Instructions
  const instructions = isOnline
    ? [
        "Save this ticket — it is required for event access.",
        "Do not share your QR code or ticket number with others.",
        "Join the online session at least 10 minutes early.",
        "Test your device and internet connection beforehand.",
      ]
    : [
        "Present this ticket (printed or digital) at the venue entrance.",
        "Do not share your QR code or ticket number with others.",
        "Arrive at least 15 minutes before the event starts.",
        "Contact support if you need to transfer or cancel your ticket.",
      ];

  const instructionsHtml = instructions
    .map(
      (line) =>
        `<li style="margin:6px 0;padding:0;color:#374151;font-size:13px;">${escapeHtml(line)}</li>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ticket — ${eventTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #1e293b;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { max-width: 794px; margin: 0 auto; padding: 0; }

    /* Header */
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);
      color: white;
      padding: 28px 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-name { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .brand-tagline { font-size: 12px; opacity: 0.65; margin-top: 3px; }
    .ticket-badge {
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 20px;
      padding: 6px 16px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }

    /* Body */
    .body { padding: 32px 36px; }

    /* Event Title Block */
    .event-title-block { margin-bottom: 24px; }
    .event-title-block h1 {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
      margin-bottom: 8px;
    }
    .event-meta-pills { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .pill {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .pill-venue { background: #eff6ff; color: #1d4ed8; }
    .pill-category { background: #faf5ff; color: #7c3aed; }

    /* Two-column grid */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }

    /* Info Cards */
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 20px;
    }
    .info-card h3 {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 14px;
    }
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table td { padding: 6px 0; font-size: 13px; vertical-align: top; }
    .info-table td:first-child { color: #64748b; width: 45%; font-weight: 500; }
    .info-table td:last-child { color: #1e293b; font-weight: 600; }

    /* Payment badge */
    .payment-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
    }

    /* Divider */
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
    .divider-dashed { border: none; border-top: 2px dashed #e2e8f0; margin: 24px 0; }

    /* Instructions */
    .instructions-section {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .instructions-section h3 {
      font-size: 13px;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 12px;
    }
    .instructions-section ul { padding-left: 20px; }

    /* Footer */
    .footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 20px 36px;
      text-align: center;
    }
    .footer-links { display: flex; justify-content: center; gap: 24px; margin-bottom: 8px; }
    .footer-links a { color: #3b82f6; font-size: 12px; text-decoration: none; }
    .footer-copy { font-size: 11px; color: #94a3b8; }
    .footer-terms { font-size: 10px; color: #cbd5e1; margin-top: 4px; }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="brand-name">${safe(brand.appName)}</div>
      <div class="brand-tagline">Event Ticket &amp; Booking Confirmation</div>
    </div>
    <div class="ticket-badge">🎫 E-Ticket</div>
  </div>

  <!-- BODY -->
  <div class="body">

    ${bannerSection}

    <!-- Event Title -->
    <div class="event-title-block">
      <h1>${eventTitle}</h1>
      <div class="event-meta-pills">
        <span class="pill pill-venue">${isOnline ? "🎥 Online" : "📍 In-Person"}</span>
        ${category ? `<span class="pill pill-category">${category}</span>` : ""}
      </div>
    </div>

    <!-- 2-column: Event Info + Attendee Info -->
    <div class="grid-2">

      <!-- Event Details -->
      <div class="info-card">
        <h3>Event Details</h3>
        <table class="info-table">
          <tr>
            <td>Date &amp; Time</td>
            <td>${formatDateTime(eventDate)}</td>
          </tr>
          ${timezone ? `<tr><td>Timezone</td><td>${timezone}</td></tr>` : ""}
          <tr>
            <td>${isOnline ? "Platform" : "Venue"}</td>
            <td>${locationLine}</td>
          </tr>
          ${meetingSection}
          <tr>
            <td>Organizer</td>
            <td>${organizer}</td>
          </tr>
        </table>
      </div>

      <!-- Booking Details -->
      <div class="info-card">
        <h3>Booking Details</h3>
        <table class="info-table">
          <tr>
            <td>Attendee</td>
            <td>${safe(input.customerName)}</td>
          </tr>
          <tr>
            <td>Email</td>
            <td style="word-break:break-all;">${safe(input.customerEmail)}</td>
          </tr>
          <tr>
            <td>Order #</td>
            <td style="font-family:'Courier New',monospace;font-size:12px;">${safe(input.orderNumber)}</td>
          </tr>
          <tr>
            <td>Order Date</td>
            <td>${formatDate(input.bookingDate)}</td>
          </tr>
          <tr>
            <td>Quantity</td>
            <td>${totalQty} ticket${totalQty !== 1 ? "s" : ""}</td>
          </tr>
          <tr>
            <td>Status</td>
            <td>
              <span class="payment-badge" style="background:${badgeBg};color:${badgeColor};">
                ${badgeText}
              </span>
            </td>
          </tr>
          ${paymentMethod ? `<tr><td>Method</td><td>${paymentMethod}</td></tr>` : ""}
          <tr>
            <td>Total</td>
            <td style="font-weight:800;color:#10b981;font-size:15px;">${formatCurrency(input.orderTotal, input.currency)}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- QR Code Section -->
    ${qrSection}

    <!-- Instructions -->
    <div class="instructions-section">
      <h3>📋 Important Instructions</h3>
      <ul>${instructionsHtml}</ul>
    </div>

  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-links">
      <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>
      <a href="${escapeHtml(frontendUrl)}">${escapeHtml(frontendUrl)}</a>
    </div>
    <div class="footer-copy">© ${new Date().getFullYear()} ${safe(brand.appName)}. All rights reserved.</div>
    <div class="footer-terms">This ticket is non-transferable. Keep your QR code private. For cancellations, contact support.</div>
  </div>

</div>
</body>
</html>`;
}

// ─── Service ──────────────────────────────────────────────────────────────────
export class BookingSummaryPdfService {
  static async generate(input: BookingSummaryPdfInput): Promise<Buffer> {
    const html = buildHtml(input);
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 794, height: 1123 });
      await page.setContent(html, {
        waitUntil: "networkidle0",   // Wait for Google Fonts
        timeout: 30000,
      });

      // Wait for all images (banner + QR) to load
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
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
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
