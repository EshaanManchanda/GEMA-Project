/**
 * Rule-based natural-language → search-filter parser for the "AI Event
 * Finder". No LLM involved — regex/keyword extraction against a known
 * vocabulary (categories/cities pulled from the DB) mapped onto the exact
 * query params getEvents() already accepts. Deliberately conservative:
 * anything it can't confidently extract is left for the leftover `search`
 * text rather than guessed at.
 */

import { escapeRegex } from "./regexHelpers";

export interface ParsedEventFilters {
  category?: string;
  city?: string;
  venueType?: "Indoor" | "Outdoor" | "Online";
  minPrice?: number;
  maxPrice?: number;
  ageMin?: number;
  ageMax?: number;
  featured?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function endOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}
function addDays(d: Date, days: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
}

/**
 * Consumes a regex match out of the working text (so leftover words can
 * become the free-text `search` fallback) and returns the match, if any.
 */
function extract(
  text: { value: string },
  pattern: RegExp,
): RegExpMatchArray | null {
  const match = text.value.match(pattern);
  if (match) {
    text.value = text.value.replace(match[0], " ");
  }
  return match;
}

export function parseEventQuery(
  query: string,
  vocabulary: { categories: string[]; cities: string[] },
): ParsedEventFilters {
  const filters: ParsedEventFilters = {};
  const text = { value: ` ${query.toLowerCase()} ` };

  // --- venue type -----------------------------------------------------
  if (extract(text, /\bonline\b/i)) filters.venueType = "Online";
  else if (extract(text, /\boutdoor(s)?\b/i)) filters.venueType = "Outdoor";
  else if (extract(text, /\bindoor(s)?\b/i)) filters.venueType = "Indoor";

  // --- price ------------------------------------------------------------
  if (extract(text, /\bfree\b/i)) {
    filters.maxPrice = 0;
  } else {
    const between = extract(
      text,
      /between\s*\$?\s*(\d+)\s*(?:and|-|to)\s*\$?\s*(\d+)/i,
    );
    if (between) {
      filters.minPrice = Number(between[1]);
      filters.maxPrice = Number(between[2]);
    } else {
      const under = extract(text, /(?:under|below|less than)\s*\$?\s*(\d+)/i);
      if (under) filters.maxPrice = Number(under[1]);
      const over = extract(text, /(?:over|above|more than)\s*\$?\s*(\d+)/i);
      if (over) filters.minPrice = Number(over[1]);
    }
  }

  // --- age range ----------------------------------------------------------
  const ageRange = extract(
    text,
    /(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\s*(?:years?|yrs?|year[\s-]olds?)?/i,
  );
  if (ageRange) {
    filters.ageMin = Number(ageRange[1]);
    filters.ageMax = Number(ageRange[2]);
  } else {
    const singleAge = extract(
      text,
      /(?:age[sd]?|for)\s*(\d{1,2})\s*(?:years?|yrs?|year[\s-]olds?)/i,
    );
    if (singleAge) {
      filters.ageMin = Number(singleAge[1]);
      filters.ageMax = Number(singleAge[1]);
    }
  }

  // --- date -----------------------------------------------------------
  const now = new Date();
  if (extract(text, /\btomorrow\b/i)) {
    const t = addDays(now, 1);
    filters.dateFrom = startOfDay(t).toISOString();
    filters.dateTo = endOfDay(t).toISOString();
  } else if (extract(text, /\bthis\s*weekend\b/i)) {
    const day = now.getDay(); // 0=Sun..6=Sat
    const daysUntilSat = (6 - day + 7) % 7;
    const saturday = addDays(now, daysUntilSat);
    const sunday = addDays(saturday, 1);
    filters.dateFrom = startOfDay(saturday).toISOString();
    filters.dateTo = endOfDay(sunday).toISOString();
  } else if (extract(text, /\bnext\s*week\b/i)) {
    const day = now.getDay();
    const daysUntilNextMon = ((1 - day + 7) % 7) + 7;
    const monday = addDays(now, daysUntilNextMon);
    filters.dateFrom = startOfDay(monday).toISOString();
    filters.dateTo = endOfDay(addDays(monday, 6)).toISOString();
  } else if (extract(text, /\bthis\s*week\b/i)) {
    const day = now.getDay();
    const daysUntilSun = (7 - day) % 7;
    filters.dateFrom = startOfDay(now).toISOString();
    filters.dateTo = endOfDay(addDays(now, daysUntilSun)).toISOString();
  } else if (extract(text, /\btoday\b/i)) {
    filters.dateFrom = startOfDay(now).toISOString();
    filters.dateTo = endOfDay(now).toISOString();
  }

  // --- featured -----------------------------------------------------------
  if (extract(text, /\b(featured|popular|top|trending)\b/i)) {
    filters.featured = true;
  }

  // --- category / city (matched against real DB vocabulary) ---------------
  const lowerText = text.value.toLowerCase();
  const matchedCategory = vocabulary.categories.find((c) =>
    new RegExp(`\\b${escapeRegex(c.toLowerCase())}\\b`).test(lowerText),
  );
  if (matchedCategory) {
    filters.category = matchedCategory;
    text.value = text.value.replace(
      new RegExp(escapeRegex(matchedCategory), "i"),
      " ",
    );
  }
  const matchedCity = vocabulary.cities.find((c) =>
    new RegExp(`\\b${escapeRegex(c.toLowerCase())}\\b`).test(lowerText),
  );
  if (matchedCity) {
    filters.city = matchedCity;
    text.value = text.value.replace(
      new RegExp(escapeRegex(matchedCity), "i"),
      " ",
    );
  }

  // --- leftover free text -> search fallback -------------------------------
  const STOPWORDS = new Set([
    "a",
    "an",
    "the",
    "in",
    "at",
    "for",
    "with",
    "and",
    "or",
    "of",
    "to",
    "me",
    "find",
    "show",
    "search",
    "events",
    "event",
    "kids",
    "kid",
    "child",
    "children",
    "near",
    "around",
    "some",
    "any",
    "i",
    "want",
    "looking",
  ]);
  const leftover = text.value
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOPWORDS.has(w.toLowerCase()))
    .join(" ")
    .trim();
  if (leftover) filters.search = leftover;

  return filters;
}
