import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface Config {
  port: number;
  nodeEnv: string;
  mongodbUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
  frontendUrl: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  firebase: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
  };
  stripe: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
  };
  email: {
    service: string;
    host: string;
    port: number;
    username: string;
    password: string;
    from: string;
    fromName: string;
  };
  upload: {
    path: string;
    maxFileSize: number;
    allowedFileTypes: string[];
    provider: 'local' | 'cloudinary';
  };
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    uploadPreset: string;
    secure: boolean;
  };
  security: {
    bcryptSaltRounds: number;
    passwordMinLength: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  session: {
    secret: string;
    maxAge: number;
  };
  logging: {
    level: string;
    filePath: string;
    enableRequestLogging: boolean;
  };
  qrCode: {
    size: number;
    margin: number;
    errorCorrection: string;
  };
  ticket: {
    validityDays: number;
    transferEnabled: boolean;
    resendCooldown: number;
  };
  event: {
    approvalRequired: boolean;
    maxEventsPerVendor: number;
    maxImageCount: number;
  };
  order: {
    expiryMinutes: number;
    refundProcessingFeePercent: number;
    maxRefundProcessingFee: number;
  };
  review: {
    autoApproval: boolean;
    maxFlagsBeforeHide: number;
    editTimeLimit: number;
  };
}

// Define and export the configuration object
export const config: Config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/gema',
  jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'default_jwt_refresh_secret',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || ''
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
  },
  email: {
    service: process.env.EMAIL_SERVICE || 'mailtrap',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    username: process.env.EMAIL_USERNAME || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@gema.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Gema Events'
  },
  upload: {
    path: process.env.UPLOAD_PATH || 'uploads/',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB default
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    provider: (process.env.UPLOAD_PROVIDER as 'local' | 'cloudinary') || 'local'
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default',
    secure: process.env.CLOUDINARY_SECURE === 'true'
  },
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '1800000', 10) // 30 minutes default
  },
  session: {
    secret: process.env.SESSION_SECRET || 'default_session_secret',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10) // 24 hours default
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || 'logs/',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true'
  },
  qrCode: {
    size: parseInt(process.env.QR_CODE_SIZE || '200', 10),
    margin: parseInt(process.env.QR_CODE_MARGIN || '2', 10),
    errorCorrection: process.env.QR_CODE_ERROR_CORRECTION || 'M'
  },
  ticket: {
    validityDays: parseInt(process.env.TICKET_VALIDITY_DAYS || '30', 10),
    transferEnabled: process.env.TICKET_TRANSFER_ENABLED === 'true',
    resendCooldown: parseInt(process.env.TICKET_RESEND_COOLDOWN || '300000', 10) // 5 minutes default
  },
  event: {
    approvalRequired: process.env.EVENT_APPROVAL_REQUIRED === 'true',
    maxEventsPerVendor: parseInt(process.env.MAX_EVENTS_PER_VENDOR || '50', 10),
    maxImageCount: parseInt(process.env.EVENT_IMAGE_MAX_COUNT || '10', 10)
  },
  order: {
    expiryMinutes: parseInt(process.env.ORDER_EXPIRY_MINUTES || '30', 10),
    refundProcessingFeePercent: parseInt(process.env.REFUND_PROCESSING_FEE_PERCENT || '3', 10),
    maxRefundProcessingFee: parseInt(process.env.MAX_REFUND_PROCESSING_FEE || '10', 10)
  },
  review: {
    autoApproval: process.env.REVIEW_AUTO_APPROVAL === 'true',
    maxFlagsBeforeHide: parseInt(process.env.MAX_REVIEW_FLAGS_BEFORE_HIDE || '3', 10),
    editTimeLimit: parseInt(process.env.REVIEW_EDIT_TIME_LIMIT || '24', 10) // hours
  }
};

// Validate required environment variables
const validateEnv = (): void => {
  const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`Warning: Environment variable ${envVar} is not set.`);
    }
  }

  // Firebase validation only in production
  if (config.nodeEnv === 'production') {
    const firebaseVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL'
    ];

    for (const envVar of firebaseVars) {
      if (!process.env[envVar]) {
        console.warn(`Warning: Firebase environment variable ${envVar} is not set in production.`);
      }
    }
  }
};

validateEnv();