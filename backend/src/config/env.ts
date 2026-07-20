import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Calculate optimal MongoDB pool size based on cluster mode
 * Prevents connection pool exhaustion when running multiple PM2 instances
 */
function calculateOptimalPoolSize(): number {
  const defaultPoolSize = 20;
  const envPoolSize = process.env.MONGODB_MAX_POOL_SIZE;

  // If explicitly set, use that value
  if (envPoolSize) {
    return parseInt(envPoolSize, 10);
  }

  // Auto-detect PM2 cluster mode
  const isClusterMode =
    process.env.NODE_APP_INSTANCE !== undefined ||
    process.env.PM2_INSTANCE_ID !== undefined ||
    process.env.PM2_INSTANCES !== undefined;

  if (isClusterMode) {
    // Get number of instances (default to 4 if not specified)
    const instances = parseInt(process.env.PM2_INSTANCES || "4", 10);
    const targetTotal = 40; // Total connections across all instances

    // Calculate per-instance pool size
    const perInstanceSize = Math.max(Math.floor(targetTotal / instances), 5);

    console.log(
      `[MongoDB] Cluster mode detected: ${instances} instances, ${perInstanceSize} connections per instance (${perInstanceSize * instances} total)`,
    );
    return perInstanceSize;
  }

  // Single instance mode - use default
  console.log(`[MongoDB] Single instance mode: ${defaultPoolSize} connections`);
  return defaultPoolSize;
}

interface Config {
  port: number;
  nodeEnv: string;
  mongodbUri: string;
  mongodb: {
    connectTimeoutMS: number;
    socketTimeoutMS: number;
    serverSelectionTimeoutMS: number;
    maxPoolSize: number;
    minPoolSize: number;
    maxIdleTimeMS: number;
    retryWrites: boolean;
    retryReads: boolean;
  };
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
    testSecretKey: string;
    testPublishableKey: string;
    vendorSubscriptionPriceId: string;
    vendorPortalNoCancelConfigId: string;
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
    maxImageSize: number;
    maxVideoSize: number;
    maxDocumentSize: number;
    allowedFileTypes: string[];
    provider: "local" | "cloudinary";
    baseUrl: string;
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
  phoneVerification: {
    required: boolean;
  };
  brand: {
    appName: string;
    appNameFull: string;
    siteName: string;
    siteDescription: string;
    contactEmail: string;
  };
  commission: {
    chargeOnActiveSubscription: boolean;
  };
  google: {
    placesApiKey: string;
    mapsApiKey: string;
  };
  whatsapp: {
    provider: string;
    /** Which Cunnekt API generation the connected dashboard/workspace generates. See doc/CUNNEKT_API_GUIDE.md §1/§29 — never guessed, must match the dashboard's own "API Payload" output. */
    cunnektApiVersion: "legacy" | "rest-v1";
    cunnektBaseUrl: string;
    cunnektApiKey: string;
    cunnektWebhookSecret: string;
  };
  emailMarketing: {
    provider: string;
    senderApiKey: string;
    senderListId: string;
    mailchimpApiKey: string;
    mailchimpServerPrefix: string;
    mailchimpAudienceId: string;
  };
  communication: {
    queueEnabled: boolean;
    testMode: boolean;
    logRawProviderResponse: boolean;
    /** WhatsApp number (E.164) that receives admin_alert-category templates (e.g. partner_form_admin_alert). Alerts are skipped if unset. */
    adminAlertWhatsappPhone: string;
  };
}

