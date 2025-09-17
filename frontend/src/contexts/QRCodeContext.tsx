import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { generateBookingQRData, generateOrderQRData, generateTicketQRData, QRCodeData } from '@/utils/qrcode.utils';
import toast from 'react-hot-toast';

interface QRCodeContextType {
  // State
  isGenerating: boolean;
  lastGeneratedQR: string | null;

  // Methods
  generateQRForBooking: (bookingId: string, eventId: string, userId?: string) => Promise<string>;
  generateQRForOrder: (orderId: string, eventId: string, userId?: string) => Promise<string>;
  generateQRForTicket: (
    ticketNumber: string,
    eventId: string,
    userId?: string,
    orderId?: string,
    seatsAllocated?: number
  ) => Promise<string>;
  downloadQRCode: (qrData: string, filename?: string) => void;
  shareQRCode: (qrData: string, title?: string) => Promise<void>;
  clearLastGenerated: () => void;
}

const QRCodeContext = createContext<QRCodeContextType | undefined>(undefined);

interface QRCodeProviderProps {
  children: ReactNode;
  enableToasts?: boolean;
}

export const QRCodeProvider: React.FC<QRCodeProviderProps> = ({
  children,
  enableToasts = true
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedQR, setLastGeneratedQR] = useState<string | null>(null);

  const generateQRForBooking = useCallback(async (
    bookingId: string,
    eventId: string,
    userId?: string
  ): Promise<string> => {
    try {
      setIsGenerating(true);
      const qrData = generateBookingQRData(bookingId, eventId, userId);
      setLastGeneratedQR(qrData);

      if (enableToasts) {
        toast.success('Booking QR code generated!');
      }

      return qrData;
    } catch (error) {
      console.error('Error generating booking QR:', error);
      if (enableToasts) {
        toast.error('Failed to generate booking QR code');
      }
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [enableToasts]);

  const generateQRForOrder = useCallback(async (
    orderId: string,
    eventId: string,
    userId?: string
  ): Promise<string> => {
    try {
      setIsGenerating(true);
      const qrData = generateOrderQRData(orderId, eventId, userId);
      setLastGeneratedQR(qrData);

      if (enableToasts) {
        toast.success('Order QR code generated!');
      }

      return qrData;
    } catch (error) {
      console.error('Error generating order QR:', error);
      if (enableToasts) {
        toast.error('Failed to generate order QR code');
      }
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [enableToasts]);

  const generateQRForTicket = useCallback(async (
    ticketNumber: string,
    eventId: string,
    userId?: string,
    orderId?: string,
    seatsAllocated?: number
  ): Promise<string> => {
    try {
      setIsGenerating(true);
      const qrData = generateTicketQRData(ticketNumber, eventId, userId, orderId, seatsAllocated);
      setLastGeneratedQR(qrData);

      if (enableToasts) {
        toast.success('Ticket QR code generated!');
      }

      return qrData;
    } catch (error) {
      console.error('Error generating ticket QR:', error);
      if (enableToasts) {
        toast.error('Failed to generate ticket QR code');
      }
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [enableToasts]);

  const downloadQRCode = useCallback((qrData: string, filename = 'qr-code.png') => {
    try {
      // Create a temporary link for download
      const dataUri = `data:text/plain;charset=utf-8,${encodeURIComponent(qrData)}`;
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (enableToasts) {
        toast.success('QR code data downloaded!');
      }
    } catch (error) {
      console.error('Error downloading QR code:', error);
      if (enableToasts) {
        toast.error('Failed to download QR code');
      }
    }
  }, [enableToasts]);

  const shareQRCode = useCallback(async (qrData: string, title = 'QR Code') => {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: 'QR Code Data',
          url: `data:text/plain,${encodeURIComponent(qrData)}`
        });

        if (enableToasts) {
          toast.success('QR code shared successfully!');
        }
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(qrData);
        if (enableToasts) {
          toast.success('QR code data copied to clipboard!');
        }
      }
    } catch (error) {
      console.error('Error sharing QR code:', error);
      if (enableToasts) {
        toast.error('Failed to share QR code');
      }
    }
  }, [enableToasts]);

  const clearLastGenerated = useCallback(() => {
    setLastGeneratedQR(null);
  }, []);

  const value: QRCodeContextType = {
    isGenerating,
    lastGeneratedQR,
    generateQRForBooking,
    generateQRForOrder,
    generateQRForTicket,
    downloadQRCode,
    shareQRCode,
    clearLastGenerated,
  };

  return (
    <QRCodeContext.Provider value={value}>
      {children}
    </QRCodeContext.Provider>
  );
};

export const useQRCode = (): QRCodeContextType => {
  const context = useContext(QRCodeContext);
  if (!context) {
    throw new Error('useQRCode must be used within a QRCodeProvider');
  }
  return context;
};

export default QRCodeContext;