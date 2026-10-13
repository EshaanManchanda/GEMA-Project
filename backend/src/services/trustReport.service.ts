/**
 * Platform Highlights ("trust") report — customer-facing aggregation layer.
 *
 * Aggregation only; presentation lives in reportTemplate.service.ts
 * (buildTrustReportHtml). No money figures ever leave this module.
 *
 * ─── Metric dictionary (every number in the PDF comes from exactly one row) ──
 * | Metric                       | Source                                         | Scope                         |
 * |------------------------------|------------------------------------------------|-------------------------------|
 * | Registered members           | User role customer/parent, active or inactive  | Lifetime                      |
 * | New registrations (+ change) | User.createdAt ∈ [start,end) vs previous equal | Selected period               |
 * | Community growth             | users before start + running sum of createdAt  | Selected period, per bucket   |
 * | Registration activity        | new users per day (30d) / week (90d) / month   | Selected period               |
 * | Adult age groups             | User.dateOfBirth, exact age 18–100             | Members with a recorded DOB   |
 * | Kids age groups              | Student.dateOfBirth, exact age 3–17            | Children with a recorded DOB  |
 * | Community locations          | User.addresses[0].country / .city, 1 per user  | Lifetime                      |
 * | Visitors, page views, devices| PageView (bots excluded)                       | Period ∩ 90-day TTL window    |
 * | Event page opens             | AnalyticsEvent type=eventViewed                | Same window as visitor data   |
 * | Published events             | Event published + approved + not deleted       | Current total                 |
 * | Popular events               | Event.viewsCount (no per-event sales figures)  | Lifetime                      |
 * | Popular blogs / blog views   | Blog.viewCount (published)                     | Lifetime ("views", not reads) |
 * | Search clicks / impressions  | Google Search Console, deduplicated sites      | GSC data coverage dates       |
 * | Avg. search position         | Σ(position × impressions) / Σ impressions      | Shown only when ≤ 10          |
 */

import { PipelineStage } from "mongoose";
import User, { UserRole, UserStatus } from "../models/User";
import Student from "../models/Student";
import Event from "../models/Event";
import { Blog } from "../models/Blog";
import PageView from "../models/PageView";
import AnalyticsEvent from "../models/AnalyticsEvent";
import * as gsc from "./searchConsole.service";
import logger from "../config/logger";

// ─── Contract ────────────────────────────────────────────────────────────────

export type HighlightsRange = "30d" | "90d" | "1y";
export const HIGHLIGHTS_RANGES: readonly HighlightsRange[] = ["30d", "90d", "1y"];
/** Whole buckets per range: 30 days, 13 weeks, 12 months. */
const RANGE_BUCKETS: Record<HighlightsRange, number> = { "30d": 30, "90d": 13, "1y": 12 };

export const HIGHLIGHTS_CACHE_PREFIX = "report:platform-highlights:";

/** PageView documents expire after 90 days (models/PageView.ts TTL index). */
export const PAGEVIEW_RETENTION_DAYS = 90;
/** Minimum group size before a demographic / location group is shown on its own. */
export const PRIVACY_MIN_COUNT = 10;

export type BucketUnit = "day" | "week" | "month";
export type SectionName =
  | "community"
  | "ages"
  | "locations"
  | "engagement"
  | "search"
  | "events"
  | "blogs";
export type SectionState = "ok" | "empty" | "insufficient" | "failed" | "not_configured";

export interface DateSpan {
  start: Date;
  end: Date;
}
export interface ReportPeriod extends DateSpan {
  days: number;
}
export interface SeriesPoint {
  key: string; // YYYY-MM-DD (bucket start, UTC)
  value: number;
}
export interface RankRow {
  label: string;
  count: number;
  pct: number;
}
export interface AgeBin {
  label: string;
  pct: number;
}
export interface AgeDistribution {
  bins: AgeBin[];
  basedOn: number; // rounded DOWN to a multiple of 10 — shown as "N+"
}

export interface TrustKpi {
  id: string;
  label: string;
  subtitle: string;
  value: number;
  scope: string;
  changePct?: number;
}

export interface SectionStatus {
  section: SectionName;
  status: SectionState;
  note?: string;
}

