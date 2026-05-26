/**
 * Generates a styled PNG ticket and triggers a browser download.
 * Uses the Canvas API — no external PDF dependencies required.
 */

export interface TicketDownloadData {
  ticketNumber: string;
  attendeeName: string;
  attendeeEmail?: string;
  qrCodeImage?: string;   // base64 data URL or absolute URL
  price: number;
  currency: string;
  status: string;
  validUntil?: string;
  eventTitle: string;
  eventDate?: string;     // pre-formatted date string
  eventLocation?: string; // pre-formatted location string
}

const CANVAS_W = 700;
const CANVAS_H = 380;
const QR_X = 500;         // left edge of QR section
const PRIMARY = '#4f46e5';

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getDisplayStatus(
  status: string,
  validUntil?: string,
  eventDate?: string,
): string {
  if (status && status !== 'active') {
    return status;
  }

  const now = new Date();

  // If we have an event date, use it as the primary expiry reference.
  // The ticket is only expired if the event date + 24h grace has passed.
  if (eventDate) {
    const evtDate = new Date(eventDate);
    if (!Number.isNaN(evtDate.getTime())) {
      const graceExpiry = new Date(evtDate.getTime() + 24 * 60 * 60 * 1000);
      if (now > graceExpiry) {
        return 'expired';
      }
      // Event hasn't ended yet — ticket is active regardless of validUntil
      return status || 'active';
    }
  }

  // Fallback: use validUntil
  if (validUntil) {
    const expiry = new Date(validUntil);
    if (!Number.isNaN(expiry.getTime()) && now > expiry) {
      return 'expired';
    }
  }

  return status || 'active';
}

function drawBase(ctx: CanvasRenderingContext2D, data: TicketDownloadData): void {
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Header bar
  ctx.fillStyle = PRIMARY;
  ctx.fillRect(0, 0, CANVAS_W, 68);

  // Event title in header
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, Arial, sans-serif';
  ctx.fillText(truncate(data.eventTitle, 42), 20, 44);

  // Left section content
  const left = 20;

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, Arial, sans-serif';
  ctx.fillText(`TICKET #${data.ticketNumber.slice(-10).toUpperCase()}`, left, 98);

  let y = 128;

  ctx.fillStyle = '#9ca3af';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, Arial, sans-serif';
  ctx.fillText('ATTENDEE', left, y);
  y += 18;
  ctx.fillStyle = '#111827';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, Arial, sans-serif';
  ctx.fillText(truncate(data.attendeeName, 38), left, y);
  y += 16;

  if (data.attendeeEmail) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, Arial, sans-serif';
    ctx.fillText(truncate(data.attendeeEmail, 40), left, y);
    y += 20;
  } else {
    y += 8;
  }

  if (data.eventDate) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, Arial, sans-serif';
    ctx.fillText('DATE', left, y);
    y += 18;
    ctx.fillStyle = '#111827';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, Arial, sans-serif';
    ctx.fillText(data.eventDate, left, y);
    y += 22;
  }

  if (data.eventLocation) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, Arial, sans-serif';
    ctx.fillText('LOCATION', left, y);
    y += 18;
    ctx.fillStyle = '#111827';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, Arial, sans-serif';
    ctx.fillText(truncate(data.eventLocation, 36), left, y);
    y += 22;
  }

  // Price
  ctx.fillStyle = PRIMARY;
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, Arial, sans-serif';
  const priceText = data.price === 0 ? 'FREE' : `${data.currency.toUpperCase()} ${data.price.toFixed(2)}`;
  ctx.fillText(priceText, left, CANVAS_H - 46);

  // Status badge
  const displayStatus = getDisplayStatus(data.status, data.validUntil);
  const isActive = displayStatus === 'active';
  ctx.fillStyle = isActive ? '#dcfce7' : '#f3f4f6';
  const statusLabel = displayStatus.toUpperCase();
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, Arial, sans-serif';
  const badgeW = ctx.measureText(statusLabel).width + 20;
  roundRect(ctx, left, CANVAS_H - 32, badgeW, 22, 4);
  ctx.fill();
  ctx.fillStyle = isActive ? '#16a34a' : '#6b7280';
  ctx.fillText(statusLabel, left + 10, CANVAS_H - 16);

  // Dashed separator
  ctx.save();
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(QR_X - 10, 80);
  ctx.lineTo(QR_X - 10, CANVAS_H - 20);
  ctx.stroke();
  ctx.restore();

  // Semicircle cutouts on separator
  ctx.fillStyle = '#f9fafb';
  ctx.beginPath();
  ctx.arc(QR_X - 10, 80, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(QR_X - 10, CANVAS_H - 20, 10, 0, Math.PI * 2);
  ctx.fill();
}

function drawQRSection(
  ctx: CanvasRenderingContext2D,
  data: TicketDownloadData,
  qrImg?: HTMLImageElement
): void {
  const cx = QR_X + (CANVAS_W - QR_X) / 2; // center of right column

  ctx.fillStyle = '#6b7280';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SCAN FOR ENTRY', cx, 92);

  if (qrImg) {
    const size = 160;
    const qx = cx - size / 2;
    ctx.drawImage(qrImg, qx, 102, size, size);
  } else {
    // Placeholder box when no QR
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(cx - 60, 102, 120, 120);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, Arial, sans-serif';
    ctx.fillText('QR not available', cx, 168);
  }

  ctx.fillStyle = '#374151';
  ctx.font = '9px -apple-system, BlinkMacSystemFont, Arial, sans-serif';
  ctx.fillText(data.ticketNumber.slice(-12), cx, 278);
  ctx.textAlign = 'left';
}

function triggerDownload(canvas: HTMLCanvasElement, ticketNumber: string): void {
  const link = document.createElement('a');
  link.download = `ticket-${ticketNumber.slice(-8)}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads a single ticket as a PNG image.
 */
export function downloadTicketAsPNG(data: TicketDownloadData): void {
  const canvas = document.createElement('canvas');
  // 2× resolution for sharp display on retina screens
  canvas.width = CANVAS_W * 2;
  canvas.height = CANVAS_H * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  drawBase(ctx, data);

  if (data.qrCodeImage) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      drawQRSection(ctx, data, img);
      triggerDownload(canvas, data.ticketNumber);
    };
    img.onerror = () => {
      drawQRSection(ctx, data);
      triggerDownload(canvas, data.ticketNumber);
    };
    img.src = data.qrCodeImage;
  } else {
    drawQRSection(ctx, data);
    triggerDownload(canvas, data.ticketNumber);
  }
}

/**
 * Downloads multiple tickets sequentially with a short delay between each.
 */
export function downloadMultipleTickets(tickets: TicketDownloadData[]): void {
  tickets.forEach((ticket, i) => {
    // Stagger downloads so browsers don't block them
    setTimeout(() => downloadTicketAsPNG(ticket), i * 600);
  });
}
