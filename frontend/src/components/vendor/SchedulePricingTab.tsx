import React, { useState } from 'react';
import { Plus, Trash2, Calendar, DollarSign, Users, Clock, Repeat, Edit3, X, Check, Copy, Star } from 'lucide-react';
import { TIMEZONE_OPTIONS } from '../../utils/timezoneUtils';

interface Schedule {
  id: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  availableSeats: string;
  price: string;
  unlimitedSeats?: boolean;
  isSpecialDate?: boolean;
  specialDates?: string[];
  priority?: number;
  isOverride?: boolean;
  timeSlots?: Array<{
    date: string;
    startTime: string;
    availableSeats: string;
  }>;
  sessionType?: string;
  ratePerClass?: string;
  isFreeSession?: boolean;
}

interface SchedulePricingTabProps {
  schedules: Schedule[];
  currency: string;
  capacity: string;
  eventType?: string;
  errors: Record<string, string>;
  isFreeEvent?: boolean;
  basePrice?: string;
  timezone?: string;
  onFreeEventChange?: (val: boolean) => void;
  onBasePriceChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTimezoneChange?: (timezone: string) => void;
  onScheduleChange: (index: number, field: keyof Schedule, value: string | boolean | string[] | number) => void;
  onAddSchedule: (isSpecialDate?: boolean) => void;
  onRemoveSchedule: (index: number) => void;
  onCurrencyChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onCapacityChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const COMPETITION_TYPES = ['Olympiad', 'Championship', 'Competition'];

const getCapacityLabel = (type?: string) => {
  if (type === 'Venue') return 'Venue Capacity';
  if (type === 'Course' || type === 'Workshop') return 'Seats per Session';
  if (type && COMPETITION_TYPES.includes(type)) return 'Max Participants';
  return 'Event Capacity';
};

const SectionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 ${className}`}>
    {children}
  </div>
);

const FieldGroup: React.FC<{ label: string; hint?: React.ReactNode; required?: boolean; children: React.ReactNode; }> = ({ label, hint, required, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {hint && <div className="text-xs text-gray-400 mt-1.5">{hint}</div>}
  </div>
);

const inputCls = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow placeholder-gray-400';

const SchedulePricingTab: React.FC<SchedulePricingTabProps> = ({
  schedules,
  currency,
  capacity,
  eventType,
  errors,
  isFreeEvent = false,
  basePrice: _basePrice = '',
  timezone = 'Asia/Dubai',
  onFreeEventChange,
  onBasePriceChange: _onBasePriceChange,
  onTimezoneChange,
  onScheduleChange,
  onAddSchedule,
  onRemoveSchedule,
  onCurrencyChange,
  onCapacityChange,
}) => {
  const [showRecurring, setShowRecurring] = useState(false);
  const [recurringDate, setRecurringDate] = useState('');
  const [recurringPattern, setRecurringPattern] = useState<'daily' | 'weekly'>('weekly');
  const [recurringCount, setRecurringCount] = useState(4);
  const [recurringStartTime, setRecurringStartTime] = useState('09:00');
  const [recurringEndTime, setRecurringEndTime] = useState('10:00');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const isEducational = ['Course', 'Workshop', 'Bootcamp', 'Class', 'Masterclass'].includes(eventType || '');

  const [modalForm, setModalForm] = useState<Partial<Schedule> & { scheduleType?: 'single' | 'cohort', cohortDays?: string[] }>({
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    availableSeats: capacity || '10',
    price: _basePrice || '',
    unlimitedSeats: false,
    scheduleType: 'single',
    cohortDays: [],
    sessionType: 'Intro Session',
    ratePerClass: '',
  });

  const openModal = (index: number | null = null) => {
    setEditingIndex(index);
    if (index !== null) {
      const schedule = schedules[index];
      const isCohort = schedule.timeSlots && schedule.timeSlots.length > 0;
      const cohortDays = isCohort 
        ? Array.from(new Set(schedule.timeSlots!.map(t => new Date(t.date).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }))))
        : [];
        
      setModalForm({ 
        ...schedule,
        scheduleType: isCohort ? 'cohort' : 'single',
        cohortDays: cohortDays
      });
    } else {
      setModalForm({
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        availableSeats: capacity || '10',
        price: _basePrice || '',
        unlimitedSeats: false,
        scheduleType: 'single',
        cohortDays: [],
        sessionType: 'Intro Session',
        ratePerClass: '',
        isFreeSession: false,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingIndex(null);
  };

  const handleModalSave = () => {
    let finalForm = { ...modalForm };

    if (finalForm.scheduleType === 'cohort' && finalForm.startDate && finalForm.endDate && finalForm.cohortDays && finalForm.cohortDays.length > 0) {
      const start = new Date(finalForm.startDate);
      const end = new Date(finalForm.endDate);
      const daysMap: Record<string, number> = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
      const selectedDays = finalForm.cohortDays.map(d => daysMap[d]);
      
      const timeSlots = [];
      let currentDate = new Date(start);
      while (currentDate <= end) {
        if (selectedDays.includes(currentDate.getDay())) {
          timeSlots.push({
            date: currentDate.toISOString().split('T')[0],
            startTime: finalForm.startTime || '',
            endTime: finalForm.endTime || '',
            availableSeats: finalForm.unlimitedSeats ? 999999 : (parseInt(finalForm.availableSeats || '0') || 0),
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      finalForm.timeSlots = timeSlots as any;
    }

    if (editingIndex !== null) {
      Object.entries(finalForm).forEach(([field, value]) => {
        if (value !== undefined && field !== 'scheduleType' && field !== 'cohortDays') {
          onScheduleChange(editingIndex, field as keyof Schedule, value as any);
        }
      });
    } else {
      onAddSchedule(false);
      const newIdx = schedules.length;
      setTimeout(() => {
        Object.entries(finalForm).forEach(([field, value]) => {
          if (value !== undefined && field !== 'scheduleType' && field !== 'cohortDays') {
            onScheduleChange(newIdx, field as keyof Schedule, value as any);
          }
        });
      }, 50);
    }
    closeModal();
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
        availableSeats: capacity || '10',
        price: _basePrice || '',
        unlimitedSeats: false,
      };
    });

    newSessions.forEach((session, i) => {
      onAddSchedule(false);
      const targetIdx = schedules.length + i;
      setTimeout(() => {
        onScheduleChange(targetIdx, 'startDate', session.startDate);
        onScheduleChange(targetIdx, 'endDate', session.endDate);
        onScheduleChange(targetIdx, 'startTime', session.startTime!);
        onScheduleChange(targetIdx, 'endTime', session.endTime!);
        onScheduleChange(targetIdx, 'price', session.price!);
        onScheduleChange(targetIdx, 'availableSeats', session.availableSeats!);
      }, (i + 1) * 50);
    });
    setShowRecurring(false);
    setRecurringDate('');
  };

  const duplicateSession = (index: number) => {
    const sessionToDuplicate = schedules[index];
    onAddSchedule(false);
    const targetIdx = schedules.length;
    setTimeout(() => {
      Object.entries(sessionToDuplicate).forEach(([field, value]) => {
        if (field !== 'id' && field !== '_id' && value !== undefined) {
          onScheduleChange(targetIdx, field as keyof Schedule, value as any);
        }
      });
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <SectionCard>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">General Settings</h3>
        <div className="space-y-6">
          {/* Free Event Toggle */}
          {onFreeEventChange && !isEducational && (
            <div
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${isFreeEvent ? 'bg-green-50/50 border-green-400 ring-1 ring-green-400' : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50/30'}`}
              onClick={() => onFreeEventChange(!isFreeEvent)}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isFreeEvent ? 'bg-green-500 border-green-500' : 'border-gray-400'}`}>
                {isFreeEvent && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
              <div>
                <p className={`font-semibold text-sm ${isFreeEvent ? 'text-green-700' : 'text-gray-700'}`}>Free Event (No Payment Required)</p>
                <p className="text-xs text-gray-500 mt-0.5">Attendees register without paying — registration form is still collected</p>
              </div>
              {isFreeEvent && <span className="ml-auto bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Free</span>}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {!isEducational && (
              <FieldGroup
                label="Base Price"
                required={!isFreeEvent}
              >
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm font-medium">{currency}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={isFreeEvent ? '0' : _basePrice}
                    onChange={_onBasePriceChange}
                    disabled={isFreeEvent}
                    placeholder="0.00"
                    className={`${inputCls} pl-12 ${errors.basePrice ? 'border-red-500 focus:ring-red-500' : ''} ${isFreeEvent ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : ''}`}
                  />
                </div>
                {errors.basePrice && <p className="mt-1 text-sm text-red-500">{errors.basePrice}</p>}
              </FieldGroup>
            )}

            {!isEducational && (
              <FieldGroup label="Currency">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                  <select
                    id="currency"
                    name="currency"
                    value={currency}
                    onChange={onCurrencyChange}
                    className={`${inputCls} pl-10`}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="EGP">EGP (£)</option>
                    <option value="CAD">CAD ($)</option>
                  </select>
                </div>
              </FieldGroup>
            )}
          </div>

          {/* Timezone */}
          {onTimezoneChange && (
            <FieldGroup label="Timezone" hint="All session start/end times are interpreted in this timezone.">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  🌐
                </div>
                <select
                  value={timezone}
                  onChange={e => onTimezoneChange(e.target.value)}
                  className={`${inputCls} pl-10`}
                >
                  {TIMEZONE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </FieldGroup>
          )}
        </div>
      </SectionCard>

      {/* ── Sessions Management ── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-gray-100 gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              Manage Sessions
            </h3>
            <p className="text-sm text-gray-500 mt-1">Create and manage your event dates and timings.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowRecurring(!showRecurring)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${showRecurring
                  ? 'bg-green-100 text-green-700 border border-green-200 shadow-inner'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm hover:shadow'
                }`}
            >
              <Repeat className="w-4 h-4" />
              Generate Recurring
            </button>
            <button
              type="button"
              onClick={() => openModal(null)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl hover:from-green-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              Add Session
            </button>
          </div>
        </div>

        {/* Recurring Generator Panel */}
        {showRecurring && (
          <div className="p-6 bg-gradient-to-br from-green-50 to-teal-50 border-b border-green-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-1">
                <label className="block text-sm font-semibold text-green-900 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={recurringDate}
                  onChange={(e) => setRecurringDate(e.target.value)}
                  className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-sm font-semibold text-green-900 mb-1.5">Pattern</label>
                <select
                  value={recurringPattern}
                  onChange={(e) => setRecurringPattern(e.target.value as 'daily' | 'weekly')}
                  className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div className="lg:col-span-1">
                <label className="block text-sm font-semibold text-green-900 mb-1.5">Count</label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={recurringCount}
                  onChange={(e) => setRecurringCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-sm font-semibold text-green-900 mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={recurringStartTime}
                  onChange={(e) => setRecurringStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-sm font-semibold text-green-900 mb-1.5">End Time</label>
                <input
                  type="time"
                  value={recurringEndTime}
                  onChange={(e) => setRecurringEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={generateRecurringSessions}
                disabled={!recurringDate}
                className="px-6 py-2.5 font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                Generate {recurringCount} Sessions
              </button>
            </div>
          </div>
        )}

        {/* Sessions Summary List */}
        <div className="p-6 bg-gray-50/50">
          {schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">No sessions scheduled</h4>
              <p className="text-gray-500 max-w-sm mb-6">Create single sessions or use the recurring generator to quickly build out your event schedule.</p>
              <button
                type="button"
                onClick={() => openModal(null)}
                className="inline-flex items-center gap-2 px-5 py-2.5 font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors shadow-md"
              >
                <Plus className="w-5 h-5" />
                Create First Session
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {schedules.map((schedule, index) => (
                <div key={schedule.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex flex-col items-center justify-center text-green-700 flex-shrink-0">
                        <span className="text-xs font-bold leading-none mb-0.5">
                          {schedule.startDate ? new Date(schedule.startDate).toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '---'}
                        </span>
                        <span className="text-lg font-black leading-none">
                          {schedule.startDate ? new Date(schedule.startDate).getDate() : '--'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 leading-tight flex items-center gap-2">
                          {schedule.startDate ? new Date(schedule.startDate).toLocaleDateString('en-US', { weekday: 'long' }) : 'No Date Set'}
                          {schedule.timeSlots && schedule.timeSlots.length > 0 && (
                            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Cohort ({schedule.timeSlots.length} meetings)
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center text-sm text-gray-500 mt-1 font-medium">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {schedule.startTime || 'TBD'} - {schedule.endTime || 'TBD'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Price</span>
                      <span className="font-semibold text-gray-800 flex items-center">
                        {isFreeEvent || schedule.isFreeSession ? (
                          <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded text-xs">FREE</span>
                        ) : (
                          `${currency} ${schedule.price || _basePrice || '0'}`
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Capacity</span>
                      <span className="font-semibold text-gray-800 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        {schedule.unlimitedSeats ? 'Unlimited' : `${schedule.availableSeats || 0} seats`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => duplicateSession(index)}
                      className="text-xs font-medium text-gray-500 hover:text-green-600 flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Duplicate
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openModal(index)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Session"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveSchedule(index)}
                        disabled={schedules.length === 1}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Delete Session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {errors.schedules && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 flex items-start gap-3">
          <div className="p-1 bg-red-100 rounded-full mt-0.5">
            <X className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Please fix schedule errors</h4>
            <p className="text-sm mt-1">{errors.schedules}</p>
          </div>
        </div>
      )}

      {/* ── Add/Edit Session Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">
                {editingIndex !== null ? 'Edit Session' : 'Add New Session'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto min-h-0">
              {/* Schedule Type Selection */}
              <div className="flex gap-4 p-1 bg-gray-100 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setModalForm(prev => ({ ...prev, scheduleType: 'single' }))}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                    modalForm.scheduleType === 'single' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Single Session
                </button>
                <button
                  type="button"
                  onClick={() => setModalForm(prev => ({ ...prev, scheduleType: 'cohort' }))}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                    modalForm.scheduleType === 'cohort' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Multi-Date Cohort
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {modalForm.scheduleType === 'cohort' ? 'Cohort Start Date *' : 'Start Date *'}
                  </label>
                  <input
                    type="date"
                    value={modalForm.startDate || ''}
                    onChange={(e) => setModalForm(prev => ({ ...prev, startDate: e.target.value, ...(modalForm.scheduleType === 'single' ? { endDate: e.target.value } : {}) }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {modalForm.scheduleType === 'cohort' ? 'Cohort End Date *' : 'End Date *'}
                  </label>
                  <input
                    type="date"
                    value={modalForm.endDate || ''}
                    onChange={(e) => setModalForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                  />
                </div>
              </div>

              {modalForm.scheduleType === 'cohort' && (
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select Days of Week *</label>
                  <div className="flex flex-wrap gap-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                      const isSelected = modalForm.cohortDays?.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setModalForm(prev => {
                              const days = prev.cohortDays || [];
                              return {
                                ...prev,
                                cohortDays: isSelected ? days.filter(d => d !== day) : [...days, day]
                              };
                            });
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                            isSelected 
                              ? 'bg-green-50 border-green-500 text-green-700' 
                              : 'bg-white border-gray-300 text-gray-600 hover:border-green-300'
                          }`}
                        >
                          {day.substring(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Select the days this cohort will run. The system will automatically generate sessions for these days between the start and end dates.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Time *</label>
                  <input
                    type="time"
                    value={modalForm.startTime || ''}
                    onChange={(e) => setModalForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Time *</label>
                  <input
                    type="time"
                    value={modalForm.endTime || ''}
                    onChange={(e) => setModalForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                  />
                </div>
              </div>

              {isEducational && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Session Category / Type</label>
                    <select
                      value={modalForm.sessionType || 'Intro Session'}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setModalForm(prev => ({ 
                          ...prev, 
                          sessionType: newType,
                          ...(newType === 'Intro Session' ? { price: '0', isFreeSession: true } : { isFreeSession: false })
                        }));
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm bg-white"
                    >
                      <option value="Intro Session">Intro Session (Free)</option>
                      <option value="Standard Session">Standard Session</option>
                    </select>
                  </div>
                  {modalForm.scheduleType === 'cohort' && modalForm.sessionType === 'Standard Session' && (
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Rate Per Class ({currency})</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={modalForm.ratePerClass || ''}
                        onChange={(e) => setModalForm(prev => ({ ...prev, ratePerClass: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                        placeholder="e.g. 50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Optional breakdown price per individual class in this cohort.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price</label>
                  <div className="flex rounded-xl shadow-sm border border-gray-300 overflow-hidden">
                    <select
                      value={currency}
                      onChange={onCurrencyChange}
                      className="px-3 pr-8 py-2.5 bg-gray-50 border-r border-gray-300 text-gray-700 font-medium focus:outline-none min-w-[80px]"
                    >
                      {['AED', 'USD', 'EUR', 'GBP', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={isFreeEvent || (isEducational && modalForm.sessionType === 'Intro Session') ? '0' : (modalForm.price || '')}
                      onChange={(e) => setModalForm(prev => ({ ...prev, price: e.target.value }))}
                      disabled={isFreeEvent || (isEducational && modalForm.sessionType === 'Intro Session')}
                      placeholder="0.00"
                      className={`flex-1 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold ${
                        isFreeEvent || (isEducational && modalForm.sessionType === 'Intro Session') ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                      }`}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="freeSessionCheck"
                      checked={isFreeEvent || (isEducational && modalForm.sessionType === 'Intro Session') || modalForm.isFreeSession}
                      disabled={isFreeEvent || (isEducational && modalForm.sessionType === 'Intro Session')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setModalForm(prev => ({ ...prev, price: '0', isFreeSession: true }));
                        } else {
                          setModalForm(prev => ({ ...prev, price: '', isFreeSession: false }));
                        }
                      }}
                      className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="freeSessionCheck" className="text-sm text-gray-700 font-medium cursor-pointer">
                      Free Event
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={modalForm.unlimitedSeats ? '' : (modalForm.availableSeats || '')}
                    onChange={(e) => setModalForm(prev => ({ ...prev, availableSeats: e.target.value }))}
                    disabled={modalForm.unlimitedSeats}
                    placeholder={modalForm.unlimitedSeats ? 'Unlimited' : '10'}
                    className={`w-full px-3 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${modalForm.unlimitedSeats ? 'bg-gray-100 text-gray-400 border-gray-200' : 'border-gray-300'}`}
                  />
                </div>
              </div>

              {/* Toggles Grid */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Unlimited Capacity</p>
                    <p className="text-xs text-gray-500">No maximum limit on attendees</p>
                  </div>
                  <div className={`relative w-10 h-6 rounded-full transition-colors ${modalForm.unlimitedSeats ? 'bg-green-600' : 'bg-gray-300 group-hover:bg-gray-400'}`}>
                    <input type="checkbox" className="sr-only" checked={modalForm.unlimitedSeats || false} onChange={(e) => setModalForm(prev => ({ ...prev, unlimitedSeats: e.target.checked }))} />
                    <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${modalForm.unlimitedSeats ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModalSave}
                disabled={!modalForm.startDate}
                className="px-6 py-2.5 flex items-center gap-2 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                {editingIndex !== null ? 'Save Changes' : 'Add Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePricingTab;
