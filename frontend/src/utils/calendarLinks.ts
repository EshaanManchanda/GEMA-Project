/** Combines a calendar day with an "HH:mm" wall-clock time into one local Date. */
export function combineDateAndTime(date: Date, time?: string): Date {
  const combined = new Date(date);
  if (!time) return combined;
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isNaN(hours)) combined.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
  return combined;
}

export interface CalendarEventInput {
  title: string;
  description?: string;
  location?: string;
  /** Wall-clock start, as displayed to the visitor (no timezone conversion is applied). */
  start: Date;
  /** Defaults to start + 2 hours when omitted. */
  end?: Date;
  /** When true, only the date portion of start/end is used (Google/Outlook render it as a full-day block). */
  allDay?: boolean;
}

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

function resolveEnd(input: CalendarEventInput): Date {
  return input.end ?? new Date(input.start.getTime() + DEFAULT_DURATION_MS);
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

// UTC "floating" stamp built from the Date's own local getters, so the
// calendar shows the same wall-clock time the visitor already saw on-screen
// (the Date was itself constructed naively from local display strings).
function toUtcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function toDateStamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function formatDates(input: CalendarEventInput): { start: string; end: string } {
  const end = resolveEnd(input);
  if (input.allDay) {
    return { start: toDateStamp(input.start), end: toDateStamp(end) };
  }
  return { start: toUtcStamp(input.start), end: toUtcStamp(end) };
}

export function buildGoogleCalendarUrl(input: CalendarEventInput): string {
  const { start, end } = formatDates(input);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${start}/${end}`,
    details: input.description || '',
    location: input.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl(input: CalendarEventInput): string {
  const end = resolveEnd(input);
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: input.title,
    body: input.description || '',
    location: input.location || '',
    startdt: input.start.toISOString(),
    enddt: end.toISOString(),
    allday: input.allDay ? 'true' : 'false',
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function escapeIcsText(text: string): string {
  return text.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
}

export function buildIcsContent(input: CalendarEventInput): string {
  const { start, end } = formatDates(input);
  const dtStartLine = input.allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`;
  const dtEndLine = input.allDay ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GEMA//EventCalendar//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@gema`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    dtStartLine,
    dtEndLine,
    `SUMMARY:${escapeIcsText(input.title)}`,
    input.description ? `DESCRIPTION:${escapeIcsText(input.description)}` : '',
    input.location ? `LOCATION:${escapeIcsText(input.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
}

export function downloadIcsFile(input: CalendarEventInput, filename = 'event.ics'): void {
  const blob = new Blob([buildIcsContent(input)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
