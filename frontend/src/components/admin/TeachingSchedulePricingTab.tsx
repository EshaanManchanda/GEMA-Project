import React from 'react';
import { Plus, Trash2, Calendar, DollarSign, Users, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

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
  onScheduleChange: (index: number, field: keyof Schedule, value: string | boolean | string[] | number) => void;
  onAddSchedule: (isSpecialDate?: boolean) => void;
  onRemoveSchedule: (index: number) => void;
  onCurrencyChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBasePriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TeachingSchedulePricingTab: React.FC<TeachingSchedulePricingTabProps> = ({
  schedules,
  currency,
  basePrice,
  errors,
  onScheduleChange,
  onAddSchedule,
  onRemoveSchedule,
  onCurrencyChange,
  onBasePriceChange,
}) => {
  return (
    <div className="space-y-8">
      {/* Pricing Overview Card */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-gray-900">
            <DollarSign className="w-6 h-6 mr-3 text-primary-600" />
            Course Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700 mb-2">
                Base Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  id="basePrice"
                  name="basePrice"
                  value={basePrice}
                  onChange={onBasePriceChange}
                  min="0"
                  step="0.01"
                  className={`w-full pl-10 pr-3 py-2 border ${errors.basePrice ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg font-semibold`}
                  placeholder="99.99"
                />
              </div>
              {errors.basePrice && <p className="mt-1 text-sm text-red-500">{errors.basePrice}</p>}
              <p className="mt-2 text-xs text-gray-500">Default course price</p>
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
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
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
              Course Schedule
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {schedules.map((schedule, index) => (
              <div
                key={schedule.id}
                className="p-6 border border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-white hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Schedule #{index + 1}</h4>
                  {schedules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveSchedule(index)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <label htmlFor={`schedule_${index}_startDate`} className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        type="date"
                        id={`schedule_${index}_startDate`}
                        value={schedule.startDate}
                        onChange={(e) =>
                          onScheduleChange(index, 'startDate', e.target.value)
                        }
                        className={`w-full pl-10 pr-3 py-2 border ${
                          errors[`schedule_${index}_startDate`]
                            ? 'border-red-500'
                            : 'border-gray-300'
                        } rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                      />
                    </div>
                    {errors[`schedule_${index}_startDate`] && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors[`schedule_${index}_startDate`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor={`schedule_${index}_endDate`} className="block text-sm font-medium text-gray-700 mb-2">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        type="date"
                        id={`schedule_${index}_endDate`}
                        value={schedule.endDate}
                        onChange={(e) =>
                          onScheduleChange(index, 'endDate', e.target.value)
                        }
                        className={`w-full pl-10 pr-3 py-2 border ${
                          errors[`schedule_${index}_endDate`]
                            ? 'border-red-500'
                            : 'border-gray-300'
                        } rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                      />
                    </div>
                    {errors[`schedule_${index}_endDate`] && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors[`schedule_${index}_endDate`]}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <label htmlFor={`schedule_${index}_startTime`} className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        type="time"
                        id={`schedule_${index}_startTime`}
                        value={schedule.startTime || ''}
                        onChange={(e) =>
                          onScheduleChange(index, 'startTime', e.target.value)
                        }
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`schedule_${index}_endTime`} className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        type="time"
                        id={`schedule_${index}_endTime`}
                        value={schedule.endTime || ''}
                        onChange={(e) =>
                          onScheduleChange(index, 'endTime', e.target.value)
                        }
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="flex items-center cursor-pointer mb-3">
                      <input
                        type="checkbox"
                        checked={schedule.unlimitedSeats || false}
                        onChange={(e) =>
                          onScheduleChange(index, 'unlimitedSeats', e.target.checked)
                        }
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">Unlimited Seats</span>
                    </label>

                    {!schedule.unlimitedSeats && (
                      <div>
                        <label htmlFor={`schedule_${index}_availableSeats`} className="block text-sm font-medium text-gray-700 mb-2">
                          Available Seats <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                          <input
                            type="number"
                            id={`schedule_${index}_availableSeats`}
                            value={schedule.availableSeats}
                            onChange={(e) =>
                              onScheduleChange(index, 'availableSeats', e.target.value)
                            }
                            min="1"
                            max="10000"
                            className={`w-full pl-10 pr-3 py-2 border ${
                              errors[`schedule_${index}_availableSeats`]
                                ? 'border-red-500'
                                : 'border-gray-300'
                            } rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                            placeholder="30"
                          />
                        </div>
                        {errors[`schedule_${index}_availableSeats`] && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors[`schedule_${index}_availableSeats`]}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor={`schedule_${index}_price`} className="block text-sm font-medium text-gray-700 mb-2">
                      Price ({currency}) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        type="number"
                        id={`schedule_${index}_price`}
                        value={schedule.price}
                        onChange={(e) =>
                          onScheduleChange(index, 'price', e.target.value)
                        }
                        min="0"
                        step="0.01"
                        className={`w-full pl-10 pr-3 py-2 border ${
                          errors[`schedule_${index}_price`]
                            ? 'border-red-500'
                            : 'border-gray-300'
                        } rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                        placeholder="99.99"
                      />
                    </div>
                    {errors[`schedule_${index}_price`] && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors[`schedule_${index}_price`]}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={schedule.isSpecialDate || false}
                      onChange={(e) =>
                        onScheduleChange(index, 'isSpecialDate', e.target.checked)
                      }
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Mark as Special/Premium Schedule</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Tips */}
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Schedule Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Add multiple schedules to offer different course dates or time slots</li>
          <li>Set different prices for different schedules if needed</li>
          <li>Enable "Unlimited Seats" for courses without seat restrictions</li>
          <li>Mark premium sessions with "Special/Premium Schedule" for higher pricing</li>
          <li>Include start and end times for better clarity</li>
        </ul>
      </div>
    </div>
  );
};

export default TeachingSchedulePricingTab;
