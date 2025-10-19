console.log('Server starting...');
import express, { Express, Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { config, connectDB, initializeFirebase, logger } from './config';
import { errorHandler, notFound } from './middleware';
import routes from './routes';
import healthRoutes from './routes/health.routes';
import { scheduleTicketJobs } from './utils/ticketExpiration';
import { scheduleEventLifecycleJobs } from './utils/eventLifecycle';

// Initialize Firebase Admin SDK
initializeFirebase();

// Connect to MongoDB
connectDB();

// Create Express app
const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    config.frontendUrl,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:4200',
    'http://localhost:4201',
    /\.vercel\.app$/,  // Allow all Vercel app domains
    'https://kidrove-frontend.vercel.app', // Current frontend Vercel URL
    'https://kidrove-frontend-git-main-eshaanmanchandas-projects.vercel.app/',
    'https://gema-project-bnp5xge4w-eshaanmanchandas-projects.vercel.app',
    'https://kidrove.netlify.app/',
    'https://lightcoral-snail-365363.hostingersite.com/'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));
app.use(mongoSanitize());
app.use(hpp());

// Rate limiting with enhanced limits for admin routes
const generalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});

// More generous rate limiting for admin routes
const adminLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax * 2, // Double the limit for admin routes
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many admin requests from this IP, please try again later.'
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Apply enhanced rate limiting to admin routes
app.use('/api/admin', adminLimiter);
app.use('/api/analytics', adminLimiter);

// Body parsing middleware with special handling for Stripe webhooks
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// API routes
app.use('/api', routes);

// Enhanced health check routes (also mounted under /api for API consistency)
app.use('/api/health', healthRoutes);

// Also keep standalone health routes for direct access
app.use('/health', healthRoutes);

// Root route handler
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to the Gema Backend API',
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

// Initialize scheduled jobs
scheduleTicketJobs();
scheduleEventLifecycleJobs();

// Start server
console.log('Server starting...');
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Don't crash the server in production
  if (config.nodeEnv === 'development') {
    process.exit(1);
  }
});

export default app;