// Define and export the configuration object
export const config: Config = {
  port: parseInt(process.env.PORT || "5001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/gema",
  mongodb: {
    connectTimeoutMS: parseInt(
      process.env.MONGODB_CONNECT_TIMEOUT_MS || "30000",
      10,
    ),
    socketTimeoutMS: parseInt(
      process.env.MONGODB_SOCKET_TIMEOUT_MS || "90000",
      10,
    ), // Increased to 90s for category ops + cache invalidation under load
    serverSelectionTimeoutMS: parseInt(
      process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || "30000",
      10,
    ),

    /**
     * Connection Pool Optimization for KVM2 Hostinger Hosting
     *
     * IMPORTANT: When using PM2 cluster mode with N instances, each instance creates its own pool.
     * Total connections = maxPoolSize × number_of_instances
     *
     * Example with 4 PM2 instances and maxPoolSize=10: Total = 40 connections
     *
     * Recommended Settings by Server Setup:
     *
     * Single Instance (no clustering):
     *   maxPoolSize: 50, minPoolSize: 10
     *
     * 2 PM2 Instances (2 CPU cores):
     *   maxPoolSize: 20, minPoolSize: 5  (Total: 40 connections)
     *
     * 4 PM2 Instances (4 CPU cores) - RECOMMENDED for 500-1000 users:
     *   maxPoolSize: 10, minPoolSize: 3  (Total: 40 connections)
     *
     * MongoDB Atlas Free Tier Limit: 500 connections
     * MongoDB Atlas M10: 1500 connections
     *
     * Setting too high = wasted memory per instance
     * Setting too low = connection queuing under load
     *
     * AUTO-DETECTION: Pool size is automatically adjusted based on PM2 cluster mode
     */
    maxPoolSize: calculateOptimalPoolSize(),
    minPoolSize: Math.max(Math.floor(calculateOptimalPoolSize() / 4), 2),
    maxIdleTimeMS: parseInt(
      process.env.MONGODB_MAX_IDLE_TIME_MS || "60000",
      10,
    ),
    retryWrites: process.env.MONGODB_RETRY_WRITES !== "false",
    retryReads: process.env.MONGODB_RETRY_READS !== "false",
  },
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET as string,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3001",
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "500", 10),
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") || "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    testSecretKey: process.env.STRIPE_TEST_SECRET_KEY || "",
    testPublishableKey: process.env.STRIPE_TEST_PUBLISHABLE_KEY || "",
    // Recurring price for the 150 AED/month vendor subscription.
    // Run: npx ts-node src/scripts/utilities/createVendorSubscriptionPrice.ts
    vendorSubscriptionPriceId: process.env.STRIPE_VENDOR_SUBSCRIPTION_PRICE_ID || "",
    // Portal configuration with subscription_cancel disabled (auto-created lazily if blank).
    // Set after first server start: STRIPE_PORTAL_NO_CANCEL_CONFIG_ID=bpc_xxx
    vendorPortalNoCancelConfigId: process.env.STRIPE_PORTAL_NO_CANCEL_CONFIG_ID || "",
  },
  email: {
    service: process.env.EMAIL_SERVICE || "mailtrap",
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587", 10),
    username: process.env.EMAIL_USERNAME || "",
    password: process.env.EMAIL_PASSWORD || "",
    from: process.env.EMAIL_FROM || "contact@kidrove.com",
    fromName: process.env.EMAIL_FROM_NAME || process.env.APP_NAME || "Kidrove",
  },
  upload: {
    path: process.env.UPLOAD_PATH || "uploads/",
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "26214400", 10), // 25MB default
    maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE || "52428800", 10), // 50MB
    maxVideoSize: parseInt(process.env.MAX_VIDEO_SIZE || "524288000", 10), // 500MB
    maxDocumentSize: parseInt(process.env.MAX_DOCUMENT_SIZE || "26214400", 10), // 25MB
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(",") || [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/avif",
      "image/bmp",
      "image/tiff",
      "image/svg+xml",
      "image/heic",
      "image/heif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/csv",
      "application/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "application/zip",
      "application/x-zip-compressed",
      "video/mp4",
      "video/webm",
    ],
    provider:
      (process.env.UPLOAD_PROVIDER as "local" | "cloudinary") || "local",
    baseUrl:
      process.env.BASE_URL || `http://localhost:${process.env.PORT || "5001"}`,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || "ml_default",
    secure: process.env.CLOUDINARY_SECURE === "true",
  },
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10),
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "8", 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5", 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || "1800000", 10),
  },
  session: {
    secret: process.env.SESSION_SECRET || "",
    maxAge: parseInt(process.env.SESSION_MAX_AGE || "86400000", 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || "info",
    filePath: process.env.LOG_FILE_PATH || "logs/",
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === "true",
  },
  qrCode: {
    size: parseInt(process.env.QR_CODE_SIZE || "200", 10),
    margin: parseInt(process.env.QR_CODE_MARGIN || "2", 10),
    errorCorrection: process.env.QR_CODE_ERROR_CORRECTION || "M",
  },
  ticket: {
    validityDays: parseInt(process.env.TICKET_VALIDITY_DAYS || "30", 10),
    transferEnabled: process.env.TICKET_TRANSFER_ENABLED === "true",
    resendCooldown: parseInt(
      process.env.TICKET_RESEND_COOLDOWN || "300000",
      10,
    ),
  },
  event: {
    approvalRequired: process.env.EVENT_APPROVAL_REQUIRED === "true",
    maxEventsPerVendor: parseInt(process.env.MAX_EVENTS_PER_VENDOR || "50", 10),
    maxImageCount: parseInt(process.env.EVENT_IMAGE_MAX_COUNT || "10", 10),
  },
  order: {
    expiryMinutes: parseInt(process.env.ORDER_EXPIRY_MINUTES || "30", 10),
    refundProcessingFeePercent: parseInt(
      process.env.REFUND_PROCESSING_FEE_PERCENT || "3",
      10,
    ),
    maxRefundProcessingFee: parseInt(
      process.env.MAX_REFUND_PROCESSING_FEE || "10",
      10,
    ),
  },
  review: {
    autoApproval: process.env.REVIEW_AUTO_APPROVAL === "true",
    maxFlagsBeforeHide: parseInt(
      process.env.MAX_REVIEW_FLAGS_BEFORE_HIDE || "3",
      10,
    ),
    editTimeLimit: parseInt(process.env.REVIEW_EDIT_TIME_LIMIT || "24", 10),
  },
  phoneVerification: {
    required: process.env.REQUIRE_PHONE_VERIFICATION !== "false", // Default true for backward compatibility
  },
  brand: {
    appName: process.env.APP_NAME || "Kidrove",
    appNameFull: process.env.APP_NAME_FULL || "Kidrove Events",
    siteName: process.env.SITE_NAME || "Kidrove",
    siteDescription:
      process.env.SITE_DESCRIPTION ||
      "Discover and book amazing family events and kids activities across the UAE",
    contactEmail:
      process.env.CONTACT_EMAIL ||
      process.env.EMAIL_FROM ||
      "contact@kidrove.com",
  },
  commission: {
    chargeOnActiveSubscription: process.env.COMMISSION_CHARGE_ON_ACTIVE_SUBSCRIPTION === "true",
  },
  whatsapp: {
    provider: process.env.WHATSAPP_PROVIDER || "dev",
    cunnektApiVersion:
      (process.env.CUNNEKT_API_VERSION || "legacy") === "rest-v1"
        ? "rest-v1"
        : "legacy",
    cunnektBaseUrl: process.env.CUNNEKT_BASE_URL || "https://app.cunnekt.com",
    cunnektApiKey: process.env.CUNNEKT_API_KEY || "",
    cunnektWebhookSecret: process.env.CUNNEKT_WEBHOOK_SECRET || "",
  },
  emailMarketing: {
    provider: process.env.EMAIL_MARKETING_PROVIDER || "dev",
    senderApiKey: process.env.SENDER_API_KEY || "",
    senderListId: process.env.SENDER_DEFAULT_LIST_ID || "",
    mailchimpApiKey: process.env.MAILCHIMP_API_KEY || "",
    mailchimpServerPrefix: process.env.MAILCHIMP_SERVER_PREFIX || "",
    mailchimpAudienceId: process.env.MAILCHIMP_AUDIENCE_ID || "",
  },
  communication: {
    queueEnabled: process.env.COMMUNICATION_QUEUE_ENABLED !== "false",
    // Forces dev/mock providers even when real provider keys are present —
    // guarantees local/dev work can never send a real WhatsApp/email-marketing message.
    testMode: process.env.COMMUNICATION_TEST_MODE === "true",
    logRawProviderResponse:
      process.env.COMMUNICATION_LOG_RAW_PROVIDER_RESPONSE === "true",
    adminAlertWhatsappPhone: process.env.ADMIN_ALERT_WHATSAPP_PHONE || "",
  },
  google: {
    placesApiKey: process.env.GOOGLE_PLACES_API_KEY || "",
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
  },
};