export interface CommunitySection {
  totalUsers: number;
  newUsers: number;
  previousNewUsers: number;
  unit: BucketUnit;
  cumulative: SeriesPoint[];
  activity: SeriesPoint[];
}
export interface AgesSection {
  adults?: AgeDistribution;
  kids?: AgeDistribution;
}
export interface LocationsSection {
  communityCountries?: RankRow[];
  communityCities?: RankRow[];
  visitorCountries?: RankRow[];
}
export interface EngagementSection {
  coverage: DateSpan;
  pageViews: number;
  uniqueVisitors: number;
  eventPageOpens: number;
  devices: RankRow[];
  daily: SeriesPoint[];
}
export interface SearchSection {
  sites: string[];
  coverage: DateSpan | null;
  clicks: number;
  impressions: number;
  avgPosition?: number;
  trend: { key: string; clicks: number; impressions: number }[];
  topQueries: { query: string; clicks: number; impressions: number }[];
}
export interface EventsSection {
  publishedEvents: number;
  // Views only: per-event ticket counts would expose a named vendor's sales.
  top: { title: string; place: string; views: number }[];
}
export interface BlogsSection {
  totalViews: number;
  top: { title: string; category: string; views: number }[];
}

export interface TrustReport {
  generatedAt: string;
  range: HighlightsRange;
  period: ReportPeriod;
  previousPeriod: ReportPeriod;
  kpis: TrustKpi[];
  sections: {
    community?: CommunitySection;
    ages?: AgesSection;
    locations?: LocationsSection;
    engagement?: EngagementSection;
    search?: SearchSection;
    events?: EventsSection;
    blogs?: BlogsSection;
  };
  diagnostics: SectionStatus[];
}

interface SectionResult<T> {
  status: SectionState;
  data?: T;
  note?: string;
}

// ─── Dates ───────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

export function isHighlightsRange(v: unknown): v is HighlightsRange {
  return typeof v === "string" && (HIGHLIGHTS_RANGES as readonly string[]).includes(v);
}

export const bucketUnitFor = (range: HighlightsRange): BucketUnit =>
  range === "30d" ? "day" : range === "90d" ? "week" : "month";

function shiftUtc(d: Date, unit: BucketUnit, n: number): Date {
  const t = new Date(d.getTime());
  if (unit === "day") t.setUTCDate(t.getUTCDate() + n);
  else if (unit === "week") t.setUTCDate(t.getUTCDate() + 7 * n);
  else t.setUTCMonth(t.getUTCMonth() + n);
  return t;
}

/**
 * Single source of report dates: UTC, half-open [start, end). Both ends sit on
 * bucket boundaries (end = start of the current day/week/month), so every chart
 * bucket is complete — an in-progress month never reads as a drop.
 */
export function resolveReportPeriod(
  range: HighlightsRange,
  now: Date = new Date(),
): { current: ReportPeriod; previous: ReportPeriod } {
  const unit = bucketUnitFor(range);
  const n = RANGE_BUCKETS[range];
  const end = truncateUtc(now, unit);
  const start = shiftUtc(end, unit, -n);
  const prevStart = shiftUtc(start, unit, -n);
  const days = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY_MS);
  return {
    current: { start, end, days: days(start, end) },
    previous: { start: prevStart, end: new Date(start.getTime()), days: days(prevStart, start) },
  };
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Truncate to the UTC bucket start (weeks start Monday — matches $dateTrunc below). */
export function truncateUtc(d: Date, unit: BucketUnit): Date {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (unit === "week") t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  if (unit === "month") t.setUTCDate(1);
  return t;
}

/** Every bucket key in [start, end), so empty buckets show as real zeros. */
export function bucketKeys(span: DateSpan, unit: BucketUnit): string[] {
  const keys: string[] = [];
  for (let cur = truncateUtc(span.start, unit); cur < span.end; cur = shiftUtc(cur, unit, 1)) {
    keys.push(isoDay(cur));
  }
  return keys;
}

const bucketExpr = (field: string, unit: BucketUnit) => ({
  $dateToString: {
    format: "%Y-%m-%d",
    date: { $dateTrunc: { date: field, unit, startOfWeek: "monday", timezone: "UTC" } },
  },
});

function fillSeries(span: DateSpan, unit: BucketUnit, rows: { _id: string; n: number }[]) {
  const byKey = new Map(rows.map((r) => [r._id, r.n]));
  return bucketKeys(span, unit).map((key) => ({ key, value: byKey.get(key) ?? 0 }));
}

