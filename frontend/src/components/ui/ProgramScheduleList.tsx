import React, { useState, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { RawSchedule } from '../../utils/scheduleUtils'; // We'll need to export RawSchedule or define it locally

interface ProgramScheduleListProps {
  dateSchedules: any[]; // The raw event.dateSchedule array
  onEnroll: (scheduleId: string) => void;
  currency?: string;
  timezone?: string;
}

interface Block {
  id: string; // The base schedule ID or grouped ID
  daysOfWeek: string; // e.g. "Thursdays" or "Thursdays & Fridays"
  timeString: string; // e.g. "12:30 AM - 1:20 AM"
  startDate: Date;
  endDate: Date;
  sessions: any[]; // The individual sessions/dates in this block
  availableSeats: number;
  totalSeats: number;
  isSoldOut: boolean;
  isUnlimited: boolean;
  scheduleId: string; // The ID to pass when enrolling
  teacherName?: string;
  description?: string;
}

export const ProgramScheduleList: React.FC<ProgramScheduleListProps> = ({
  dateSchedules,
  onEnroll,
  currency = 'AED',
  timezone,
}) => {
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});

  const toggleExpand = (blockId: string) => {
    setExpandedBlocks((prev) => ({
      ...prev,
      [blockId]: !prev[blockId],
    }));
  };

  const blocks = useMemo(() => {
    if (!dateSchedules || dateSchedules.length === 0) return [];

    // Group schedules by scheduleId. Often, a program block is defined by a single dateSchedule entry 
    // with multiple timeSlots, or multiple dateSchedule entries.
    // For simplicity, we treat each `dateSchedule` item as a block, or group them if they are timeSlots.
    
    const processedBlocks: Block[] = [];

    dateSchedules.forEach((schedule) => {
      const scheduleId = schedule._id || schedule.id;
      
      // Collect dates
      const dates: Date[] = [];
      let startTime = schedule.startTime || '';
      let endTime = schedule.endTime || '';

      if (schedule.timeSlots && schedule.timeSlots.length > 0) {
        schedule.timeSlots.forEach((slot: any) => {
          if (slot.date) dates.push(new Date(slot.date));
          if (!startTime && slot.startTime) startTime = slot.startTime;
          if (!endTime && slot.endTime) endTime = slot.endTime;
        });
      } else {
        // Just the start and end date
        if (schedule.startDate) dates.push(new Date(schedule.startDate));
        if (schedule.endDate && schedule.startDate !== schedule.endDate) dates.push(new Date(schedule.endDate));
      }

      if (dates.length === 0) return; // Skip invalid

      dates.sort((a, b) => a.getTime() - b.getTime());
      
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];

      // Determine days of week (e.g. "Sat", "Sun")
      const daysSet = new Set(dates.map(d => format(d, 'EEE')));
      const daysOfWeek = Array.from(daysSet).join(' & ');

      // Format time
      const formatTime = (t: string) => {
        if (!t) return '';
        const [h, m] = t.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
      };

      const timeString = startTime && endTime 
        ? `${formatTime(startTime)} - ${formatTime(endTime)}`
        : 'Time TBD';

      const totalSeats = schedule.totalSeats || (schedule.availableSeats + (schedule.reservedSeats || 0) + (schedule.soldSeats || 0));
      const availableSeats = schedule.availableSeats || 0;
      const filledSeats = totalSeats - availableSeats;
      const isSoldOut = availableSeats <= 0 && !schedule.unlimitedSeats;

      processedBlocks.push({
        id: scheduleId,
        daysOfWeek,
        timeString,
        startDate,
        endDate,
        sessions: dates,
        availableSeats,
        totalSeats,
        isSoldOut,
        isUnlimited: !!schedule.unlimitedSeats || availableSeats >= 999999,
        scheduleId,
        teacherName: schedule.teacherName || 'Instructor', // Can be enriched from event
        description: schedule.description,
      });
    });

    return processedBlocks;
  }, [dateSchedules]);

  if (blocks.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-700">
        No schedules have been configured for this event yet.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 border-b pb-2">
        <h3 className="text-xl font-bold text-gray-900">
          Available times <span className="text-gray-500 font-normal text-base">({blocks.length} available)</span>
        </h3>
        {timezone && (
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            🌐 {timezone}
          </span>
        )}
      </div>

      <div className="space-y-6">
        {blocks.map((block) => {
          const isExpanded = expandedBlocks[block.id] || false;
          const filledSeats = block.totalSeats - block.availableSeats;

          return (
            <div key={block.id} className="border-b border-gray-200 pb-6 flex flex-col md:flex-row gap-4">
              
              {/* Left Column: Day and Time */}
              <div className="md:w-1/4">
                <h4 className="font-bold text-lg text-gray-900">{block.daysOfWeek}</h4>
                <p className="text-gray-600 text-sm">{block.timeString}</p>
              </div>

              {/* Middle Column: Dates, Teacher, Dropdown */}
              <div className="md:w-2/4">
                <p className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Starts:</span> {format(block.startDate, 'MMM d')} 
                  <span className="mx-2 text-gray-300">|</span> 
                  <span className="font-medium">Ends:</span> {format(block.endDate, 'MMM d')}
                </p>

                {block.description && (
                  <p className="text-sm text-gray-700 font-medium mb-2 bg-indigo-50 border border-indigo-100 inline-block px-2 py-1 rounded">
                    {block.description}
                  </p>
                )}
                <button 
                  onClick={() => toggleExpand(block.id)}
                  className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center transition-colors"
                >
                  {isExpanded ? 'Hide' : 'Show'} all {block.sessions.length} meetings
                  {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                </button>

                {isExpanded && (
                  <div className="mt-3 pl-2 border-l-2 border-primary-200 space-y-1">
                    {block.sessions.map((date, idx) => (
                      <p key={idx} className="text-sm text-gray-600">
                        {format(date, 'EEE, MMM d')} <span className="text-gray-400 mx-1">•</span> {block.timeString}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Seats and Enroll */}
              <div className="md:w-1/4 flex flex-col md:items-end justify-start">
                <div className="text-right mb-3 w-full flex justify-between md:flex-col md:justify-start">
                  {(!block.isUnlimited && block.availableSeats < 9999) && (
                    <>
                      <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded-full w-max md:w-auto md:ml-auto md:mb-1">
                        {Math.max(0, filledSeats)} seats filled
                      </span>
                      {!block.isSoldOut ? (
                        <span className="text-sm text-red-500 font-medium mt-1">
                          Only {block.availableSeats} seats left!
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 font-medium mt-1">
                          Sold out
                        </span>
                      )}
                    </>
                  )}
                </div>
                
                <button
                  onClick={() => onEnroll(block.scheduleId)}
                  disabled={block.isSoldOut}
                  className={`px-6 py-2 rounded-full font-bold transition-colors w-full md:w-auto ${
                    block.isSoldOut 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-[#4000D3] hover:bg-[#2b008e] text-white'
                  }`}
                >
                  Enroll
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgramScheduleList;
