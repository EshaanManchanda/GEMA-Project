/**
 * scheduleUtils.ts
 *
 * Flattens the backend's multi-layer schedule structure
 * (dateSchedule[] → optional timeSlots[]) into a simple, flat
 * array of `Session` objects that the UI can render directly.
 *
 * Backend model:
 *   event.dateSchedule[]          ← one entry per date range
 *     .startDate / .endDate       ← the range
 *     .availableSeats / .price    ← defaults for every day in range
 *     .isOverride                 ← beats non-override schedules for same dates
 *     .unlimitedSeats             ← bypass capacity checks
 *     .timeSlots[]                ← optional per-day sessions
 *       .date                     ← scopes slot to one day (else applies to all days)
 *       .startTime / .endTime     ← HH:mm
 *       .availableSeats / .price  ← slot-level overrides
 *
 * UI model (what we expose):
 *   Session                        ← one bookable item
 *     .date / .displayDate
 *     .startTime? / .endTime?
 *     .price / .availableSeats / .isUnlimited
 *     .scheduleId / .timeSlotIndex?
 */

import { format, startOfDay, isAfter, isBefore, isEqual } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Session {
  /** Unique React key: `{scheduleId}-{YYYY-MM-DD}[-slot{i}]` */
  id: string;
  date: Date;
  /** E.g. "Mon, Jun 18" */
  displayDate: string;
  /** HH:mm, e.g. "09:00" */
  startTime?: string;
  /** HH:mm, e.g. "11:00" */
  endTime?: string;
  /** Effective price for this session (slot price ?? schedule price) */
  price: number;
  availableSeats: number;
  isUnlimited: boolean;
  /** Whether this came from an override schedule */
  isOverride: boolean;
  /** `dateSchedule[n]._id` — required by booking controller */
  scheduleId: string;
  /** Index inside `dateSchedule[n].timeSlots` — undefined for base-schedule sessions */
  timeSlotIndex?: number;
}

interface RawTimeSlot {
  date?: string | Date;
  startTime?: string;
  endTime?: string;
  availableSeats?: number;
  soldSeats?: number;
  price?: number;
}