// ─── Pure helpers (exported for tests) ───────────────────────────────────────

/**
 * Growth % only when it is honest AND positive: both periods have data,
 * the baseline is > 0, and the change is > 0. Otherwise undefined (not shown).
 */
export function positiveGrowthPct(current: number, previous: number): number | undefined {
  if (!(previous > 0) || !(current > 0)) return undefined;
  const pct = ((current - previous) / previous) * 100;
  return pct > 0 ? Math.round(pct * 10) / 10 : undefined;
}

/** Percentages that always sum to exactly 100 (largest-remainder method). */
export function toPercentages(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total <= 0) return counts.map(() => 0);
  const raw = counts.map((c) => (c / total) * 100);
  const floored = raw.map(Math.floor);
  let rest = 100 - floored.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => {
      if (rest > 0) {
        floored[i]++;
        rest--;
      }
    });
  return floored;
}

export interface AgeBinDef {
  min: number;
  max: number; // inclusive; Infinity = open-ended
}
export const ADULT_BINS: AgeBinDef[] = [
  { min: 18, max: 24 },
  { min: 25, max: 34 },
  { min: 35, max: 44 },
  { min: 45, max: 54 },
  { min: 55, max: Infinity },
];
export const KID_BINS: AgeBinDef[] = [
  { min: 3, max: 5 },
  { min: 6, max: 8 },
  { min: 9, max: 12 },
  { min: 13, max: 17 },
];

const binLabel = (b: AgeBinDef) => (b.max === Infinity ? `${b.min}+` : `${b.min}–${b.max}`);

/**
 * Privacy suppression for age histograms. Any bin under `threshold` is merged
 * into its smaller adjacent neighbour until every bin meets the threshold.
 * Returns undefined (section "insufficient") when fewer than 2 bins survive.
 * Output is percentages only — no counts — so a merged bin can't be recovered
 * by subtracting from a total.
 */
export function suppressAgeBins(
  defs: AgeBinDef[],
  counts: number[],
  threshold = PRIVACY_MIN_COUNT,
): AgeDistribution | undefined {
  let bins = defs.map((d, i) => ({ ...d, count: counts[i] ?? 0 }));
  const total = bins.reduce((a, b) => a + b.count, 0);
  if (total < threshold * 2) return undefined;

  // Drop empty edge bins first so "0%" bars don't appear at the extremes.
  while (bins.length && bins[0].count === 0) bins.shift();
  while (bins.length && bins[bins.length - 1].count === 0) bins.pop();

  for (;;) {
    if (bins.length < 2) return undefined;
    let idx = -1;
    bins.forEach((b, i) => {
      if (b.count < threshold && (idx === -1 || b.count < bins[idx].count)) idx = i;
    });
    if (idx === -1) break;
    const left = idx > 0 ? idx - 1 : -1;
    const right = idx < bins.length - 1 ? idx + 1 : -1;
    const target =
      left === -1 ? right : right === -1 ? left : bins[left].count <= bins[right].count ? left : right;
    const [a, b] = target < idx ? [target, idx] : [idx, target];
    const merged = { min: bins[a].min, max: bins[b].max, count: bins[a].count + bins[b].count };
    bins = [...bins.slice(0, a), merged, ...bins.slice(b + 1)];
  }

  const pcts = toPercentages(bins.map((b) => b.count));
  return {
    bins: bins.map((b, i) => ({ label: binLabel(b), pct: pcts[i] })),
    basedOn: Math.floor(total / 10) * 10,
  };
}

// ponytail: small inline ISO map covering the markets we serve; unknown codes pass through as-is.
const COUNTRY_NAMES: Record<string, string> = {
  AE: "United Arab Emirates", UAE: "United Arab Emirates", IN: "India", SA: "Saudi Arabia",
  QA: "Qatar", OM: "Oman", KW: "Kuwait", BH: "Bahrain", GB: "United Kingdom", UK: "United Kingdom",
  US: "United States", USA: "United States", PK: "Pakistan", EG: "Egypt", JO: "Jordan",
  LB: "Lebanon", PH: "Philippines", CA: "Canada", AU: "Australia", DE: "Germany", FR: "France",
};

