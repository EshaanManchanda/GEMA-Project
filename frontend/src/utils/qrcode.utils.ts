/**
 * Frontend QR Code Utilities
 * Provides secure QR code data generation and validation for frontend components
 */

export interface QRCodeData {
  orderId?: string;
  bookingId?: string;
  ticketNumber?: string;
  eventId?: string;
  userId?: string;
  vendorId?: string;
  validUntil?: Date;
  seatsAllocated?: number;
  type: 'order' | 'booking' | 'ticket';

  // Event date information for smart expiration
  eventStartDate?: Date;
  eventEndDate?: Date;
  selectedDateScheduleId?: string;
  gracePeriodHours?: number; // Hours after event end to keep QR valid
}

export interface SecureQRData extends QRCodeData {
  generatedAt: string;
  expiresAt: string;
  version: string;
  checksum: string;
}

/**
 * Calculate smart expiration date based on event dates
 */
export const calculateQRExpiration = (data: QRCodeData): Date => {
  // Default grace period is 2 hours after event end
  const defaultGracePeriodHours = data.gracePeriodHours ?? 2;

  // Priority 1: Use explicitly provided validUntil
  if (data.validUntil) {
    return new Date(data.validUntil);
  }

  // Priority 2: Use event end date + grace period
  if (data.eventEndDate) {
    const eventEndTime = new Date(data.eventEndDate);
    const expirationTime = new Date(eventEndTime.getTime() + (defaultGracePeriodHours * 60 * 60 * 1000));

    // Ensure expiration is not in the past (minimum 1 hour from now)
    const minimumExpiration = new Date(Date.now() + (1 * 60 * 60 * 1000));
    return expirationTime > minimumExpiration ? expirationTime : minimumExpiration;
  }

  // Priority 3: Use event start date + 24 hours (for events without end time)
  if (data.eventStartDate) {
    const eventStartTime = new Date(data.eventStartDate);
    const estimatedEndTime = new Date(eventStartTime.getTime() + (24 * 60 * 60 * 1000));
    const expirationTime = new Date(estimatedEndTime.getTime() + (defaultGracePeriodHours * 60 * 60 * 1000));

    const minimumExpiration = new Date(Date.now() + (1 * 60 * 60 * 1000));
    return expirationTime > minimumExpiration ? expirationTime : minimumExpiration;
  }

  // Fallback: 24 hours from now (legacy behavior)
  return new Date(Date.now() + (24 * 60 * 60 * 1000));
};

/**
 * Generate secure QR code data with smart expiration based on event dates
 */
export const generateSecureQRData = (data: QRCodeData): string => {
  const timestamp = new Date().toISOString();

  // Use smart expiration calculation based on event dates
  const expirationDate = calculateQRExpiration(data);
  const expiresAt = expirationDate.toISOString();

  // Create unique identifier based on data type
  const identifier = data.orderId || data.bookingId || data.ticketNumber || 'unknown';

  const secureData: SecureQRData = {
    ...data,
    generatedAt: timestamp,
    expiresAt,
    version: '1.0',
    // Add a simple checksum for basic integrity
    checksum: btoa(`${identifier}-${data.eventId || 'no-event'}-${timestamp}`).slice(0, 8)
  };

  return JSON.stringify(secureData);
};

/**
 * Validate QR code data structure and timing
 */
export const validateQRData = (qrDataString: string): { isValid: boolean; data?: SecureQRData; error?: string } => {
  try {
    const data = JSON.parse(qrDataString) as SecureQRData;

    // Check required fields based on type
    if (data.type === 'order' && !data.orderId) {
      return { isValid: false, error: 'Missing order ID' };
    }
    if (data.type === 'booking' && !data.bookingId) {
      return { isValid: false, error: 'Missing booking ID' };
    }
    if (data.type === 'ticket' && !data.ticketNumber) {
      return { isValid: false, error: 'Missing ticket number' };
    }

    // Check expiration
    if (data.expiresAt && new Date() > new Date(data.expiresAt)) {
      return { isValid: false, error: 'QR code has expired' };
    }

    // Validate checksum
    const identifier = data.orderId || data.bookingId || data.ticketNumber || 'unknown';
    const expectedChecksum = btoa(`${identifier}-${data.eventId || 'no-event'}-${data.generatedAt}`).slice(0, 8);
    if (data.checksum && data.checksum !== expectedChecksum) {
      return { isValid: false, error: 'QR code integrity check failed' };
    }

    return { isValid: true, data };
  } catch (error) {
    return { isValid: false, error: 'Invalid QR code format' };
  }
};

