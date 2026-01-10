import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { config, logger, checkRedisHealth, isRedisEnabled } from '../config/index';
import { redisClient, redisPool } from '../config/redis';
import { Event, User, Order } from '../models/index';
import { qrQueue, emailQueue, ticketQueue, analyticsQueue, notificationsQueue } from '../config/queue';
import os from 'os';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  environment: string;
  version: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus & { poolEnabled?: boolean; poolSize?: number; poolActive?: number };
    queues: QueueStatus;
    stripe: ServiceStatus;
    cloudinary: ServiceStatus;
    email: ServiceStatus;
    firebase: ServiceStatus;
  };
  metrics: {
    totalUsers: number;
    totalEvents: number;
    totalOrders: number;
    activeBookings: number;
    systemLoad: {
      memory: {
        used: number;
        total: number;
        percentage: number;
        systemTotal: number;
        systemFree: number;
        systemUsedPercentage: number;
        pressure: 'low' | 'medium' | 'high' | 'critical';
      };
      cpu: {
        usage: number;
        loadAverage: number[];
        cores: number;
      };
      eventLoop: {
        lag: number;
      };
    };
  };
}

interface ServiceStatus {
  status: 'ok' | 'degraded' | 'down';
  responseTime?: number;
  lastChecked: string;
  error?: string;
}

interface QueueStatus extends ServiceStatus {
  queues?: {
    [queueName: string]: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      paused: boolean;
    };
  };
  totalBacklog?: number;
  hasBackpressure?: boolean;
}

// @desc    Get system health status
// @route   GET /health
// @access  Public
export const getHealthStatus = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    const dbStatus = await checkDatabaseHealth();

    // Check Redis connectivity
    const redisStatus = await checkRedisHealthStatus();

    // Check queue health
    const queueStatus = await checkQueueHealth();

    // Check external services
    const stripeStatus = await checkStripeHealth();
    const cloudinaryStatus = await checkCloudinaryHealth();
    const emailStatus = await checkEmailHealth();
    const firebaseStatus = await checkFirebaseHealth();

    // Get system metrics
    const metrics = await getSystemMetrics();

    // Calculate overall status
    const services = {
      database: dbStatus,
      redis: redisStatus,
      queues: queueStatus,
      stripe: stripeStatus,
      cloudinary: cloudinaryStatus,
      email: emailStatus,
      firebase: firebaseStatus,
    };
    
    const overallStatus = calculateOverallStatus(services);
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      services,
      metrics,
    };
    
    const responseTime = Date.now() - startTime;
    
    // Log health check
    logger.info('Health check completed', {
      status: overallStatus,
      responseTime,
      services: Object.entries(services).map(([name, service]) => ({
        name,
        status: service.status,
      })),
    });
    
    // Set appropriate HTTP status code
    const httpStatus = overallStatus === 'ok' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    
    res.status(httpStatus).json({
      success: true,
      data: healthStatus,
      responseTime: `${responseTime}ms`,
    });
    
  } catch (error) {
    logger.error('Health check failed:', error);
    
    res.status(503).json({
      success: false,
      status: 'down',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      error: 'Health check failed',
      responseTime: `${Date.now() - startTime}ms`,
    });
  }
};

// @desc    Get basic health status (lightweight)
// @route   GET /health/basic
// @access  Public
export const getBasicHealthStatus = async (req: Request, res: Response) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;

    res.status(isDbConnected ? 200 : 503).json({
      status: isDbConnected ? 'ok' : 'down',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      database: isDbConnected ? 'connected' : 'disconnected',
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'down',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      error: 'Basic health check failed',
    });
  }
};

// @desc    Get Redis connection statistics
// @route   GET /health/redis
// @access  Public
export const getRedisConnectionStats = async (req: Request, res: Response) => {
  try {
    if (!isRedisEnabled || !redisClient) {
      return res.status(200).json({
        success: true,
        data: {
          enabled: false,
          message: 'Redis is disabled',
        },
      });
    }

    // Get Redis INFO for clients
    const info = await redisClient.info('clients');
    const stats = await redisClient.info('stats');

    // Parse client info
    const clientsMatch = info.match(/connected_clients:(\d+)/);
    const connectedClients = clientsMatch ? parseInt(clientsMatch[1]) : 0;

    const maxClientsMatch = info.match(/maxclients:(\d+)/);
    const maxClients = maxClientsMatch ? parseInt(maxClientsMatch[1]) : 0;

    // Get client list
    const clientList = (await redisClient.call('CLIENT', 'LIST')) as string;
    const clients = clientList.split('\n').filter(Boolean).map((line) => {
      const attrs: any = {};
      line.split(' ').forEach((pair) => {
        const [key, value] = pair.split('=');
        attrs[key] = value;
      });
      return attrs;
    });

    // Count by name/type
    const clientsByName = clients.reduce((acc: any, client: any) => {
      const name = client.name || 'unnamed';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        enabled: true,
        connected: redisClient.status === 'ready',
        connectedClients,
        maxClients,
        utilizationPercent: ((connectedClients / maxClients) * 100).toFixed(2),
        clientsByName,
        clients: clients.slice(0, 20), // Show first 20 clients
        totalClientsInList: clients.length,
        info: {
          clients: info,
          stats: stats,
        },
      },
    });
  } catch (error) {
    logger.error('Redis connection stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis connection stats',
    });
  }
};