export function normalizeLocation(raw: unknown): string | null {
  const s = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!s || s.length > 60 || /^(n\/?a|none|null|unknown|-+)$/i.test(s)) return null;
  const iso = COUNTRY_NAMES[s.toUpperCase()];
  if (iso) return iso;
  return s
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/**
 * Normalise → merge duplicates → top N; groups under PRIVACY_MIN_COUNT and the
 * tail go to "Other". Returns undefined when no named group survives.
 */
export function rankLocations(
  rows: { label: unknown; count: number }[],
  top = 6,
  minCount = PRIVACY_MIN_COUNT,
): RankRow[] | undefined {
  const merged = new Map<string, number>();
  let other = 0;
  for (const r of rows) {
    const label = normalizeLocation(r.label);
    if (!label || !(r.count > 0)) continue;
    merged.set(label, (merged.get(label) ?? 0) + r.count);
  }
  const sorted = [...merged.entries()].sort((a, b) => b[1] - a[1]);
  const named: { label: string; count: number }[] = [];
  for (const [label, count] of sorted) {
    if (count >= minCount && named.length < top) named.push({ label, count });
    else other += count;
  }
  if (!named.length) return undefined;
  const all = other > 0 ? [...named, { label: "Other", count: other }] : named;
  const pcts = toPercentages(all.map((r) => r.count));
  return all.map((r, i) => ({ ...r, pct: pcts[i] }));
}

/**
 * Drop URL-prefix properties already covered by a configured sc-domain: property.
 * ponytail: overlapping sc-domain properties (kidrove.com + ae.kidrove.com) are NOT
 * merged and would double-count; configure only the apex domain property.
 */
export function dedupeSites(sites: string[]): string[] {
  const unique = [...new Set(sites.map((s) => s.trim()).filter(Boolean))];
  const domains = unique
    .filter((s) => s.startsWith("sc-domain:"))
    .map((s) => s.slice("sc-domain:".length).toLowerCase());
  return unique.filter((s) => {
    if (s.startsWith("sc-domain:")) return true;
    try {
      const host = new URL(s).hostname.toLowerCase();
      return !domains.some((d) => host === d || host.endsWith(`.${d}`));
    } catch {
      return true;
    }
  });
}

// ponytail: allowlist heuristic for customer-safe queries. EVERY word must be a
// brand/activity/place term or a filler word, so "priya teacher contact" or a
// child's name never reaches the PDF. Extend SAFE_QUERY_TERMS if good queries drop.
const SAFE_QUERY_TERMS =
  /^(kidrove|kids?|child(ren)?|family|families|toddlers?|teens?|class(es)?|camps?|events?|activit(y|ies)|workshops?|courses?|lessons?|things|birthday|party|parties|summer|winter|weekend|play|art|arts|crafts?|music|dance|swim\w*|sports?|football|coding|robotics|stem|science|tutor\w*|schools?|holidays?|dubai|abu|dhabi|sharjah|uae|india|tickets?|indoor|outdoor|fun|free|online)$/i;
const QUERY_FILLER = new Set(["a", "an", "the", "for", "in", "near", "me", "to", "do", "and", "of", "at", "with", "best", "top", "on", "&"]);

export function isSafeQuery(q: string, impressions: number, minImpressions = 20): boolean {
  if (impressions < minImpressions) return false;
  if (q.length > 80 || /@|\d{5,}|https?:|www\./i.test(q)) return false;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return (
    words.some((w) => SAFE_QUERY_TERMS.test(w)) &&
    words.every((w) => SAFE_QUERY_TERMS.test(w) || QUERY_FILLER.has(w))
  );
}

export function weightedPosition(rows: { position: number; impressions: number }[]): number | undefined {
  const impr = rows.reduce((a, r) => a + (r.impressions > 0 ? r.impressions : 0), 0);
  if (impr <= 0) return undefined;
  const sum = rows.reduce((a, r) => a + (r.impressions > 0 ? r.position * r.impressions : 0), 0);
  return Math.round((sum / impr) * 10) / 10;
}

// ─── Sections ────────────────────────────────────────────────────────────────

