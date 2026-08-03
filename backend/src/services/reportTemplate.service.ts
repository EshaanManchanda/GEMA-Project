/**
 * Report Template Service
 *
 * Centralizes HTML report rendering so PDF/CSV report generation isn't
 * scattered across route files. `buildEventReportHtml` was extracted
 * verbatim from routes/analytics.routes.ts (a 1057-line route file) with no
 * behavioral changes — see the extraction note in the KBOS plan (§11) — so
 * GET /api/insights/events/:eventId/report?format=pdf keeps producing
 * byte-identical output.
 *
 * New Handlebars-based report templates (business health, promotion
 * snapshot) are added here as compiled/cached templates rather than as
 * on-disk .hbs files: the backend build (`tsc`) does not copy non-.ts
 * assets into dist/, and this project has no existing asset-copy step to
 * piggyback on (certificate templates are DB-stored, not files). Keeping
 * template markup as exported .ts string constants avoids introducing a
 * new build step for this feature.
 */

import Handlebars from "handlebars";
import { EventReportData } from "./eventReport.service";
import { ReportPayload } from "./businessReport.service";
import { IVendorPromotionInput } from "../models/VendorPromotionInput";
import { DIMENSION_WEIGHTS } from "../constants/businessHealth.rules";

// ─── Event report HTML (extracted verbatim, unchanged output) ─────────────────

