import React, { useState } from 'react';
import { Plus, Trash2, Calendar, DollarSign, Users, ChevronDown, ChevronUp, Repeat } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  availableSeats: string;
  price: string;
}

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
  timeSlots?: TimeSlot[];
}

interface SchedulePricingTabProps {
  schedules: Schedule[];
  currency: string;
  capacity: string;
  basePrice: string;
  isFreeEvent: boolean;
  unlimitedCapacity: boolean;
  errors: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onScheduleChange: (index: number, field: keyof Schedule, value: any) => void;
  onAddSchedule: (isSpecialDate?: boolean) => void;
  onRemoveSchedule: (index: number) => void;
  onCurrencyChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onCapacityChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBasePriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFreeEventChange: (value: boolean) => void;
  onUnlimitedCapacityChange: (value: boolean) => void;
}

const CURRENCIES = ['AED', 'USD', 'EUR', 'GBP', 'SAR', 'QAR', 'KWD', 'EGP', 'CAD'];

const SchedulePricingTab: React.FC<SchedulePricingTabProps> = ({
  schedules,
  currency,
  capacity,
  basePrice,
  isFreeEvent,
  unlimitedCapacity,
  errors,
  onScheduleChange,
  onAddSchedule,
  onRemoveSchedule,
  onCurrencyChange,
  onCapacityChange,
  onBasePriceChange,
  onFreeEventChange,
  onUnlimitedCapacityChange,
}) => {
  const [showRecurring, setShowRecurring] = useState(false);
  const [recurringDate, setRecurringDate] = useState('');
  const [recurringPattern, setRecurringPattern] = useState<'daily' | 'weekly'>('weekly');
  const [recurringCount, setRecurringCount] = useState(4);
  const [recurringStartTime, setRecurringStartTime] = useState('09:00');
  const [recurringEndTime, setRecurringEndTime] = useState('10:00');

  const generateRecurringSessions = () => {
    if (!recurringDate) return;
    const start = new Date(recurringDate + 'T00:00:00');
    for (let i = 0; i < recurringCount; i++) {
      const d = new Date(start);
      if (recurringPattern === 'daily') d.setDate(start.getDate() + i);
      else d.setDate(start.getDate() + i * 7);
      const dateStr = d.toISOString().split('T')[0];
      onAddSchedule(false);
      const newIdx = schedules.length + i;
      setTimeout(() => {
        onScheduleChange(newIdx, 'startDate', dateStr);
        onScheduleChange(newIdx, 'endDate', dateStr);
        onScheduleChange(newIdx, 'startTime', recurringStartTime);
        onScheduleChange(newIdx, 'endTime', recurringEndTime);
      }, 0);
    }
    setShowRecurring(false);
    setRecurringDate('');
  };

  return (
    <div className="space-y-8">
      {/* ── Pricing Overview ─────────────────────────────────────────────── */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-gray-900">
            <DollarSign className="w-6 h-6 mr-3 text-primary-600" />
            Pricing Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Free Event Toggle */}
          <div
            className={`flex items-center gap-3 mb-6 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              isFreeEvent ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-200 hover:border-green-300'
            }`}
            onClick={() => onFreeEventChange(!isFreeEvent)}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isFreeEvent ? 'bg-green-500 border-green-500' : 'border-gray-400'}`}>
              {isFreeEvent && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <p className={`font-semibold text-sm ${isFreeEvent ? 'text-green-700' : 'text-gray-700'}`}>
                Free Event (No Payment Required)
              </p>
              <p className="text-xs text-gray-500">Attendees register without paying — registration form is still collected</p>
            </div>
            {isFreeEvent && <span className="ml-auto bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">FREE</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Base Price */}
            <div>
              <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700 mb-2">
                Base Price {!isFreeEvent && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  id="basePrice"
                  name="basePrice"
                  value={isFreeEvent ? '0' : basePrice}
                  onChange={onBasePriceChange}
                  disabled={isFreeEvent}
                  min="0"
                  step="0.01"
                  placeholder="25.00"
                  className={`w-full pl-10 pr-3 py-2 border ${errors.basePrice ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg font-semibold ${isFreeEvent ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                />
              </div>
              {errors.basePrice && <p className="mt-1 text-sm text-red-500">{errors.basePrice}</p>}
              <p className="mt-2 text-xs text-gray-500">{isFreeEvent ? 'Free — no charge' : 'Default ticket price'}</p>
            </div>

            {/* Currency */}
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
              <select
                id="currency"
                name="currency"
                value={currency}
                onChange={onCurrencyChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Capacity */}
            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-2">
                Event Capacity {!unlimitedCapacity && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  value={unlimitedCapacity ? '' : capacity}
                  onChange={onCapacityChange}
                  disabled={unlimitedCapacity}
                  min="1"
                  placeholder={unlimitedCapacity ? 'Unlimited' : '50'}
                  className={`w-full pl-10 pr-3 py-2 border ${errors.capacity ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg font-semibold ${unlimitedCapacity ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                />
              </div>
              {errors.capacity && <p className="mt-1 text-sm text-red-500">{errors.capacity}</p>}
              <label className="flex items-center gap-2 mt-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unlimitedCapacity}
                  onChange={(e) => onUnlimitedCapacityChange(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                Unlimited Capacity
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Session List ─────────────────────────────────────────────────── */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center text-gray-900">
              <Calendar className="w-6 h-6 mr-3 text-primary-600" />
              Sessions
              {schedules.length > 0 && (
                <span className="ml-3 text-sm font-medium bg-primary-100 text-primary-700 px-2.5 py-1 rounded-full">
                  {schedules.length}
                </span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowRecurring(!showRecurring)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Repeat className="w-4 h-4" />
                Recurring
                {showRecurring ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={() => onAddSchedule(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-700 text-white text-sm font-semibold rounded-lg hover:from-primary-600 hover:to-primary-800 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Session
              </button>
            </div>
          </div>

          {/* Recurring Generator */}
          {showRecurring && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
              <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                Generate Recurring Sessions
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-blue-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={recurringDate}
                    onChange={(e) => setRecurringDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">Pattern</label>
                  <select
                    value={recurringPattern}
                    onChange={(e) => setRecurringPattern(e.target.value as 'daily' | 'weekly')}
                    className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">Count</label>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={recurringCount}
                    onChange={(e) => setRecurringCount(parseInt(e.target.value) || 1)}
                    className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={recurringStartTime}
                    onChange={(e) => setRecurringStartTime(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={recurringEndTime}
                    onChange={(e) => setRecurringEndTime(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={generateRecurringSessions}
                disabled={!recurringDate}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Generate {recurringCount} Sessions
              </button>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {schedules.length === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-10 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-sm font-medium text-gray-900 mb-1">No sessions added yet</h4>
              <p className="text-xs text-gray-500 mb-4">Add at least one session with a date and pricing</p>
              <button
                type="button"
                onClick={() => onAddSchedule(false)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add First Session
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-3 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="pb-3 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Start</th>
                    <th className="pb-3 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">End</th>
                    <th className="pb-3 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">End Date</th>
                    <th className="pb-3 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Seats</th>
                    <th className="pb-3 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Price ({currency})
                    </th>
                    <th className="pb-3 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Override</th>
                    <th className="pb-3 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {schedules.map((schedule, index) => (
                    <tr key={schedule.id} className="group hover:bg-gray-50">
                      {/* Start Date */}
                      <td className="py-3 pr-3">
                        <input
                          type="date"
                          value={schedule.startDate}
                          onChange={(e) => onScheduleChange(index, 'startDate', e.target.value)}
                          className={`w-36 px-2 py-1.5 border ${
                            errors[`schedule_${index}_startDate`] ? 'border-red-400' : 'border-gray-200'
                          } rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400`}
                        />
                        {errors[`schedule_${index}_startDate`] && (
                          <p className="text-red-500 text-xs mt-0.5">{errors[`schedule_${index}_startDate`]}</p>
                        )}
                      </td>

                      {/* Start Time */}
                      <td className="py-3 pr-3">
                        <input
                          type="time"
                          value={schedule.startTime || ''}
                          onChange={(e) => onScheduleChange(index, 'startTime', e.target.value)}
                          className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                      </td>

                      {/* End Time */}
                      <td className="py-3 pr-3">
                        <input
                          type="time"
                          value={schedule.endTime || ''}
                          onChange={(e) => onScheduleChange(index, 'endTime', e.target.value)}
                          className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                      </td>

                      {/* End Date (optional — for multi-day sessions) */}
                      <td className="py-3 pr-3">
                        <input
                          type="date"
                          value={schedule.endDate}
                          onChange={(e) => onScheduleChange(index, 'endDate', e.target.value)}
                          className={`w-36 px-2 py-1.5 border ${
                            errors[`schedule_${index}_endDate`] ? 'border-red-400' : 'border-gray-200'
                          } rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400`}
                        />
                      </td>

                      {/* Available Seats */}
                      <td className="py-3 pr-3">
                        <div className="flex flex-col gap-1">
                          <input
                            type="number"
                            value={unlimitedCapacity || schedule.unlimitedSeats ? '' : schedule.availableSeats}
                            onChange={(e) => onScheduleChange(index, 'availableSeats', e.target.value)}
                            disabled={unlimitedCapacity || schedule.unlimitedSeats}
                            min="1"
                            placeholder={unlimitedCapacity || schedule.unlimitedSeats ? '∞' : ''}
                            className={`w-20 px-2 py-1.5 border ${
                              errors[`schedule_${index}_availableSeats`] ? 'border-red-400' : 'border-gray-200'
                            } rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                              unlimitedCapacity || schedule.unlimitedSeats ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                          />
                          {!unlimitedCapacity && (
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={schedule.unlimitedSeats || false}
                                onChange={(e) => onScheduleChange(index, 'unlimitedSeats', e.target.checked)}
                                className="h-3 w-3 text-primary border-gray-300 rounded"
                              />
                              <span className="text-xs text-gray-500">Unlimited</span>
                            </label>
                          )}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3 pr-3">
                        <input
                          type="number"
                          value={isFreeEvent ? '0' : schedule.price}
                          onChange={(e) => onScheduleChange(index, 'price', e.target.value)}
                          disabled={isFreeEvent}
                          min="0"
                          step="0.01"
                          placeholder={basePrice || '0'}
                          className={`w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                            isFreeEvent ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
                          }`}
                        />
                      </td>

                      {/* Override toggle */}
                      <td className="py-3 pr-3">
                        <label className="flex items-center gap-1 cursor-pointer" title="Override beats non-override schedules on the same date">
                          <input
                            type="checkbox"
                            checked={schedule.isOverride || false}
                            onChange={(e) => onScheduleChange(index, 'isOverride', e.target.checked)}
                            className="h-4 w-4 text-amber-500 focus:ring-amber-400 border-gray-300 rounded"
                          />
                          <span className="text-xs text-gray-500">Override</span>
                        </label>
                      </td>

                      {/* Priority */}
                      <td className="py-3 pr-3">
                        <input
                          type="number"
                          value={schedule.priority ?? 0}
                          onChange={(e) => onScheduleChange(index, 'priority', parseInt(e.target.value) || 0)}
                          min="0"
                          max="100"
                          className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                      </td>

                      {/* Delete */}
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => onRemoveSchedule(index)}
                          disabled={schedules.length === 1}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Remove session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                type="button"
                onClick={() => onAddSchedule(false)}
                className="mt-4 text-sm text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another session
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SchedulePricingTab;
