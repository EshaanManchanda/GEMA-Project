import React from 'react';
import { Plus, Trash2, Calendar, DollarSign, Users } from 'lucide-react';

interface Schedule {
  id: string;
  startDate: string;
  endDate: string;
  availableSeats: string;
  price: string;
  unlimitedSeats?: boolean;
}

interface SchedulePricingTabProps {
  schedules: Schedule[];
  currency: string;
  capacity: string;
  errors: Record<string, string>;
  onScheduleChange: (index: number, field: keyof Schedule, value: string) => void;
  onAddSchedule: () => void;
  onRemoveSchedule: (index: number) => void;
  onCurrencyChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onCapacityChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SchedulePricingTab: React.FC<SchedulePricingTabProps> = ({
  schedules,
  currency,
  capacity,
  errors,
  onScheduleChange,
  onAddSchedule,
  onRemoveSchedule,
  onCurrencyChange,
  onCapacityChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Capacity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
          <button
            type="button"
            onClick={onAddSchedule}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Schedule
          </button>
        </div>

        {schedules.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-gray-900 mb-1">No schedules added yet</h4>
            <p className="text-sm text-gray-500 mb-4">
              Add at least one schedule with dates and pricing
            </p>
            <button
              type="button"
              onClick={onAddSchedule}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Schedule
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule, index) => (
              <div key={schedule.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-900">
                    Schedule #{index + 1}
                  </h4>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date <span className="text-red-500">*</span>
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
                      End Date <span className="text-red-500">*</span>
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
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price ({currency}) <span className="text-red-500">*</span>
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
                      placeholder="e.g. 25.00"
                    />
                    {errors[`schedule_${index}_price`] && (
                      <p className="mt-1 text-sm text-red-500">{errors[`schedule_${index}_price`]}</p>
                    )}
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
