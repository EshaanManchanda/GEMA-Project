import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaSave, FaSpinner, FaClock, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface DayHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface BusinessHoursEditorProps {
  currentHours?: Partial<Record<keyof BusinessHours, string | DayHours>>;
  onSave: (hours: BusinessHours) => Promise<void>;
  isLoading?: boolean;
}

const DAYS: Array<keyof BusinessHours> = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DAY_LABELS: Record<keyof BusinessHours, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

// Helper to parse old string format or return DayHours
const parseHours = (value: string | DayHours | undefined): DayHours => {
  if (!value) {
    return { isOpen: false, openTime: '09:00', closeTime: '17:00' };
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'closed') {
      return { isOpen: false, openTime: '09:00', closeTime: '17:00' };
    }
    // Parse "9:00 AM - 5:00 PM" format
    const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      const [, openHour, openMin, openPeriod, closeHour, closeMin, closePeriod] = match;

      const convert24Hour = (hour: string, minute: string, period?: string) => {
        let h = parseInt(hour);
        if (period?.toUpperCase() === 'PM' && h !== 12) h += 12;
        if (period?.toUpperCase() === 'AM' && h === 12) h = 0;
        return `${h.toString().padStart(2, '0')}:${minute}`;
      };

      return {
        isOpen: true,
        openTime: convert24Hour(openHour, openMin, openPeriod),
        closeTime: convert24Hour(closeHour, closeMin, closePeriod),
      };
    }
    return { isOpen: false, openTime: '09:00', closeTime: '17:00' };
  }

  return value;
};

const BusinessHoursEditor: React.FC<BusinessHoursEditorProps> = ({
  currentHours,
  onSave,
  isLoading = false,
}) => {
  const [hours, setHours] = useState<BusinessHours>({
    monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
    friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
    saturday: { isOpen: false, openTime: '09:00', closeTime: '17:00' },
    sunday: { isOpen: false, openTime: '09:00', closeTime: '17:00' },
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentHours) {
      const parsed: BusinessHours = {
        monday: parseHours(currentHours.monday),
        tuesday: parseHours(currentHours.tuesday),
        wednesday: parseHours(currentHours.wednesday),
        thursday: parseHours(currentHours.thursday),
        friday: parseHours(currentHours.friday),
        saturday: parseHours(currentHours.saturday),
        sunday: parseHours(currentHours.sunday),
      };
      setHours(parsed);
    }
  }, [currentHours]);

  const handleToggleDay = (day: keyof BusinessHours) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day].isOpen,
      },
    }));
  };

  const handleTimeChange = (day: keyof BusinessHours, field: 'openTime' | 'closeTime', value: string) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));

    // Clear error for this day
    if (errors[day]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[day];
        return newErrors;
      });
    }
  };

  const handleCopyToAll = (sourceDay: keyof BusinessHours) => {
    const sourceDayHours = hours[sourceDay];
    const newHours: BusinessHours = {} as BusinessHours;

    DAYS.forEach(day => {
      newHours[day] = { ...sourceDayHours };
    });

    setHours(newHours);
    toast.success(`Applied ${DAY_LABELS[sourceDay]} hours to all days`);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    DAYS.forEach(day => {
      if (hours[day].isOpen) {
        const { openTime, closeTime } = hours[day];

        // Convert to minutes for comparison
        const openMinutes = parseInt(openTime.split(':')[0]) * 60 + parseInt(openTime.split(':')[1]);
        const closeMinutes = parseInt(closeTime.split(':')[0]) * 60 + parseInt(closeTime.split(':')[1]);

        if (closeMinutes <= openMinutes) {
          newErrors[day] = 'Close time must be after open time';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the errors in business hours');
      return;
    }

    setSaving(true);
    try {
      await onSave(hours);
      toast.success('Business hours saved successfully');
    } catch (error: any) {
      console.error('Error saving business hours:', error);
      toast.error(error.response?.data?.message || 'Failed to save business hours');
    } finally {
      setSaving(false);
    }
  };

  const formatDisplayTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${minutes} ${period}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
          <FaClock className="text-purple-600 text-xl" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Business Hours</h3>
          <p className="text-sm text-gray-600">Set your operating hours for each day of the week</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {DAYS.map((day, index) => (
          <motion.div
            key={day}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-white border-2 rounded-xl p-4 transition-colors ${
              errors[day] ? 'border-red-300' : 'border-gray-200'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Day Label and Toggle */}
              <div className="flex items-center justify-between md:w-48">
                <label className="font-medium text-gray-900 capitalize">
                  {DAY_LABELS[day]}
                </label>
                <button
                  type="button"
                  onClick={() => handleToggleDay(day)}
                  className="flex items-center gap-2 text-sm"
                  disabled={isLoading || saving}
                >
                  {hours[day].isOpen ? (
                    <>
                      <FaToggleOn className="text-green-600 text-2xl" />
                      <span className="text-green-600 font-medium">Open</span>
                    </>
                  ) : (
                    <>
                      <FaToggleOff className="text-gray-400 text-2xl" />
                      <span className="text-gray-500">Closed</span>
                    </>
                  )}
                </button>
              </div>

              {/* Time Inputs */}
              {hours[day].isOpen ? (
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Open</label>
                    <input
                      type="time"
                      value={hours[day].openTime}
                      onChange={(e) => handleTimeChange(day, 'openTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading || saving}
                    />
                  </div>

                  <div className="pt-5 text-gray-400">—</div>

                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Close</label>
                    <input
                      type="time"
                      value={hours[day].closeTime}
                      onChange={(e) => handleTimeChange(day, 'closeTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading || saving}
                    />
                  </div>

                  <div className="pt-5">
                    <button
                      type="button"
                      onClick={() => handleCopyToAll(day)}
                      className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                      disabled={isLoading || saving}
                    >
                      Copy to All
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 text-gray-500 italic">
                  Closed all day
                </div>
              )}
            </div>

            {errors[day] && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-sm mt-2"
              >
                {errors[day]}
              </motion.p>
            )}
          </motion.div>
        ))}

        {/* Preview */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <h4 className="font-semibold text-gray-900 mb-4">Hours Preview</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DAYS.map(day => (
              <div key={day} className="flex justify-between text-sm">
                <span className="font-medium text-gray-700 capitalize">{DAY_LABELS[day]}:</span>
                <span className="text-gray-600">
                  {hours[day].isOpen
                    ? `${formatDisplayTime(hours[day].openTime)} - ${formatDisplayTime(hours[day].closeTime)}`
                    : 'Closed'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || isLoading}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <FaSpinner className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FaSave />
                Save Business Hours
              </>
            )}
          </button>
        </div>
      </form>

      {/* Help Text */}
      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
        <h5 className="font-medium text-yellow-900 mb-2">Tips</h5>
        <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
          <li>Use the "Copy to All" button to quickly set the same hours for all days</li>
          <li>Toggle the switch to mark a day as closed</li>
          <li>Make sure your closing time is after your opening time</li>
        </ul>
      </div>
    </div>
  );
};

export default BusinessHoursEditor;
