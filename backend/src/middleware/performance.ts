import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * Performance Monitoring Middleware
 *
 * Tracks request timing, memory usage, and identifies slow endpoints
 * Helps optimize backend performance for handling 500-1000 concurrent users
 */

interface PerformanceMetrics {
  totalRequests: number;
  slowRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  requestsByEndpoint: Map<string, {
    count: number;
    totalTime: number;
    avgTime: number;
    maxTime: number;
  }>;
}

// In-memory metrics storage (use Redis in production for multi-instance support)
const metrics: PerformanceMetrics = {
  totalRequests: 0,
  slowRequests: 0,
  averageResponseTime: 0,
  maxResponseTime: 0,
  requestsByEndpoint: new Map()
};

// Slow request threshold in milliseconds
const SLOW_REQUEST_THRESHOLD = 1000; // 1 second
const VERY_SLOW_REQUEST_THRESHOLD = 3000; // 3 seconds

/**
 * Request timing middleware
 */
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  // Log request start in development
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`→ ${req.method} ${req.path}`);
  }

  // Capture response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    // Update global metrics
    metrics.totalRequests++;
    if (duration > SLOW_REQUEST_THRESHOLD) {
      metrics.slowRequests++;
    }
    if (duration > metrics.maxResponseTime) {
      metrics.maxResponseTime = duration;
    }
    metrics.averageResponseTime =
      (metrics.averageResponseTime * (metrics.totalRequests - 1) + duration) / metrics.totalRequests;

    // Update endpoint-specific metrics
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    const endpointMetrics = metrics.requestsByEndpoint.get(endpoint) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      maxTime: 0
    };

    endpointMetrics.count++;
    endpointMetrics.totalTime += duration;
    endpointMetrics.avgTime = endpointMetrics.totalTime / endpointMetrics.count;
    endpointMetrics.maxTime = Math.max(endpointMetrics.maxTime, duration);

    metrics.requestsByEndpoint.set(endpoint, endpointMetrics);

    // Log slow requests
    if (duration > VERY_SLOW_REQUEST_THRESHOLD) {
      logger.warn('🐌 VERY SLOW REQUEST DETECTED', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        memoryDelta: `${Math.round(memoryDelta / 1024)}KB`,
        endpoint
      });
    } else if (duration > SLOW_REQUEST_THRESHOLD) {
      logger.info('⏱️  Slow request', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        statusCode: res.statusCode
      });
    }

    // Log all requests in development with timing
    if (process.env.NODE_ENV === 'development') {
      const emoji = duration > SLOW_REQUEST_THRESHOLD ? '🐌' : '✓';
      logger.debug(`${emoji} ${req.method} ${req.path} - ${duration}ms - ${res.statusCode}`);
    }
  });

  next();
};

/**
 * Get current performance metrics
 */
export const getPerformanceMetrics = (): PerformanceMetrics => {
  return {
    ...metrics,
    requestsByEndpoint: new Map(metrics.requestsByEndpoint)
  };
};

/**
 * Get slowest endpoints
 */
export const getSlowestEndpoints = (limit: number = 10) => {
  const endpoints = Array.from(metrics.requestsByEndpoint.entries())
    .map(([endpoint, stats]) => ({
      endpoint,
      ...stats
    }))
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, limit);

  return endpoints;
};

/**
 * Get most frequently called endpoints
 */
export const getMostCalledEndpoints = (limit: number = 10) => {
  const endpoints = Array.from(metrics.requestsByEndpoint.entries())
    .map(([endpoint, stats]) => ({
      endpoint,
      ...stats
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return endpoints;
};

/**
 * Reset metrics (useful for testing or periodic resets)
 */
export const resetMetrics = () => {
  metrics.totalRequests = 0;
  metrics.slowRequests = 0;
  metrics.averageResponseTime = 0;
  metrics.maxResponseTime = 0;
  metrics.requestsByEndpoint.clear();

  logger.info('Performance metrics reset');
};

/**
 * Log performance summary (call periodically or on shutdown)
 */
export const logPerformanceSummary = () => {
  const slowPercentage = metrics.totalRequests > 0
    ? ((metrics.slowRequests / metrics.totalRequests) * 100).toFixed(2)
    : '0.00';

  logger.info('📊 Performance Summary', {
    totalRequests: metrics.totalRequests,
    slowRequests: metrics.slowRequests,
    slowPercentage: `${slowPercentage}%`,
    avgResponseTime: `${Math.round(metrics.averageResponseTime)}ms`,
    maxResponseTime: `${metrics.maxResponseTime}ms`,
    uniqueEndpoints: metrics.requestsByEndpoint.size
  });

  // Log top 5 slowest endpoints
  const slowest = getSlowestEndpoints(5);
  if (slowest.length > 0) {
    logger.info('🐌 Top 5 Slowest Endpoints:', slowest.map(e => ({
      endpoint: e.endpoint,
      avgTime: `${Math.round(e.avgTime)}ms`,
      maxTime: `${e.maxTime}ms`,
      calls: e.count
    })));
  }

  // Log top 5 most called endpoints
  const mostCalled = getMostCalledEndpoints(5);
  if (mostCalled.length > 0) {
    logger.info('🔥 Top 5 Most Called Endpoints:', mostCalled.map(e => ({
      endpoint: e.endpoint,
      calls: e.count,
      avgTime: `${Math.round(e.avgTime)}ms`
    })));
  }
};

/**
 * Schedule periodic performance summary logging (every 10 minutes)
 */
export const startPerformanceMonitoring = () => {
  // Log summary every 10 minutes
  setInterval(() => {
    if (metrics.totalRequests > 0) {
      logPerformanceSummary();
    }
  }, 10 * 60 * 1000); // 10 minutes

  logger.info('Performance monitoring started - summary logs every 10 minutes');
};

// Export all functions
export default {
  performanceMonitor,
  getPerformanceMetrics,
  getSlowestEndpoints,
  getMostCalledEndpoints,
  resetMetrics,
  logPerformanceSummary,
  startPerformanceMonitoring
};
