import React, { useMemo } from 'react';
// @ts-ignore — react-datepicker has no bundled type declarations
import DatePicker from 'react-datepicker';
import { format, isAfter, isBefore, isEqual, startOfDay } from 'date-fns';
import { getTimezoneAbbr } from '../../utils/timezoneUtils';

/** A single time slot within a date schedule (mirrors backend Event.ts schema). */
interface TimeSlot {
  _id?: string;
  /** The specific date this slot is for (ISO string). */
  date?: string;
  /** HH:mm format, e.g. "09:00" */
  startTime: string;
  /** HH:mm format, e.g. "11:00" */
  endTime: string;
  availableSeats: number;
  soldSeats?: number;
  /** Per-slot price override (falls back to schedule price if 0 / undefined). */
  price?: number;
}

interface DateSchedule {
  _id?: string;
  startDate: string;
  endDate: string;
  totalSeats?: number;
  availableSeats: number;
  soldSeats?: number;
  reservedSeats?: number;
  price: number;
  unlimitedSeats?: boolean;
  isOverride?: boolean;
  /** Optional time slots per date (from backend dateSchedule[].timeSlots). */
  timeSlots?: TimeSlot[];
}

interface EventDatePickerProps {
  dateSchedules: DateSchedule[];
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void;
  /** Called when the user picks a specific time slot; null = slot cleared. */
  onTimeSlotSelect?: (slot: TimeSlot | null) => void;
  /** Currently selected time slot (controlled). */
  selectedTimeSlot?: TimeSlot | null;
  /**
   * Set to false to hide the built-in time-slot picker grid.
   * Use this when the parent component (e.g. SessionPicker) owns slot selection.
   * Default: true.
   */
  showTimeSlotPicker?: boolean;
  /**
   * Set to false to hide the selected-date summary block (date, time, seats, price).
   * Use this when the parent (e.g. SessionPicker) renders its own session cards.
   * Default: true.
   */
  showDateSummary?: boolean;
  /** IANA timezone name (e.g. "Asia/Dubai"). Displays abbreviation next to times. */
  timezone?: string;
  className?: string;
  disabled?: boolean;
}