/** Build a self-contained A4 HTML string for the event report PDF. */
export function buildEventReportHtml(report: EventReportData): string {
  const rangeLabel = `Last ${report.period.range === "7d" ? "7" : "30"} days`;

  const esc = (s: unknown) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const kpiCard = (label: string, value: string | number, note?: string) => `
    <div class="kpi-card">
      <div class="kpi-value">${value}</div>
      <div class="kpi-label">${label}</div>
      ${note ? `<div class="kpi-note">${note}</div>` : ""}
    </div>`;

  const statusTableRows = (byStatus: Record<string, number>) => {
    const entries = Object.entries(byStatus);
    if (!entries.length)
      return `<tr><td colspan="2" class="empty">No data in this period</td></tr>`;
    return entries
      .map(([s, n]) => `<tr><td>${s}</td><td>${n}</td></tr>`)
      .join("");
  };

  const ratingBar = (stars: number, count: number, total: number) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return `
      <div class="rating-row">
        <span class="stars">${"★".repeat(stars)}${"☆".repeat(5 - stars)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <span class="bar-count">${count}</span>
      </div>`;
  };

  const dailySalesRows = () => {
    if (!report.dailySales.length)
      return `<tr><td colspan="4" class="empty">No data in this period</td></tr>`;
    let totO = 0,
      totR = 0,
      totT = 0;
    const rows = report.dailySales.map((d) => {
      totO += d.orders;
      totR += d.revenue;
      totT += d.tickets;
      return `<tr><td>${d.date}</td><td>${d.orders}</td><td>${d.revenue.toFixed(2)}</td><td>${d.tickets}</td></tr>`;
    });
    rows.push(
      `<tr class="totals-row"><td>TOTAL</td><td>${totO}</td><td>${totR.toFixed(2)}</td><td>${totT}</td></tr>`,
    );
    return rows.join("");
  };

  const recentReviewsSection = () => {
    if (!report.reviews.recent.length)
      return `<p class="empty">No reviews in this period.</p>`;
    return `<table><thead><tr><th>Rating</th><th>Reviewer</th><th>Comment</th><th>Date</th></tr></thead><tbody>
      ${report.reviews.recent
        .map(
          (r) => `<tr>
        <td>${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</td>
        <td>${r.userName ?? "—"}</td>
        <td>${r.comment ?? "—"}</td>
        <td>${r.date}</td>
      </tr>`,
        )
        .join("")}
    </tbody></table>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; padding: 0; }
  .header { background: linear-gradient(135deg, #0f3460 0%, #16213e 100%); color: #fff; padding: 20px 24px 16px; }
  .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .header .meta { font-size: 9.5px; opacity: 0.8; }
  .period-banner { background: #e8f4f8; border-left: 4px solid #0f3460; padding: 8px 14px; margin: 14px 24px; font-size: 9.5px; color: #0f3460; }
  .period-banner strong { font-weight: 600; }
  .section { margin: 14px 24px; }
  .section-title { font-size: 12px; font-weight: 700; color: #0f3460; border-bottom: 2px solid #0f3460; padding-bottom: 4px; margin-bottom: 10px; }
  .kpi-grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .kpi-card { flex: 1 1 120px; background: #f7f9fc; border: 1px solid #dbe3f0; border-radius: 6px; padding: 10px 12px; text-align: center; }
  .kpi-value { font-size: 20px; font-weight: 700; color: #0f3460; }
  .kpi-label { font-size: 9px; color: #555; margin-top: 2px; }
  .kpi-note { font-size: 8.5px; color: #999; font-style: italic; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px; }
  th { background: #0f3460; color: #fff; padding: 5px 8px; text-align: left; font-weight: 600; }
  td { padding: 4px 8px; border-bottom: 1px solid #eef0f5; }
  tr:nth-child(even) td { background: #f7f9fc; }
  .totals-row td { font-weight: 700; background: #e8f4f8 !important; }
  .empty { color: #999; font-style: italic; text-align: center; padding: 10px; }
  .rating-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .stars { font-size: 11px; color: #f59e0b; min-width: 70px; }
  .bar-track { flex: 1; height: 8px; background: #eee; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; background: #0f3460; border-radius: 4px; }
  .bar-count { min-width: 24px; text-align: right; color: #555; font-size: 9.5px; }
  .two-col { display: flex; gap: 20px; }
  .two-col > div { flex: 1; }
</style>
</head>
<body>

<div class="header">
  <h1>${esc(report.event.title)}</h1>
  <div class="meta">
    ${report.event.location !== "—" ? `${esc(report.event.location)} &nbsp;|&nbsp; ` : ""}Event Report &nbsp;|&nbsp; Generated ${report.generated.at.slice(0, 10)}
  </div>
</div>

<div class="period-banner">
  <strong>Report period:</strong> ${report.period.label} &nbsp;(${rangeLabel}) &nbsp;&mdash;&nbsp;
  Views shown are all-time totals; all other metrics cover the report period above.
</div>

<div class="section">
  <div class="section-title">Key Performance Indicators</div>
  <div class="kpi-grid">
    ${kpiCard("Registrations", report.kpis.registrations, rangeLabel)}
    ${kpiCard("Revenue", `${report.kpis.revenue.toFixed(2)}`, rangeLabel)}
    ${kpiCard("Tickets Sold", report.kpis.ticketsSold, rangeLabel)}
    ${kpiCard("Certificates Issued", report.kpis.certificatesIssued, rangeLabel)}
    ${kpiCard("Reviews", report.kpis.reviews, rangeLabel)}
    ${kpiCard("Total Views", report.event.viewsAllTime, "all-time")}
    ${report.externalBooking.enabled ? kpiCard("Booking Clicks", report.externalBooking.clicksInPeriod, rangeLabel) : ""}
  </div>
</div>

${
  report.externalBooking.enabled
    ? `
<div class="section">
  <div class="section-title">External Booking</div>
  <table>
    <thead><tr><th>Link</th><th>Total Clicks</th><th>Unique Clicks</th><th>CTR (all-time)</th><th>Last Clicked</th></tr></thead>
    <tbody>
      <tr>
        <td style="word-break:break-all">${esc(report.externalBooking.link ?? "—")}</td>
        <td>${report.externalBooking.totalClicks}</td>
        <td>${report.externalBooking.uniqueClicks}</td>
        <td>${report.externalBooking.clickThroughRate}%</td>
        <td>${report.externalBooking.lastClickedAt ? report.externalBooking.lastClickedAt.slice(0, 10) : "—"}</td>
      </tr>
    </tbody>
  </table>
</div>
<div class="period-banner" style="background:#fff7e6;border-left-color:#b45309;color:#7a4d05">
  Booking happens on the external site — registrations, revenue, and certificates below are not tracked on-platform for this event.
</div>`
    : ""
}

<div class="two-col" style="margin:0 24px">
  <div>
    <div class="section-title" style="margin-bottom:8px">Registrations by Status</div>
    <table>
      <thead><tr><th>Status</th><th>Count</th></tr></thead>
      <tbody>
        ${statusTableRows(report.registrations.byStatus)}
        ${report.registrations.total > 0 ? `<tr class="totals-row"><td>TOTAL</td><td>${report.registrations.total}</td></tr>` : ""}
      </tbody>
    </table>
  </div>
  <div>
    <div class="section-title" style="margin-bottom:8px">Certificates by Status</div>
    <table>
      <thead><tr><th>Status</th><th>Count</th></tr></thead>
      <tbody>
        ${statusTableRows(report.certificates.byStatus)}
        ${report.certificates.total > 0 ? `<tr class="totals-row"><td>TOTAL</td><td>${report.certificates.total}</td></tr>` : ""}
      </tbody>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-title">Reviews — Rating Distribution</div>
  ${
    report.reviews.total === 0
      ? `<p class="empty">No reviews in this period.</p>`
      : `<div style="margin-bottom:10px">
        <div style="font-size:10px;color:#555;margin-bottom:6px">Average: <strong>${report.reviews.averageRating} / 5</strong> &nbsp; (${report.reviews.total} reviews)</div>
        ${[5, 4, 3, 2, 1].map((s) => ratingBar(s, report.reviews.distribution[s] ?? 0, report.reviews.total)).join("")}
       </div>`
  }
  ${recentReviewsSection()}
</div>

<div class="section">
  <div class="section-title">Daily Sales</div>
  <table>
    <thead><tr><th>Date</th><th>Orders</th><th>Revenue</th><th>Tickets</th></tr></thead>
    <tbody>${dailySalesRows()}</tbody>
  </table>
</div>

</body>
</html>`;
}

// ─── Shared Handlebars helpers for new (business-report) templates ────────────
// Registered once at module load, mirroring the pattern already established in
// workers/certificate.worker.ts (upper/lower/date/year/default helpers).

/** Full HTML-escape — safe for both text nodes and quoted attribute values. */
function escHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Only `http(s)` URLs are ever safe to drop into a `src`/`href` attribute in
 * these self-contained reports — `javascript:`/`data:`/`vbscript:` etc. are
 * rejected outright rather than escaped, since escaping alone doesn't
 * neutralize a dangerous scheme. Returns "" (falsy) for anything else so
 * callers can `x ? ... : ""` around it exactly like the other optional
 * fields in these templates.
 */
function safeUrl(url: unknown): string {
  const raw = String(url ?? "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? escHtml(raw)
      : "";
  } catch {
    return "";
  }
}

let helpersRegistered = false;

function registerReportHelpers() {
  if (helpersRegistered) return;
  helpersRegistered = true;

  Handlebars.registerHelper("percent", (val: number | null | undefined) =>
    val === null || val === undefined ? "—" : `${Math.round(val)}%`,
  );
  Handlebars.registerHelper(
    "currency",
    (val: number | null | undefined, code: string = "AED") =>
      val === null || val === undefined
        ? "—"
        : new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: code,
            maximumFractionDigits: 2,
          }).format(val),
  );
  Handlebars.registerHelper(
    "dateLabel",
    (d: string | Date | null | undefined) => {
      if (!d) return "—";
      const date = new Date(d);
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    },
  );
  Handlebars.registerHelper(
    "severityBadge",
    (severity: "critical" | "high" | "medium" | "low") => {
      const colors: Record<string, string> = {
        critical: "#dc2626",
        high: "#ea580c",
        medium: "#d97706",
        low: "#65a30d",
      };
      const color = colors[severity] ?? "#6b7280";
      return new Handlebars.SafeString(
        `<span class="severity-badge" style="background:${color}">${severity.toUpperCase()}</span>`,
      );
    },
  );
  Handlebars.registerHelper(
    "trendArrow",
    (direction?: "up" | "down" | "flat") => {
      if (direction === "up")
        return new Handlebars.SafeString(
          '<span style="color:#16a34a">▲</span>',
        );
      if (direction === "down")
        return new Handlebars.SafeString(
          '<span style="color:#dc2626">▼</span>',
        );
      if (direction === "flat")
        return new Handlebars.SafeString(
          '<span style="color:#6b7280">—</span>',
        );
      return "";
    },
  );
  Handlebars.registerHelper(
    "metricValue",
    (value: number | null | undefined, unit?: string) =>
      value === null || value === undefined
        ? "Not tracked"
        : `${value}${unit ?? ""}`,
  );
  Handlebars.registerHelper(
    "changePercent",
    (val: number | null | undefined) =>
      val === null || val === undefined ? "" : `${val > 0 ? "+" : ""}${val}%`,
  );
  Handlebars.registerHelper(
    "scoreOrNotTracked",
    (val: number | null | undefined) =>
      val === null || val === undefined ? "Not tracked" : `${val}%`,
  );
}

