import mongoose from 'mongoose';
import { config } from './env';
import logger from './logger';
import { enableSlowQueryLogging } from '../middleware/mongoose-slow-query';

/**
 * Connect to MongoDB database with enhanced error handling and retries
 */
export const connectDB = async (retryCount = 0, maxRetries = 5): Promise<void> => {
  try {
    // MongoDB connection options optimized for Atlas (Mongoose 8.x compatible)
    const options = {
      // Connection timeouts
      connectTimeoutMS: config.mongodb.connectTimeoutMS,
      socketTimeoutMS: config.mongodb.socketTimeoutMS,
      serverSelectionTimeoutMS: config.mongodb.serverSelectionTimeoutMS,

      // Connection pool settings
      maxPoolSize: config.mongodb.maxPoolSize,
      minPoolSize: config.mongodb.minPoolSize,
      maxIdleTimeMS: config.mongodb.maxIdleTimeMS,

      // Buffer settings to prevent timeout issues
      bufferCommands: false,

      // Heartbeat settings
      heartbeatFrequencyMS: 10000
    };

    logger.info('Attempting to connect to MongoDB...', {
      attempt: retryCount + 1,
      maxRetries: maxRetries + 1,
      uri: config.mongodbUri.replace(/\/\/[^:]*:[^@]*@/, '//***:***@')
    });

    const conn = await mongoose.connect(config.mongodbUri, options);

    logger.info(`MongoDB Connected Successfully: ${conn.connection.host}`, {
      readyState: conn.connection.readyState,
      database: conn.connection.name
    });

    // Enable slow query logging (100ms threshold)
    enableSlowQueryLogging({
      threshold: 100, // Log queries > 100ms
      logStackTrace: process.env.NODE_ENV === 'development' // Stack traces in dev only
    });

    // Set up connection event handlers
    setupConnectionHandlers();

    // Set up process termination handlers
    setupProcessHandlers();

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error(`MongoDB connection attempt ${retryCount + 1} failed: ${errorMessage}`, {
      attempt: retryCount + 1,
      maxRetries: maxRetries + 1,
      error: errorMessage
    });

    if (retryCount < maxRetries) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s

      logger.warn(`Retrying MongoDB connection in ${retryDelay}ms...`, {
        nextAttempt: retryCount + 2,
        delay: retryDelay
      });

      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return connectDB(retryCount + 1, maxRetries);
    } else {
      logger.error('MongoDB connection failed after maximum retry attempts', {
        maxRetries: maxRetries + 1,
        finalError: errorMessage
      });
      process.exit(1);
    }
  }
};

/**
 * Track if connection handlers have been set up to prevent memory leaks
 */
let handlersSetUp = false;

/**
 * Set up MongoDB connection event handlers
 * Prevents memory leaks by ensuring handlers are only registered once
 */
const setupConnectionHandlers = (): void => {
  // Only set up handlers once to prevent memory leaks from duplicate listeners
  if (handlersSetUp) {
    logger.debug('Connection handlers already set up, skipping...');
    return;
  }

  logger.info('Setting up MongoDB connection event handlers...');

  // Handle MongoDB connection errors after initial connection
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error after initial connection', {
      error: err.message,
      readyState: mongoose.connection.readyState
    });
  });

  // Handle MongoDB disconnection
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected', {
      readyState: mongoose.connection.readyState
    });
  });

  // Handle MongoDB reconnection
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected successfully', {
      readyState: mongoose.connection.readyState
    });
  });

  // Handle connection buffer overflow
  mongoose.connection.on('fullsetup', () => {
    logger.info('MongoDB replica set connection established');
  });

  // Handle buffer errors
  mongoose.connection.on('timeout', () => {
    logger.error('MongoDB connection timeout');
  });

  // Monitor connection state changes
  mongoose.connection.on('connecting', () => {
    logger.info('MongoDB connecting...');
  });

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('close', () => {
    logger.info('MongoDB connection closed');
  });

  // Mark handlers as set up
  handlersSetUp = true;
  logger.info('MongoDB connection event handlers registered successfully');
};

/**
 * Set up process termination handlers
 * NOTE: Commented out - shutdown handlers are centralized in server.ts to prevent duplicate calls
 */
const setupProcessHandlers = (): void => {
  // Process handlers now centralized in server.ts for proper shutdown sequencing
  logger.debug('Process handlers managed by server.ts - skipping database-specific handlers');
};

/**
 * Gracefully close MongoDB connection
 * Called by server.ts during graceful shutdown sequence
 */
export const closeDBConnection = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed gracefully');
    }
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error; // Propagate error to caller
  }
};

/**
 * Check MongoDB connection health
 */
export const checkDBHealth = async (): Promise<boolean> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return false;
    }

    // Simple ping to check connection
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (error) {
    logger.error('MongoDB health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      readyState: mongoose.connection.readyState
    });
    return false;
  }
};