/** Exact age at `now`: year difference minus 1 if the birthday hasn't happened yet. */
const exactAgeExpr = (field: string, now: Date) => ({
  $subtract: [
    { $subtract: [{ $year: now }, { $year: field }] },
    {
      $cond: [
        {
          $or: [
            { $lt: [{ $month: now }, { $month: field }] },
            {
              $and: [
                { $eq: [{ $month: now }, { $month: field }] },
                { $lt: [{ $dayOfMonth: now }, { $dayOfMonth: field }] },
              ],
            },
          ],
        },
        1,
        0,
      ],
    },
  ],
});

// "Members" = families on the platform: customers and parents with a usable
// account. Staff, vendors, teachers and unverified sign-ups are not counted.
const COMMUNITY_USER = {
  role: { $in: [UserRole.CUSTOMER, UserRole.PARENT] },
  status: { $in: [UserStatus.ACTIVE, UserStatus.INACTIVE] },
};

async function communitySection(
  range: HighlightsRange,
  period: ReportPeriod,
  previous: ReportPeriod,
): Promise<SectionResult<CommunitySection>> {
  const unit = bucketUnitFor(range);
  const [totalUsers, before, newUsers, previousNewUsers, rows] = await Promise.all([
    User.countDocuments({ ...COMMUNITY_USER, createdAt: { $lt: period.end } }),
    User.countDocuments({ ...COMMUNITY_USER, createdAt: { $lt: period.start } }),
    User.countDocuments({ ...COMMUNITY_USER, createdAt: { $gte: period.start, $lt: period.end } }),
    User.countDocuments({ ...COMMUNITY_USER, createdAt: { $gte: previous.start, $lt: previous.end } }),
    User.aggregate<{ _id: string; n: number }>([
      { $match: { ...COMMUNITY_USER, createdAt: { $gte: period.start, $lt: period.end } } },
      { $project: { _id: 0, createdAt: 1 } },
      { $group: { _id: bucketExpr("$createdAt", unit), n: { $sum: 1 } } },
    ]),
  ]);
  if (totalUsers === 0) return { status: "empty" };

  const activity = fillSeries(period, unit, rows);
  let running = before;
  const cumulative = activity.map((p) => ({ key: p.key, value: (running += p.value) }));
  return {
    status: "ok",
    data: { totalUsers, newUsers, previousNewUsers, unit, cumulative, activity },
  };
}

async function ageCounts(
  model: typeof User | typeof Student,
  extraMatch: Record<string, unknown>,
  defs: AgeBinDef[],
  now: Date,
): Promise<number[]> {
  const lo = defs[0].min;
  const hi = defs[defs.length - 1].max === Infinity ? 100 : defs[defs.length - 1].max;
  const boundaries = [...defs.map((d) => d.min), hi + 1];
  const pipeline: PipelineStage[] = [
    { $match: { ...extraMatch, dateOfBirth: { $type: "date", $lte: now } } },
    { $project: { _id: 0, age: exactAgeExpr("$dateOfBirth", now) } },
    { $match: { age: { $gte: lo, $lte: hi } } },
    { $bucket: { groupBy: "$age", boundaries, output: { n: { $sum: 1 } } } },
  ];
  const rows = await (model as any).aggregate(pipeline);
  const byMin = new Map<number, number>(rows.map((r: { _id: number; n: number }) => [r._id, r.n]));
  return defs.map((d) => byMin.get(d.min) ?? 0);
}

async function agesSection(period: ReportPeriod): Promise<SectionResult<AgesSection>> {
  const [adultCounts, kidCounts] = await Promise.all([
    ageCounts(User, COMMUNITY_USER, ADULT_BINS, period.end),
    ageCounts(Student, { status: "active" }, KID_BINS, period.end),
  ]);
  const adults = suppressAgeBins(ADULT_BINS, adultCounts);
  const kids = suppressAgeBins(KID_BINS, kidCounts);
  if (!adults && !kids) {
    const any = [...adultCounts, ...kidCounts].some((n) => n > 0);
    return { status: any ? "insufficient" : "empty", note: "below privacy threshold" };
  }
  return { status: "ok", data: { adults, kids } };
}

/**
 * Visitor-data window, in whole UTC days: from the period start (or the oldest
 * full day PageView still retains — its TTL runs from now) up to today 00:00.
 * Visitor charts are daily, so they run to yesterday even when the period's
 * week/month boundary is earlier; the card prints these exact dates.
 */