const compiledTemplateCache = new Map<string, HandlebarsTemplateDelegate>();

/**
 * Compile (and cache) a Handlebars template string by a stable cache key.
 * Used by businessReport.service.ts for the promotion-snapshot and
 * business-health templates.
 */
export function compileReportTemplate(
  key: string,
  templateSource: string,
): HandlebarsTemplateDelegate {
  registerReportHelpers();
  const cached = compiledTemplateCache.get(key);
  if (cached) return cached;
  const compiled = Handlebars.compile(templateSource, { noEscape: false });
  compiledTemplateCache.set(key, compiled);
  return compiled;
}

// ─── Shared report chrome (same navy palette as the event report) ─────────────

const REPORT_BASE_STYLE = `
  @page { size: A4; margin: 16mm 12mm 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; }
  .header { background: linear-gradient(135deg, #0f3460 0%, #16213e 100%); color: #fff; padding: 20px 24px 16px; display: flex; align-items: center; gap: 14px; justify-content: space-between; }
  .header .identity { display: flex; align-items: center; gap: 14px; }
  .header img.logo { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; background: #fff; }
  .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .header .meta { font-size: 9.5px; opacity: 0.8; }
  .header .verification-badge { font-size: 8.5px; font-weight: 700; padding: 3px 8px; border-radius: 10px; background: rgba(255,255,255,0.15); white-space: nowrap; }
  .period-banner { background: #e8f4f8; border-left: 4px solid #0f3460; padding: 8px 14px; margin: 14px 24px; font-size: 9.5px; color: #0f3460; }
  .section { margin: 14px 24px; page-break-inside: avoid; }
  .section-title { font-size: 12px; font-weight: 700; color: #0f3460; border-bottom: 2px solid #0f3460; padding-bottom: 4px; margin-bottom: 10px; }
  .kpi-grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .kpi-card { flex: 1 1 120px; background: #f7f9fc; border: 1px solid #dbe3f0; border-radius: 6px; padding: 10px 12px; text-align: center; }
  .kpi-value { font-size: 18px; font-weight: 700; color: #0f3460; }
  .kpi-label { font-size: 9px; color: #555; margin-top: 2px; }
  .stat-strip { display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 4px; }
  .stat-strip .stat { font-size: 9.5px; color: #444; }
  .stat-strip .stat strong { color: #0f3460; font-size: 11px; display: block; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px; }
  th { background: #0f3460; color: #fff; padding: 5px 8px; text-align: left; font-weight: 600; }
  td { padding: 4px 8px; border-bottom: 1px solid #eef0f5; }
  tr:nth-child(even) td { background: #f7f9fc; }
  .empty { color: #999; font-style: italic; text-align: center; padding: 10px; }
  .score-bar-track { flex: 1; height: 10px; background: #eee; border-radius: 5px; overflow: hidden; }
  .score-bar-fill { height: 100%; background: #0f3460; border-radius: 5px; }
  .score-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .score-row .label { min-width: 90px; font-size: 10px; color: #333; }
  .score-row .value { min-width: 40px; text-align: right; font-size: 10px; font-weight: 700; color: #0f3460; }
  .score-row .trend { min-width: 62px; text-align: right; font-size: 8.5px; }
  .severity-badge { display: inline-block; color: #fff; font-size: 8px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
  .checklist { display: flex; flex-wrap: wrap; gap: 6px 16px; }
  .checklist .item { font-size: 9.5px; }
  .checklist .item.done { color: #16a34a; }
  .checklist .item.pending { color: #999; }
  .event-thumb { width: 28px; height: 28px; border-radius: 4px; object-fit: cover; vertical-align: middle; margin-right: 6px; }
  .rank-badge { display: inline-block; width: 16px; height: 16px; line-height: 16px; text-align: center; border-radius: 50%; background: #0f3460; color: #fff; font-size: 8px; font-weight: 700; margin-right: 6px; }
  .footer-note { margin: 18px 24px 0; font-size: 8px; color: #999; border-top: 1px solid #eef0f5; padding-top: 6px; }
  .confidence-line { font-size: 9.5px; color: #555; margin-top: 4px; }
`;

