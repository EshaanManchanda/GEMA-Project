/**
 * SessionPicker.tsx
 *
 * Two-step session selection:
 *   Step 1 — Date pills: user picks a date from available dates
 *   Step 2 — Session cards: shows only the slots for that date
 *
 * Rendering modes:
 *   "cards"  (default) — compact card grid
 *   "table"            — full-width table, best for events with many sessions
 */

import React, { useState, useMemo } from 'react';
import { startOfDay, isEqual } from 'date-fns';
import { getAllSessions, formatTime, Session } from '../../utils/scheduleUtils';
import { getTimezoneAbbr } from '../../utils/timezoneUtils';
import EventDatePicker from './EventDatePicker';

// ─── Props ────────────────────────────────────────────────────────────────────

interface RawSchedule {
  _id?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  availableSeats: number;
  totalSeats?: number;
  price: number;
  unlimitedSeats?: boolean;
  isOverride?: boolean;
  timeSlots?: Array<{
    date?: string;
    startTime?: string;
    endTime?: string;
    availableSeats?: number;
    price?: number;
  }>;
}

interface SessionPickerProps {
  dateSchedules: RawSchedule[];
  selectedSession: Session | null;
  /** Widened to accept null so date-switching can clear the parent's selection. */
  onSessionSelect: (session: Session | null) => void;
  currency?: string;
  /** IANA timezone name for the event (e.g. "Asia/Dubai"). Displays abbreviation next to times. */
  timezone?: string;
  /** Visual style — "cards" (default) or "table" */
  mode?: 'cards' | 'table';
  /** Show sold-out sessions as disabled rows (default false) */
  showSoldOut?: boolean;
  className?: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Seat availability badge */
const SeatsBadge: React.FC<{ session: Session }> = ({ session }) => {
  if (session.isUnlimited) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Unlimited
      </span>
    );
  }
  if (session.availableSeats <= 0) {
    return <span className="text-xs text-red-500 font-medium">Sold out</span>;
  }
  if (session.availableSeats <= 5) {
    return (
      <span className="text-xs text-amber-600 font-medium">
        ⚡ {session.availableSeats} left
      </span>
    );
  }
  return (
    <span className="text-xs text-gray-500">
      {session.availableSeats} seats
    </span>
  );
};

/** Time label — "9:00 AM – 11:00 AM · GST" or "All Day" */
const TimeLabel: React.FC<{ session: Session; timezone?: string; className?: string }> = ({ session, timezone, className = '' }) => {
  if (session.startTime && session.endTime) {
    const tzAbbr = timezone ? ` · ${getTimezoneAbbr(timezone)}` : '';
    return (
      <span className={className}>
        {formatTime(session.startTime)} – {formatTime(session.endTime)}{tzAbbr}
      </span>
    );
  }
  return <span className={`text-gray-400 ${className}`}>All Day</span>;
};


// ─── Table Mode ───────────────────────────────────────────────────────────────

