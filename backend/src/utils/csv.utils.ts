/**
 * CSV Export Utilities
 *
 * Generates properly escaped CSV with UTF-8 BOM for Excel compatibility.
 * Handles quotes, commas, newlines, and one level of nested objects.
 */

/** UTF-8 BOM — signals encoding so Excel opens without mojibake */
const BOM = "﻿";

/**
 * Neutralise CSV formula injection.
 * Cells starting with = + - @ TAB or CR are prefixed with a single quote so
 * Excel / LibreOffice Calc do not evaluate them as formulae.
 */
function sanitizeFormulaInjection(str: string): string {
  if (str.length > 0 && /^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Escape a single CSV field.
 * Applies formula-injection sanitisation, then wraps in double-quotes when
 * the value contains comma, quote, CR, or LF.
 */
function escapeField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = value instanceof Date ? value.toISOString() : String(value);
  const str = sanitizeFormulaInjection(raw);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Flatten a plain object one level deep for CSV serialization.
 * Arrays become a JSON string inside a single cell (avoids column explosion).
 *
 * @example
 * flattenObject({ revenue: { total: 100, orders: 5 } })
 * // → { revenue_total: 100, revenue_orders: 5 }
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}_${key}` : key;
    if (
      val !== null &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      !(val instanceof Date)
    ) {
      Object.assign(flat, flattenObject(val as Record<string, unknown>, fullKey));
    } else if (Array.isArray(val)) {
      flat[fullKey] = JSON.stringify(val); // arrays → JSON string in cell
    } else {
      flat[fullKey] = val;
    }
  }
  return flat;
}

/**
 * Convert an array of objects to a CSV string with UTF-8 BOM.
 * Auto-flattens one level of object nesting.
 *
 * @param rows - Array of plain objects to serialize
 * @returns CSV string (BOM + header row + data rows, CRLF line endings)
 */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return BOM;

  const flat = rows.map((r) => flattenObject(r));

  // Union of all keys across all rows (handles sparse rows safely)
  const headers = Array.from(new Set(flat.flatMap((r) => Object.keys(r))));

  const lines = [
    headers.map(escapeField).join(","),
    ...flat.map((row) => headers.map((h) => escapeField(row[h])).join(",")),
  ];

  return BOM + lines.join("\r\n");
}

/**
 * Extract exportable row array from an analytics service result.
 *
 * Analytics methods return a single object with typed fields (some arrays).
 * This picks the most useful array property for tabular export, or wraps
 * the whole object as a single summary row.
 *
 * Priority:
 * 1. Named arrays that are useful as row sets (revenueByEvent, ordersByMonth, etc.)
 * 2. First array property with object elements
 * 3. Whole object as a single row (summary)
 */
const PREFERRED_ARRAY_KEYS = [
  "revenueByEvent",
  "ordersByMonth",
  "ordersByDay",
  "ordersByStatus",
  "ticketsByType",
  "scansByHour",
  "usersByMonth",
  "usersByRole",
  "topCountries",
  "topCategories",
  "topLocations",
  "venuesByCity",
  "venuesByType",
  "eventsByMonth",
];

export function analyticsToRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (!data || typeof data !== "object") return [];

  const obj = data as Record<string, unknown>;

  // Check preferred keys first
  for (const key of PREFERRED_ARRAY_KEYS) {
    const val = obj[key];
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
      return val as Record<string, unknown>[];
    }
  }

  // Fall back to first array with object elements
  for (const val of Object.values(obj)) {
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
      return val as Record<string, unknown>[];
    }
  }

  // Last resort: summary row
  return [obj];
}

/**
 * Build a dated export filename.
 * e.g. "orders-analytics-2026-06-01-to-2026-06-29"
 */
export function buildExportFilename(
  type: string,
  startDate?: string,
  endDate?: string,
): string {
  const today = new Date().toISOString().split("T")[0];
  if (startDate && endDate) {
    return `${type}-analytics-${startDate}-to-${endDate}`;
  }
  return `${type}-analytics-${today}`;
}

/**
 * Build a safe, filesystem-friendly filename from arbitrary parts.
 * Lowercases, replaces non-word chars with dashes, collapses runs, trims edges.
 *
 * @example
 * safeReportFilename("Event Report", "Scratch Workshop!", "2026-06-29")
 * // → "event-report-scratch-workshop-2026-06-29"
 */
export function safeReportFilename(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^\w-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}