function trendSpan(t?: {
  direction?: "up" | "down" | "flat";
  changePercent?: number;
}): string {
  if (!t?.direction || t.changePercent === undefined) return "";
  const color =
    t.direction === "up"
      ? "#16a34a"
      : t.direction === "down"
        ? "#dc2626"
        : "#6b7280";
  const arrow = t.direction === "up" ? "▲" : t.direction === "down" ? "▼" : "—";
  return `<span style="color:${color}">${arrow} ${t.changePercent > 0 ? "+" : ""}${t.changePercent}%</span>`;
}

function scoreRow(
  label: string,
  value: number | null,
  trend?: { direction?: "up" | "down" | "flat"; changePercent?: number },
): string {
  const pct = value ?? 0;
  const display = value === null ? "Not tracked" : `${value}%`;
  return `
    <div class="score-row">
      <div class="label">${label}</div>
      <div class="score-bar-track"><div class="score-bar-fill" style="width:${pct}%"></div></div>
      <div class="value">${display}</div>
      <div class="trend">${trendSpan(trend)}</div>
    </div>`;
}

/** Plain-language summary of the report — the first thing a vendor reads. */
function buildExecutiveSummary(payload: ReportPayload): string {
  const overall = payload.scores.overall;
  const overallLine =
    overall === null
      ? `${payload.vendor.businessName} does not have enough tracked activity yet to compute an overall business health score this period.`
      : overall >= 80
        ? `${payload.vendor.businessName} is performing strongly this period, with an overall business health score of ${overall}%.`
        : overall >= 60
          ? `${payload.vendor.businessName} is performing reasonably this period, with an overall business health score of ${overall}%. A few areas need attention.`
          : `${payload.vendor.businessName}'s overall business health score is ${overall}% this period — several areas below target need attention.`;

  const critical = payload.recommendations.filter(
    (r) => r.severity === "critical",
  ).length;
  const high = payload.recommendations.filter(
    (r) => r.severity === "high",
  ).length;
  const openTasks = payload.tasks.filter((t) => !t.done).length;

  const actionLine =
    payload.recommendations.length === 0
      ? "No outstanding recommendations — every scored dimension is at target."
      : `${payload.recommendations.length} recommendation${payload.recommendations.length === 1 ? "" : "s"} identified${
          critical || high
            ? ` (${critical} critical, ${high} high priority)`
            : ""
        }, with ${openTasks} action item${openTasks === 1 ? "" : "s"} still open.`;

  return `${overallLine} ${actionLine}`;
}

