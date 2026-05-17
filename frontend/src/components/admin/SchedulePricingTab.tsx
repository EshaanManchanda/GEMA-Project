import React, { useState } from 'react';
import { Plus, Trash2, Calendar, DollarSign, Users, Clock, ChevronDown, ChevronUp, Repeat, Edit3, X, Check, Copy } from 'lucide-react';
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [modalForm, setModalForm] = useState<Partial<Schedule>>({
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    availableSeats: '',
    price: '',
    unlimitedSeats: false,
    isOverride: false,
    priority: 0,
  });

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
        onScheduleChange(newIdx, 'price', basePrice || '0');
        onScheduleChange(newIdx, 'availableSeats', capacity || '10');
      }, (i + 1) * 50);
    }
    setShowRecurring(false);
    setRecurringDate('');
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
        availableSeats: capacity || '10',
        price: basePrice || '',
        unlimitedSeats: unlimitedCapacity,
        isOverride: false,
        priority: 0,
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
      Object.entries(modalForm).forEach(([field, value]) => {
        if (value !== undefined && field !== 'id' && field !== '_id') {
          onScheduleChange(editingIndex, field as keyof Schedule, value);
        }
      });
    } else {
      onAddSchedule(false);
      const newIdx = schedules.length;
      setTimeout(() => {
        Object.entries(modalForm).forEach(([field, value]) => {
          if (value !== undefined && field !== 'id' && field !== '_id') {
            onScheduleChange(newIdx, field as keyof Schedule, value);
          }
        });
      }, 50);
    }
    closeModal();
  };

  const duplicateSession = (index: number) => {
    const sessionToDuplicate = schedules[index];
    onAddSchedule(false);
    const targetIdx = schedules.length;
    setTimeout(() => {
      Object.entries(sessionToDuplicate).forEach(([field, value]) => {
        if (field !== 'id' && field !== '_id' && value !== undefined) {
          onScheduleChange(targetIdx, field as keyof Schedule, value);
        }
      });
    }, 50);
  };

  return (
    <div className="space-y-8">
      {/* ── Pricing Overview ── */}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg font-semibold"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Global Capacity */}
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

      {/* ── Sessions List ── */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-2xl flex items-center text-gray-900">
              <Calendar className="w-6 h-6 mr-3 text-primary-600" />
              Sessions
              {schedules.length > 0 && (
                <span className="ml-3 text-sm font-medium bg-primary-100 text-primary-700 px-2.5 py-1 rounded-full">
                  {schedules.length}
                </span>
              )}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowRecurring(!showRecurring)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                  showRecurring
                    ? 'bg-primary-100 text-primary-700 border border-primary-200 shadow-inner'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm hover:shadow'
                }`}
              >
                <Repeat className="w-4 h-4" />
                Recurring
              </button>
              <button
                type="button"
                onClick={() => openModal(null)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-primary-500 to-primary-700 text-white rounded-xl hover:from-primary-600 hover:to-primary-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                Add Session
              </button>
            </div>
          </div>

          {/* Recurring Generator */}
          {showRecurring && (
            <div className="mt-4 p-6 bg-gradient-to-br from-primary-50 to-primary-100/50 border border-primary-100 rounded-xl space-y-4">
              <p className="text-sm font-bold text-primary-800 flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                Generate Recurring Sessions
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-1">
                  <label className="block text-sm font-semibold text-primary-900 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={recurringDate}
                    onChange={(e) => setRecurringDate(e.target.value)}
                    className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm bg-white"
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-sm font-semibold text-primary-900 mb-1.5">Pattern</label>
                  <select
                    value={recurringPattern}
                    onChange={(e) => setRecurringPattern(e.target.value as 'daily' | 'weekly')}
                    className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm bg-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-sm font-semibold text-primary-900 mb-1.5">Count</label>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={recurringCount}
                    onChange={(e) => setRecurringCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm bg-white"
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-sm font-semibold text-primary-900 mb-1.5">Start Time</label>
                  <input
                    type="time"
                    value={recurringStartTime}
                    onChange={(e) => setRecurringStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm bg-white"
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-sm font-semibold text-primary-900 mb-1.5">End Time</label>
                  <input
                    type="time"
                    value={recurringEndTime}
                    onChange={(e) => setRecurringEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={generateRecurringSessions}
                  disabled={!recurringDate}
                  className="px-6 py-2.5 text-sm font-bold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  Generate {recurringCount} Sessions
                </button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {schedules.length === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center">
              <div className="w-20 h-20 bg-primary-100 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">No sessions added yet</h4>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto">Create single sessions or use the recurring generator to quickly build out your event schedule.</p>
              <button
                type="button"
                onClick={() => openModal(null)}
                className="inline-flex items-center gap-2 px-6 py-3 font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-md hover:shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Add First Session
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {schedules.map((schedule, index) => (
                <div key={schedule.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                  {schedule.isOverride && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-bl-xl">
                      OVERRIDE
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary-100 flex flex-col items-center justify-center text-primary-700 flex-shrink-0 shadow-inner">
                        <span className="text-xs font-bold leading-none mb-1">
                          {schedule.startDate ? new Date(schedule.startDate).toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '---'}
                        </span>
                        <span className="text-xl font-black leading-none">
                          {schedule.startDate ? new Date(schedule.startDate).getDate() : '--'}
                        </span>
                      </div>
                      <div className="pt-1">
                        <h4 className="font-bold text-gray-900 leading-tight mb-1">
                          {schedule.startDate ? new Date(schedule.startDate).toLocaleDateString('en-US', { weekday: 'long' }) : 'No Date Set'}
                        </h4>
                        <div className="flex items-center text-sm text-gray-500 font-medium">
                          <Clock className="w-4 h-4 mr-1.5" />
                          {schedule.startTime || 'TBD'} - {schedule.endTime || 'TBD'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Price</span>
                      <span className="font-bold text-gray-800 text-lg flex items-center">
                        {isFreeEvent ? (
                          <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded text-sm">FREE</span>
                        ) : (
                          `${currency} ${schedule.price || basePrice || '0'}`
                        )}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Capacity</span>
                      <span className="font-bold text-gray-800 text-lg flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-gray-400" />
                        {unlimitedCapacity || schedule.unlimitedSeats ? 'Unlimited' : `${schedule.availableSeats || 0}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => duplicateSession(index)}
                      className="text-xs font-bold text-gray-400 hover:text-primary-600 flex items-center gap-1.5 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Duplicate
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openModal(index)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        title="Edit Session"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveSchedule(index)}
                        disabled={schedules.length === 1}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Delete Session"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add/Edit Session Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">
                {editingIndex !== null ? 'Edit Session Details' : 'Add New Session'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={modalForm.startDate || ''}
                    onChange={(e) => setModalForm(prev => ({ ...prev, startDate: e.target.value, endDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={modalForm.endDate || ''}
                    onChange={(e) => setModalForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={modalForm.startTime || ''}
                    onChange={(e) => setModalForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">End Time</label>
                  <input
                    type="time"
                    value={modalForm.endTime || ''}
                    onChange={(e) => setModalForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Price ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={isFreeEvent ? '0' : (modalForm.price || '')}
                    onChange={(e) => setModalForm(prev => ({ ...prev, price: e.target.value }))}
                    disabled={isFreeEvent}
                    placeholder={basePrice || '0.00'}
                    className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold ${
                      isFreeEvent ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={unlimitedCapacity || modalForm.unlimitedSeats ? '' : (modalForm.availableSeats || '')}
                    onChange={(e) => setModalForm(prev => ({ ...prev, availableSeats: e.target.value }))}
                    disabled={unlimitedCapacity || modalForm.unlimitedSeats}
                    placeholder={unlimitedCapacity || modalForm.unlimitedSeats ? 'Unlimited' : (capacity || '50')}
                    className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold ${
                      unlimitedCapacity || modalForm.unlimitedSeats ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 space-y-4 border border-gray-200">
                {!unlimitedCapacity && (
                  <label className="flex items-center justify-between cursor-pointer group pb-4 border-b border-gray-200">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Unlimited Capacity</p>
                      <p className="text-xs text-gray-500">No maximum limit on attendees for this specific session</p>
                    </div>
                    <div className={`relative w-12 h-7 rounded-full transition-colors ${modalForm.unlimitedSeats ? 'bg-primary-600' : 'bg-gray-300 group-hover:bg-gray-400'}`}>
                      <input type="checkbox" className="sr-only" checked={modalForm.unlimitedSeats || false} onChange={(e) => setModalForm(prev => ({ ...prev, unlimitedSeats: e.target.checked }))} />
                      <span className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${modalForm.unlimitedSeats ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </label>
                )}
                
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Priority Override</p>
                    <p className="text-xs text-gray-500">Prioritize this session if dates conflict</p>
                  </div>
                  <div className={`relative w-12 h-7 rounded-full transition-colors ${modalForm.isOverride ? 'bg-amber-500' : 'bg-gray-300 group-hover:bg-gray-400'}`}>
                    <input type="checkbox" className="sr-only" checked={modalForm.isOverride || false} onChange={(e) => setModalForm(prev => ({ ...prev, isOverride: e.target.checked }))} />
                    <span className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${modalForm.isOverride ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </label>
              </div>
            </div>

            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-6 py-3 text-sm font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModalSave}
                disabled={!modalForm.startDate}
                className="px-8 py-3 flex items-center gap-2 text-sm font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
              >
                <Check className="w-5 h-5" />
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
