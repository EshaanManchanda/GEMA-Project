import React from 'react';
import { QrCode, X } from 'lucide-react';

import Modal from '../ui/Modal';
import QRCodeGenerator from '../ui/QRCodeGenerator';
import Button from '../ui/Button';
import { QRCodeData, generateSecureQRData, getQRDisplayInfo, validateQRData } from '../../utils/qrcode.utils';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrData: QRCodeData;
  size?: number;
  title?: string;
  subtitle?: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  qrData,
  size = 250,
  title,
  subtitle
}) => {
  // Generate secure QR code data
  const qrCodeString = generateSecureQRData(qrData);

  // Get display information
  const displayInfo = getQRDisplayInfo(validateQRData(qrCodeString).data!);

  // Use provided title/subtitle or fallback to generated ones
  const finalTitle = title || displayInfo.title;
  const finalSubtitle = subtitle || `${displayInfo.subtitle} - ID: ${displayInfo.id}`;

  // Generate filename based on type and ID
  const filename = `${qrData.type}-${displayInfo.id.replace(/[^a-zA-Z0-9]/g, '-')}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={finalTitle}
      size="md"
      className="text-center"
    >
      <div className="py-4">
        {/* QR Code Generator */}
        <QRCodeGenerator
          value={qrCodeString}
          size={size}
          title="" // Don't show title in generator since modal has title
          subtitle={finalSubtitle}
          showDownload={true}
          showCopy={true}
          showShare={true}
          filename={filename}
          className="border-0 shadow-none"
        />

        {/* Additional Information */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
          <h4 className="font-medium text-gray-900 mb-2">QR Code Information</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Type:</span>
              <span className="font-medium capitalize">{qrData.type}</span>
            </div>
            <div className="flex justify-between">
              <span>ID:</span>
              <span className="font-medium">{displayInfo.id}</span>
            </div>
            {qrData.eventId && (
              <div className="flex justify-between">
                <span>Event ID:</span>
                <span className="font-medium">{qrData.eventId}</span>
              </div>
            )}
            {qrData.userId && (
              <div className="flex justify-between">
                <span>User ID:</span>
                <span className="font-medium">{qrData.userId}</span>
              </div>
            )}
            {qrData.seatsAllocated && (
              <div className="flex justify-between">
                <span>Seats:</span>
                <span className="font-medium">{qrData.seatsAllocated}</span>
              </div>
            )}
            {qrData.validUntil && (
              <div className="flex justify-between">
                <span>Valid Until:</span>
                <span className="font-medium">
                  {new Date(qrData.validUntil).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
          <h4 className="font-medium text-blue-900 mb-2 flex items-center">
            <QrCode className="w-4 h-4 mr-2" />
            How to Use This QR Code
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            {qrData.type === 'ticket' && (
              <>
                <li>• Show this QR code at the venue entrance</li>
                <li>• Keep it accessible on your mobile device</li>
                <li>• Have a backup (screenshot or printed copy)</li>
              </>
            )}
            {qrData.type === 'booking' && (
              <>
                <li>• Use for event check-in and registration</li>
                <li>• Scan to view complete booking details</li>
                <li>• Present to event staff when requested</li>
              </>
            )}
            {qrData.type === 'order' && (
              <>
                <li>• Use to verify order details and status</li>
                <li>• Scan for quick access to order information</li>
                <li>• Keep for records and support purposes</li>
              </>
            )}
            <li>• Save or download for offline access</li>
          </ul>
        </div>
      </div>

      {/* Modal Footer */}
      <div className="flex justify-center pt-4 border-t">
        <Button
          variant="outline"
          onClick={onClose}
          leftIcon={<X className="w-4 h-4" />}
        >
          Close
        </Button>
      </div>
    </Modal>
  );
};

export default QRCodeModal;