interface RawSchedule {
  _id?: string;
  date?: string | Date;
  startDate?: string | Date;
  endDate?: string | Date;
  startTime?: string;
  endTime?: string;
  availableSeats: number;
  totalSeats?: number;
  soldSeats?: number;
  price: number;
  unlimitedSeats?: boolean;
  isOverride?: boolean;
  timeSlots?: RawTimeSlot[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format HH:mm → "9:00 AM" */
export const formatTime = (t: string): string => {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

/** Walk day-by-day between two dates (inclusive). Returns local-midnight Dates. */
const expandDateRange = (start: Date, end: Date): Date[] => {
  const days: Date[] = [];
  const cur = startOfDay(new Date(start));
  const fin = startOfDay(new Date(end));
  while (!isAfter(cur, fin)) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

/** Midnight of a Date (local). */
const dayOf = (d: Date | string): Date => startOfDay(new Date(d));

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * getAllSessions(dateSchedule)
 *
 * Converts the raw `event.dateSchedule` array into a flat, sorted list
 * of bookable `Session` objects ready for direct rendering.
 *
 * Rules applied:
 *  1. Expand each schedule's startDate→endDate into individual calendar days.
 *  2. For each day, if the schedule has timeSlots that match that day, emit
 *     one Session per available slot.  If no slots exist, emit one Session for
 *     the whole day using the schedule's base time/price/seats.
 *  3. Override schedules (`isOverride: true`) replace non-override sessions
 *     on the same day.
 *  4. Past days and fully-booked sessions (availableSeats === 0, !unlimited)
 *     are excluded by default (pass `includeUnavailable: true` to keep them).
 *  5. Result is sorted by date asc, then startTime asc.
 *
 * @param dateSchedule  Raw array from `event.dateSchedule`
 * @param opts.includeUnavailable  Keep sold-out sessions in the list (default false)
 * @param opts.includePast         Keep past sessions (default false)
 */
export function getAllSessions(
  dateSchedule: RawSchedule[],
  opts: { includeUnavailable?: boolean; includePast?: boolean } = {},
): Session[] {
  const { includeUnavailable = false, includePast = false } = opts;
  const today = startOfDay(new Date());

  if (!dateSchedule?.length) return [];

  /**
   * Build a day-keyed map: YYYY-MM-DD → Session[]
   * We'll apply override priority at the end.
   */
  const dayMap = new Map<string, { override: Session[]; base: Session[] }>();

  const ensureDay = (key: string) => {
    if (!dayMap.has(key)) dayMap.set(key, { override: [], base: [] });
    return dayMap.get(key)!;
  };

  for (const schedule of dateSchedule) {
    const scheduleId = schedule._id ?? '';
    const isOverride = Boolean(schedule.isOverride);
    const isUnlimited = Boolean(schedule.unlimitedSeats);

    // Determine the date range for this schedule
    const rangeStart = schedule.startDate
      ? dayOf(schedule.startDate)
      : schedule.date
      ? dayOf(schedule.date)
      : null;

    const rangeEnd = schedule.endDate
      ? dayOf(schedule.endDate)
      : rangeStart;    // single-day fallback

    if (!rangeStart) continue; // no usable date — skip

    const days = expandDateRange(rangeStart, rangeEnd!);

    for (const day of days) {
      // Skip past dates unless caller opts in
      if (!includePast && isBefore(day, today)) continue;

      const dateKey = format(day, 'yyyy-MM-dd');
      const bucket = ensureDay(dateKey);
      const displayDate = format(day, 'EEE, MMM d');

      // ── Slot-level sessions ──────────────────────────────────────────────
      const slotsForDay: RawTimeSlot[] = (schedule.timeSlots ?? []).filter(slot => {
        if (!slot.date) return true; // slot applies to every day in range
        return isEqual(dayOf(slot.date), day);
      });

      if (slotsForDay.length > 0) {
        slotsForDay.forEach((slot, slotIdx) => {
          const seats = slot.availableSeats ?? 0;
          const unlimited = isUnlimited; // slot inherits schedule unlimited flag

          const session: Session = {
            id: `${scheduleId}-${dateKey}-slot${slotIdx}`,
            date: new Date(day),
            displayDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            price: slot.price ?? schedule.price,
            availableSeats: seats,
            isUnlimited: unlimited,
            isOverride,
            scheduleId,
            timeSlotIndex: slotIdx,
          };

          if (!includeUnavailable && !unlimited && seats <= 0) return; // skip sold-out
          (isOverride ? bucket.override : bucket.base).push(session);
        });
        continue; // slots consumed this day — don't also add a base session
      }

      // ── Base-schedule session (no time slots for this day) ───────────────
      const seats = schedule.availableSeats;
      if (!includeUnavailable && !isUnlimited && seats <= 0) continue;

      const session: Session = {
        id: `${scheduleId}-${dateKey}`,
        date: new Date(day),
        displayDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        price: schedule.price,
        availableSeats: seats,
        isUnlimited,
        isOverride,
        scheduleId,
        timeSlotIndex: undefined,
      };

      (isOverride ? bucket.override : bucket.base).push(session);
    }
  }

  // ── Merge: override wins per day ─────────────────────────────────────────
  const sessions: Session[] = [];

  for (const [, { override, base }] of dayMap) {
    // If any override sessions exist for this day, suppress all base sessions
    sessions.push(...(override.length > 0 ? override : base));
  }

  // ── Sort: date asc, then startTime asc ───────────────────────────────────
  sessions.sort((a, b) => {
    const dateDiff = a.date.getTime() - b.date.getTime();
    if (dateDiff !== 0) return dateDiff;
    if (!a.startTime && !b.startTime) return 0;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return a.startTime.localeCompare(b.startTime);
  });

  return sessions;
}

// ─── Session → DateSchedule transform (for event creation) ───────────────────

export interface FlatSession {
  /** Client-side only ID */
  id: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  price: number;
  availableSeats: number;
  isUnlimited: boolean;
}

/**
 * Convert a flat list of FlatSession objects (used in the creation UI) back
 * into the backend dateSchedule[] format.
 *
 * Sessions on the same date are grouped as timeSlots under a single
 * dateSchedule entry. Sessions with unique dates become standalone entries.
 */
export function sessionsToDateSchedule(sessions: FlatSession[]): RawSchedule[] {
  if (!sessions || sessions.length === 0) return [];

  // Group sessions by date key (YYYY-MM-DD)
  const byDate = new Map<string, FlatSession[]>();
  for (const s of sessions) {
    const key = format(startOfDay(new Date(s.date)), 'yyyy-MM-dd');
    const group = byDate.get(key) || [];
    group.push(s);
    byDate.set(key, group);
  }

  const result: RawSchedule[] = [];

  for (const [, group] of byDate) {
    const first = group[0];
    const dateObj = startOfDay(new Date(first.date));

    if (group.length === 1 && !first.startTime) {
      // Single all-day session — simple dateSchedule entry
      result.push({
        startDate: dateObj,
        endDate: dateObj,
        availableSeats: first.isUnlimited ? 999999 : first.availableSeats,
        price: first.price,
        unlimitedSeats: first.isUnlimited,
      });
    } else {
      // Multiple sessions on same date → use timeSlots
      const timeSlots: RawTimeSlot[] = group.map((s) => ({
        date: dateObj,
        startTime: s.startTime,
        endTime: s.endTime,
        availableSeats: s.isUnlimited ? 999999 : s.availableSeats,
        price: s.price,
      }));

      // Base entry uses the first session's price/seats as default
      result.push({
        startDate: dateObj,
        endDate: dateObj,
        availableSeats: first.isUnlimited ? 999999 : first.availableSeats,
        price: first.price,
        unlimitedSeats: first.isUnlimited,
        timeSlots,
      });
    }
  }

  // Sort by startDate ascending
  return result.sort((a, b) => {
    const da = a.startDate ? new Date(a.startDate).getTime() : 0;
    const db = b.startDate ? new Date(b.startDate).getTime() : 0;
    return da - db;
  });
}
