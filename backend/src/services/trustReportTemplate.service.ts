/**
 * Platform Highlights PDF — presentation only.
 *
 * Consumes a TrustReport (services/trustReport.service.ts) and returns one
 * self-contained HTML document for renderReportPdf: inline <style>, inline
 * SVG charts, no scripts, no remote assets. Every dynamic string goes through
 * escHtml; only finite numbers reach SVG coordinates.
 *
 * Chart rules (dataviz reference palette, light/print): one axis per chart,
 * single-series charts in one hue, categorical hues in fixed order, direct
 * labels on the few values that matter, recessive grid.
 */

import { escHtml } from "./reportTemplate.service";
import {
  TrustReport,
  SeriesPoint,
  RankRow,
  AgeDistribution,
  BucketUnit,
  scopeLabel,
  PAGEVIEW_RETENTION_DAYS,
} from "./trustReport.service";

// ─── Style system ────────────────────────────────────────────────────────────

const C = {
  ink: "#1b1f2a",
  ink2: "#52514e",
  muted: "#8a8984",
  grid: "#e7e6e1",
  surface: "#ffffff",
  panel: "#f7f6f2",
  brand: "#eb6834", // categorical slot 2 (orange) — brand accent
  series: "#2a78d6", // categorical slot 1 (blue) — single-series charts
  categorical: ["#2a78d6", "#eb6834", "#1baf7a"], // slots 1–3, validated all-pairs
  good: "#0f7b3f",
};
const FONT = `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

// ─── Formatting ──────────────────────────────────────────────────────────────

const fin = (n: unknown): number => (typeof n === "number" && Number.isFinite(n) ? n : 0);
const fmtInt = (n: number) => Math.round(fin(n)).toLocaleString("en-US");

/** Cover-only compact form: 1,290 → "1.2K+" (floored, "+" only when rounded down). */
export function compactNumber(n: number): string {
  const v = Math.floor(fin(n));
  if (v < 1000) return v.toLocaleString("en-US");
  const [div, suf] = v >= 1_000_000 ? [1_000_000, "M"] : [1000, "K"];
  const floored = Math.floor((v / div) * 10) / 10;
  const exact = floored * div === v;
  return `${floored.toFixed(floored % 1 === 0 ? 0 : 1)}${suf}${exact ? "" : "+"}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Period/visitor ends are exclusive midnights — print the last day actually included. */
const lastDay = (d: Date) => new Date(d.getTime() - 1);
const fmtDate = (d: Date | string) => {
  const x = new Date(d);
  return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
};
const fmtKey = (key: string, unit: BucketUnit) => {
  const [y, m, d] = key.split("-").map(Number);
  if (unit === "month") return `${MONTHS[m - 1]} '${String(y).slice(2)}`;
  return `${d} ${MONTHS[m - 1]}`;
};
const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

// ─── SVG chart kit ───────────────────────────────────────────────────────────

/** 0 → a "nice" max with 4 even steps (1/2/2.5/5 × 10^k). */
export function niceScale(max: number, steps = 4): { max: number; step: number } {
  const m = Math.max(fin(max), 1);
  const raw = m / steps;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? 10 * mag;
  const niceStep = step < 1 ? 1 : step;
  return { max: niceStep * steps, step: niceStep };
}

const axisNum = (n: number) =>
  n >= 1_000_000 ? `${n / 1_000_000}M` : n >= 1000 ? `${n / 1000}K` : String(n);