export function visitorWindow(period: ReportPeriod, now: Date = period.end): DateSpan {
  const retained = new Date(truncateUtc(new Date(now.getTime() - PAGEVIEW_RETENTION_DAYS * DAY_MS), "day").getTime() + DAY_MS);
  return { start: period.start > retained ? period.start : retained, end: truncateUtc(now, "day") };
}

const HUMAN_VIEW = { device: { $ne: "bot" } };

async function locationsSection(period: ReportPeriod, now: Date): Promise<SectionResult<LocationsSection>> {
  const win = visitorWindow(period, now);
  const firstAddress = (f: string) => ({ $arrayElemAt: [`$addresses.${f}`, 0] });
  const [countries, cities, visitors] = await Promise.all([
    User.aggregate<{ _id: string; n: number }>([
      { $match: { ...COMMUNITY_USER, "addresses.0": { $exists: true } } },
      { $project: { _id: 0, v: firstAddress("country") } },
      { $group: { _id: "$v", n: { $sum: 1 } } },
    ]),
    User.aggregate<{ _id: string; n: number }>([
      { $match: { ...COMMUNITY_USER, "addresses.0": { $exists: true } } },
      { $project: { _id: 0, v: firstAddress("city") } },
      { $group: { _id: "$v", n: { $sum: 1 } } },
    ]),
    PageView.aggregate<{ _id: string; n: number }>([
      { $match: { ...HUMAN_VIEW, timestamp: { $gte: win.start, $lt: win.end }, country: { $ne: null } } },
      { $group: { _id: "$country", n: { $sum: 1 } } },
    ]),
  ]);
  const toRows = (rs: { _id: string; n: number }[]) => rs.map((r) => ({ label: r._id, count: r.n }));
  const data: LocationsSection = {
    communityCountries: rankLocations(toRows(countries)),
    communityCities: rankLocations(toRows(cities)),
    visitorCountries: rankLocations(toRows(visitors)),
  };
  if (!data.communityCountries && !data.communityCities && !data.visitorCountries) {
    const any = [...countries, ...cities, ...visitors].some((r) => r.n > 0);
    return { status: any ? "insufficient" : "empty" };
  }
  return { status: "ok", data };
}

