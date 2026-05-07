/**
 * timezoneUtils.ts
 *
 * Helpers for displaying HH:mm time strings with timezone context.
 *
 * Times in the GEMA platform are stored as naive HH:mm strings (e.g. "09:00")
 * alongside an IANA timezone field (e.g. "Asia/Dubai"). This module provides
 * helpers to format those strings with a timezone abbreviation for display.
 */

/** The 7 IANA timezones offered in event creation forms. */
export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Asia/Dubai',       label: 'UAE — Asia/Dubai (UTC+4)' },
  { value: 'Asia/Riyadh',      label: 'Saudi Arabia — Asia/Riyadh (UTC+3)' },
  { value: 'Asia/Kuwait',      label: 'Kuwait — Asia/Kuwait (UTC+3)' },
  { value: 'Asia/Kolkata',     label: 'India — Asia/Kolkata (UTC+5:30)' },
  { value: 'Europe/London',    label: 'UK — Europe/London (UTC+0/+1)' },
  { value: 'America/New_York', label: 'US East — America/New_York (UTC-5/-4)' },
  { value: 'UTC',              label: 'UTC' },
];

/**
 * Returns the short timezone abbreviation for the given IANA timezone using
 * the browser's Intl API. E.g. "Asia/Dubai" → "GST", "UTC" → "UTC".
 * Falls back to the IANA name on error.
 */
export const getTimezoneAbbr = (timezone: string): string => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    return parts.find(p => p.type === 'timeZoneName')?.value ?? timezone;
  } catch {
    return timezone;
  }
};

/**
 * Formats a naive HH:mm string to 12-hour human-readable time.
 * E.g. "09:00" → "9:00 AM"
 */
export const formatHHmm = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return time;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

/**
 * Formats a time range (HH:mm – HH:mm) with a timezone abbreviation suffix.
 * E.g. ("09:00", "11:00", "Asia/Dubai") → "9:00 AM – 11:00 AM · GST"
 *
 * If timezone is falsy or "UTC", the suffix is omitted for UTC to keep it clean,
 * but a non-UTC suffix is always shown.
 */
export const formatTimeRange = (
  startTime: string,
  endTime: string,
  timezone?: string,
): string => {
  const start = formatHHmm(startTime);
  const end   = formatHHmm(endTime);
  const range = `${start} – ${end}`;

  if (!timezone) return range;

  const abbr = getTimezoneAbbr(timezone);
  return `${range} · ${abbr}`;
};