interface Frame {
  w: number;
  h: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function yGrid(f: Frame, scale: { max: number; step: number }): string {
  const out: string[] = [];
  for (let v = 0; v <= scale.max + 1e-9; v += scale.step) {
    const y = f.top + (f.h - f.top - f.bottom) * (1 - v / scale.max);
    out.push(
      `<line x1="${f.left}" x2="${f.w - f.right}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${v === 0 ? C.muted : C.grid}" stroke-width="1"/>`,
      `<text x="${f.left - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="${C.muted}">${axisNum(v)}</text>`,
    );
  }
  return out.join("");
}

function xLabels(f: Frame, labels: string[], xAt: (i: number) => number, maxLabels = 7): string {
  if (!labels.length) return "";
  const every = Math.max(1, Math.ceil(labels.length / maxLabels));
  return labels
    .map((l, i) =>
      i % every === 0 || i === labels.length - 1
        ? (i !== labels.length - 1 && labels.length - 1 - i < every
            ? "" // keep the last label from colliding with the previous one
            : `<text x="${xAt(i).toFixed(1)}" y="${f.h - f.bottom + 14}" text-anchor="middle" font-size="9" fill="${C.muted}">${escHtml(l)}</text>`)
        : "",
    )
    .join("");
}

/** Single-series line/area. Labels the final value directly. */
export function svgLine(
  points: SeriesPoint[],
  unit: BucketUnit,
  opts: { w?: number; h?: number; color?: string; ariaLabel: string },
): string {
  if (!points.length || points.every((p) => fin(p.value) === 0)) return "";
  const f: Frame = { w: opts.w ?? 680, h: opts.h ?? 190, left: 40, right: 44, top: 14, bottom: 24 };
  const color = opts.color ?? C.series;
  const scale = niceScale(Math.max(...points.map((p) => fin(p.value))));
  const plotW = f.w - f.left - f.right;
  const plotH = f.h - f.top - f.bottom;
  const xAt = (i: number) => f.left + (points.length === 1 ? plotW / 2 : (plotW * i) / (points.length - 1));
  const yAt = (v: number) => f.top + plotH * (1 - fin(v) / scale.max);
  const path = points.map((p, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`).join("");
  const base = (f.top + plotH).toFixed(1);
  const area = `${path}L${xAt(points.length - 1).toFixed(1)},${base}L${xAt(0).toFixed(1)},${base}Z`;
  const last = points[points.length - 1];
  const lx = xAt(points.length - 1);
  const ly = yAt(last.value);
  return `<svg class="chart" role="img" aria-label="${escHtml(opts.ariaLabel)}" viewBox="0 0 ${f.w} ${f.h}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family='${FONT}'>
${yGrid(f, scale)}
<path d="${area}" fill="${color}" fill-opacity="0.10"/>
<path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4" fill="${color}" stroke="${C.surface}" stroke-width="2"/>
<text x="${(lx + 7).toFixed(1)}" y="${(ly + 3).toFixed(1)}" font-size="10" font-weight="700" fill="${C.ink}">${escHtml(compactNumber(last.value))}</text>
${xLabels(f, points.map((p) => fmtKey(p.key, unit)), xAt)}
</svg>`;
}

/** Single-series columns. Direct label on the tallest column only. */
export function svgColumns(
  points: SeriesPoint[],
  unit: BucketUnit,
  opts: { w?: number; h?: number; color?: string; ariaLabel: string },
): string {
  if (!points.length || points.every((p) => fin(p.value) === 0)) return "";
  const f: Frame = { w: opts.w ?? 680, h: opts.h ?? 170, left: 40, right: 12, top: 16, bottom: 24 };
  const color = opts.color ?? C.series;
  const scale = niceScale(Math.max(...points.map((p) => fin(p.value))));
  const plotW = f.w - f.left - f.right;
  const plotH = f.h - f.top - f.bottom;
  const slot = plotW / points.length;
  const bw = Math.max(2, Math.min(28, slot - 2)); // 2px surface gap between bars
  const maxIdx = points.reduce((best, p, i) => (fin(p.value) > fin(points[best].value) ? i : best), 0);
  const bars = points
    .map((p, i) => {
      const v = fin(p.value);
      if (v <= 0) return "";
      const h = (plotH * v) / scale.max;
      const x = f.left + slot * i + (slot - bw) / 2;
      const y = f.top + plotH - h;
      const r = Math.min(4, bw / 2, h);
      // rounded top, square baseline
      const d = `M${x.toFixed(1)},${(f.top + plotH).toFixed(1)}V${(y + r).toFixed(1)}Q${x.toFixed(1)},${y.toFixed(1)} ${(x + r).toFixed(1)},${y.toFixed(1)}H${(x + bw - r).toFixed(1)}Q${(x + bw).toFixed(1)},${y.toFixed(1)} ${(x + bw).toFixed(1)},${(y + r).toFixed(1)}V${(f.top + plotH).toFixed(1)}Z`;
      const label =
        i === maxIdx
          ? `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="700" fill="${C.ink}">${fmtInt(v)}</text>`
          : "";
      return `<path d="${d}" fill="${color}"/>${label}`;
    })
    .join("");
  return `<svg class="chart" role="img" aria-label="${escHtml(opts.ariaLabel)}" viewBox="0 0 ${f.w} ${f.h}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family='${FONT}'>
${yGrid(f, scale)}${bars}
${xLabels(f, points.map((p) => fmtKey(p.key, unit)), (i) => f.left + slot * i + slot / 2)}
</svg>`;
}

/** Horizontal bars, sorted descending ("Other" pinned last), value + % labelled. */
export function svgHBars(
  rows: { label: string; pct: number; count?: number }[],
  opts: { w?: number; color?: string; ariaLabel: string; showCount?: boolean },
): string {
  const data = rows.filter((r) => fin(r.pct) > 0);
  if (!data.length) return "";
  const sorted = [
    ...data.filter((r) => r.label !== "Other").sort((a, b) => b.pct - a.pct),
    ...data.filter((r) => r.label === "Other"),
  ];
  const w = opts.w ?? 330;
  const rowH = 22;
  const labelW = 112;
  const valueW = opts.showCount ? 78 : 40;
  const plotW = w - labelW - valueW;
  const maxPct = Math.max(...sorted.map((r) => r.pct));
  const h = sorted.length * rowH + 4;
  const color = opts.color ?? C.series;
  const body = sorted
    .map((r, i) => {
      const y = 2 + i * rowH;
      const bw = Math.max(3, (plotW * r.pct) / maxPct);
      const value = opts.showCount && r.count !== undefined ? `${fmtInt(r.count)} · ${r.pct}%` : `${r.pct}%`;
      return `<text x="${labelW - 8}" y="${y + 14}" text-anchor="end" font-size="10" fill="${C.ink}">${escHtml(truncate(r.label, 20))}</text>
<rect x="${labelW}" y="${y + 4}" width="${bw.toFixed(1)}" height="13" rx="3" fill="${r.label === "Other" ? C.muted : color}"/>
<text x="${(labelW + bw + 6).toFixed(1)}" y="${y + 14}" font-size="9.5" fill="${C.ink2}">${escHtml(value)}</text>`;
    })
    .join("");
  return `<svg class="chart" role="img" aria-label="${escHtml(opts.ariaLabel)}" viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family='${FONT}'>${body}</svg>`;
}

/** Donut (≤ 3 categories, fixed hue order) + legend with %. */
export function svgDonut(rows: RankRow[], opts: { ariaLabel: string; centerLabel: string }): string {
  const data = rows.filter((r) => fin(r.count) > 0).slice(0, 3);
  const total = data.reduce((a, r) => a + r.count, 0);
  if (!total) return "";
  const size = 150;
  const cx = size / 2;
  const R = 62;
  const r0 = 40;
  let angle = -Math.PI / 2;
  const arcs = data
    .map((row, i) => {
      const frac = row.count / total;
      const color = C.categorical[i];
      if (frac >= 0.9999) {
        return `<circle cx="${cx}" cy="${cx}" r="${(R + r0) / 2}" fill="none" stroke="${color}" stroke-width="${R - r0}"/>`;
      }
      const a0 = angle;
      const a1 = angle + frac * Math.PI * 2;
      angle = a1;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (rad: number, a: number) => `${(cx + rad * Math.cos(a)).toFixed(2)},${(cx + rad * Math.sin(a)).toFixed(2)}`;
      return `<path d="M${p(R, a0)}A${R},${R} 0 ${large} 1 ${p(R, a1)}L${p(r0, a1)}A${r0},${r0} 0 ${large} 0 ${p(r0, a0)}Z" fill="${color}" stroke="${C.surface}" stroke-width="2"/>`;
    })
    .join("");
  const legend = data
    .map(
      (row, i) =>
        `<div class="legend-row"><span class="swatch" style="background:${C.categorical[i]}"></span><span class="legend-label">${escHtml(row.label)}</span><span class="legend-value">${fin(row.pct)}%</span></div>`,
    )
    .join("");
  return `<div class="donut-wrap">
<svg class="chart" role="img" aria-label="${escHtml(opts.ariaLabel)}" viewBox="0 0 ${size} ${size}" width="150" height="150" xmlns="http://www.w3.org/2000/svg" font-family='${FONT}'>
${arcs}
<text x="${cx}" y="${cx - 2}" text-anchor="middle" font-size="15" font-weight="700" fill="${C.ink}">${escHtml(compactNumber(total))}</text>
<text x="${cx}" y="${cx + 12}" text-anchor="middle" font-size="8.5" fill="${C.ink2}">${escHtml(opts.centerLabel)}</text>
</svg>
<div class="legend">${legend}</div>
</div>`;
}

// ─── Sections ────────────────────────────────────────────────────────────────

const card = (title: string, intro: string, body: string, extraClass = "") =>
  body.trim()
    ? `<section class="card ${extraClass}"><h2>${escHtml(title)}</h2><p class="intro">${escHtml(intro)}</p>${body}</section>`
    : "";

const sub = (title: string, body: string, note?: string) =>
  body.trim()
    ? `<div class="sub"><h3>${escHtml(title)}</h3>${body}${note ? `<p class="note">${escHtml(note)}</p>` : ""}</div>`
    : "";

const ageChart = (title: string, dist: AgeDistribution | undefined, who: string) =>
  dist
    ? sub(
        title,
        svgHBars(
          dist.bins.map((b) => ({ label: `Age ${b.label}`, pct: b.pct })),
          { ariaLabel: title, color: C.series },
        ),
        `Based on ${dist.basedOn.toLocaleString("en-US")}+ ${who} with a recorded date of birth. Small groups are combined to protect privacy.`,
      )
    : "";

function communityCard(r: TrustReport): string {
  const c = r.sections.community;
  if (!c) return "";
  const unitWord = c.unit === "day" ? "day" : c.unit;
  const growth = svgLine(c.cumulative, c.unit, { ariaLabel: "Total registered members over time" });
  const activity = svgColumns(c.activity, c.unit, {
    ariaLabel: `New members per ${unitWord}`,
    color: C.brand,
  });
  return card(
    "Our Growing Community",
    `Kidrove is home to ${fmtInt(c.totalUsers)} registered members, with ${fmtInt(c.newUsers)} joining in the ${scopeLabel(r.period.days).toLowerCase()}.`,
    sub("Total registered members", growth, `Running total of real sign-up dates, by ${unitWord}.`) +
      sub(`New members per ${unitWord}`, activity),
  );
}

function agesCard(r: TrustReport): string {
  const a = r.sections.ages;
  if (!a) return "";
  const body = `<div class="two-col">${ageChart("Parents", a.adults, "parents")}${ageChart("Children", a.kids, "children")}</div>`;
  return card("Who Joins Us", "Age mix of our registered community, shown as shares of each group.", body);
}

function locationsCard(r: TrustReport): string {
  const l = r.sections.locations;
  if (!l) return "";
  // Shares only: exact counts on small groups (incl. "Other") would let repeat readers spot individual sign-ups.
  const chart = (title: string, rows: RankRow[] | undefined, note: string) =>
    rows ? sub(title, svgHBars(rows, { ariaLabel: title }), note) : "";
  const community =
    chart("Members by country", l.communityCountries, "From members' registered addresses.") +
    chart("Members by city", l.communityCities, "From members' registered addresses.");
  const visitors = chart(
    "Website visitors by country",
    l.visitorCountries,
    "From website visits — a different audience from registered members.",
  );
  return card(
    "Where Families Join Us",
    "Where our members live, and where our website visitors come from.",
    `<div class="two-col">${community}${visitors}</div>`,
  );
}

function engagementCard(r: TrustReport): string {
  const e = r.sections.engagement;
  if (!e) return "";
  const stats = [
    ["Page views", e.pageViews],
    ["Unique visitor sessions", e.uniqueVisitors],
    ["Event pages opened", e.eventPageOpens],
  ]
    .filter(([, v]) => fin(v) > 0)
    .map(([l, v]) => `<div class="stat"><div class="stat-value">${fmtInt(v as number)}</div><div class="stat-label">${escHtml(l as string)}</div></div>`)
    .join("");
  const daily = svgLine(e.daily, "day", { ariaLabel: "Page views per day" });
  const devices = svgDonut(e.devices, { ariaLabel: "Page views by device", centerLabel: "page views" });
  return card(
    "Platform Engagement",
    `Visitor activity from ${fmtDate(e.coverage.start)} to ${fmtDate(lastDay(e.coverage.end))}.`,
    `<div class="stats">${stats}</div>` +
      sub("Page views per day", daily) +
      sub("How visitors browse", devices),
  );
}

function searchCard(r: TrustReport): string {
  const s = r.sections.search;
  if (!s) return "";
  const stats = [
    ["Appearances in Google results", s.impressions],
    ["Visits from Google", s.clicks],
  ]
    .filter(([, v]) => fin(v) > 0)
    .map(([l, v]) => `<div class="stat"><div class="stat-value">${fmtInt(v as number)}</div><div class="stat-label">${escHtml(l as string)}</div></div>`)
    .concat(
      s.avgPosition !== undefined
        ? [`<div class="stat"><div class="stat-value">${s.avgPosition.toFixed(1)}</div><div class="stat-label">Average position in Google — page 1</div></div>`]
        : [],
    )
    .join("");
  const trend = svgLine(
    s.trend.map((t) => ({ key: t.key, value: t.clicks })),
    "day",
    { ariaLabel: "Visits from Google per day" },
  );
  const queries = s.topQueries.length
    ? `<table><thead><tr><th>What people search for</th><th class="num">Visits</th><th class="num">Appearances</th></tr></thead><tbody>${s.topQueries
        .map((q) => `<tr><td>${escHtml(truncate(q.query, 60))}</td><td class="num">${fmtInt(q.clicks)}</td><td class="num">${fmtInt(q.impressions)}</td></tr>`)
        .join("")}</tbody></table>`
    : "";
  const coverage = s.coverage ? ` from ${fmtDate(s.coverage.start)} to ${fmtDate(s.coverage.end)}` : "";
  return card(
    "Found on Google",
    `Families find Kidrove through Google Search. Google data${coverage}.`,
    `<div class="stats">${stats}</div>` + sub("Visits from Google per day", trend) + sub("Popular searches that lead to Kidrove", queries),
  );
}

function popularCard(r: TrustReport): string {
  const ev = r.sections.events;
  const bl = r.sections.blogs;
  const events = ev?.top.length
    ? sub(
        "Most viewed experiences",
        `<table><thead><tr><th>Experience</th><th>City / category</th><th class="num">Views</th></tr></thead><tbody>${ev.top
          .map(
            (e) =>
              `<tr><td class="wrap">${escHtml(truncate(e.title, 90))}</td><td>${escHtml(truncate(e.place, 28)) || "—"}</td><td class="num">${fmtInt(e.views)}</td></tr>`,
          )
          .join("")}</tbody></table>`,
        "Views are all-time page views of each experience.",
      )
    : "";
  const blogs = bl?.top.length
    ? sub(
        "Most viewed articles",
        `<table><thead><tr><th>Article</th><th>Category</th><th class="num">Views</th></tr></thead><tbody>${bl.top
          .map((b) => `<tr><td class="wrap">${escHtml(truncate(b.title, 90))}</td><td>${escHtml(truncate(b.category, 28)) || "—"}</td><td class="num">${fmtInt(b.views)}</td></tr>`)
          .join("")}</tbody></table>`,
        `${fmtInt(bl.totalViews)} article views in total, all-time.`,
      )
    : "";
  const intro = ev
    ? `${fmtInt(ev.publishedEvents)} live experiences on Kidrove right now. These attract the most attention.`
    : "The experiences and articles that attract the most attention.";
  return card("Popular Experiences", intro, events + blogs);
}

// ─── Document ────────────────────────────────────────────────────────────────

export function buildTrustReportHtml(r: TrustReport): string {
  const scope = scopeLabel(r.period.days);
  const kpis = r.kpis
    .slice(0, 6)
    .map(
      (k) => `<div class="kpi">
  <div class="kpi-scope">${escHtml(k.scope)}</div>
  <div class="kpi-value">${escHtml(compactNumber(k.value))}</div>
  <div class="kpi-label">${escHtml(k.label)}</div>
  <div class="kpi-sub">${escHtml(k.subtitle)}</div>
  ${k.changePct !== undefined ? `<div class="kpi-growth">▲ ${k.changePct}% vs previous ${escHtml(scope.replace(/^Last /, ""))}</div>` : ""}
</div>`,
    )
    .join("");

  const freshness: string[] = [];
  if (r.sections.search?.coverage) freshness.push(`Google Search data through ${fmtDate(r.sections.search.coverage.end)}.`);
  if (r.sections.engagement) {
    const capped = r.sections.engagement.coverage.start > r.period.start && r.period.days > PAGEVIEW_RETENTION_DAYS;
    freshness.push(
      `Website visitor data covers ${fmtDate(r.sections.engagement.coverage.start)} – ${fmtDate(lastDay(r.sections.engagement.coverage.end))}${capped ? ` (we keep visitor data for ${PAGEVIEW_RETENTION_DAYS} days)` : ""}.`,
    );
  }

  const sections = [communityCard(r), agesCard(r), locationsCard(r), engagementCard(r), searchCard(r), popularCard(r)]
    .filter(Boolean)
    .join("\n");

  // Only define the figures that actually appear in this report.
  const { community, engagement, events, blogs, search } = r.sections;
  const definitions = [
    community && "Registered members: family (customer and parent) accounts on Kidrove, all-time; staff, partner and unverified accounts are not counted. New members: accounts created during the reporting period.",
    engagement && "Page views and visitor sessions: pages opened on our website, automated bots excluded.",
    (events || blogs) && "Experience and article views: all-time page views counted on each page.",
    search && "Google figures: reported by Google Search Console for our sites; average position is weighted by appearances.",
  ].filter((d): d is string => !!d);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Kidrove Platform Highlights</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${FONT}; font-size: 10.5px; color: ${C.ink}; background: ${C.surface}; line-height: 1.45; font-variant-numeric: tabular-nums; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .cover { page-break-after: always; break-after: page; }
  .hero { background: linear-gradient(135deg, ${C.brand} 0%, #f8962b 100%); color: #fff; border-radius: 14px; padding: 34px 30px 28px; }
  .wordmark { font-size: 15px; font-weight: 800; letter-spacing: .5px; opacity: .95; }
  .hero h1 { font-size: 30px; font-weight: 800; margin: 18px 0 6px; line-height: 1.15; }
  .hero .period { font-size: 12px; opacity: .95; }
  .hero .generated { font-size: 9.5px; opacity: .85; margin-top: 4px; }
  .lede { font-size: 12px; color: ${C.ink2}; margin: 18px 2px 16px; max-width: 620px; }
  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .kpi { background: ${C.panel}; border-radius: 10px; padding: 14px 14px 12px; break-inside: avoid; }
  .kpi-scope { display: inline-block; font-size: 8.5px; font-weight: 600; color: ${C.ink2}; background: #fff; border: 1px solid ${C.grid}; border-radius: 99px; padding: 1px 8px; }
  .kpi-value { font-size: 28px; font-weight: 800; color: ${C.ink}; margin-top: 8px; line-height: 1.1; }
  .kpi-label { font-size: 11px; font-weight: 700; margin-top: 4px; }
  .kpi-sub { font-size: 9px; color: ${C.ink2}; margin-top: 2px; }
  .kpi-growth { font-size: 9.5px; font-weight: 700; color: ${C.good}; margin-top: 6px; }
  .freshness { margin-top: 16px; font-size: 9px; color: ${C.ink2}; }
  .freshness li { margin-left: 14px; }
  .card { border: 1px solid ${C.grid}; border-radius: 12px; padding: 16px 18px; margin-bottom: 14px; break-inside: avoid; page-break-inside: avoid; }
  .card h2 { font-size: 15px; font-weight: 800; color: ${C.ink}; break-after: avoid; }
  .card h2::before { content: ""; display: inline-block; width: 4px; height: 13px; background: ${C.brand}; border-radius: 2px; margin-right: 8px; vertical-align: -1px; }
  .intro { color: ${C.ink2}; margin: 3px 0 10px; font-size: 10.5px; }
  .sub { margin-top: 10px; break-inside: avoid; }
  .sub h3 { font-size: 10.5px; font-weight: 700; color: ${C.ink}; margin-bottom: 4px; break-after: avoid; }
  .note { font-size: 8.5px; color: ${C.muted}; margin-top: 3px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .stats { display: flex; gap: 10px; flex-wrap: wrap; }
  .stat { flex: 1 1 140px; background: ${C.panel}; border-radius: 8px; padding: 9px 12px; }
  .stat-value { font-size: 18px; font-weight: 800; }
  .stat-label { font-size: 9px; color: ${C.ink2}; }
  .chart { display: block; overflow: visible; }
  .donut-wrap { display: flex; align-items: center; gap: 22px; }
  .legend-row { display: flex; align-items: center; gap: 8px; font-size: 10px; margin: 3px 0; }
  .swatch { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
  .legend-label { min-width: 70px; }
  .legend-value { font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-top: 2px; table-layout: fixed; }
  th { text-align: left; font-weight: 700; color: ${C.ink2}; border-bottom: 1.5px solid ${C.grid}; padding: 5px 6px; }
  td { padding: 5px 6px; border-bottom: 1px solid ${C.grid}; overflow-wrap: anywhere; vertical-align: top; }
  th:first-child, td:first-child { width: 42%; }
  .num { text-align: right; }
  .closing { break-inside: avoid; page-break-inside: avoid; background: ${C.panel}; border-radius: 14px; padding: 24px 26px; margin-top: 6px; }
  .closing h2 { font-size: 18px; font-weight: 800; }
  .closing p { font-size: 11px; color: ${C.ink2}; margin-top: 6px; max-width: 600px; }
  .cta { display: inline-block; margin-top: 14px; background: ${C.brand}; color: #fff; font-weight: 800; font-size: 12px; padding: 9px 18px; border-radius: 99px; text-decoration: none; }
  .about { margin-top: 18px; padding-top: 12px; border-top: 1px solid ${C.grid}; font-size: 8.5px; color: ${C.muted}; break-inside: avoid; }
  .about h3 { font-size: 9.5px; color: ${C.ink2}; margin-bottom: 3px; }
  .about li { margin-left: 14px; }
</style>
</head>
<body>

<div class="cover">
  <div class="hero">
    <div class="wordmark">KIDROVE</div>
    <h1>Platform Highlights</h1>
    <div class="period">${escHtml(scope)} · ${escHtml(fmtDate(r.period.start))} – ${escHtml(fmtDate(lastDay(r.period.end)))}</div>
    <div class="generated">Generated ${escHtml(fmtDate(r.generatedAt))}</div>
  </div>
  <p class="lede">A snapshot of the families, experiences and search visibility on Kidrove. Each figure is labelled with the period it covers. "Lifetime" means since launch.</p>
  ${kpis ? `<div class="kpis">${kpis}</div>` : ""}
  ${freshness.length ? `<ul class="freshness">${freshness.map((f) => `<li>${escHtml(f)}</li>`).join("")}</ul>` : ""}
</div>

${sections}

<div class="closing">
  <h2>Join the Kidrove community</h2>
  <p>Kidrove helps families discover and book trusted classes, camps, workshops and events for children, all in one place. Create your free account to save favourites, book in a few taps and hear about new experiences first.</p>
  <a class="cta" href="https://kidrove.com">Register free at kidrove.com</a>
  ${definitions.length ? `<div class="about">
    <h3>About these numbers</h3>
    <ul>${definitions.map((d) => `<li>${escHtml(d)}</li>`).join("")}</ul>
  </div>` : ""}
</div>

</body>
</html>`;
}
