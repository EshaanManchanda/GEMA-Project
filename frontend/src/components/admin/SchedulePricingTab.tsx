import React from 'react';
import { Plus, Trash2, Calendar, DollarSign, Users, Star, X } from 'lucide-react';
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
  _id?: string; // MongoDB ID for existing schedules
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  availableSeats: string;
  totalSeats?: string; // Admin can see/edit total seats
  price: string;
  unlimitedSeats?: boolean;
  isSpecialDate?: boolean;
  specialDates?: string[];
  priority?: number;
  isOverride?: boolean;
  timeSlots?: TimeSlot[]; // Multiple time slots per date
}

interface SchedulePricingTabProps {
  schedules: Schedule[];
  currency: string;
  capacity: string;
  basePrice: string; // Admin can set base price
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
  return (
    <div className="space-y-8">
      {/* Pricing Overview Card */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-gray-900">
            <DollarSign className="w-6 h-6 mr-3 text-primary-600" />
            Pricing Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Free Event Toggle */}
          <div className={`flex items-center gap-3 mb-6 p-4 rounded-lg border-2 cursor-pointer transition-colors ${isFreeEvent ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-200 hover:border-green-300'}`}
            onClick={() => onFreeEventChange(!isFreeEvent)}>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isFreeEvent ? 'bg-green-500 border-green-500' : 'border-gray-400'}`}>
              {isFreeEvent && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            </div>
            <div>
              <p className={`font-semibold text-sm ${isFreeEvent ? 'text-green-700' : 'text-gray-700'}`}>Free Event (No Payment Required)</p>
              <p className="text-xs text-gray-500">Attendees register without paying — registration form is still collected</p>
            </div>
            {isFreeEvent && <span className="ml-auto bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">FREE</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700 mb-2">
                Base Price {!isFreeEvent && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  id="basePrice"
                  name="basePrice"
                  value={isFreeEvent ? '0' : basePrice}
                  onChange={onBasePriceChange}
                  disabled={isFreeEvent}
                  min="0"
                  step="0.01"
                  className={`w-full pl-10 pr-3 py-2 border ${errors.basePrice ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg font-semibold ${isFreeEvent ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                  placeholder="25.00"
                />
              </div>
              {errors.basePrice && <p className="mt-1 text-sm text-red-500">{errors.basePrice}</p>}
              <p className="mt-2 text-xs text-gray-500">{isFreeEvent ? 'Free — no charge' : 'Default ticket price'}</p>
            </div>

            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={currency}
                onChange={onCurrencyChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="USD">USD ($)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="EGP">EGP (£)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>

            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-2">
                Event Capacity {!unlimitedCapacity && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  value={unlimitedCapacity ? '' : capacity}
                  onChange={onCapacityChange}
                  disabled={unlimitedCapacity}
                  min="1"
                  className={`w-full pl-10 pr-3 py-2 border ${errors.capacity ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg font-semibold ${unlimitedCapacity ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                  placeholder={unlimitedCapacity ? 'Unlimited' : '50'}
                />
              </div>
              {errors.capacity && <p className="mt-1 text-sm text-red-500">{errors.capacity}</p>}
              <div className="mt-2">
                <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={unlimitedCapacity}
                    onChange={(e) => onUnlimitedCapacityChange(e.target.checked)}
                    className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  Unlimited Capacity (ideal for online events)
                </label>
              </div>
              {!unlimitedCapacity && <p className="mt-1 text-xs text-gray-500">Total seats available</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule & Pricing Section */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center text-gray-900">
              <Calendar className="w-6 h-6 mr-3 text-primary-600" />
              Event Schedules
            </CardTitle>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => onAddSchedule(false)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-800 hover:shadow-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Schedule
              </button>
              <button
                type="button"
                onClick={() => onAddSchedule(true)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-amber-700 hover:shadow-lg transition-all duration-200"
              >
                <Star className="w-4 h-4 mr-2" />
                Special Dates
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Add multiple date ranges with individual pricing for each schedule
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
        </div>

        {schedules.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-gray-900 mb-1">No schedules added yet</h4>
            <p className="text-sm text-gray-500 mb-4">
              Add at least one schedule with dates and pricing
            </p>
            <div className="flex justify-center space-x-3">
              <button
                type="button"
                onClick={() => onAddSchedule(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Schedule
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {schedules.map((schedule, index) => (
              <div
                key={schedule.id}
                className={`rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-200 ${
                  schedule.isSpecialDate
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300'
                    : 'bg-white border-2 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      schedule.isSpecialDate ? 'bg-amber-500' : 'bg-primary-500'
                    }`}>
                      {schedule.isSpecialDate ? (
                        <Star className="w-5 h-5 text-white" />
                      ) : (
                        <Calendar className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {schedule.isSpecialDate ? 'Special Date Schedule' : 'Schedule'} #{index + 1}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {schedule.isSpecialDate && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                            Special Date
                          </span>
                        )}
                        {schedule.isOverride && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                            Override
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {schedules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveSchedule(index)}
                      className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200"
                      title="Remove schedule"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Special Dates Picker - Only for special date schedules */}
                {schedule.isSpecialDate && (
                  <div className="mb-4 p-3 bg-amber-100 rounded-md">
                    <label className="block text-sm font-medium text-amber-800 mb-2">
                      Select Specific Dates (these will override base schedules)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(schedule.specialDates || []).map((date, dateIndex) => (
                        <span
                          key={dateIndex}
                          className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-white text-amber-800 border border-amber-300"
                        >
                          {new Date(date).toLocaleDateString()}
                          <button
                            type="button"
                            onClick={() => {
                              const newDates = (schedule.specialDates || []).filter((_, i) => i !== dateIndex);
                              onScheduleChange(index, 'specialDates', newDates);
                            }}
                            className="ml-1 text-amber-600 hover:text-amber-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="date"
                        className="px-3 py-2 border border-amber-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 text-sm"
                        onChange={(e) => {
                          if (e.target.value) {
                            const currentDates = schedule.specialDates || [];
                            if (!currentDates.includes(e.target.value)) {
                              onScheduleChange(index, 'specialDates', [...currentDates, e.target.value]);
                            }
                            e.target.value = '';
                          }
                        }}
                      />
                      <span className="text-sm text-amber-700">Click to add individual dates</span>
                    </div>
                    <p className="mt-2 text-xs text-amber-600">
                      Tip: You can also use the date range below to define the period, and add specific dates here for additional pricing days.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {schedule.isSpecialDate ? 'Date Range Start (optional)' : 'Start Date'} {!schedule.isSpecialDate && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="date"
                      value={schedule.startDate}
                      onChange={(e) => onScheduleChange(index, 'startDate', e.target.value)}
                      className={`w-full px-3 py-2 border ${
                        errors[`schedule_${index}_startDate`] ? 'border-red-500' : 'border-gray-300'
                      } rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                    />
                    {errors[`schedule_${index}_startDate`] && (
                      <p className="mt-1 text-sm text-red-500">{errors[`schedule_${index}_startDate`]}</p>
                    )}
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {schedule.isSpecialDate ? 'Date Range End (optional)' : 'End Date'} {!schedule.isSpecialDate && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="date"
                      value={schedule.endDate}
                      onChange={(e) => onScheduleChange(index, 'endDate', e.target.value)}
                      className={`w-full px-3 py-2 border ${
                        errors[`schedule_${index}_endDate`] ? 'border-red-500' : 'border-gray-300'
                      } rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                    />
                    {errors[`schedule_${index}_endDate`] && (
                      <p className="mt-1 text-sm text-red-500">{errors[`schedule_${index}_endDate`]}</p>
                    )}
                  </div>

                  {/* Start Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={schedule.startTime || ''}
                      onChange={(e) => onScheduleChange(index, 'startTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={schedule.endTime || ''}
                      onChange={(e) => onScheduleChange(index, 'endTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>

                  {/* Available Seats */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Available Seats {!unlimitedCapacity && !schedule.unlimitedSeats && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="number"
                      value={unlimitedCapacity || schedule.unlimitedSeats ? '' : schedule.availableSeats}
                      onChange={(e) => onScheduleChange(index, 'availableSeats', e.target.value)}
                      min="1"
                      disabled={unlimitedCapacity || schedule.unlimitedSeats}
                      className={`w-full px-3 py-2 border ${
                        errors[`schedule_${index}_availableSeats`] ? 'border-red-500' : 'border-gray-300'
                      } rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary ${
                        unlimitedCapacity || schedule.unlimitedSeats ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder={unlimitedCapacity || schedule.unlimitedSeats ? 'Unlimited' : 'e.g. 30'}
                    />
                    {errors[`schedule_${index}_availableSeats`] && (
                      <p className="mt-1 text-sm text-red-500">{errors[`schedule_${index}_availableSeats`]}</p>
                    )}

                    {/* Unlimited Capacity Checkbox */}
                    <div className="mt-2">
                      <label className={`flex items-center text-sm ${unlimitedCapacity ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={unlimitedCapacity || schedule.unlimitedSeats || false}
                          onChange={(e) => !unlimitedCapacity && onScheduleChange(index, 'unlimitedSeats', e.target.checked)}
                          disabled={unlimitedCapacity}
                          className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        {unlimitedCapacity ? 'Unlimited Capacity (set globally)' : 'Unlimited Capacity (ideal for online events)'}
                      </label>
                    </div>

                    {/* Override Checkbox */}
                    <div className="mt-2">
                      <label className="flex items-center text-sm text-gray-600" title="When checked, this schedule's price/seats will override base schedules for overlapping dates">
                        <input
                          type="checkbox"
                          checked={schedule.isOverride || false}
                          onChange={(e) => onScheduleChange(index, 'isOverride', e.target.checked)}
                          className="mr-2 h-4 w-4 text-amber-500 focus:ring-amber-500 border-gray-300 rounded"
                        />
                        Override (takes priority over other schedules for same dates)
                      </label>
                    </div>
                  </div>

                  {/* Multi-Time Slots Section */}
                  <div className="col-span-2 border-t pt-4 mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Time Slots (Multiple sessions per day)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newSlots = [...(schedule.timeSlots || []), {
                            id: `slot-${Date.now()}`,
                            date: schedule.startDate,
                            startTime: '',
                            endTime: '',
                            availableSeats: '',
                            price: isFreeEvent ? '0' : schedule.price,
                          }];
                          onScheduleChange(index, 'timeSlots', newSlots);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 focus:outline-none"
                      >
                        <Plus className="inline w-4 h-4 mr-1" /> Add Time Slot
                      </button>
                    </div>

                    {(schedule.timeSlots || []).length > 0 ? (
                      <div className="space-y-2 bg-gray-50 p-3 rounded-md">
                        {schedule.timeSlots!.map((slot, slotIdx) => (
                          <div key={slot.id} className="grid grid-cols-6 gap-2 items-end">
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Date</label>
                              <input
                                type="date"
                                value={slot.date}
                                onChange={(e) => {
                                  const updated = [...schedule.timeSlots!];
                                  updated[slotIdx].date = e.target.value;
                                  onScheduleChange(index, 'timeSlots', updated);
                                }}
                                className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Start</label>
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => {
                                  const updated = [...schedule.timeSlots!];
                                  updated[slotIdx].startTime = e.target.value;
                                  onScheduleChange(index, 'timeSlots', updated);
                                }}
                                className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">End</label>
                              <input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => {
                                  const updated = [...schedule.timeSlots!];
                                  updated[slotIdx].endTime = e.target.value;
                                  onScheduleChange(index, 'timeSlots', updated);
                                }}
                                className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Seats</label>
                              <input
                                type="number"
                                value={unlimitedCapacity || schedule.unlimitedSeats ? '' : slot.availableSeats}
                                onChange={(e) => {
                                  const updated = [...schedule.timeSlots!];
                                  updated[slotIdx].availableSeats = e.target.value;
                                  onScheduleChange(index, 'timeSlots', updated);
                                }}
                                disabled={unlimitedCapacity || schedule.unlimitedSeats}
                                className={`w-full text-sm px-2 py-1 border border-gray-300 rounded ${unlimitedCapacity || schedule.unlimitedSeats ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                min="0"
                                placeholder={unlimitedCapacity || schedule.unlimitedSeats ? '∞' : ''}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Price</label>
                              <input
                                type="number"
                                value={isFreeEvent ? '0' : slot.price}
                                onChange={(e) => {
                                  const updated = [...schedule.timeSlots!];
                                  updated[slotIdx].price = e.target.value;
                                  onScheduleChange(index, 'timeSlots', updated);
                                }}
                                disabled={isFreeEvent}
                                className={`w-full text-sm px-2 py-1 border border-gray-300 rounded ${isFreeEvent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = schedule.timeSlots!.filter((_, i) => i !== slotIdx);
                                onScheduleChange(index, 'timeSlots', updated);
                              }}
                              className="text-red-600 hover:text-red-700 pb-1"
                              title="Remove time slot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic bg-gray-50 p-3 rounded-md">
                        No time slots added. Use this for events with multiple sessions on the same day.
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {schedule.isSpecialDate ? 'Special Price' : 'Price'} ({currency}) {!isFreeEvent && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="number"
                      value={isFreeEvent ? '0' : schedule.price}
                      onChange={(e) => onScheduleChange(index, 'price', e.target.value)}
                      disabled={isFreeEvent}
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 border ${
                        errors[`schedule_${index}_price`] ? 'border-red-500' : 'border-gray-300'
                      } rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary ${
                        isFreeEvent ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
                      }`}
                      placeholder={isFreeEvent ? '0.00 (Free)' : (schedule.isSpecialDate ? 'e.g. 35.00 (special pricing)' : 'e.g. 25.00')}
                    />
                    {errors[`schedule_${index}_price`] && (
                      <p className="mt-1 text-sm text-red-500">{errors[`schedule_${index}_price`]}</p>
                    )}
                    {isFreeEvent && <p className="mt-1 text-xs text-green-600">Free — no charge</p>}
                  </div>

                  {/* Total Seats (Admin-specific field) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Seats (Capacity Tracking)
                    </label>
                    <input
                      type="number"
                      value={unlimitedCapacity || schedule.unlimitedSeats ? '' : (schedule.totalSeats || '')}
                      onChange={(e) => onScheduleChange(index, 'totalSeats', e.target.value)}
                      min="0"
                      disabled={unlimitedCapacity || schedule.unlimitedSeats}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary ${
                        unlimitedCapacity || schedule.unlimitedSeats ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder={unlimitedCapacity || schedule.unlimitedSeats ? 'Unlimited' : 'e.g. 50'}
                    />
                    <p className="mt-1 text-xs text-gray-500">Total capacity for this schedule</p>
                  </div>

                  {/* Priority (Admin-specific field) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority (Higher = More Important)
                    </label>
                    <input
                      type="number"
                      value={schedule.priority || 0}
                      onChange={(e) => onScheduleChange(index, 'priority', parseInt(e.target.value) || 0)}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      placeholder="0 (default)"
                    />
                    <p className="mt-1 text-xs text-gray-500">Higher priority schedules take precedence</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SchedulePricingTab;