/** "About" section — vendor description/contact/socials/all-time track record, when any are on file. */
function buildVendorInfoSection(
  payload: ReportPayload,
  esc: (s: unknown) => string,
): string {
  const website = payload.vendor.website || payload.vendor.socialMedia?.website;
  const socialEntries = payload.vendor.socialMedia
    ? Object.entries(payload.vendor.socialMedia).filter(
        ([key, value]) => key !== "website" && value,
      )
    : [];
  const socials = socialEntries
    .map(([platform, handle]) => `${platform}: ${esc(handle)}`)
    .join(" &nbsp;|&nbsp; ");
  const rawDescription = payload.vendor.description ?? "";
  const description =
    rawDescription.length > 0
      ? esc(rawDescription.slice(0, 240)) +
        (rawDescription.length > 240 ? "…" : "")
      : "";

  const stats = payload.vendor.allTimeStats;
  const statStrip = stats
    ? `<div class="stat-strip">
        <div class="stat"><strong>${stats.totalEvents}</strong>All-time events</div>
        <div class="stat"><strong>${stats.totalBookings}</strong>All-time bookings</div>
        <div class="stat"><strong>AED ${stats.totalRevenue.toLocaleString()}</strong>All-time revenue</div>
        <div class="stat"><strong>${stats.totalReviews > 0 ? `${stats.averageRating.toFixed(1)} / 5` : "—"}</strong>Rating (${stats.totalReviews} reviews)</div>
        ${payload.vendor.memberSince ? `<div class="stat"><strong>${new Date(payload.vendor.memberSince).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</strong>Vendor since</div>` : ""}
      </div>`
    : "";

  if (!website && !socials && !description && !statStrip) return "";

  return `
<div class="section">
  <div class="section-title">About This Vendor</div>
  ${statStrip}
  ${description ? `<p style="font-size:10px;color:#444;margin-bottom:6px">${description}</p>` : ""}
  ${
    website || socials
      ? `<p style="font-size:9px;color:#666">${website ? `Website: ${esc(website)}` : ""}${website && socials ? " &nbsp;|&nbsp; " : ""}${socials}</p>`
      : ""
  }
</div>`;
}

/** Top-performing events this period, ranked by revenue — frozen with the snapshot (see ITopEventEntry). */
function buildTopEventsSection(
  payload: ReportPayload,
  esc: (s: unknown) => string,
): string {
  if (payload.topEvents.length === 0) return "";
  const rows = payload.topEvents
    .map((e, i) => {
      const thumb = safeUrl(e.coverImage);
      return `<tr>
        <td>${
          thumb
            ? `<img class="event-thumb" src="${thumb}" />`
            : `<span class="rank-badge">${i + 1}</span>`
        }${esc(e.title)}</td>
        <td>AED ${e.revenue.toLocaleString()}</td>
        <td>${e.orders}</td>
        <td>${e.tickets}</td>
        <td>${e.viewsAllTime.toLocaleString()}</td>
        <td>${e.averageRating ? `${e.averageRating.toFixed(1)} / 5` : "—"}</td>
      </tr>`;
    })
    .join("");

  return `
<div class="section">
  <div class="section-title">Top Performing Events (${payload.topEvents.length}) — This Period</div>
  <table>
    <thead><tr><th>Event</th><th>Revenue</th><th>Orders</th><th>Tickets</th><th>Views (all-time)</th><th>Rating</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
}

// ─── Business Health report ─────────────────────────────────────────────────

/**
 * Self-contained A4 HTML for the Business Health report (KBOS Phase 1).
 * Consumes a ReportPayload — already passed through toReportPayload(), so
 * internal notes and the audit trail are guaranteed absent by construction.
 */
export function buildBusinessHealthHtml(payload: ReportPayload): string {
  const esc = escHtml;

  const recommendationRows =
    payload.recommendations.length > 0
      ? payload.recommendations
          .map(
            (r) => `<tr>
              <td><span class="severity-badge" style="background:${
                {
                  critical: "#dc2626",
                  high: "#ea580c",
                  medium: "#d97706",
                  low: "#65a30d",
                }[r.severity]
              }">${r.severity.toUpperCase()}</span></td>
              <td>${esc(r.title)}</td>
              <td>${esc(r.currentValue)}</td>
              <td>${esc(r.targetValue)}</td>
              <td>${esc(r.reason)}</td>
            </tr>`,
          )
          .join("")
      : `<tr><td colspan="5" class="empty">No recommendations — every scored dimension is at target.</td></tr>`;

  const metricRows = payload.metrics
    .map((m) => {
      const valueDisplay =
        m.value === null ? "Not tracked" : `${m.value}${m.unit ?? ""}`;
      const trendDisplay =
        m.direction && m.changePercent !== undefined
          ? `<span style="color:${m.direction === "up" ? "#16a34a" : m.direction === "down" ? "#dc2626" : "#6b7280"}">${
              m.direction === "up" ? "▲" : m.direction === "down" ? "▼" : "—"
            } ${m.changePercent > 0 ? "+" : ""}${m.changePercent}%</span>`
          : "";
      return `<tr><td>${esc(m.label)}</td><td>${esc(valueDisplay)}</td><td>${trendDisplay}</td><td>${m.source}</td></tr>`;
    })
    .join("");

  const checklistItems = payload.profileCompletion.items
    .map(
      (i) =>
        `<span class="item ${i.done ? "done" : "pending"}">${i.done ? "✓" : "✗"} ${esc(i.label)}</span>`,
    )
    .join("");

  const taskRows =
    payload.tasks.length > 0
      ? payload.tasks
          .map(
            (t) =>
              `<tr><td>${t.done ? '<span style="color:#16a34a;font-weight:700">✓ Done</span>' : '<span style="color:#d97706;font-weight:700">Open</span>'}</td><td>${esc(t.label)}</td></tr>`,
          )
          .join("")
      : `<tr><td colspan="2" class="empty">No action items for this period.</td></tr>`;

  const executiveSummary = buildExecutiveSummary(payload);
  const vendorInfo = buildVendorInfoSection(payload, esc);
  const topEventsSection = buildTopEventsSection(payload, esc);
  const trends = payload.scoreTrends ?? {};
  const logoUrl = safeUrl(payload.vendor.logo);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>${REPORT_BASE_STYLE}</style>
</head>
<body>

<div class="header">
  <div class="identity">
    ${logoUrl ? `<img class="logo" src="${logoUrl}" />` : ""}
    <div>
      <h1>${esc(payload.vendor.businessName)} — Business Health Report</h1>
      <div class="meta">Period ${esc(payload.period)} &nbsp;|&nbsp; Generated ${payload.generatedAt.toISOString().slice(0, 10)}</div>
    </div>
  </div>
  ${payload.vendor.verificationStatus ? `<span class="verification-badge">${esc(payload.vendor.verificationStatus).toUpperCase()}</span>` : ""}
</div>

<div class="period-banner">
  Report v${payload.reportVersion} &middot; Ruleset v${payload.rulesetVersion} &mdash; scores below reflect ${payload.confidence.dimensionsScored} of ${payload.confidence.dimensionsTotal} tracked dimensions (${payload.confidence.level} confidence).
</div>

<div class="section">
  <div class="section-title">Executive Summary</div>
  <p style="font-size:10px;line-height:1.5;color:#333">${esc(executiveSummary)}</p>
</div>

${vendorInfo}

<div class="section">
  <div class="section-title">Business Health</div>
  ${scoreRow("Overall", payload.scores.overall, trends.overall)}
  ${scoreRow("Listing", payload.scores.listing, trends.listing)}
  ${scoreRow("Sales", payload.scores.sales, trends.sales)}
  ${scoreRow("Marketing", payload.scores.marketing, trends.marketing)}
  ${scoreRow("Customer", payload.scores.customer, trends.customer)}
  ${scoreRow("Operations", payload.scores.operations, trends.operations)}
  <div class="confidence-line">Confidence: ${payload.confidence.level} &mdash; Coverage: ${payload.confidence.dimensionsScored} / ${payload.confidence.dimensionsTotal} dimensions</div>
  <div class="confidence-line">Dimension weights in overall score: Listing ${DIMENSION_WEIGHTS.listing * 100}% &middot; Sales ${DIMENSION_WEIGHTS.sales * 100}% &middot; Marketing ${DIMENSION_WEIGHTS.marketing * 100}% &middot; Customer ${DIMENSION_WEIGHTS.customer * 100}% &middot; Operations ${DIMENSION_WEIGHTS.operations * 100}%</div>
  ${trends.overall?.direction ? `<div class="confidence-line">Trend arrows compare this period's scores against the previous period's frozen snapshot.</div>` : ""}
</div>

${topEventsSection}

<div class="section">
  <div class="section-title">Business Profile Completion — ${payload.profileCompletion.percent}%</div>
  <div class="checklist">${checklistItems}</div>
</div>

<div class="section">
  <div class="section-title">Metrics</div>
  <table>
    <thead><tr><th>Metric</th><th>Value</th><th>Trend</th><th>Source</th></tr></thead>
    <tbody>${metricRows || `<tr><td colspan="4" class="empty">No metrics recorded</td></tr>`}</tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">Recommendations</div>
  <table>
    <thead><tr><th>Severity</th><th>Recommendation</th><th>Current</th><th>Target</th><th>Why</th></tr></thead>
    <tbody>${recommendationRows}</tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">Action Items</div>
  <table>
    <thead><tr><th style="width:70px">Status</th><th>Task</th></tr></thead>
    <tbody>${taskRows}</tbody>
  </table>
</div>

${
  payload.vendorVisibleNotes
    ? `<div class="section">
  <div class="section-title">Notes from Kidrove</div>
  <p>${esc(payload.vendorVisibleNotes)}</p>