const TableView: React.FC<{
  sessions: Session[];
  selectedSession: Session | null;
  onSelect: (s: Session) => void;
  currency: string;
  timezone?: string;
}> = ({ sessions, selectedSession, onSelect, currency, timezone }) => (
  <div className="overflow-x-auto rounded-xl border border-gray-200">
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Availability</th>
          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {sessions.map(session => {
          const isSelected = selectedSession?.id === session.id;
          const isSoldOut  = !session.isUnlimited && session.availableSeats <= 0;

          return (
            <tr
              key={session.id}
              onClick={() => !isSoldOut && onSelect(session)}
              className={[
                'transition-colors',
                isSelected  ? 'bg-primary-50'  : '',
                isSoldOut   ? 'opacity-50'      : 'hover:bg-gray-50 cursor-pointer',
              ].join(' ')}
            >
              <td className="px-4 py-3 text-gray-600">
                <TimeLabel session={session} timezone={timezone} />
              </td>
              <td className="px-4 py-3">
                <SeatsBadge session={session} />
              </td>
              <td className="px-4 py-3 text-right font-semibold text-gray-800">
                {session.price === 0 ? (
                  <span className="text-emerald-600">Free</span>
                ) : (
                  `${currency} ${session.price.toFixed(2)}`
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  disabled={isSoldOut}
                  onClick={e => { e.stopPropagation(); !isSoldOut && onSelect(session); }}
                  className={[
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-colors',
                    isSelected
                      ? 'bg-primary-600 text-white'
                      : isSoldOut
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-primary-100 text-primary-700 hover:bg-primary-200',
                  ].join(' ')}
                >
                  {isSelected ? 'Selected' : isSoldOut ? 'Full' : 'Select'}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const SessionPicker: React.FC<SessionPickerProps> = ({
  dateSchedules,
  selectedSession,
  onSessionSelect,
  currency = 'AED',
  timezone,
  mode = 'cards',
  showSoldOut = false,
  className = '',
}) => {
  // ── Step 1 state: which date has the user drilled into ─────────────────────
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Flatten all schedules into sorted sessions
  const sessions = useMemo(
    () => getAllSessions(dateSchedules, { includeUnavailable: showSoldOut }),
    [dateSchedules, showSoldOut],
  );

  // Sessions visible in step 2 — only for the chosen date
  const sessionsForDate = useMemo(() => {
    if (!selectedDate) return [];
    const target = startOfDay(selectedDate);
    return sessions.filter(s => isEqual(startOfDay(s.date), target));
  }, [selectedDate, sessions]);

  // ── Empty states ────────────────────────────────────────────────────────────
  if (!dateSchedules?.length) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-700">
        No schedules have been configured for this event yet.
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-700">
        No sessions are currently available for booking.
      </div>
    );
  }

  return (
    <div className={`session-picker ${className}`}>
      {/* ── Step 1: Calendar date picker ────────────────────────────────────── */}
      <EventDatePicker
        dateSchedules={dateSchedules as any[]}
        selectedDate={selectedDate}
        onDateSelect={date => {
          setSelectedDate(date);
          onSessionSelect(null); // clear parent selection when switching dates
        }}
        showTimeSlotPicker={false}
        showDateSummary={false}
        className="mb-4"
      />

      {/* ── Step 2: Sessions for the chosen date ────────────────────────────── */}
      {selectedDate && (
        mode === 'table' ? (
          <TableView
            sessions={sessionsForDate}
            selectedSession={selectedSession}
            onSelect={onSessionSelect}
            currency={currency}
            timezone={timezone}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sessionsForDate.map(session => {
              const isSelected = selectedSession?.id === session.id;
              const isSoldOut  = !session.isUnlimited && session.availableSeats <= 0;

              return (
                <button
                  key={session.id}
                  type="button"
                  disabled={isSoldOut}
                  onClick={() => onSessionSelect(session)}
                  className={[
                    'flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all duration-150',
                    isSelected
                      ? 'bg-primary-600 border-primary-600 text-white shadow-md ring-2 ring-primary-300'
                      : isSoldOut
                      ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed opacity-60'
                      : 'bg-white border-gray-200 hover:border-primary-400 hover:bg-primary-50 hover:shadow-sm cursor-pointer',
                  ].join(' ')}
                >
                  <div className="space-y-0.5">
                    <TimeLabel
                      session={session}
                      timezone={timezone}
                      className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-800'}`}
                    />
                    <div className={isSelected ? 'text-primary-100' : ''}>
                      <SeatsBadge session={session} />
                    </div>
                  </div>
                  <div className={`text-right ml-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                    {session.price === 0 ? (
                      <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-emerald-600'}`}>
                        Free
                      </span>
                    ) : (
                      <span className="text-sm font-bold">
                        {currency} {session.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )
      )}

      {/* Prompt when no date selected yet */}
      {!selectedDate && (
        <p className="text-sm text-gray-400 mt-1 text-center">
          Select a highlighted date on the calendar to see available sessions.
        </p>
      )}

      {/* Selection confirmation — only shown when session belongs to the current date view */}
      {selectedSession && selectedDate && sessionsForDate.some(s => s.id === selectedSession.id) && (
        <div className="mt-3 px-4 py-3 bg-primary-50 border border-primary-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-primary-900">
              ✅ {selectedSession.displayDate}
            </span>
            {(selectedSession.startTime || selectedSession.endTime) && (
              <span className="text-sm text-primary-700 ml-2">
                · <TimeLabel session={selectedSession} timezone={timezone} />
              </span>
            )}
          </div>
          <span className={`text-sm font-bold ${selectedSession.price === 0 ? 'text-emerald-600' : 'text-primary-700'}`}>
            {selectedSession.price === 0 ? 'Free' : `${currency} ${selectedSession.price.toFixed(2)}`}
          </span>
        </div>
      )}
    </div>
  );
};

export default SessionPicker;
