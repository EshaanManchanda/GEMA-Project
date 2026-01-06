import express, { Express, Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { config, connectDB, initializeFirebase, logger } from './config/index';
import { errorHandler, notFound, timeoutMiddleware } from './middleware/index';
import { performanceMonitor, startPerformanceMonitoring, logPerformanceSummary } from './middleware/performance';
import routes from './routes/index';
import healthRoutes from './routes/health.routes';
import currencyRoutes from './routes/currency.routes';
import { scheduleTicketJobs, stopTicketJobs } from './utils/ticketExpiration';
import { ensureDefaultCommissionConfig } from './scripts/seedCommissions';
import { ensureAdminRevenueSettings } from './scripts/seedAdminSettings';
import { ensureAffiliateVendor } from './scripts/seedAffiliateVendor';
import { scheduleEventLifecycleJobs, stopEventLifecycleJobs } from './utils/eventLifecycle';
import { startCollectionReconciliationCron } from './utils/cron';
import { devLog } from './utils/devLogger';
import { redisClient } from './config/redis';
import { qrQueue, emailQueue, ticketQueue, analyticsQueue, notificationsQueue, bullMQClient } from './config/queue';
import { getTimeoutForFileSize } from './utils/uploadHelpers';

devLog.log('Server starting...');

// Create Express app
const app: Application = express();

// Trust proxy - REQUIRED when behind reverse proxy/load balancer (nginx, etc.)
// This allows Express to correctly handle X-Forwarded-* headers for:
// - Rate limiting (identifies real client IPs)
// - HTTPS detection (req.protocol)
// - Client IP tracking (req.ip)
app.set('trust proxy', 1); // Trust first proxy only

// Security middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Build allowed origins from environment variables
    const allowedOrigins = [
      config.frontendUrl,
      'https://kidrove.com',
      'https://kidrove.in',
      'https://kidrove.ae',
      'https://www.kidrove.com',
      'https://www.kidrove.in',
      'https://www.kidrove.ae',
      ...(process.env.ADDITIONAL_ALLOWED_ORIGINS?.split(',').map(url => url.trim()) || [])
    ].filter(Boolean);

    // Debug logging for CORS issues
    if (process.env.NODE_ENV === 'production') {
      console.log('🔍 CORS Check - Origin:', origin, '| Allowed:', allowedOrigins);
    }

    // In development, allow localhost origins
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push(
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173' // Vite default port 
        );
    }

    // Allow requests with no origin (direct browser navigation, favicon, health checks)
    // These requests don't have CORS implications as they don't access response data
    if (!origin) {
      // In development, allow all no-origin requests
      if (process.env.NODE_ENV === 'development') {
        devLog.tagged('CORS', 'Request with no origin - allowing (dev mode)');
        return callback(null, true);
      }
      // In production, allow no-origin for safe methods (GET, HEAD, OPTIONS)
      // This allows favicon, direct navigation, monitoring while maintaining security
      return callback(null, true);
    }

    // Check if origin is allowed (check strings and regex separately)
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      return origin === allowedOrigin || origin === allowedOrigin.replace(/\/$/, '');
    }) || (origin && /\.vercel\.app$/.test(origin));

    if (isAllowed) {
      devLog.tagged('CORS', 'Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log('[CORS] Origin rejected:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));
app.use(mongoSanitize());
app.use(hpp());

// Rate limiting optimized for KVM1 (single core protection)
// Shorter windows and lower limits to prevent single CPU from being overwhelmed

// General API rate limiting (reduced for single core)
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window (shorter than default 15 min)
  max: 100, // REDUCED from 500 - max 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please slow down. Try again in a minute.'
});

// Heavy endpoints (dashboard, analytics) - even more restrictive
const heavyEndpointsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 20, // STRICT: Only 20 requests/min for heavy operations
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Dashboard/analytics rate limit exceeded. These endpoints are cached - please wait a moment.'
});

// Auth endpoints - moderate limits
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please try again in 15 minutes.',
  skipSuccessfulRequests: true // Don't count successful logins
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Apply strict limits to heavy endpoints BEFORE general admin routes
app.use('/api/admin/dashboard', heavyEndpointsLimiter);
app.use('/api/admin/analytics', heavyEndpointsLimiter);

// Apply auth limiter
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing middleware with special handling for Stripe webhooks
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Enhanced compression middleware (optimized for KVM1)
app.use(compression({
  level: 6, // Balanced compression (1-9, higher = more CPU but better compression)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress if client explicitly disables it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression's default filter for everything else
    return compression.filter(req, res);
  }
}));

// Enable strong ETags for better caching
app.set('etag', 'strong');

// Logging middleware
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// Performance monitoring middleware
app.use(performanceMonitor);

// Timeout middleware (prevent indefinite hangs)
// Apply upload-specific timeout for file upload routes
app.use((req: Request, res: Response, next: NextFunction) => {
  const isUploadRoute = req.path.startsWith('/api/uploads') || req.path.startsWith('/api/media');

  if (isUploadRoute) {
    // For upload routes, use tiered timeout based on content-length if available
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const uploadTimeout = contentLength > 0
      ? getTimeoutForFileSize(contentLength) / 1000 // Convert ms to seconds
      : 120; // Default 120s if size unknown

    console.log(`[Upload Timeout] Route: ${req.path}, Size: ${contentLength} bytes, Timeout: ${uploadTimeout}s`);
    return timeoutMiddleware(uploadTimeout)(req, res, next);
  } else {
    // Standard routes: 90s timeout (increased from 45s to allow most requests to complete)
    return timeoutMiddleware(90)(req, res, next);
  }
});

