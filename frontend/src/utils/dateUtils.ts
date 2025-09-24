// Date and timezone utilities for UAE market
// Handles proper date formatting, timezone conversion, and localization

export const UAE_TIMEZONE = 'Asia/Dubai';
export const DEFAULT_LOCALE = 'en-AE';
export const ARABIC_LOCALE = 'ar-AE';

export interface DateFormatOptions {
  locale?: string;
  timezone?: string;
  includeTime?: boolean;
  format?: 'short' | 'medium' | 'long' | 'full';
}

export const getDefaultTimezone = (): string => {
  return import.meta.env.VITE_DEFAULT_TIMEZONE || UAE_TIMEZONE;
};

export const getDefaultLocale = (): string => {
  return import.meta.env.VITE_DEFAULT_LANGUAGE === 'ar' ? ARABIC_LOCALE : DEFAULT_LOCALE;
};

export const formatDateForUAE = (
  date: string | Date,
  options?: DateFormatOptions
): string => {
  const {
    locale = getDefaultLocale(),
    timezone = getDefaultTimezone(),
    includeTime = true,
    format = 'medium'
  } = options || {};

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
  };

  // Configure date format
  switch (format) {
    case 'short':
      formatOptions.dateStyle = 'short';
      break;
    case 'medium':
      formatOptions.dateStyle = 'medium';
      break;
    case 'long':
      formatOptions.dateStyle = 'long';
      break;
    case 'full':
      formatOptions.dateStyle = 'full';
      break;
  }

  // Add time if requested
  if (includeTime) {
    formatOptions.timeStyle = 'short';
  }

  return dateObj.toLocaleString(locale, formatOptions);
};

export const formatEventDate = (
  startDate: string | Date,
  endDate?: string | Date,
  options?: DateFormatOptions
): string => {
  const start = formatDateForUAE(startDate, options);

  if (!endDate) {
    return start;
  }

  const end = formatDateForUAE(endDate, options);
  const startObj = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const endObj = typeof endDate === 'string' ? new Date(endDate) : endDate;

  // Same day event
  if (startObj.toDateString() === endObj.toDateString()) {
    const startTime = startObj.toLocaleTimeString(getDefaultLocale(), {
      timeZone: getDefaultTimezone(),
      timeStyle: 'short'
    });
    const endTime = endObj.toLocaleTimeString(getDefaultLocale(), {
      timeZone: getDefaultTimezone(),
      timeStyle: 'short'
    });

    const date = formatDateForUAE(startDate, { ...options, includeTime: false });
    return `${date}, ${startTime} - ${endTime}`;
  }

  return `${start} - ${end}`;
};

export const formatEventTime = (
  date: string | Date,
  options?: { locale?: string; timezone?: string }
): string => {
  const {
    locale = getDefaultLocale(),
    timezone = getDefaultTimezone()
  } = options || {};

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleTimeString(locale, {
    timeZone: timezone,
    timeStyle: 'short'
  });
};

export const isEventToday = (date: string | Date): boolean => {
  const eventDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();

  // Convert both to UAE timezone for comparison
  const eventUAE = new Date(eventDate.toLocaleString('en-US', { timeZone: UAE_TIMEZONE }));
  const todayUAE = new Date(today.toLocaleString('en-US', { timeZone: UAE_TIMEZONE }));

  return eventUAE.toDateString() === todayUAE.toDateString();
};

export const isEventTomorrow = (date: string | Date): boolean => {
  const eventDate = typeof date === 'string' ? new Date(date) : date;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Convert both to UAE timezone for comparison
  const eventUAE = new Date(eventDate.toLocaleString('en-US', { timeZone: UAE_TIMEZONE }));
  const tomorrowUAE = new Date(tomorrow.toLocaleString('en-US', { timeZone: UAE_TIMEZONE }));

  return eventUAE.toDateString() === tomorrowUAE.toDateString();
};

export const getTimeUntilEvent = (date: string | Date): string => {
  const eventDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  const diff = eventDate.getTime() - now.getTime();

  if (diff < 0) {
    return 'Event has passed';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return days === 1 ? '1 day' : `${days} days`;
  }

  if (hours > 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }

  if (minutes > 0) {
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }

  return 'Starting soon';
};

export const formatRelativeDate = (date: string | Date): string => {
  const eventDate = typeof date === 'string' ? new Date(date) : date;

  if (isEventToday(eventDate)) {
    return `Today, ${formatEventTime(eventDate)}`;
  }

  if (isEventTomorrow(eventDate)) {
    return `Tomorrow, ${formatEventTime(eventDate)}`;
  }

  const now = new Date();
  const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) {
    const dayName = eventDate.toLocaleDateString(getDefaultLocale(), {
      weekday: 'long',
      timeZone: getDefaultTimezone()
    });
    return `${dayName}, ${formatEventTime(eventDate)}`;
  }

  return formatEventDate(eventDate, undefined, { includeTime: true, format: 'medium' });
};

export const convertToUAETime = (date: string | Date): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Date(dateObj.toLocaleString('en-US', { timeZone: UAE_TIMEZONE }));
};

export const formatDateForAPI = (date: Date): string => {
  return date.toISOString();
};

export const parseDateFromAPI = (dateString: string): Date => {
  return new Date(dateString);
};

export const getBusinessHours = (): { start: string; end: string } => {
  // UAE business hours: 9 AM to 6 PM
  return {
    start: '09:00',
    end: '18:00'
  };
};

export const isBusinessHours = (): boolean => {
  const now = convertToUAETime(new Date());
  const hours = now.getHours();
  const businessHours = getBusinessHours();

  const startHour = parseInt(businessHours.start.split(':')[0]);
  const endHour = parseInt(businessHours.end.split(':')[0]);

  return hours >= startHour && hours < endHour;
};

export const getWeekendDays = (): number[] => {
  // UAE weekend: Friday (5) and Saturday (6)
  return [5, 6];
};

export const isWeekend = (date?: Date): boolean => {
  const checkDate = date ? convertToUAETime(date) : convertToUAETime(new Date());
  const weekendDays = getWeekendDays();
  return weekendDays.includes(checkDate.getDay());
};

export default {
  formatDateForUAE,
  formatEventDate,
  formatEventTime,
  formatRelativeDate,
  isEventToday,
  isEventTomorrow,
  getTimeUntilEvent,
  convertToUAETime,
  formatDateForAPI,
  parseDateFromAPI,
  isBusinessHours,
  isWeekend,
  getDefaultTimezone,
  getDefaultLocale,
};