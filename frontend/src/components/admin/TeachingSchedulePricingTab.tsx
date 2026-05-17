import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, DollarSign, Users, Clock, Repeat, Edit3, X, Check, Copy } from 'lucide-react';

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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [modalForm, setModalForm] = useState<Partial<Schedule>>({
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    availableSeats: '10',
    price: '',
    unlimitedSeats: false,
  });

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

  const openModal = (index: number | null = null) => {
    setEditingIndex(index);
    if (index !== null) {
      setModalForm({ ...schedules[index] });
    } else {
      setModalForm({
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        availableSeats: '10',
        price: basePrice || '',
        unlimitedSeats: false,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingIndex(null);
  };

  const handleModalSave = () => {
    if (editingIndex !== null) {
      // Update existing
      Object.entries(modalForm).forEach(([field, value]) => {
        if (value !== undefined) {
          onScheduleChange(editingIndex, field as keyof Schedule, value as any);
        }
      });
    } else {
      // Add new
      onAddSchedule(false);
      const newIdx = schedules.length;
      setTimeout(() => {
        Object.entries(modalForm).forEach(([field, value]) => {
          if (value !== undefined) {
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
        availableSeats: '10',
        price: basePrice || '',
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
    <div className="space-y-8">
      {/* ── Pricing Overview ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-purple-600" />
          Pricing Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Base Price {!isFreeEvent && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">{currency}</span>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={isFreeEvent ? '0' : basePrice}
                onChange={onBasePriceChange}
                disabled={isFreeEvent}
                placeholder="0.00"
                className={`w-full pl-12 pr-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg font-medium transition-colors ${errors.basePrice ? 'border-red-400 focus:ring-red-500' : 'border-gray-200'
                  } ${isFreeEvent ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}`}
              />
            </div>
            {errors.basePrice && <p className="text-red-500 text-sm mt-1">{errors.basePrice}</p>}
            <p className="mt-2 text-xs text-gray-500">This price will be used as default for new sessions.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Currency</label>
            <select
              value={currency}
              onChange={onCurrencyChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-base font-medium bg-white"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Sessions Management ── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-gray-100 gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Manage Sessions
            </h3>
            <p className="text-sm text-gray-500 mt-1">Create and manage your class dates and timings.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowRecurring(!showRecurring)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${showRecurring
                  ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-inner'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm hover:shadow'
                }`}
            >
              <Repeat className="w-4 h-4" />
              Generate Recurring
            </button>
            <button
              type="button"
              onClick={() => openModal(null)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              Add Session
            </button>
          </div>
        </div>

        {/* Recurring Generator Panel */}
        {showRecurring && (
          <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-b border-purple-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-1">
                <label className="block text-sm font-semibold text-purple-900 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={recurringDate}
                  onChange={(e) => setRecurringDate(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-sm font-semibold text-purple-900 mb-1.5">Pattern</label>
                <select
                  value={recurringPattern}
                  onChange={(e) => setRecurringPattern(e.target.value as 'daily' | 'weekly')}
                  className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div className="lg:col-span-1">
                <label className="block text-sm font-semibold text-purple-900 mb-1.5">Count</label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={recurringCount}
                  onChange={(e) => setRecurringCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-sm font-semibold text-purple-900 mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={recurringStartTime}
                  onChange={(e) => setRecurringStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-sm font-semibold text-purple-900 mb-1.5">End Time</label>
                <input
                  type="time"
                  value={recurringEndTime}
                  onChange={(e) => setRecurringEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={generateRecurringSessions}
                disabled={!recurringDate}
                className="px-6 py-2.5 font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
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
              <div className="w-16 h-16 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">No sessions scheduled</h4>
              <p className="text-gray-500 max-w-sm mb-6">Create single sessions or use the recurring generator to quickly build out your class schedule.</p>
              <button
                type="button"
                onClick={() => openModal(null)}
                className="inline-flex items-center gap-2 px-5 py-2.5 font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors shadow-md"
              >
                <Plus className="w-5 h-5" />
                Create First Session
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {schedules.map((schedule, index) => (
                <div key={schedule.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                  {/* Overlap badge */}
                  {schedule.isOverride && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                      OVERRIDE
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex flex-col items-center justify-center text-purple-700 flex-shrink-0">
                        <span className="text-xs font-bold leading-none mb-0.5">
                          {schedule.startDate ? new Date(schedule.startDate).toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '---'}
                        </span>
                        <span className="text-lg font-black leading-none">
                          {schedule.startDate ? new Date(schedule.startDate).getDate() : '--'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 leading-tight">
                          {schedule.startDate ? new Date(schedule.startDate).toLocaleDateString('en-US', { weekday: 'long' }) : 'No Date Set'}
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
                        {isFreeEvent ? (
                          <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded text-xs">FREE</span>
                        ) : (
                          `${currency} ${schedule.price || basePrice || '0'}`
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
                      className="text-xs font-medium text-gray-500 hover:text-purple-600 flex items-center gap-1 transition-colors"
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
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

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Date *</label>
                  <input
                    type="date"
                    value={modalForm.startDate || ''}
                    onChange={(e) => setModalForm(prev => ({ ...prev, startDate: e.target.value, endDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={modalForm.endDate || ''}
                    onChange={(e) => setModalForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Time</label>
                  <input
                    type="time"
                    value={modalForm.startTime || ''}
                    onChange={(e) => setModalForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Time</label>
                  <input
                    type="time"
                    value={modalForm.endTime || ''}
                    onChange={(e) => setModalForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={isFreeEvent ? '0' : (modalForm.price || '')}
                    onChange={(e) => setModalForm(prev => ({ ...prev, price: e.target.value }))}
                    disabled={isFreeEvent}
                    placeholder={basePrice || '0.00'}
                    className={`w-full px-3 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${isFreeEvent ? 'bg-gray-100 text-gray-400 border-gray-200' : 'border-gray-300'
                      }`}
                  />
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
                    className={`w-full px-3 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${modalForm.unlimitedSeats ? 'bg-gray-100 text-gray-400 border-gray-200' : 'border-gray-300'
                      }`}
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
                  <div className={`relative w-10 h-6 rounded-full transition-colors ${modalForm.unlimitedSeats ? 'bg-purple-600' : 'bg-gray-300 group-hover:bg-gray-400'}`}>
                    <input type="checkbox" className="sr-only" checked={modalForm.unlimitedSeats || false} onChange={(e) => setModalForm(prev => ({ ...prev, unlimitedSeats: e.target.checked }))} />
                    <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${modalForm.unlimitedSeats ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </label>

                <label className="flex items-center justify-between cursor-pointer group pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Priority Override</p>
                    <p className="text-xs text-gray-500">Prioritize this session if dates conflict</p>
                  </div>
                  <div className={`relative w-10 h-6 rounded-full transition-colors ${modalForm.isOverride ? 'bg-amber-500' : 'bg-gray-300 group-hover:bg-gray-400'}`}>
                    <input type="checkbox" className="sr-only" checked={modalForm.isOverride || false} onChange={(e) => setModalForm(prev => ({ ...prev, isOverride: e.target.checked }))} />
                    <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${modalForm.isOverride ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
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
                className="px-6 py-2.5 flex items-center gap-2 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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

export default TeachingSchedulePricingTab;