// API routes
app.use('/api', routes);
app.use('/api/currency', currencyRoutes);

// Enhanced health check routes (also mounted under /api for API consistency)
app.use('/api/health', healthRoutes);

// Also keep standalone health routes for direct access
app.use('/health', healthRoutes);

// Root route handler
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: `Welcome to the ${process.env.APP_NAME || 'Kidrove'} Backend API`,
    version: '1.0.0',
    status: 'running',
    endpoints: {
      api: '/api',
      health: '/health',
      sitemap: '/sitemap.xml',
      robots: '/robots.txt'
    },
    documentation: 'API endpoints are available under /api/'
  });
});

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Server variable for graceful shutdown access
let server: any;

// Async startup function to handle initialization
async function startServer() {
  try {
    logger.info('Starting server initialization...');

    // Step 1: Initialize Firebase Admin SDK
    logger.info('Initializing Firebase Admin SDK...');
    initializeFirebase();
    logger.info('Firebase Admin SDK initialized successfully');

    // Step 2: Connect to MongoDB with retry
    logger.info('Connecting to MongoDB...');
    await connectDB();
    logger.info('MongoDB connected successfully');

    // Step 3: Wait a moment for connections to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3.5: Ensure default commission configuration exists
    logger.info('Initializing commission system...');
    try {
      await ensureDefaultCommissionConfig();
      logger.info('✓ Commission system initialized');
    } catch (error) {
      logger.error('⚠️  Failed to initialize commission system:', error);
      // Continue anyway - not critical for server startup
    }

    // Step 3.6: Ensure admin revenue settings exist
    logger.info('Initializing admin revenue settings...');
    try {
      await ensureAdminRevenueSettings();
      logger.info('✓ Admin revenue settings initialized');
    } catch (error) {
      logger.error('⚠️  Failed to initialize admin revenue settings:', error);
      // Continue anyway - not critical for server startup
    }

    // Step 3.7: Ensure affiliate vendor exists
    logger.info('Initializing affiliate vendor...');
    try {
      await ensureAffiliateVendor();
      logger.info('✓ Affiliate vendor initialized');
    } catch (error) {
      logger.error('⚠️  Failed to initialize affiliate vendor:', error);
      // Continue anyway - not critical for server startup
    }

    // Step 4: Initialize scheduled jobs (only after DB is ready)
    logger.info('Initializing scheduled jobs...');
    scheduleTicketJobs();
    scheduleEventLifecycleJobs();
    startCollectionReconciliationCron();
    logger.info('Scheduled jobs initialized successfully');

    // Step 5: Start performance monitoring
    logger.info('Starting performance monitoring...');
    startPerformanceMonitoring();
    logger.info('Performance monitoring started');

    // Step 6: Start Express server
    const PORT = config.port;
    server = app.listen(PORT, () => {
      logger.info(`✓ Server running in ${config.nodeEnv} mode on port ${PORT}`);
      logger.info(`✓ Ready to accept connections`);
    });

    // Configure HTTP keep-alive (optimized for KVM1)
    // Keeps connections open to reduce handshake overhead
    server.keepAliveTimeout = 61000; // 61 seconds (slightly > typical load balancer timeout of 60s)
    server.headersTimeout = 65000; // Must be > keepAliveTimeout (65 seconds)
    logger.info('HTTP keep-alive configured: 61s timeout');

  } catch (error) {
    logger.error('Failed to start server:', error);
    logger.error('Server initialization failed. Exiting...');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection:', err);
  logger.error('Shutting down gracefully...');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  logger.error('Shutting down gracefully...');
  process.exit(1);
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} signal received: starting graceful shutdown`);

  try {
    // 1. Log performance summary
    logger.info('Logging performance summary...');
    logPerformanceSummary();

    // 2. Close HTTP server (stop accepting new requests)
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => {
          logger.info('HTTP server closed');
          resolve();
        });
      });
    }

    // 3. Stop scheduled jobs
    logger.info('Stopping scheduled jobs...');
    stopTicketJobs();
    stopEventLifecycleJobs();
    logger.info('Scheduled jobs stopped');

    // 4. Close BullMQ queues (wait for in-flight jobs to complete)
    logger.info('Closing BullMQ queues...');
    const queueClosePromises = [
      qrQueue?.close(),
      emailQueue?.close(),
      ticketQueue?.close(),
      analyticsQueue?.close(),
      notificationsQueue?.close(),
    ].filter(Boolean);

    await Promise.allSettled(queueClosePromises);
    logger.info('All queues closed');

    // 5. Close BullMQ Redis client
    if (bullMQClient) {
      logger.info('Closing BullMQ Redis connection...');
      await bullMQClient.quit();
      logger.info('BullMQ Redis connection closed');
    }

    // 6. Close main Redis connection (last step!)
    if (redisClient) {
      logger.info('Closing main Redis connection...');
      await redisClient.quit();
      logger.info('Main Redis connection closed');
    }

    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();

export default app;


