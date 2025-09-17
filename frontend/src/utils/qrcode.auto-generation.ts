import { AppDispatch } from '@/store';
import { generateQRCodesForBooking } from '@/store/slices/bookingsSlice';
import { generateBookingQRWithEventData, generateOrderQRWithEventData } from './qrcode.utils';

/**
 * Auto-generation utilities for QR codes based on booking status
 */

export interface BookingForQRGeneration {
  id: string;
  _id?: string;
  bookingNumber?: string;
  status: string;
  eventId: string;
  userId?: string;
  qrCode?: string;
  qrCodeData?: {
    bookingQR: string;
    orderQR: string;
    generatedAt: string;
  };
}

/**
 * Check if a booking needs QR code generation
 */
export const needsQRGeneration = (booking: BookingForQRGeneration): boolean => {
  if (!booking || booking.status !== 'confirmed') {
    return false;
  }

  // Check if QR codes are already present
  const hasQRCodes = booking.qrCodeData?.bookingQR || booking.qrCode;
  return !hasQRCodes;
};

/**
 * Auto-generate QR codes for a single booking
 */
export const autoGenerateQRForBooking = async (
  booking: BookingForQRGeneration,
  dispatch: AppDispatch
): Promise<boolean> => {
  if (!needsQRGeneration(booking)) {
    return false;
  }

  try {
    const bookingId = booking.id || booking._id;
    if (!bookingId) {
      console.warn('Cannot generate QR: booking ID missing');
      return false;
    }

    dispatch(generateQRCodesForBooking(bookingId));
    console.log(`Auto-generated QR codes for booking ${bookingId}`);
    return true;
  } catch (error) {
    console.error('Error auto-generating QR codes for booking:', booking.id, error);
    return false;
  }
};

/**
 * Auto-generate QR codes for multiple bookings
 */
export const autoGenerateQRForBookings = async (
  bookings: BookingForQRGeneration[],
  dispatch: AppDispatch
): Promise<{ generated: number; total: number }> => {
  let generated = 0;
  const confirmedBookings = bookings.filter(booking => booking.status === 'confirmed');

  for (const booking of confirmedBookings) {
    const success = await autoGenerateQRForBooking(booking, dispatch);
    if (success) {
      generated++;
    }
  }

  console.log(`Auto-generated QR codes for ${generated}/${confirmedBookings.length} confirmed bookings`);
  return { generated, total: confirmedBookings.length };
};

/**
 * Generate QR codes on-demand for immediate use
 */
export const generateQRCodesOnDemand = (booking: BookingForQRGeneration) => {
  if (booking.status !== 'confirmed') {
    throw new Error('Cannot generate QR codes for non-confirmed booking');
  }

  const bookingId = booking.bookingNumber || booking.id || booking._id;
  if (!bookingId) {
    throw new Error('Booking ID is required for QR generation');
  }

  try {
    // Use smart QR generation with event dates
    const bookingQR = generateBookingQRWithEventData(bookingId, booking, 2);
    const orderQR = generateOrderQRWithEventData(bookingId, booking, 2);

    return {
      bookingQR,
      orderQR,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating QR codes on-demand:', error);
    throw error;
  }
};

/**
 * Batch process bookings and generate missing QR codes
 */
export const batchProcessQRGeneration = async (
  bookings: BookingForQRGeneration[],
  dispatch: AppDispatch,
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<{ generated: number; errors: number }> => {
  const { batchSize = 10, delayBetweenBatches = 1000, onProgress } = options;

  const confirmedBookings = bookings.filter(booking => needsQRGeneration(booking));
  let generated = 0;
  let errors = 0;

  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < confirmedBookings.length; i += batchSize) {
    const batch = confirmedBookings.slice(i, i + batchSize);

    // Process current batch
    const promises = batch.map(async (booking) => {
      try {
        const success = await autoGenerateQRForBooking(booking, dispatch);
        return success ? 'generated' : 'skipped';
      } catch (error) {
        console.error('Batch processing error for booking:', booking.id, error);
        return 'error';
      }
    });

    const results = await Promise.all(promises);

    // Count results
    results.forEach(result => {
      if (result === 'generated') generated++;
      else if (result === 'error') errors++;
    });

    // Report progress
    const processed = Math.min(i + batchSize, confirmedBookings.length);
    onProgress?.(processed, confirmedBookings.length);

    // Delay between batches (except for the last batch)
    if (i + batchSize < confirmedBookings.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  console.log(`Batch QR generation completed: ${generated} generated, ${errors} errors`);
  return { generated, errors };
};

/**
 * Auto-generate QR codes when booking status changes to confirmed
 */
export const handleBookingStatusChange = (
  oldBooking: BookingForQRGeneration | null,
  newBooking: BookingForQRGeneration,
  dispatch: AppDispatch
): void => {
  // Check if status changed to confirmed
  const wasConfirmed = oldBooking?.status === 'confirmed';
  const isNowConfirmed = newBooking.status === 'confirmed';

  if (!wasConfirmed && isNowConfirmed) {
    // Status changed from non-confirmed to confirmed
    autoGenerateQRForBooking(newBooking, dispatch);
    console.log(`Booking ${newBooking.id} confirmed - auto-generating QR codes`);
  }
};

export default {
  needsQRGeneration,
  autoGenerateQRForBooking,
  autoGenerateQRForBookings,
  generateQRCodesOnDemand,
  batchProcessQRGeneration,
  handleBookingStatusChange,
};