// Helper functions
async function checkDatabaseHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    // Check connection status
    if (mongoose.connection.readyState !== 1) {
      return {
        status: 'down',
        lastChecked: new Date().toISOString(),
        error: 'Database not connected',
      };
    }

    // Perform a simple query to test responsiveness
    await mongoose.connection.db.admin().ping();

    const responseTime = Date.now() - startTime;

    return {
      status: responseTime < 1000 ? 'ok' : 'degraded',
      responseTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Database health check failed',
    };
  }
}

async function checkRedisHealthStatus(): Promise<ServiceStatus & { poolEnabled?: boolean; poolSize?: number; poolActive?: number }> {
  const startTime = Date.now();

  try {
    // If Redis is disabled, mark as degraded (not down)
    if (!isRedisEnabled) {
      return {
        status: 'degraded',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: 'Redis is disabled (background jobs unavailable)',
        poolEnabled: false
      };
    }

    const isHealthy = await checkRedisHealth();
    const responseTime = Date.now() - startTime;

    if (!isHealthy) {
      return {
        status: 'down',
        responseTime,
        lastChecked: new Date().toISOString(),
        error: 'Redis not responding',
        poolEnabled: redisPool !== null
      };
    }

    // Get pool stats if enabled
    const poolStats = redisPool ? redisPool.getStats() : null;

    return {
      status: responseTime < 500 ? 'ok' : 'degraded',
      responseTime,
      lastChecked: new Date().toISOString(),
      poolEnabled: poolStats !== null,
      poolSize: poolStats?.poolSize,
      poolActive: poolStats?.activeConnections
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Redis health check failed',
      poolEnabled: redisPool !== null
    };
  }
}

async function checkQueueHealth(): Promise<QueueStatus> {
  const startTime = Date.now();

  try {
    const queues = [
      { name: 'email', queue: emailQueue },
      { name: 'qr', queue: qrQueue },
      { name: 'ticket', queue: ticketQueue },
      { name: 'analytics', queue: analyticsQueue },
      { name: 'notifications', queue: notificationsQueue }
    ].filter(q => q.queue !== null && q.queue !== undefined);

    if (queues.length === 0) {
      return {
        status: 'degraded',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: 'No queues available (Redis disabled)',
        totalBacklog: 0,
        hasBackpressure: false
      };
    }

    // Get counts for all queues in parallel
    const queueStats = await Promise.all(
      queues.map(async ({ name, queue }) => {
        try {
          const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
            queue!.getWaitingCount(),
            queue!.getActiveCount(),
            queue!.getCompletedCount(),
            queue!.getFailedCount(),
            queue!.getDelayedCount(),
            queue!.isPaused()
          ]);

          return {
            name,
            stats: { waiting, active, completed, failed, delayed, paused: isPaused }
          };
        } catch (error) {
          logger.error(`Queue health check failed for ${name}:`, error);
          return {
            name,
            stats: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: true }
          };
        }
      })
    );

    // Build queue status object
    const queueStatusMap: any = {};
    let totalBacklog = 0;

    queueStats.forEach(({ name, stats }) => {
      queueStatusMap[name] = stats;
      totalBacklog += stats.waiting + stats.delayed;
    });

    // Determine status based on backlog
    // Backpressure: > 1000 jobs waiting/delayed across all queues
    const hasBackpressure = totalBacklog > 1000;
    const responseTime = Date.now() - startTime;

    let status: 'ok' | 'degraded' | 'down' = 'ok';
    if (hasBackpressure) {
      status = 'degraded';
    } else if (responseTime > 2000) {
      status = 'degraded';
    }

    return {
      status,
      responseTime,
      lastChecked: new Date().toISOString(),
      queues: queueStatusMap,
      totalBacklog,
      hasBackpressure
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Queue health check failed',
      totalBacklog: 0,
      hasBackpressure: false
    };
  }
}

async function checkStripeHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    if (!config.stripe.secretKey) {
      return {
        status: 'down',
        lastChecked: new Date().toISOString(),
        error: 'Stripe not configured',
      };
    }
    
    // This is a placeholder - in a real implementation, you'd make a test API call
    // For now, we'll just check if the key exists
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'ok',
      responseTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Stripe health check failed',
    };
  }
}

