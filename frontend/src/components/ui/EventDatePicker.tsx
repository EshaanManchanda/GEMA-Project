import React, { useState, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import { format, isAfter, isBefore, isEqual, startOfDay } from 'date-fns';

interface DateSchedule {
  startDate: string;
  endDate: string;
  totalSeats: number;
  availableSeats: number;
  soldSeats: number;
  reservedSeats: number;
  price: number;
  _id?: string;
}

interface EventDatePickerProps {
  dateSchedules: DateSchedule[];
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void;
  className?: string;
  disabled?: boolean;
}

const EventDatePicker: React.FC<EventDatePickerProps> = ({
  dateSchedules,
  selectedDate,
  onDateSelect,
  className = '',
  disabled = false
}) => {
  const today = startOfDay(new Date());
  
  // Calculate available dates based on event schedules and business logic
  const availableDates = useMemo(() => {
    if (!dateSchedules || dateSchedules.length === 0) return [];
    
    const dates: Date[] = [];
    
    dateSchedules.forEach(schedule => {
      const startDate = startOfDay(new Date(schedule.startDate));
      const endDate = startOfDay(new Date(schedule.endDate));
      
      // Business logic: show dates from current date to ending date of event,
      // or from starting date of event to ending date if event hasn't started
      const minDate = isAfter(today, startDate) ? today : startDate;
      const maxDate = endDate;
      
      // Generate all dates in the range
      let currentDate = new Date(minDate);
      while (!isAfter(currentDate, maxDate)) {
        // Only add if seats are available
        if (schedule.availableSeats > 0) {
          dates.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    
    // Remove duplicates and sort
    const uniqueDates = Array.from(new Set(dates.map(d => d.getTime())))
      .map(time => new Date(time))
      .sort((a, b) => a.getTime() - b.getTime());
    
    return uniqueDates;
  }, [dateSchedules, today]);
  
  // Filter function to determine which dates should be enabled
  const filterDate = (date: Date) => {
    return availableDates.some(availableDate => 
      isEqual(startOfDay(date), startOfDay(availableDate))
    );
  };
  
  // Get the schedule for a specific date
  const getScheduleForDate = (date: Date) => {
    if (!date || !dateSchedules || !Array.isArray(dateSchedules)) return null;

    return dateSchedules.find(schedule => {
      const startDate = startOfDay(new Date(schedule.startDate));
      const endDate = startOfDay(new Date(schedule.endDate));
      const targetDate = startOfDay(date);
      
      return !isBefore(targetDate, startDate) && !isAfter(targetDate, endDate);
    });
  };
  
  // Check if a date is an event date (has schedule)
  const isEventDate = (date: Date) => {
    if (!dateSchedules || !Array.isArray(dateSchedules)) return false;
    return dateSchedules.some(schedule => {
      const startDate = startOfDay(new Date(schedule.startDate));
      const endDate = startOfDay(new Date(schedule.endDate));
      const targetDate = startOfDay(date);
      
      return !isBefore(targetDate, startDate) && !isAfter(targetDate, endDate);
    });
  };

  // Custom day class names for styling
  const getDayClassName = (date: Date) => {
    const isAvailable = filterDate(date);
    const isSelected = selectedDate && isEqual(startOfDay(date), startOfDay(selectedDate));
    const isEvent = isEventDate(date);
    const isToday = isEqual(startOfDay(date), today);
    
    let classes = 'relative ';
    
    if (isSelected) {
      classes += 'bg-primary-600 text-white hover:bg-primary-700 ring-2 ring-primary-200 ring-offset-1';
    } else if (isEvent && isAvailable) {
      classes += 'bg-gradient-to-br from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 cursor-pointer shadow-sm';
    } else if (isAvailable) {
      classes += 'hover:bg-primary-50 hover:text-primary-700 cursor-pointer border border-transparent hover:border-primary-200';
    } else {
      classes += 'text-gray-300 cursor-not-allowed opacity-50';
    }
    
    if (isToday && !isSelected) {
      classes += ' ring-1 ring-orange-400';
    }
    
    return classes;
  };
  
  return (
    <div className={`event-date-picker ${className}`}>
      <div className="mb-3">
        <label className="block text-gray-700 text-sm font-medium mb-2">
          Select Event Date
        </label>
        {dateSchedules && dateSchedules.length > 0 && (
          <div className="text-xs text-gray-600">
            Event runs: {format(new Date(dateSchedules[0].startDate), 'MMM d')} - {format(new Date(dateSchedules[0].endDate), 'MMM d, yyyy')}
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <DatePicker
          selected={selectedDate}
          onChange={onDateSelect}
          filterDate={filterDate}
          minDate={today}
          inline
          disabled={disabled}
          dayClassName={getDayClassName}
          className="w-full"
          calendarClassName="w-full"
        />
        
        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gradient-to-br from-primary-500 to-primary-600"></div>
              <span className="text-gray-600">Event dates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border border-primary-200 bg-primary-50"></div>
              <span className="text-gray-600">Available dates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded ring-1 ring-orange-400 bg-white"></div>
              <span className="text-gray-600">Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-200 opacity-50"></div>
              <span className="text-gray-600">Unavailable</span>
            </div>
          </div>
        </div>
      </div>
      
      {selectedDate && (
        <div className="mt-3 p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-primary-900">
                📅 {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </div>
              {(() => {
                const schedule = getScheduleForDate(selectedDate);
                return schedule ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-primary-700">
                      <span className="inline-flex items-center gap-1">
                        🕐 {format(new Date(schedule.startDate), 'h:mm a')} - {format(new Date(schedule.endDate), 'h:mm a')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="inline-flex items-center gap-1 text-green-700">
                        ✅ {schedule.availableSeats} seats available
                      </span>
                      <span className="inline-flex items-center gap-1 text-primary-700 font-medium">
                        💰 {schedule.price} AED per ticket
                      </span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
            <div className="text-primary-500">
              ✨
            </div>
          </div>
        </div>
      )}
      
      {(!dateSchedules || dateSchedules.length === 0) && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm text-yellow-700">
            No event schedules available. Please check back later.
          </div>
        </div>
      )}

      {dateSchedules && dateSchedules.length > 0 && availableDates.length === 0 && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm text-yellow-700">
            No dates available for booking at this time.
          </div>
        </div>
      )}
      
      {availableDates.length > 0 && !selectedDate && (
        <div className="mt-3 text-sm text-gray-600">
          {availableDates.length} date{availableDates.length !== 1 ? 's' : ''} available for booking
        </div>
      )}
    </div>
  );
};

export default EventDatePicker;