/** Format an HH:mm string to human-readable 12-hour time (e.g. "9:00 AM"). */
const formatHHmm = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const EventDatePicker: React.FC<EventDatePickerProps> = ({
  dateSchedules,
  selectedDate,
  onDateSelect,
  onTimeSlotSelect,
  selectedTimeSlot,
  showTimeSlotPicker = true,
  showDateSummary = true,
  timezone,
  className = '',
  disabled = false,
}) => {
  const tzAbbr = timezone ? ` · ${getTimezoneAbbr(timezone)}` : '';
  const today = startOfDay(new Date());

  // Calculate available dates based on event schedules
  const availableDates = useMemo(() => {
    if (!dateSchedules || dateSchedules.length === 0) return [];

    const dates: Date[] = [];

    dateSchedules.forEach(schedule => {
      const startDate = startOfDay(new Date(schedule.startDate));
      const endDate = startOfDay(new Date(schedule.endDate));

      const minDate = isAfter(today, startDate) ? today : startDate;

      let currentDate = new Date(minDate);
      while (!isAfter(currentDate, endDate)) {
        if (schedule.unlimitedSeats || schedule.availableSeats > 0) {
          dates.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // Deduplicate and sort
    return Array.from(new Set(dates.map(d => d.getTime())))
      .map(t => new Date(t))
      .sort((a, b) => a.getTime() - b.getTime());
  }, [dateSchedules, today]);

  /** Return the best matching schedule for a given day (prefers override). */
  const getScheduleForDate = (date: Date): DateSchedule | null => {
    if (!date || !dateSchedules?.length) return null;

    const target = startOfDay(date);

    const matches = dateSchedules.filter(s => {
      const start = startOfDay(new Date(s.startDate));
      const end   = startOfDay(new Date(s.endDate));
      return !isBefore(target, start) && !isAfter(target, end);
    });

    if (!matches.length) return null;
    return matches.find(s => s.isOverride) ?? matches[0];
  };

  /**
   * Return the time slots for the selected date that still have available seats.
   * Slots can carry an optional `.date` field to scope them to a specific day;
   * if absent they apply to every day in the schedule range.
   */
  const availableTimeSlotsForDate = useMemo((): TimeSlot[] => {
    if (!selectedDate) return [];

    const schedule = getScheduleForDate(selectedDate);
    if (!schedule?.timeSlots?.length) return [];

    const targetDay = startOfDay(selectedDate).getTime();

    return schedule.timeSlots.filter(slot => {
      // If the slot carries a date, match it; otherwise the slot applies to all days.
      if (slot.date) {
        const slotDay = startOfDay(new Date(slot.date)).getTime();
        if (slotDay !== targetDay) return false;
      }
      // Only expose slots with remaining availability
      return slot.availableSeats > 0;
    });
  }, [selectedDate, dateSchedules]);

  const filterDate = (date: Date) =>
    availableDates.some(d => isEqual(startOfDay(date), startOfDay(d)));

  const isEventDate = (date: Date) =>
    dateSchedules?.some(s => {
      const start = startOfDay(new Date(s.startDate));
      const end   = startOfDay(new Date(s.endDate));
      const target = startOfDay(date);
      return !isBefore(target, start) && !isAfter(target, end);
    }) ?? false;

  const getDayClassName = (date: Date) => {
    const isAvailable = filterDate(date);
    const isSelected  = selectedDate && isEqual(startOfDay(date), startOfDay(selectedDate));
    const isEvent     = isEventDate(date);
    const isToday     = isEqual(startOfDay(date), today);

    let classes = 'relative ';

    if (isSelected) {
      classes += 'bg-primary-600 text-white hover:bg-primary-700 ring-2 ring-primary-200 ring-offset-1';
    } else if (isEvent && isAvailable) {
      classes += 'bg-gradient-to-br from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 cursor-pointer shadow-sm';
    } else if (isAvailable) {
      classes += 'hover:bg-primary-50 hover:text-primary-700 cursor-pointer border border-transparent hover:border-primary-200';
    } else {
      classes += 'text-gray-300 cursor-not-allowed opacity-50';
    }

    if (isToday && !isSelected) classes += ' ring-1 ring-orange-400';

    return classes;
  };

  // When the date changes, clear any previously selected time slot
  const handleDateSelect = (date: Date | null) => {
    onDateSelect(date);
    onTimeSlotSelect?.(null);
  };

  return (
    <div className={`event-date-picker ${className}`}>
      <div className="mb-3">
        <label className="block text-gray-700 text-sm font-medium mb-2">
          Select Event Date
        </label>
        {dateSchedules?.length > 0 && (
          <div className="text-xs text-gray-600">
            Event runs:{' '}
            {format(new Date(dateSchedules[0].startDate), 'MMM d')} –{' '}
            {format(new Date(dateSchedules[0].endDate), 'MMM d, yyyy')}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <DatePicker
            selected={selectedDate}
            onChange={handleDateSelect}
            filterDate={filterDate}
            minDate={today}
            inline
            disabled={disabled}
            dayClassName={getDayClassName}
            wrapperClassName="w-full"
            calendarClassName="!w-full"
          />
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gradient-to-br from-primary-500 to-primary-600" />
              <span className="text-gray-600">Event dates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border border-primary-200 bg-primary-50" />
              <span className="text-gray-600">Available dates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded ring-1 ring-orange-400 bg-white" />
              <span className="text-gray-600">Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-200 opacity-50" />
              <span className="text-gray-600">Unavailable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected date summary — hidden when parent (e.g. SessionPicker) renders its own session cards */}
      {showDateSummary && selectedDate && (
        <div className="mt-3 p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm font-semibold text-primary-900">
                📅 {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </div>
              {(() => {
                const schedule = getScheduleForDate(selectedDate);
                if (!schedule) return null;

                // When time slots exist, show the slot picker instead of schedule-level time
                const hasSlots = availableTimeSlotsForDate.length > 0;

                return (
                  <div className="mt-2 space-y-1">
                    {!hasSlots && (schedule as any).startTime && (schedule as any).endTime && (
                      <div className="flex items-center gap-2 text-xs text-primary-700">
                        <span>
                          🕐 {formatHHmm((schedule as any).startTime)} – {formatHHmm((schedule as any).endTime)}{tzAbbr}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-green-700">
                        ✅{' '}
                        {schedule.unlimitedSeats || schedule.availableSeats >= 999999
                          ? 'Unlimited seats'
                          : `${schedule.availableSeats} seats available`}
                      </span>
                      <span className={`font-medium ${schedule.price === 0 ? 'text-green-700' : 'text-primary-700'}`}>
                        💰 {schedule.price === 0 ? 'Free' : `${schedule.price} AED per ticket`}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="text-primary-500">✨</div>
          </div>
        </div>
      )}

      {/* ── Time Slot Picker ─────────────────────────────────────────────────
          Shown only when the selected date has defined time slots.
          Hidden when showTimeSlotPicker={false} (e.g. inside SessionPicker).
      ────────────────────────────────────────────────────────────────────── */}
      {showTimeSlotPicker && selectedDate && availableTimeSlotsForDate.length > 0 && (
        <div className="mt-3">
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            🕐 Select a Time Slot
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {availableTimeSlotsForDate.map((slot, idx) => {
              const slotKey = slot._id ?? `${slot.startTime}-${slot.endTime}-${idx}`;
              const isSelected =
                selectedTimeSlot?.startTime === slot.startTime &&
                selectedTimeSlot?.endTime === slot.endTime;
              const effectivePrice = slot.price ?? getScheduleForDate(selectedDate)?.price ?? 0;

              return (
                <button
                  key={slotKey}
                  type="button"
                  disabled={disabled}
                  onClick={() => onTimeSlotSelect?.(isSelected ? null : slot)}
                  className={`flex flex-col items-center px-3 py-2 rounded-lg border text-sm transition-all ${
                    isSelected
                      ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400 hover:bg-primary-50'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="font-medium">
                    {formatHHmm(slot.startTime)}
                  </span>
                  <span className="text-xs opacity-80">
                    – {formatHHmm(slot.endTime)}{tzAbbr}
                  </span>
                  <span className={`text-xs mt-1 ${isSelected ? 'text-primary-100' : 'text-gray-500'}`}>
                    {slot.availableSeats} seat{slot.availableSeats !== 1 ? 's' : ''}
                    {effectivePrice > 0 ? ` · ${effectivePrice} AED` : ' · Free'}
                  </span>
                </button>
              );
            })}
          </div>
          {!selectedTimeSlot && (
            <p className="mt-2 text-xs text-amber-600">
              Please select a time slot to continue.
            </p>
          )}
        </div>
      )}

      {(!dateSchedules || dateSchedules.length === 0) && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm text-yellow-700">
            No event schedules available. Please check back later.
          </div>
        </div>
      )}

      {dateSchedules?.length > 0 && availableDates.length === 0 && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm text-yellow-700">
            No dates available for booking at this time.
          </div>
        </div>
      )}

      {availableDates.length > 0 && !selectedDate && (
        <div className="mt-3 text-sm text-gray-600">
          {availableDates.length} date{availableDates.length !== 1 ? 's' : ''} available for booking
        </div>
      )}
    </div>
  );
};

export default EventDatePicker;
