import React, { useState, useRef, useEffect } from 'react';
import QrScanner from 'qr-scanner';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

interface TicketVerificationResult {
  success: boolean;
  status: 'verified' | 'expired' | 'invalid' | 'already_used' | 'not_yet_valid';
  message: string;
  data?: {
    ticket: {
      id: string;
      ticketNumber: string;
      attendeeName: string;
      attendeeEmail: string;
      attendeePhone?: string;
      ticketType: string;
      seatNumber?: string;
      price: number;
      currency: string;
      eventTitle: string;
      eventDate: string;
      eventLocation: string;
      scanCount: number;
      validUntil: string;
      checkInTime?: string;
      usedAt?: string;
      usedBy?: string;
      expiredAt?: string;
      validFrom?: string;
    };
  };
}

interface QRCodeScannerProps {
  eventId?: string;
  onVerificationResult: (result: TicketVerificationResult) => void;
  onCheckIn?: (ticketId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  eventId,
  onVerificationResult,
  onCheckIn,
  isOpen,
  onClose,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<TicketVerificationResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  // Start camera and QR scanner
  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      setIsScanning(true);
      
      // Check if camera is available
      const hasCamera = await QrScanner.hasCamera();
      setHasCamera(hasCamera);
      
      if (!hasCamera) {
        throw new Error('No camera found');
      }

      // Create QR scanner instance
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => handleScanResult(result.data),
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment', // Use back camera if available
          maxScansPerSecond: 5,
        }
      );

      await qrScannerRef.current.start();
    } catch (error) {
      console.error('Failed to start QR scanner:', error);
      setHasCamera(false);
      setIsScanning(false);
    }
  };

  // Stop scanning
  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  };

  // Handle QR code scan result
  const handleScanResult = async (qrData: string) => {
    if (isVerifying) return; // Prevent multiple simultaneous verifications

    setIsVerifying(true);
    
    try {
      // Call API to verify the QR code
      const response = await fetch(`/api/tickets/verify-qr${eventId ? `/${eventId}` : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ qrCodeData: qrData }),
      });

      const result: TicketVerificationResult = await response.json();
      
      setLastScanResult(result);
      setShowResult(true);
      onVerificationResult(result);

      // Auto-hide result after 5 seconds for verified tickets
      if (result.status === 'verified') {
        setTimeout(() => {
          setShowResult(false);
          setLastScanResult(null);
        }, 5000);
      }

    } catch (error) {
      console.error('Error verifying QR code:', error);
      const errorResult: TicketVerificationResult = {
        success: false,
        status: 'invalid',
        message: 'Failed to verify QR code. Please try again.',
      };
      setLastScanResult(errorResult);
      setShowResult(true);
      onVerificationResult(errorResult);
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle check-in
  const handleCheckIn = async () => {
    if (!lastScanResult?.data?.ticket.id || !onCheckIn) return;

    try {
      await onCheckIn(lastScanResult.data.ticket.id);
      setShowResult(false);
      setLastScanResult(null);
    } catch (error) {
      console.error('Error checking in ticket:', error);
    }
  };

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'verified':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' };
      case 'expired':
        return { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' };
      case 'already_used':
        return { icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50' };
      case 'not_yet_valid':
        return { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50' };
      default:
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' };
    }
  };

  // Initialize scanner when opened
  useEffect(() => {
    if (isOpen) {
      startScanning();
    } else {
      stopScanning();
      setShowResult(false);
      setLastScanResult(null);
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative bg-white rounded-lg max-w-md w-full mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="relative">
          {hasCamera && isScanning ? (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover"
                playsInline
                muted
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white border-dashed rounded-lg opacity-75"></div>
              </div>

              {/* Scanning indicator */}
              {isVerifying && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-4 flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <span className="text-sm font-medium">Verifying...</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">
                  {hasCamera ? 'Starting camera...' : 'Camera not available'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 bg-gray-50">
          <p className="text-sm text-gray-600 text-center">
            Position the QR code within the frame to scan
          </p>
        </div>

        {/* Results Modal */}
        <AnimatePresence>
          {showResult && lastScanResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-0 bg-white z-10"
            >
              <div className="p-6">
                <div className="text-center mb-4">
                  {(() => {
                    const { icon: Icon, color, bg } = getStatusDisplay(lastScanResult.status);
                    return (
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${bg} mb-4`}>
                        <Icon className={`h-8 w-8 ${color}`} />
                      </div>
                    );
                  })()}
                  
                  <h4 className="text-lg font-semibold mb-2">
                    {lastScanResult.status === 'verified' ? 'Valid Ticket' : 
                     lastScanResult.status === 'expired' ? 'Expired Ticket' :
                     lastScanResult.status === 'already_used' ? 'Already Used' :
                     lastScanResult.status === 'not_yet_valid' ? 'Not Yet Valid' :
                     'Invalid Ticket'}
                  </h4>
                  
                  <p className="text-gray-600 mb-4">{lastScanResult.message}</p>
                </div>

                {/* Ticket Details */}
                {lastScanResult.data?.ticket && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Ticket #:</span>
                      <span className="text-sm font-medium">{lastScanResult.data.ticket.ticketNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Attendee:</span>
                      <span className="text-sm font-medium">{lastScanResult.data.ticket.attendeeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Event:</span>
                      <span className="text-sm font-medium">{lastScanResult.data.ticket.eventTitle}</span>
                    </div>
                    {lastScanResult.data.ticket.seatNumber && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Seat:</span>
                        <span className="text-sm font-medium">{lastScanResult.data.ticket.seatNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Scan Count:</span>
                      <span className="text-sm font-medium">{lastScanResult.data.ticket.scanCount}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  {lastScanResult.status === 'verified' && onCheckIn && (
                    <button
                      onClick={handleCheckIn}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      Check In
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setShowResult(false);
                      setLastScanResult(null);
                    }}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                  >
                    {lastScanResult.status === 'verified' ? 'Continue Scanning' : 'Scan Again'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default QRCodeScanner;