// Validate required environment variables
const validateEnv = (): void => {
  const isProduction = config.nodeEnv === "production";

  // These vars must be set in all environments — missing them means the server cannot function
  const criticalVars = ["MONGODB_URI", "JWT_SECRET", "JWT_REFRESH_SECRET"];
  const missingCritical = criticalVars.filter((v) => !process.env[v]);
  if (missingCritical.length > 0) {
    throw new Error(
      `Missing critical environment variables: ${missingCritical.join(", ")}. Server cannot start.`,
    );
  }

  // SESSION_SECRET must be a non-trivial value in production
  if (isProduction && !process.env.SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET must be set in production. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }

  // JWT secrets must be long enough to resist brute-force under HS256 in production
  if (isProduction) {
    const jwtSecret = process.env.JWT_SECRET ?? "";
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET ?? "";
    if (jwtSecret.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters in production.");
    }
    if (jwtRefreshSecret.length < 32) {
      throw new Error("JWT_REFRESH_SECRET must be at least 32 characters in production.");
    }
    if (jwtSecret === jwtRefreshSecret) {
      throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be different values.");
    }
  }

  // Firebase validation only in production
  if (isProduction) {
    const firebaseVars = [
      "FIREBASE_PROJECT_ID",
      "FIREBASE_PRIVATE_KEY",
      "FIREBASE_CLIENT_EMAIL",
    ];

    for (const envVar of firebaseVars) {
      if (!process.env[envVar]) {
        console.warn(
          `Warning: Firebase environment variable ${envVar} is not set in production.`,
        );
      }
    }
  }
};

// SEO Configuration
export const SEO_CONFIG = {
  siteName: process.env.SITE_NAME || "Kidrove",
  siteDomain: process.env.APP_DOMAIN || "kidrove.com",
  siteUrl: process.env.APP_URL || "https://kidrove.com",
  siteDescription:
    process.env.SITE_DESCRIPTION ||
    "Discover and book amazing family events and kids activities across the UAE",
  contactEmail:
    process.env.CONTACT_EMAIL ||
    process.env.EMAIL_FROM ||
    "contact@kidrove.com",
  supportEmail:
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_FROM ||
    "contact@kidrove.com",
  twitterHandle: process.env.TWITTER_HANDLE || "@kidrove",
  facebookPage: process.env.FACEBOOK_PAGE || "kidrove",
  instagramHandle: process.env.INSTAGRAM_HANDLE || "kidrove",
};

validateEnv();