</div>`
    : ""
}

<div class="footer-note">Generated by Kidrove Business Optimization &mdash; Report v${payload.reportVersion} / Ruleset v${payload.rulesetVersion} / Layout v${payload.templateVersion}</div>

</body>
</html>`;
}

// ─── Promotion Snapshot report ──────────────────────────────────────────────

/**
 * Self-contained A4 HTML for the Promotion Snapshot report — the
 * Ascend-Esports-style branded document. Combines the ReportPayload
 * (already sanitized via toReportPayload) with admin-entered promotion
 * input for the same period (banner placements, social reach, top posts,
 * offline campaigns) — none of which Kidrove can compute itself.
 */
export function buildPromotionSnapshotHtml(
  payload: ReportPayload,
  promotionInput: IVendorPromotionInput | null,
): string {
  const esc = escHtml;

  const reachRows = promotionInput?.socialReach
    ? Object.entries(promotionInput.socialReach)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(
          ([platform, v]) =>
            `<tr><td style="text-transform:capitalize">${platform}</td><td>${v}</td></tr>`,
        )
        .join("")
    : "";

  const bannerRows = (promotionInput?.bannerPlacements ?? [])
    .map(
      (b) =>
        `<tr><td>${esc(b.label)}</td><td>${esc(b.placement ?? "—")}</td><td>${b.impressions ?? "—"}</td><td>${b.clicks ?? "—"}</td></tr>`,
    )
    .join("");

  const featuredRows = (promotionInput?.featuredListings ?? [])
    .map(
      (f) =>
        `<tr><td>${esc(f.eventTitle)}</td><td>${esc(f.placement ?? "—")}</td></tr>`,
    )
    .join("");

  const topPostRows = (promotionInput?.topPosts ?? [])
    .map(
      (p) =>
        `<tr><td style="text-transform:capitalize">${p.platform}</td><td>${esc(p.caption ?? "—")}</td><td>${p.reach ?? "—"}</td><td>${p.engagement ?? "—"}</td></tr>`,
    )
    .join("");

  const offlineRows = (promotionInput?.offlineCampaigns ?? [])
    .map(
      (c) =>
        `<tr><td style="text-transform:capitalize">${c.type.replace("_", " ")}</td><td>${esc(c.label)}</td><td>${esc(c.details ?? "—")}</td></tr>`,
    )
    .join("");

  const kpiCard = (label: string, value: string | number, note?: string) => `
    <div class="kpi-card"><div class="kpi-value">${value}</div><div class="kpi-label">${label}</div>${
      note
        ? `<div style="font-size:8px;color:#999;font-style:italic;margin-top:2px">${note}</div>`
        : ""
    }</div>`;

  const trendNote = (m?: {
    direction?: string;
    changePercent?: number;
  }): string | undefined => {
    if (!m?.direction || m.changePercent === undefined) return undefined;
    const arrow =
      m.direction === "up" ? "▲" : m.direction === "down" ? "▼" : "—";
    return `${arrow} ${m.changePercent > 0 ? "+" : ""}${m.changePercent}% vs last month`;
  };

  const viewsMetric = payload.metrics.find((m) => m.key === "totalViews");
  const bookingsMetric = payload.metrics.find((m) => m.key === "totalBookings");
  const impressionsMetric = payload.metrics.find(
    (m) => m.key === "impressions",
  );
  const totalSocialReach = promotionInput?.socialReach
    ? Object.values(promotionInput.socialReach).reduce(
        (sum: number, v) => sum + (typeof v === "number" ? v : 0),
        0,
      )
    : 0;
  const vendorInfo = buildVendorInfoSection(payload, esc);
  const logoUrl = safeUrl(payload.vendor.logo);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>${REPORT_BASE_STYLE}</style>
</head>
<body>

<div class="header">
  <div class="identity">
    ${logoUrl ? `<img class="logo" src="${logoUrl}" />` : ""}
    <div>
      <h1>${esc(payload.vendor.businessName)} — Promotion Snapshot</h1>
      <div class="meta">Period ${esc(payload.period)} &nbsp;|&nbsp; Generated ${payload.generatedAt.toISOString().slice(0, 10)}</div>
    </div>
  </div>
  ${payload.vendor.verificationStatus ? `<span class="verification-badge">${esc(payload.vendor.verificationStatus).toUpperCase()}</span>` : ""}
</div>

<div class="section">
  <div class="section-title">Performance Summary</div>
  <div class="kpi-grid">
    ${kpiCard("Marketing Score", payload.scores.marketing === null ? "Not tracked" : `${payload.scores.marketing}%`)}
    ${kpiCard("Total Views", viewsMetric?.value ?? "Not tracked", trendNote(viewsMetric))}
    ${kpiCard("Bookings", bookingsMetric?.value ?? "Not tracked", trendNote(bookingsMetric))}
    ${kpiCard("Impressions", promotionInput?.impressions ?? "Not tracked", trendNote(impressionsMetric))}
    ${kpiCard("Total Social Reach", totalSocialReach > 0 ? totalSocialReach.toLocaleString() : "Not tracked")}
  </div>
</div>

${vendorInfo}

${
  reachRows
    ? `<div class="section">
  <div class="section-title">Social Media Reach</div>
  <table><thead><tr><th>Platform</th><th>Reach</th></tr></thead><tbody>${reachRows}</tbody></table>
</div>`
    : ""
}

${
  bannerRows
    ? `<div class="section">
  <div class="section-title">Banner Placements</div>
  <table><thead><tr><th>Banner</th><th>Placement</th><th>Impressions</th><th>Clicks</th></tr></thead><tbody>${bannerRows}</tbody></table>
</div>`
    : ""
}

${
  featuredRows
    ? `<div class="section">
  <div class="section-title">Featured Listings</div>
  <table><thead><tr><th>Event</th><th>Placement</th></tr></thead><tbody>${featuredRows}</tbody></table>
</div>`
    : ""
}

${
  topPostRows
    ? `<div class="section">
  <div class="section-title">Top Posts</div>
  <table><thead><tr><th>Platform</th><th>Caption</th><th>Reach</th><th>Engagement</th></tr></thead><tbody>${topPostRows}</tbody></table>
</div>`
    : ""
}

${
  offlineRows
    ? `<div class="section">
  <div class="section-title">Offline Promotion</div>
  <table><thead><tr><th>Type</th><th>Campaign</th><th>Details</th></tr></thead><tbody>${offlineRows}</tbody></table>
</div>`
    : ""
}

${
  !reachRows && !bannerRows && !featuredRows && !topPostRows && !offlineRows
    ? `<div class="section"><p class="empty">No promotion activity has been logged for this period yet.</p></div>`
    : ""
}

${
  payload.vendorVisibleNotes
    ? `<div class="section">
  <div class="section-title">Highlights &amp; Conclusion</div>
  <p>${esc(payload.vendorVisibleNotes)}</p>
</div>`
    : ""
}

<div class="footer-note">Generated by Kidrove Business Optimization &mdash; Report v${payload.reportVersion} / Ruleset v${payload.rulesetVersion} / Layout v${payload.templateVersion}</div>

</body>
</html>`;
}
