import React, { useState } from 'react';
import { Plus, Trash2, Calendar, DollarSign, Users, Clock, Repeat, ChevronDown, ChevronUp } from 'lucide-react';

interface Schedule {
  id: string;
  _id?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  availableSeats: string;
  totalSeats?: string;
  price: string;
  unlimitedSeats?: boolean;
  isSpecialDate?: boolean;
  specialDates?: string[];
  priority?: number;
  isOverride?: boolean;
}

interface TeachingSchedulePricingTabProps {
  schedules: Schedule[];
  currency: string;
  basePrice: string;
  errors: Record<string, string>;
  isFreeEvent?: boolean;
  onScheduleChange: (index: number, field: keyof Schedule, value: string | boolean | string[] | number) => void;
  onAddSchedule: (isSpecialDate?: boolean) => void;
  onRemoveSchedule: (index: number) => void;
  onCurrencyChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBasePriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CURRENCIES = ['AED', 'USD', 'EUR', 'GBP', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR'];

const TeachingSchedulePricingTab: React.FC<TeachingSchedulePricingTabProps> = ({
  schedules,
  currency,
  basePrice,
  errors,
  isFreeEvent = false,
  onScheduleChange,
  onAddSchedule,
  onRemoveSchedule,
  onCurrencyChange,
  onBasePriceChange,
}) => {
  const [showRecurring, setShowRecurring] = useState(false);
  const [recurringDate, setRecurringDate] = useState('');
  const [recurringPattern, setRecurringPattern] = useState<'daily' | 'weekly'>('weekly');
  const [recurringCount, setRecurringCount] = useState(4);
  const [recurringStartTime, setRecurringStartTime] = useState('09:00');
  const [recurringEndTime, setRecurringEndTime] = useState('10:00');

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'No date';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const generateRecurringSessions = () => {
    if (!recurringDate) return;
    const start = new Date(recurringDate);
    const newSessions = Array.from({ length: recurringCount }, (_, i) => {
      const d = new Date(start);
      if (recurringPattern === 'daily') d.setDate(start.getDate() + i);
      else d.setDate(start.getDate() + i * 7);
      const dateStr = d.toISOString().split('T')[0];
      return {
        id: `schedule-${Date.now()}-${i}`,
        startDate: dateStr,
        endDate: dateStr,
        startTime: recurringStartTime,
        endTime: recurringEndTime,
        availableSeats: '10',
        price: '',
        unlimitedSeats: false,
      };
    });
    // Add all sessions at once via onAddSchedule side-effect bypass:
    // Since onAddSchedule only adds one blank session, we call onScheduleChange
    // for each new session after they're added. Instead, add all at once
    // by calling onAddSchedule N times (parent uses functional updater now).
    newSessions.forEach((session, i) => {
      onAddSchedule(false);
      // Use requestAnimationFrame to let each addSchedule render before updating
      // index is schedules.length + i (parent functional updater handles ordering)
      const targetIdx = schedules.length + i;
      setTimeout(() => {
        onScheduleChange(targetIdx, 'startDate', session.startDate);
        onScheduleChange(targetIdx, 'endDate', session.endDate);
        onScheduleChange(targetIdx, 'startTime', session.startTime!);
        onScheduleChange(targetIdx, 'endTime', session.endTime!);
      }, (i + 1) * 50); // stagger so each update sees latest state
    });
    setShowRecurring(false);
    setRecurringDate('');
  };

  return (
    <div className="space-y-6">
      {/* ── Pricing ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-purple-500" />
          Pricing
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Base Price {!isFreeEvent && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={isFreeEvent ? '0' : basePrice}
              onChange={onBasePriceChange}
              disabled={isFreeEvent}
              placeholder="0.00"
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                errors.basePrice ? 'border-red-400' : 'border-gray-200'
              } ${isFreeEvent ? 'bg-gray-50 text-gray-400' : ''}`}
            />
            {errors.basePrice && <p className="text-red-500 text-xs mt-1">{errors.basePrice}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
            <select
              value={currency}
              onChange={onCurrencyChange}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Sessions ── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-500" />
            Sessions
            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {schedules.length} added
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowRecurring(!showRecurring)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                showRecurring
                  ? 'bg-purple-100 text-purple-700 border-purple-200'
                  : 'text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Repeat className="w-3 h-3" />
              Recurring
              {showRecurring ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={() => onAddSchedule(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Session
            </button>
          </div>
        </div>

        {/* Recurring generator */}
        {showRecurring && (
          <div className="px-5 py-4 bg-purple-50 border-b border-purple-100">
            <p className="text-xs font-semibold text-purple-700 mb-3 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5" />
              Generate Recurring Sessions
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={recurringDate}
                  onChange={(e) => setRecurringDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Pattern</label>
                <select
                  value={recurringPattern}
                  onChange={(e) => setRecurringPattern(e.target.value as 'daily' | 'weekly')}
                  className="w-full px-2 py-1.5 text-xs border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Sessions</label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={recurringCount}
                  onChange={(e) => setRecurringCount(parseInt(e.target.value) || 1)}
                  className="w-full px-2 py-1.5 text-xs border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                <input
                  type="time"
                  value={recurringStartTime}
                  onChange={(e) => setRecurringStartTime(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">End Time</label>
                <input
                  type="time"
                  value={recurringEndTime}
                  onChange={(e) => setRecurringEndTime(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={generateRecurringSessions}
                  disabled={!recurringDate}
                  className="w-full px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session list */}
        {schedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Calendar className="w-10 h-10 mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">No sessions yet</p>
            <p className="text-xs text-gray-400 mt-1">Click "Add Session" to create your first session</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {schedules.map((schedule, index) => (
              <div key={schedule.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                {/* Session header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                    Session {index + 1}
                    {schedule.startDate && (
                      <span className="ml-2 font-normal text-gray-500 normal-case tracking-normal">
                        · {formatDateDisplay(schedule.startDate)}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveSchedule(index)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Session fields grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Date */}
                  <div className="sm:col-span-1 lg:col-span-1">
                    <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <Calendar className="w-3 h-3" /> Date *
                    </label>
                    <input
                      type="date"
                      value={schedule.startDate}
                      onChange={(e) => {
                        onScheduleChange(index, 'startDate', e.target.value);
                        onScheduleChange(index, 'endDate', e.target.value);
                      }}
                      className={`w-full px-2.5 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                        errors[`schedule_${index}_startDate`] ? 'border-red-400' : 'border-gray-200'
                      }`}
                    />
                  </div>

                  {/* Start time */}
                  <div>
                    <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <Clock className="w-3 h-3" /> Start
                    </label>
                    <input
                      type="time"
                      value={schedule.startTime || ''}
                      onChange={(e) => onScheduleChange(index, 'startTime', e.target.value)}
                      className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>

                  {/* End time */}
                  <div>
                    <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <Clock className="w-3 h-3" /> End
                    </label>
                    <input
                      type="time"
                      value={schedule.endTime || ''}
                      onChange={(e) => onScheduleChange(index, 'endTime', e.target.value)}
                      className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <DollarSign className="w-3 h-3" /> Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={isFreeEvent ? '0' : (schedule.price || basePrice)}
                      onChange={(e) => onScheduleChange(index, 'price', e.target.value)}
                      disabled={isFreeEvent}
                      placeholder={basePrice || '0'}
                      className={`w-full px-2.5 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                        isFreeEvent ? 'bg-gray-50 text-gray-400' : 'border-gray-200'
                      }`}
                    />
                  </div>

                  {/* Seats */}
                  <div>
                    <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <Users className="w-3 h-3" /> Seats
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={schedule.unlimitedSeats ? '' : (schedule.availableSeats || '')}
                      onChange={(e) => onScheduleChange(index, 'availableSeats', e.target.value)}
                      disabled={schedule.unlimitedSeats}
                      placeholder="10"
                      className={`w-full px-2.5 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                        schedule.unlimitedSeats ? 'bg-gray-50 text-gray-400 border-gray-200' : 'border-gray-200'
                      }`}
                    />
                  </div>

                  {/* Unlimited toggle */}
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        onClick={() => onScheduleChange(index, 'unlimitedSeats', !schedule.unlimitedSeats)}
                        className={`relative w-9 h-5 rounded-full transition-colors ${
                          schedule.unlimitedSeats ? 'bg-purple-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            schedule.unlimitedSeats ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </div>
                      <span className="text-xs text-gray-600">Unlimited</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer add button */}
        {schedules.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={() => onAddSchedule(false)}
              className="flex items-center gap-2 text-sm text-purple-600 font-medium hover:text-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add another session
            </button>
          </div>
        )}
      </div>

      {errors.schedules && (
        <p className="text-red-500 text-sm flex items-center gap-1">
          <span>⚠</span> {errors.schedules}
        </p>
      )}
    </div>
  );
};

export default TeachingSchedulePricingTab;