async function engagementSection(period: ReportPeriod, now: Date): Promise<SectionResult<EngagementSection>> {
  const win = visitorWindow(period, now);
  const match = { ...HUMAN_VIEW, timestamp: { $gte: win.start, $lt: win.end } };
  const [pageViews, sessions, devices, daily, earliest, eventPageOpens] = await Promise.all([
    PageView.countDocuments(match),
    // One group per session, then $count — never a single unbounded array.
    PageView.aggregate<{ n: number }>([
      { $match: { ...match, sessionId: { $ne: null } } },
      { $group: { _id: "$sessionId" } },
      { $count: "n" },
    ]).allowDiskUse(true),
    PageView.aggregate<{ _id: string; n: number }>([
      { $match: match },
      { $group: { _id: "$device", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]),
    PageView.aggregate<{ _id: string; n: number }>([
      { $match: match },
      { $project: { _id: 0, timestamp: 1 } },
      { $group: { _id: bucketExpr("$timestamp", "day"), n: { $sum: 1 } } },
    ]),
    PageView.findOne(match).sort({ timestamp: 1 }).select("timestamp").lean(),
    // Same window as every other visitor figure in this card.
    AnalyticsEvent.countDocuments({
      type: "eventViewed",
      createdAt: { $gte: win.start, $lt: win.end },
    }),
  ]);
  if (pageViews === 0) return { status: "empty" };

  // Honest coverage: from the first retained record, not the nominal period start.
  const coverage: DateSpan = {
    start: earliest?.timestamp ? new Date(earliest.timestamp) : win.start,
    end: win.end,
  };
  const deviceRows = devices
    .filter((d) => d._id && d._id !== "unknown" && d.n > 0)
    .map((d) => ({ label: d._id.charAt(0).toUpperCase() + d._id.slice(1), count: d.n }));
  const pcts = toPercentages(deviceRows.map((d) => d.count));
  return {
    status: "ok",
    data: {
      coverage,
      pageViews,
      uniqueVisitors: sessions[0]?.n ?? 0,
      eventPageOpens,
      devices: deviceRows.map((d, i) => ({ ...d, pct: pcts[i] })),
      daily: fillSeries({ start: coverage.start, end: coverage.end }, "day", daily),
    },
  };
}

async function searchSection(period: ReportPeriod): Promise<SectionResult<SearchSection>> {
  if (!gsc.isSearchConsoleConfigured()) return { status: "not_configured" };
  const sites = dedupeSites(gsc.getConfiguredSites());
  const days = period.days;

  const perSite = await Promise.all(
    sites.map(async (site) => {
      const [summary, queries] = await Promise.all([
        gsc.getCachedSummary(site, days),
        gsc.getCachedQueries(site, days, 50),
      ]);
      return { summary: summary.data as any, queries: (queries.data as any[]) ?? [] };
    }),
  );

  const trendMap = new Map<string, { clicks: number; impressions: number }>();
  const queryMap = new Map<string, { clicks: number; impressions: number }>();
  const positions: { position: number; impressions: number }[] = [];
  let clicks = 0;
  let impressions = 0;

  for (const { summary, queries } of perSite) {
    const s = summary?.summary ?? {};
    clicks += Number(s.clicks) || 0;
    impressions += Number(s.impressions) || 0;
    positions.push({ position: Number(s.position) || 0, impressions: Number(s.impressions) || 0 });
    for (const row of summary?.trend ?? []) {
      const key = String(row.keys?.[0] ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      const cur = trendMap.get(key) ?? { clicks: 0, impressions: 0 };
      cur.clicks += Number(row.clicks) || 0;
      cur.impressions += Number(row.impressions) || 0;
      trendMap.set(key, cur);
    }
    for (const row of queries) {
      const q = String(row.keys?.[0] ?? "").trim().toLowerCase();
      if (!q) continue;
      const cur = queryMap.get(q) ?? { clicks: 0, impressions: 0 };
      cur.clicks += Number(row.clicks) || 0;
      cur.impressions += Number(row.impressions) || 0;
      queryMap.set(q, cur);
    }
  }

  if (clicks <= 0 && impressions <= 0) return { status: "empty" };

  const trend = [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ key, ...v }));
  const coverage = trend.length
    ? {
        start: new Date(`${trend[0].key}T00:00:00Z`),
        end: new Date(`${trend[trend.length - 1].key}T23:59:59Z`),
      }
    : null;
  const avg = weightedPosition(positions);
  const topQueries = [...queryMap.entries()]
    .filter(([q, v]) => isSafeQuery(q, v.impressions))
    .sort((a, b) => b[1].clicks - a[1].clicks || b[1].impressions - a[1].impressions)
    .slice(0, 5)
    .map(([query, v]) => ({ query, ...v }));

  return {
    status: "ok",
    data: {
      sites,
      coverage,
      clicks,
      impressions,
      avgPosition: avg !== undefined && avg > 0 && avg <= 10 ? avg : undefined,
      trend,
      topQueries,
    },
  };
}

const LIVE_EVENT = { status: "published", isApproved: true, isDeleted: { $ne: true } };

async function eventsSection(): Promise<SectionResult<EventsSection>> {
  const [publishedEvents, top] = await Promise.all([
    Event.countDocuments(LIVE_EVENT),
    Event.find({ ...LIVE_EVENT, viewsCount: { $gt: 0 } })
      .sort({ viewsCount: -1, _id: 1 })
      .limit(5)
      .select("title category location.city viewsCount")
      .lean<any[]>(),
  ]);
  if (publishedEvents === 0) return { status: "empty" };

  return {
    status: "ok",
    data: {
      publishedEvents,
      top: top.map((e) => ({
        title: String(e.title ?? ""),
        place: normalizeLocation(e.location?.city) ?? normalizeLocation(e.category) ?? "",
        views: e.viewsCount ?? 0,
      })),
    },
  };
}

async function blogsSection(): Promise<SectionResult<BlogsSection>> {
  const match = { status: "published" };
  const [total, top] = await Promise.all([
    Blog.aggregate<{ views: number }>([
      { $match: match },
      { $group: { _id: null, views: { $sum: "$viewCount" } } },
    ]),
    Blog.find({ ...match, viewCount: { $gt: 0 } })
      .sort({ viewCount: -1, _id: 1 })
      .limit(5)
      .select("title category viewCount")
      .populate("category", "name")
      .lean<any[]>(),
  ]);
  const totalViews = total[0]?.views ?? 0;
  if (totalViews <= 0 || !top.length) return { status: "empty" };
  return {
    status: "ok",
    data: {
      totalViews,
      top: top.map((b) => ({
        title: String(b.title ?? ""),
        category: String(b.category?.name ?? ""),
        views: b.viewCount ?? 0,
      })),
    },
  };
}

// ─── KPIs ────────────────────────────────────────────────────────────────────

export const scopeLabel = (days: number) =>
  days >= 365 ? "Last 12 months" : days > 31 && days % 7 === 0 ? `Last ${days / 7} weeks` : `Last ${days} days`;

const spanDays = (s: DateSpan, cap: number) =>
  Math.min(cap, Math.max(1, Math.round((s.end.getTime() - s.start.getTime()) / DAY_MS)));

/** Cover KPIs: a card is dropped when its value is ≤ 0 or its section is missing. */
export function buildKpis(report: Pick<TrustReport, "sections" | "period">): TrustKpi[] {
  const { community, search, engagement, events } = report.sections;
  const scope = scopeLabel(report.period.days);
  const kpis: (TrustKpi | null)[] = [
    community && {
      id: "registered_users",
      label: "Registered Members",
      subtitle: "Families who have joined Kidrove",
      value: community.totalUsers,
      scope: "Lifetime",
    },
    community && {
      id: "new_registrations",
      label: "New Members",
      subtitle: "Joined in this period",
      value: community.newUsers,
      scope,
      changePct: positiveGrowthPct(community.newUsers, community.previousNewUsers),
    },
    search && {
      id: "search_impressions",
      label: "Google Search Appearances",
      subtitle: "Times Kidrove appeared in Google results",
      value: search.impressions,
      scope: search.coverage ? `Google · ${spanDays(search.coverage, report.period.days)} days` : scope,
    },
    search && {
      id: "search_clicks",
      label: "Visits from Google",
      subtitle: "Clicks from Google Search",
      value: search.clicks,
      scope: search.coverage ? `Google · ${spanDays(search.coverage, report.period.days)} days` : scope,
    },
    engagement && {
      id: "page_views",
      label: "Page Views",
      subtitle: "Pages browsed by visitors",
      value: engagement.pageViews,
      scope: `Last ${spanDays(engagement.coverage, report.period.days)} days`,
    },
    events && {
      id: "published_events",
      label: "Live Experiences",
      subtitle: "Published events and activities",
      value: events.publishedEvents,
      scope: "Current",
    },
  ];
  return kpis.filter((k): k is TrustKpi => !!k && k.value > 0);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function buildTrustReport(
  range: HighlightsRange,
  now: Date = new Date(),
): Promise<TrustReport> {
  const { current, previous } = resolveReportPeriod(range, now);

  const runners: [SectionName, () => Promise<SectionResult<unknown>>][] = [
    ["community", () => communitySection(range, current, previous)],
    ["ages", () => agesSection(current)],
    ["locations", () => locationsSection(current, now)],
    ["engagement", () => engagementSection(current, now)],
    ["search", () => searchSection(current)],
    ["events", () => eventsSection()],
    ["blogs", () => blogsSection()],
  ];

  const settled = await Promise.allSettled(
    runners.map(async ([name, run]) => {
      const t0 = Date.now();
      try {
        return await run();
      } finally {
        logger.info(`[trustReport] section=${name} range=${range} ms=${Date.now() - t0}`);
      }
    }),
  );

  const sections: TrustReport["sections"] = {};
  const diagnostics: SectionStatus[] = settled.map((r, i) => {
    const section = runners[i][0];
    if (r.status === "rejected") {
      // Section name + message only — never documents or PII.
      logger.warn(`[trustReport] section=${section} failed: ${r.reason?.message ?? r.reason}`);
      return { section, status: "failed" };
    }
    if (r.value.status === "ok" && r.value.data) (sections as any)[section] = r.value.data;
    return { section, status: r.value.status, ...(r.value.note ? { note: r.value.note } : {}) };
  });

  const base = { period: current, sections };
  return {
    generatedAt: now.toISOString(),
    range,
    period: current,
    previousPeriod: previous,
    kpis: buildKpis(base),
    sections,
    diagnostics,
  };
}
