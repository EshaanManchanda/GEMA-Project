import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  height?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  version?: number;
  errorCorrectionLevel?: 'low' | 'medium' | 'quartile' | 'high';
}

export const generateQRCode = async (
  data: string,
  options?: QRCodeOptions
): Promise<string> => {
  try {
    console.log('🖼️ QR CODE UTILS: Starting QR code generation', {
      dataLength: data.length,
      dataPreview: data.substring(0, 100) + '...',
      options
    });

    const qrOptions = {
      width: options?.width || 200,
      margin: options?.margin || 2,
      version: options?.version || undefined,
      errorCorrectionLevel: options?.errorCorrectionLevel || 'medium',
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF',
      },
    };

    console.log('🔧 QR CODE UTILS: Using QR options', qrOptions);

    // Generate QR code as data URL (base64)
    const qrCodeDataURL = await QRCode.toDataURL(data, qrOptions);

    console.log('✅ QR CODE UTILS: QR code generated successfully', {
      resultLength: qrCodeDataURL.length,
      isDataURI: qrCodeDataURL.startsWith('data:image/'),
      mimeType: qrCodeDataURL.match(/data:([^;]+)/)?.[1] || 'unknown',
      preview: qrCodeDataURL.substring(0, 100) + '...'
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('❌ QR CODE UTILS: Error generating QR code', {
      error: error.message,
      stack: error.stack,
      dataLength: data?.length || 0
    });
    throw new Error('Failed to generate QR code');
  }
};

export const generateQRCodeBuffer = async (
  data: string,
  options?: QRCodeOptions
): Promise<Buffer> => {
  try {
    const qrOptions = {
      width: options?.width || 200,
      margin: options?.margin || 2,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF',
      },
    };

    const qrCodeBuffer = await QRCode.toBuffer(data, qrOptions);
    return qrCodeBuffer;
  } catch (error) {
    console.error('Error generating QR code buffer:', error);
    throw new Error('Failed to generate QR code buffer');
  }
};

/**
 * Generate secure QR code data with timestamping and validation info
 * Uses compact URL format instead of JSON to reduce size
 */
export const generateSecureQRData = (data: {
  ticketNumber: string;
  eventId: string;
  userId: string;
  vendorId?: string;
  orderNumber?: string;
  validUntil?: Date;
  seatsAllocated?: number;
}): string => {
  console.log('🔒 QR DATA UTILS: Generating secure QR data', {
    ticketNumber: data.ticketNumber,
    eventId: data.eventId
  });

  // Use compact URL format instead of JSON
  // This dramatically reduces QR code size from 2738 to ~100 characters
  const baseUrl = process.env.FRONTEND_URL || 'https://gema-project.onrender.com';
  const verifyUrl = `${baseUrl}/verify-ticket/${data.ticketNumber}`;

  console.log('✅ QR DATA UTILS: Secure QR data generated (URL format)', {
    resultLength: verifyUrl.length,
    ticketNumber: data.ticketNumber,
    format: 'URL'
  });

  return verifyUrl;
};

/**
 * Generate secure QR code data in legacy JSON format (for backward compatibility)
 * Use this only when you need the full data in the QR code
 */
export const generateSecureQRDataLegacy = (data: {
  ticketNumber: string;
  eventId: string;
  userId: string;
  vendorId?: string;
  orderNumber?: string;
  validUntil?: Date;
  seatsAllocated?: number;
}): string => {
  const timestamp = new Date().toISOString();
  const expiresAt = data.validUntil?.toISOString() || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const secureData = {
    ...data,
    generatedAt: timestamp,
    expiresAt,
    version: '1.0',
    // Add a simple checksum for basic integrity
    checksum: Buffer.from(`${data.ticketNumber}-${data.eventId}-${timestamp}`).toString('base64').slice(0, 8)
  };

  return JSON.stringify(secureData);
};

/**
 * Validate QR code data structure and timing
 * Handles both URL format and legacy JSON format
 */
export const validateQRData = (qrDataString: string): { isValid: boolean; data?: any; error?: string } => {
  try {
    // Check if it's a URL format (new format)
    if (qrDataString.startsWith('http://') || qrDataString.startsWith('https://')) {
      // Extract ticket number from URL
      const urlMatch = qrDataString.match(/\/verify-ticket\/([^/?#]+)/);
      if (!urlMatch || !urlMatch[1]) {
        return { isValid: false, error: 'Invalid URL format' };
      }

      return {
        isValid: true,
        data: {
          ticketNumber: urlMatch[1],
          format: 'URL'
        }
      };
    }

    // Legacy JSON format
    const data = JSON.parse(qrDataString);

    // Check required fields
    if (!data.ticketNumber || !data.eventId || !data.userId) {
      return { isValid: false, error: 'Missing required fields' };
    }

    // Check expiration
    if (data.expiresAt && new Date() > new Date(data.expiresAt)) {
      return { isValid: false, error: 'QR code has expired' };
    }

    // Validate checksum
    const expectedChecksum = Buffer.from(`${data.ticketNumber}-${data.eventId}-${data.generatedAt}`).toString('base64').slice(0, 8);
    if (data.checksum && data.checksum !== expectedChecksum) {
      return { isValid: false, error: 'QR code integrity check failed' };
    }

    return { isValid: true, data: { ...data, format: 'JSON' } };
  } catch (error) {
    return { isValid: false, error: 'Invalid QR code format' };
  }
};

export default { generateQRCode, generateQRCodeBuffer, generateSecureQRData, validateQRData };