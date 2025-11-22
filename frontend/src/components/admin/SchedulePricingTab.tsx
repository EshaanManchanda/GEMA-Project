import React from 'react';
import { Plus, Trash2, Calendar, DollarSign, Users, Star, X } from 'lucide-react';

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
}

interface SchedulePricingTabProps {
  schedules: Schedule[];
  currency: string;
  capacity: string;
  basePrice: string; // Admin can set base price
  errors: Record<string, string>;
  onScheduleChange: (index: number, field: keyof Schedule, value: string | boolean | string[] | number) => void;
  onAddSchedule: (isSpecialDate?: boolean) => void;
  onRemoveSchedule: (index: number) => void;
  onCurrencyChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onCapacityChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBasePriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SchedulePricingTab: React.FC<SchedulePricingTabProps> = ({
  schedules,
  currency,
  capacity,
  basePrice,
  errors,
  onScheduleChange,
  onAddSchedule,
  onRemoveSchedule,
  onCurrencyChange,
  onCapacityChange,
  onBasePriceChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Basic Pricing Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700 mb-1">
            <DollarSign className="inline w-4 h-4 mr-1" />
            Base Price <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="basePrice"
            name="basePrice"
            value={basePrice}
            onChange={onBasePriceChange}
            min="0"
            step="0.01"
            className={`w-full px-3 py-2 border ${errors.basePrice ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
            placeholder="e.g. 25.00"
          />
          {errors.basePrice && <p className="mt-1 text-sm text-red-500">{errors.basePrice}</p>}
          <p className="mt-1 text-xs text-gray-500">Default price for event tickets</p>
        </div>

        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
            <DollarSign className="inline w-4 h-4 mr-1" />
            Currency
          </label>
          <select
            id="currency"
            name="currency"
            value={currency}
            onChange={onCurrencyChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          >
            <option value="USD">USD ($)</option>
            <option value="AED">AED (د.إ)</option>
            <option value="EGP">EGP (£)</option>
            <option value="CAD">CAD ($)</option>
          </select>
        </div>

        <div>
          <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
            <Users className="inline w-4 h-4 mr-1" />
            Event Capacity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="capacity"
            name="capacity"
            value={capacity}
            onChange={onCapacityChange}
            min="1"
            className={`w-full px-3 py-2 border ${errors.capacity ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
            placeholder="e.g. 50"
          />
          {errors.capacity && <p className="mt-1 text-sm text-red-500">{errors.capacity}</p>}
          <p className="mt-1 text-xs text-gray-500">Total event capacity</p>
        </div>
      </div>

      {/* Schedule & Pricing Section */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              <Calendar className="inline w-5 h-5 mr-2" />
              Event Schedules & Pricing
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Add multiple date ranges with individual pricing for each schedule
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => onAddSchedule(false)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Schedule
            </button>
            <button
              type="button"
              onClick={() => onAddSchedule(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-amber-500 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
            >
              <Star className="w-4 h-4 mr-2" />
              Add Special Dates
            </button>
          </div>
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
          <div className="space-y-4">
            {schedules.map((schedule, index) => (
              <div
                key={schedule.id}
                className={`rounded-lg p-4 shadow-sm ${
                  schedule.isSpecialDate
                    ? 'bg-amber-50 border-2 border-amber-300'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {schedule.isSpecialDate ? (
                        <>
                          <Star className="inline w-4 h-4 mr-1 text-amber-500" />
                          Special Date Schedule #{index + 1}
                        </>
                      ) : (
                        <>Schedule #{index + 1}</>
                      )}
                    </h4>
                    {schedule.isSpecialDate && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        Special Date
                      </span>
                    )}
                    {schedule.isOverride && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        Override
                      </span>
                    )}
                  </div>
                  {schedules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveSchedule(index)}
                      className="text-red-600 hover:text-red-700 focus:outline-none"
                      title="Remove schedule"
                    >
                      <Trash2 className="w-4 h-4" />
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
                      Available Seats <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={schedule.unlimitedSeats ? '' : schedule.availableSeats}
                      onChange={(e) => onScheduleChange(index, 'availableSeats', e.target.value)}
                      min="1"
                      disabled={schedule.unlimitedSeats}
                      className={`w-full px-3 py-2 border ${
                        errors[`schedule_${index}_availableSeats`] ? 'border-red-500' : 'border-gray-300'
                      } rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary ${
                        schedule.unlimitedSeats ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder={schedule.unlimitedSeats ? 'Unlimited' : 'e.g. 30'}
                    />
                    {errors[`schedule_${index}_availableSeats`] && (
                      <p className="mt-1 text-sm text-red-500">{errors[`schedule_${index}_availableSeats`]}</p>
                    )}

                    {/* Unlimited Capacity Checkbox */}
                    <div className="mt-2">
                      <label className="flex items-center text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={schedule.unlimitedSeats || false}
                          onChange={(e) => onScheduleChange(index, 'unlimitedSeats', e.target.checked)}
                          className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        Unlimited Capacity (ideal for online events)
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

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {schedule.isSpecialDate ? 'Special Price' : 'Price'} ({currency}) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={schedule.price}
                      onChange={(e) => onScheduleChange(index, 'price', e.target.value)}
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 border ${
                        errors[`schedule_${index}_price`] ? 'border-red-500' : 'border-gray-300'
                      } rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                      placeholder={schedule.isSpecialDate ? 'e.g. 35.00 (special pricing)' : 'e.g. 25.00'}
                    />
                    {errors[`schedule_${index}_price`] && (
                      <p className="mt-1 text-sm text-red-500">{errors[`schedule_${index}_price`]}</p>
                    )}
                  </div>

                  {/* Total Seats (Admin-specific field) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Seats (Capacity Tracking)
                    </label>
                    <input
                      type="number"
                      value={schedule.totalSeats || ''}
                      onChange={(e) => onScheduleChange(index, 'totalSeats', e.target.value)}
                      min="0"
                      disabled={schedule.unlimitedSeats}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary ${
                        schedule.unlimitedSeats ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder="e.g. 50"
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
      </div>
    </div>
  );
};

export default SchedulePricingTab;