/**
 * Generate QR data for an order
 */
export const generateOrderQRData = (
  orderId: string,
  eventId?: string,
  userId?: string,
  eventStartDate?: Date,
  eventEndDate?: Date,
  gracePeriodHours?: number
): string => {
  return generateSecureQRData({
    orderId,
    eventId,
    userId,
    type: 'order',
    eventStartDate,
    eventEndDate,
    gracePeriodHours
  });
};

/**
 * Generate QR data for a booking
 */
export const generateBookingQRData = (
  bookingId: string,
  eventId?: string,
  userId?: string,
  eventStartDate?: Date,
  eventEndDate?: Date,
  gracePeriodHours?: number
): string => {
  return generateSecureQRData({
    bookingId,
    eventId,
    userId,
    type: 'booking',
    eventStartDate,
    eventEndDate,
    gracePeriodHours
  });
};

/**
 * Generate QR data for a ticket
 */
export const generateTicketQRData = (
  ticketNumber: string,
  eventId?: string,
  userId?: string,
  orderId?: string,
  seatsAllocated?: number,
  eventStartDate?: Date,
  eventEndDate?: Date,
  gracePeriodHours?: number
): string => {
  return generateSecureQRData({
    ticketNumber,
    eventId,
    userId,
    orderId,
    seatsAllocated,
    type: 'ticket',
    eventStartDate,
    eventEndDate,
    gracePeriodHours
  });
};

/**
 * Extract event dates from booking/event data
 */
export const extractEventDates = (booking: any): { startDate?: Date; endDate?: Date } => {
  // Try to get dates from event data
  if (booking.event?.dateSchedule && Array.isArray(booking.event.dateSchedule)) {
    const schedule = booking.event.dateSchedule[0]; // Get first/selected schedule
    if (schedule) {
      const startDate = schedule.startDateTime || schedule.date || schedule.startDate;
      const endDate = schedule.endDateTime || schedule.endDate;

      return {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      };
    }
  }

  // Try to get from event directly
  if (booking.event) {
    const startDate = booking.event.startDateTime || booking.event.startDate || booking.event.date;
    const endDate = booking.event.endDateTime || booking.event.endDate;

    return {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    };
  }

  return { startDate: undefined, endDate: undefined };
};

/**
 * Generate QR data for booking with smart event date extraction
 */
export const generateBookingQRWithEventData = (
  bookingId: string,
  booking: any,
  gracePeriodHours: number = 2
): string => {
  const { startDate, endDate } = extractEventDates(booking);

  return generateBookingQRData(
    bookingId,
    booking.eventId || booking.event?._id,
    booking.userId,
    startDate,
    endDate,
    gracePeriodHours
  );
};

/**
 * Generate QR data for order with smart event date extraction
 */
export const generateOrderQRWithEventData = (
  orderId: string,
  booking: any,
  gracePeriodHours: number = 2
): string => {
  const { startDate, endDate } = extractEventDates(booking);

  return generateOrderQRData(
    orderId,
    booking.eventId || booking.event?._id,
    booking.userId,
    startDate,
    endDate,
    gracePeriodHours
  );
};

/**
 * Extract display information from QR data
 */
export const getQRDisplayInfo = (qrData: SecureQRData): { title: string; subtitle: string; id: string } => {
  switch (qrData.type) {
    case 'order':
      return {
        title: 'Order QR Code',
        subtitle: 'Scan to view order details',
        id: qrData.orderId || 'Unknown'
      };
    case 'booking':
      return {
        title: 'Booking QR Code',
        subtitle: 'Scan for event check-in',
        id: qrData.bookingId || 'Unknown'
      };
    case 'ticket':
      return {
        title: 'Ticket QR Code',
        subtitle: 'Show at venue entrance',
        id: qrData.ticketNumber || 'Unknown'
      };
    default:
      return {
        title: 'QR Code',
        subtitle: 'Scan for details',
        id: 'Unknown'
      };
  }
};

export default {
  generateSecureQRData,
  validateQRData,
  generateOrderQRData,
  generateBookingQRData,
  generateTicketQRData,
  getQRDisplayInfo
};