async function checkCloudinaryHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    if (!config.cloudinary.cloudName || !config.cloudinary.apiKey) {
      return {
        status: 'down',
        lastChecked: new Date().toISOString(),
        error: 'Cloudinary not configured',
      };
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'ok',
      responseTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Cloudinary health check failed',
    };
  }
}

async function checkEmailHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    if (!config.email.host || !config.email.username) {
      return {
        status: 'down',
        lastChecked: new Date().toISOString(),
        error: 'Email service not configured',
      };
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'ok',
      responseTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Email health check failed',
    };
  }
}

async function checkFirebaseHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    if (!config.firebase.projectId || !config.firebase.clientEmail) {
      return {
        status: 'down',
        lastChecked: new Date().toISOString(),
        error: 'Firebase not configured',
      };
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'ok',
      responseTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Firebase health check failed',
    };
  }
}

async function getSystemMetrics() {
  try {
    // If database is not connected, return default metrics
    if (mongoose.connection.readyState !== 1) {
      return {
        totalUsers: 0,
        totalEvents: 0,
        totalOrders: 0,
        activeBookings: 0,
        systemLoad: {
          memory: {
            used: 0,
            total: 0,
            percentage: 0,
            systemTotal: 0,
            systemFree: 0,
            systemUsedPercentage: 0,
            pressure: 'low' as 'low' | 'medium' | 'high' | 'critical'
          },
          cpu: { usage: 0, loadAverage: [0, 0, 0], cores: 0 },
          eventLoop: { lag: 0 }
        },
      };
    }

    // Get database counts
    const [totalUsers, totalEvents, totalOrders, activeBookings] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments({ isDeleted: false }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'confirmed', paymentStatus: 'paid' }),
    ]);

    // Get process memory metrics
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const memoryPercentage = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);

    // Get system memory metrics
    const systemTotalMB = Math.round(os.totalmem() / 1024 / 1024);
    const systemFreeMB = Math.round(os.freemem() / 1024 / 1024);
    const systemUsedMB = systemTotalMB - systemFreeMB;
    const systemUsedPercentage = Math.round((systemUsedMB / systemTotalMB) * 100);

    // Determine memory pressure
    let memoryPressure: 'low' | 'medium' | 'high' | 'critical';
    if (systemUsedPercentage < 60) {
      memoryPressure = 'low';
    } else if (systemUsedPercentage < 80) {
      memoryPressure = 'medium';
    } else if (systemUsedPercentage < 90) {
      memoryPressure = 'high';
    } else {
      memoryPressure = 'critical';
    }

    // Get CPU metrics
    const loadAverage = os.loadavg();
    const cpuCores = os.cpus().length;
    const cpuUsagePercent = Math.round((loadAverage[0] / cpuCores) * 100);

    // Simple event loop lag estimation
    // (Real production systems should use perf_hooks or external monitoring)
    const eventLoopStart = Date.now();
    await new Promise(resolve => setImmediate(resolve));
    const eventLoopLag = Date.now() - eventLoopStart;

    return {
      totalUsers,
      totalEvents,
      totalOrders,
      activeBookings,
      systemLoad: {
        memory: {
          used: memoryUsedMB,
          total: memoryTotalMB,
          percentage: memoryPercentage,
          systemTotal: systemTotalMB,
          systemFree: systemFreeMB,
          systemUsedPercentage,
          pressure: memoryPressure,
        },
        cpu: {
          usage: cpuUsagePercent,
          loadAverage: loadAverage.map(avg => Math.round(avg * 100) / 100), // Round to 2 decimals
          cores: cpuCores,
        },
        eventLoop: {
          lag: eventLoopLag
        }
      },
    };
  } catch (error) {
    logger.error('Failed to get system metrics:', error);
    return {
      totalUsers: 0,
      totalEvents: 0,
      totalOrders: 0,
      activeBookings: 0,
      systemLoad: {
        memory: {
          used: 0,
          total: 0,
          percentage: 0,
          systemTotal: 0,
          systemFree: 0,
          systemUsedPercentage: 0,
          pressure: 'low' as 'low' | 'medium' | 'high' | 'critical'
        },
        cpu: { usage: 0, loadAverage: [0, 0, 0], cores: 0 },
        eventLoop: { lag: 0 }
      },
    };
  }
}

function calculateOverallStatus(services: Record<string, ServiceStatus>): 'ok' | 'degraded' | 'down' {
  const statuses = Object.values(services).map(service => service.status);
  
  if (statuses.includes('down')) {
    // If any critical service is down, overall status is down
    return 'down';
  }
  
  if (statuses.includes('degraded')) {
    // If any service is degraded, overall status is degraded
    return 'degraded';
  }
  
  return 'ok';
}