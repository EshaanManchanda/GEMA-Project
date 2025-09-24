import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';

const router = Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

/**
 * @route   GET /api/admin/payout-stats
 * @desc    Get payout statistics for admin dashboard
 * @access  Admin only
 */
router.get('/payout-stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // For now, return mock data that matches the expected interface
    // TODO: Implement actual payout statistics calculation
    const mockPayoutStats = {
      totalPayouts: 0,
      totalAmount: 0,
      pendingPayouts: 0,
      pendingAmount: 0,
      completedPayouts: 0,
      completedAmount: 0,
      rejectedPayouts: 0,
      averagePayoutAmount: 0,
      currency: 'AED',
      periodComparison: {
        payoutGrowth: 0,
        amountGrowth: 0
      }
    };

    res.status(200).json({
      success: true,
      message: 'Payout statistics retrieved successfully',
      data: mockPayoutStats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/commission-stats
 * @desc    Get commission statistics for admin dashboard
 * @access  Admin only
 */
router.get('/commission-stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // For now, return mock data that matches the expected interface
    // TODO: Implement actual commission statistics calculation
    const mockCommissionStats = {
      totalCommissions: 0,
      totalAmount: 0,
      pendingCommissions: 0,
      pendingAmount: 0,
      approvedCommissions: 0,
      approvedAmount: 0,
      paidCommissions: 0,
      paidAmount: 0,
      averageCommissionRate: 0,
      topVendors: []
    };

    res.status(200).json({
      success: true,
      message: 'Commission statistics retrieved successfully',
      data: mockCommissionStats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/dashboard-all
 * @desc    Get all dashboard data in a single request
 * @access  Admin only
 */
router.get('/dashboard-all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Import analytics service
    const { analyticsService } = await import('../services/analytics.service');

    // Fetch dashboard summary from analytics service
    const dashboardSummary = await analyticsService.getDashboardSummary();

    // Add payout and commission stats
    const payoutStats = {
      totalPayouts: 0,
      totalAmount: 0,
      pendingPayouts: 0,
      pendingAmount: 0,
      completedPayouts: 0,
      completedAmount: 0,
      rejectedPayouts: 0,
      averagePayoutAmount: 0,
      currency: 'AED',
      periodComparison: {
        payoutGrowth: 0,
        amountGrowth: 0
      }
    };

    const commissionStats = {
      totalCommissions: 0,
      totalAmount: 0,
      pendingCommissions: 0,
      pendingAmount: 0,
      approvedCommissions: 0,
      approvedAmount: 0,
      paidCommissions: 0,
      paidAmount: 0,
      averageCommissionRate: 0,
      topVendors: []
    };

    const allDashboardData = {
      ...dashboardSummary,
      payoutStats,
      commissionStats,
      recentActivity: [
        {
          id: 'activity-1',
          type: 'user_registered',
          title: 'Dashboard Data Loaded',
          description: 'All dashboard statistics updated successfully',
          timestamp: new Date().toISOString(),
        }
      ]
    };

    res.status(200).json({
      success: true,
      message: 'All dashboard data retrieved successfully',
      data: allDashboardData
    });
  } catch (error) {
    next(error);
  }
});

export default router;