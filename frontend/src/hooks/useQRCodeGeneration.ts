import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store';
import { generateQRCodesForBooking } from '@/store/slices/bookingsSlice';
import { generateBookingQRData, generateOrderQRData, generateTicketQRData } from '@/utils/qrcode.utils';
import toast from 'react-hot-toast';

export interface QRGenerationOptions {
  autoGenerate?: boolean;
  showToast?: boolean;
  size?: number;
}

export const useQRCodeGeneration = (options: QRGenerationOptions = {}) => {
  const { autoGenerate = true, showToast = true, size = 200 } = options;
  const dispatch = useDispatch<AppDispatch>();
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Generate QR code for a booking
   */
  const generateBookingQR = useCallback(async (
    bookingId: string,
    eventId: string,
    userId?: string
  ) => {
    try {
      setIsGenerating(true);
      const qrData = generateBookingQRData(bookingId, eventId, userId);

      if (showToast) {
        toast.success('Booking QR code generated successfully!');
      }

      return qrData;
    } catch (error) {
      console.error('Error generating booking QR code:', error);
      if (showToast) {
        toast.error('Failed to generate booking QR code');
      }
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [showToast]);

  /**
   * Generate QR code for an order
   */
  const generateOrderQR = useCallback(async (
    orderId: string,
    eventId: string,
    userId?: string
  ) => {
    try {
      setIsGenerating(true);
      const qrData = generateOrderQRData(orderId, eventId, userId);

      if (showToast) {
        toast.success('Order QR code generated successfully!');
      }

      return qrData;
    } catch (error) {
      console.error('Error generating order QR code:', error);
      if (showToast) {
        toast.error('Failed to generate order QR code');
      }
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [showToast]);

  /**
   * Generate QR code for a ticket
   */
  const generateTicketQR = useCallback(async (
    ticketNumber: string,
    eventId: string,
    userId?: string,
    orderId?: string,
    seatsAllocated?: number
  ) => {
    try {
      setIsGenerating(true);
      const qrData = generateTicketQRData(ticketNumber, eventId, userId, orderId, seatsAllocated);

      if (showToast) {
        toast.success('Ticket QR code generated successfully!');
      }

      return qrData;
    } catch (error) {
      console.error('Error generating ticket QR code:', error);
      if (showToast) {
        toast.error('Failed to generate ticket QR code');
      }
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [showToast]);

  /**
   * Auto-generate QR codes for a confirmed booking
   */
  const autoGenerateForBooking = useCallback(async (bookingId: string) => {
    if (!autoGenerate) return;

    try {
      setIsGenerating(true);
      dispatch(generateQRCodesForBooking(bookingId));

      if (showToast) {
        toast.success('QR codes generated for booking!');
      }
    } catch (error) {
      console.error('Error auto-generating QR codes:', error);
      if (showToast) {
        toast.error('Failed to auto-generate QR codes');
      }
    } finally {
      setIsGenerating(false);
    }
  }, [autoGenerate, showToast, dispatch]);

  /**
   * Check if booking needs QR codes and generate them
   */
  const ensureBookingHasQRCodes = useCallback((booking: any) => {
    if (
      booking &&
      booking.status === 'confirmed' &&
      !booking.qrCodeData &&
      !booking.qrCode &&
      autoGenerate
    ) {
      autoGenerateForBooking(booking.id || booking._id);
    }
  }, [autoGenerate, autoGenerateForBooking]);

  return {
    isGenerating,
    generateBookingQR,
    generateOrderQR,
    generateTicketQR,
    autoGenerateForBooking,
    ensureBookingHasQRCodes,
  };
};

export default useQRCodeGeneration;