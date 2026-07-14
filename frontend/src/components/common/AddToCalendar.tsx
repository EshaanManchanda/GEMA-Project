import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import {
  CalendarEventInput,
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  downloadIcsFile,
} from '@/utils/calendarLinks';

interface AddToCalendarProps {
  event: CalendarEventInput;
  /** Used to name the downloaded .ics file */
  filenameSlug?: string;
  className?: string;
}

const AddToCalendar: React.FC<AddToCalendarProps> = ({ event, filenameSlug, className = '' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const options = [
    {
      label: 'Google Calendar',
      onSelect: () => window.open(buildGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer'),
    },
    {
      label: 'Outlook',
      onSelect: () => window.open(buildOutlookCalendarUrl(event), '_blank', 'noopener,noreferrer'),
    },
    {
      label: 'Apple Calendar / .ics',
      onSelect: () => downloadIcsFile(event, `${filenameSlug || 'event'}.ics`),
    },
  ];

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Calendar className="w-4 h-4" />
        Add to Calendar
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1">
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => {
                opt.onSelect();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddToCalendar;
