import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { config, logger } from '../config';
import { Event, User, Order } from '../models';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  environment: string;
  version: string;
  uptime: number;
  services: {
    database: ServiceStatus;
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
      };
      cpu: {
        usage: number;
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

// @desc    Get system health status
// @route   GET /health
// @access  Public
export const getHealthStatus = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    const dbStatus = await checkDatabaseHealth();
    
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
    // Get database counts
    const [totalUsers, totalEvents, totalOrders, activeBookings] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments({ isDeleted: false }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'confirmed', paymentStatus: 'paid' }),
    ]);
    
    // Get system metrics
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const memoryPercentage = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);
    
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
        },
        cpu: {
          usage: Math.round(process.cpuUsage().system / 1000000), // Convert to percentage approximation
        },
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
        memory: { used: 0, total: 0, percentage: 0 },
        cpu: { usage: 0 },
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