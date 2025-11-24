import { Response, NextFunction } from 'express';
import { AppError } from '../middleware/index';
import { AuthRequest } from '../types/index';
import CommissionConfig, { ConfigStatus } from '../models/CommissionConfig';
import CommissionTransaction, { CommissionTransactionStatus } from '../models/CommissionTransaction';
import mongoose from 'mongoose';
import { CacheService } from '../services/cache.service';

const cacheService = new CacheService();

/**
 * Get all commission configurations
 * @route GET /api/admin/commissions
 */
export const getCommissionConfigs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    // Build cache key
    const cacheKey = `commission-configs:${page}:${limit}:${status || 'all'}:${search || ''}`;

    // Try to get from cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        data: cached,
        cached: true
      });
      return;
    }

    const query: any = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [configs, total] = await Promise.all([
      CommissionConfig.find(query)
        .select('-__v')
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .sort({ isDefault: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      CommissionConfig.countDocuments(query)
    ]);

    const result = {
      commissions: configs,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
        hasPrevPage: Number(page) > 1
      }
    };

    // Cache for 10 minutes (configs don't change frequently)
    await cacheService.set(cacheKey, result, { ttl: 600 });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get commission configuration by ID
 * @route GET /api/admin/commissions/:id
 */
export const getCommissionConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid commission config ID', 400));
    }

    const config = await CommissionConfig.findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .lean();

    if (!config) {
      return next(new AppError('Commission configuration not found', 404));
    }

    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Create commission configuration
 * @route POST /api/admin/commissions
 */
export const createCommissionConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = req.user?._id || req.user?.id;
    if (!adminId) {
      return next(new AppError('Admin ID not found', 401));
    }

    const configData = {
      ...req.body,
      createdBy: adminId
    };

    const config = new CommissionConfig(configData);
    await config.save();

    // Invalidate config cache
    await cacheService.deletePattern('commission-configs:*');

    res.status(201).json({
      success: true,
      message: 'Commission configuration created successfully',
      data: config
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Update commission configuration
 * @route PUT /api/admin/commissions/:id
 */
export const updateCommissionConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id || req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid commission config ID', 400));
    }

    if (!adminId) {
      return next(new AppError('Admin ID not found', 401));
    }

    const updateData = {
      ...req.body,
      updatedBy: adminId
    };

    const config = await CommissionConfig.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!config) {
      return next(new AppError('Commission configuration not found', 404));
    }

    // Invalidate config cache
    await cacheService.deletePattern('commission-configs:*');

    res.status(200).json({
      success: true,
      message: 'Commission configuration updated successfully',
      data: config
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Delete commission configuration
 * @route DELETE /api/admin/commissions/:id
 */
export const deleteCommissionConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid commission config ID', 400));
    }

    const config = await CommissionConfig.findById(id);

    if (!config) {
      return next(new AppError('Commission configuration not found', 404));
    }

    if (config.isDefault) {
      return next(new AppError('Cannot delete default commission configuration', 400));
    }

    await config.deleteOne();

    // Invalidate config cache
    await cacheService.deletePattern('commission-configs:*');

    res.status(200).json({
      success: true,
      message: 'Commission configuration deleted successfully'
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Set commission configuration as default
 * @route PUT /api/admin/commissions/:id/set-default
 */
export const setDefaultCommissionConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid commission config ID', 400));
    }

    const config = await CommissionConfig.findById(id);

    if (!config) {
      return next(new AppError('Commission configuration not found', 404));
    }

    config.isDefault = true;
    await config.save();

    res.status(200).json({
      success: true,
      message: 'Commission configuration set as default',
      data: config
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get all commission transactions
 * @route GET /api/admin/commission-transactions
 */
export const getCommissionTransactions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      vendorId,
      startDate,
      endDate
    } = req.query;

    // Normalize cache key parameters to improve hit rate
    const normalizedStatus = status || 'all';
    const normalizedVendorId = vendorId || 'all';
    const normalizedStartDate = startDate || 'none';
    const normalizedEndDate = endDate || 'none';

    const cacheKey = `commission-transactions:${page}:${limit}:${normalizedStatus}:${normalizedVendorId}:${normalizedStartDate}:${normalizedEndDate}`;

    // Try to get from cache first
    const cached = await cacheService.get(cacheKey) as any;
    if (cached) {
      // Generate ETag from cached data
      const crypto = await import('crypto');
      const etag = `"${crypto.createHash('md5').update(JSON.stringify(cached)).digest('hex')}"`;

      // Check if client has matching ETag
      if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
        return;
      }

      // Set proper HTTP caching headers
      res.set({
        'ETag': etag,
        'Cache-Control': 'private, max-age=120',
        'Last-Modified': cached.lastModified || new Date().toUTCString()
      });

      res.status(200).json({
        success: true,
        data: cached,
        cached: true
      });
      return;
    }

    // Build match stage for aggregation
    const matchStage: any = {};
    if (status) matchStage.status = status;
    if (vendorId) matchStage.vendorId = vendorId;
    if (startDate || endDate) {
      matchStage.calculatedAt = {};
      if (startDate) matchStage.calculatedAt.$gte = new Date(startDate as string);
      if (endDate) matchStage.calculatedAt.$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Use aggregation pipeline to reduce N+1 queries to single query
    const aggregationResult = await CommissionTransaction.aggregate([
      { $match: matchStage },
      {
        $facet: {
          // Get paginated transactions with lookups
          transactions: [
            { $sort: { calculatedAt: -1 } },
            { $skip: skip },
            { $limit: Number(limit) },
            {
              $lookup: {
                from: 'users',
                localField: 'vendorId',
                foreignField: '_id',
                as: 'vendor'
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'customerId',
                foreignField: '_id',
                as: 'customer'
              }
            },
            {
              $lookup: {
                from: 'commissionconfigs',
                localField: 'commissionConfigId',
                foreignField: '_id',
                as: 'commissionConfig'
              }
            },
            {
              $project: {
                transactionId: 1,
                orderId: 1,
                orderNumber: 1,
                vendorId: 1,
                vendorName: 1,
                customerId: 1,
                customerName: 1,
                commissionConfigId: 1,
                originalAmount: 1,
                totalCommissionAmount: 1,
                platformCommission: 1,
                vendorCommission: 1,
                status: 1,
                calculatedAt: 1,
                approvedAt: 1,
                vendor: {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: '$vendor',
                        as: 'v',
                        in: {
                          _id: '$$v._id',
                          firstName: '$$v.firstName',
                          lastName: '$$v.lastName',
                          email: '$$v.email'
                        }
                      }
                    },
                    0
                  ]
                },
                customer: {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: '$customer',
                        as: 'c',
                        in: {
                          _id: '$$c._id',
                          firstName: '$$c.firstName',
                          lastName: '$$c.lastName',
                          email: '$$c.email'
                        }
                      }
                    },
                    0
                  ]
                },
                commissionConfig: {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: '$commissionConfig',
                        as: 'cc',
                        in: {
                          _id: '$$cc._id',
                          name: '$$cc.name'
                        }
                      }
                    },
                    0
                  ]
                }
              }
            }
          ],
          // Get total count
          totalCount: [
            { $count: 'count' }
          ],
          // Get most recent transaction date for Last-Modified header
          mostRecent: [
            { $sort: { calculatedAt: -1 } },
            { $limit: 1 },
            { $project: { calculatedAt: 1 } }
          ]
        }
      }
    ]).hint({ calculatedAt: -1 });

    const transactions = aggregationResult[0]?.transactions || [];
    const total = aggregationResult[0]?.totalCount[0]?.count || 0;
    const mostRecentDate = aggregationResult[0]?.mostRecent[0]?.calculatedAt || new Date();

    const result = {
      transactions,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
        hasPrevPage: Number(page) > 1
      },
      lastModified: mostRecentDate.toUTCString()
    };

    // Cache for 2 minutes (transactions change frequently)
    await cacheService.set(cacheKey, result, { ttl: 120 });

    // Generate ETag from result
    const crypto = await import('crypto');
    const etag = `"${crypto.createHash('md5').update(JSON.stringify(result)).digest('hex')}"`;

    // Check if client has matching ETag
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    // Set proper HTTP caching headers
    res.set({
      'ETag': etag,
      'Cache-Control': 'private, max-age=120',
      'Last-Modified': mostRecentDate.toUTCString()
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get commission transaction by ID
 * @route GET /api/admin/commission-transactions/:id
 */
export const getCommissionTransaction = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid transaction ID', 400));
    }

    const transaction = await CommissionTransaction.findById(id)
      .populate('vendorId', 'firstName lastName email')
      .populate('customerId', 'firstName lastName email')
      .populate('commissionConfigId')
      .populate('approvedBy', 'firstName lastName email')
      .lean();

    if (!transaction) {
      return next(new AppError('Commission transaction not found', 404));
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Approve commission transactions
 * @route PUT /api/admin/commission-transactions/approve
 */
export const approveCommissionTransactions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { transactionIds } = req.body;
    const adminId = req.user?._id || req.user?.id;

    if (!adminId) {
      return next(new AppError('Admin ID not found', 401));
    }

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return next(new AppError('Transaction IDs are required', 400));
    }

    const approvedIds: string[] = [];
    const errors: string[] = [];

    for (const id of transactionIds) {
      try {
        const transaction = await CommissionTransaction.findById(id);
        if (transaction) {
          await transaction.approve(adminId);
          approvedIds.push(id);
        }
      } catch (error) {
        errors.push(`Failed to approve transaction ${id}: ${(error as Error).message}`);
      }
    }

    // Invalidate caches after approval
    await Promise.all([
      cacheService.deletePattern('commission-transactions:*'),
      cacheService.delete('commission-stats:summary')
    ]);

    res.status(200).json({
      success: true,
      message: `${approvedIds.length} commission(s) approved successfully`,
      data: {
        approvedIds,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Reject commission transaction
 * @route PUT /api/admin/commission-transactions/:id/reject
 */
export const rejectCommissionTransaction = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid transaction ID', 400));
    }

    if (!reason) {
      return next(new AppError('Rejection reason is required', 400));
    }

    const transaction = await CommissionTransaction.findById(id);

    if (!transaction) {
      return next(new AppError('Commission transaction not found', 404));
    }

    await transaction.cancel(reason);

    res.status(200).json({
      success: true,
      message: 'Commission transaction rejected',
      data: transaction
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get commission statistics
 * @route GET /api/admin/commission-stats
 */
export const getCommissionStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cacheKey = 'commission-stats:summary';

    // Try to get from cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        data: cached,
        cached: true
      });
      return;
    }

    // Use single optimized aggregation pipeline instead of multiple queries
    const [statsResult] = await CommissionTransaction.aggregate([
      {
        $facet: {
          // Total and status stats in one go
          totalsAndStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                amount: { $sum: '$totalCommissionAmount' }
              }
            }
          ],
          // Top vendors
          topVendors: [
            {
              $group: {
                _id: '$vendorId',
                vendorName: { $first: '$vendorName' },
                totalCommissions: { $sum: 1 },
                totalAmount: { $sum: '$totalCommissionAmount' }
              }
            },
            { $sort: { totalAmount: -1 } },
            { $limit: 10 }
          ]
        }
      }
    ]);

    const statusStats = statsResult.totalsAndStatus || [];
    const topVendors = statsResult.topVendors || [];

    // Calculate totals and status map
    let totalCommissions = 0;
    let totalAmount = 0;
    const statusMap: any = {};

    statusStats.forEach((item: any) => {
      totalCommissions += item.count;
      totalAmount += item.amount;
      statusMap[item._id] = { count: item.count, amount: item.amount };
    });

    const stats = {
      totalCommissions,
      totalAmount,
      pendingCommissions: statusMap[CommissionTransactionStatus.CALCULATED]?.count || 0,
      pendingAmount: statusMap[CommissionTransactionStatus.CALCULATED]?.amount || 0,
      approvedCommissions: statusMap[CommissionTransactionStatus.APPROVED]?.count || 0,
      approvedAmount: statusMap[CommissionTransactionStatus.APPROVED]?.amount || 0,
      paidCommissions: statusMap[CommissionTransactionStatus.PAID]?.count || 0,
      paidAmount: statusMap[CommissionTransactionStatus.PAID]?.amount || 0,
      averageCommissionRate: totalAmount > 0 ? (totalAmount / totalCommissions) : 5,
      topVendors: topVendors.map((vendor: any) => ({
        vendorId: vendor._id,
        vendorName: vendor.vendorName,
        totalCommissions: vendor.totalCommissions,
        totalAmount: vendor.totalAmount
      })),
      currency: 'AED'
    };

    // Cache for 5 minutes (stats don't change as frequently)
    await cacheService.set(cacheKey, stats, { ttl: 300 });

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get commission templates
 * @route GET /api/admin/commission-templates
 */
export const getCommissionTemplates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Return predefined templates
    const templates = [
      {
        id: 'standard',
        name: 'Standard Commission (5%)',
        description: 'Standard 5% platform commission',
        platformCommission: {
          defaultPercentage: 5,
          minAmount: 0,
          maxAmount: 10000,
          currency: 'AED'
        },
        rules: []
      },
      {
        id: 'premium',
        name: 'Premium Vendor (3%)',
        description: 'Reduced 3% commission for premium vendors',
        platformCommission: {
          defaultPercentage: 3,
          minAmount: 0,
          maxAmount: 50000,
          currency: 'AED'
        },
        rules: []
      },
      {
        id: 'tiered',
        name: 'Tiered Commission',
        description: 'Tiered commission based on order value',
        platformCommission: {
          defaultPercentage: 5,
          minAmount: 0,
          currency: 'AED'
        },
        rules: [
          {
            id: 'tier1',
            name: 'Orders under 1000 AED',
            type: 'percentage',
            recipient: 'platform',
            percentage: 5,
            status: 'active',
            priority: 1,
            conditions: {
              maxOrderAmount: 1000
            }
          },
          {
            id: 'tier2',
            name: 'Orders 1000-5000 AED',
            type: 'percentage',
            recipient: 'platform',
            percentage: 3,
            status: 'active',
            priority: 2,
            conditions: {
              minOrderAmount: 1000,
              maxOrderAmount: 5000
            }
          },
          {
            id: 'tier3',
            name: 'Orders above 5000 AED',
            type: 'percentage',
            recipient: 'platform',
            percentage: 2,
            status: 'active',
            priority: 3,
            conditions: {
              minOrderAmount: 5000
            }
          }
        ]
      }
    ];

    res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Recalculate commission transaction
 * @route PUT /api/admin/commission-transactions/:id/recalculate
 */
export const recalculateCommissionTransaction = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid transaction ID', 400));
    }

    // For now, just return the transaction
    // TODO: Implement actual recalculation logic
    const transaction = await CommissionTransaction.findById(id);

    if (!transaction) {
      return next(new AppError('Commission transaction not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Commission recalculated successfully',
      data: transaction
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Batch calculate commissions for orders
 * @route POST /api/admin/commission-batch-calculate
 */
export const batchCalculateCommissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderIds } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return next(new AppError('Order IDs are required', 400));
    }

    // TODO: Implement batch commission calculation
    res.status(200).json({
      success: true,
      message: `Batch calculation initiated for ${orderIds.length} orders`,
      data: { orderIds, calculated: 0, failed: 0 }
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get commission analytics
 * @route GET /api/admin/commission-analytics
 */
export const getCommissionAnalytics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.calculatedAt = {};
      if (startDate) dateFilter.calculatedAt.$gte = new Date(startDate as string);
      if (endDate) dateFilter.calculatedAt.$lte = new Date(endDate as string);
    }

    const analytics = await CommissionTransaction.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$calculatedAt' },
            month: { $month: '$calculatedAt' }
          },
          totalCommissions: { $sum: 1 },
          totalAmount: { $sum: '$totalCommissionAmount' },
          platformCommission: { $sum: '$platformCommission' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Export commission data
 * @route GET /api/admin/commission-export
 */
export const exportCommissionData = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { format = 'csv', startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.calculatedAt = {};
      if (startDate) dateFilter.calculatedAt.$gte = new Date(startDate as string);
      if (endDate) dateFilter.calculatedAt.$lte = new Date(endDate as string);
    }

    const transactions = await CommissionTransaction.find(dateFilter)
      .populate('vendorId', 'firstName lastName email')
      .populate('customerId', 'firstName lastName')
      .lean();

    // TODO: Implement actual export formatting
    res.status(200).json({
      success: true,
      message: `Export prepared in ${format} format`,
      data: { count: transactions.length, format }
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get pending commissions
 * @route GET /api/admin/commission-pending
 */
export const getPendingCommissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      CommissionTransaction.find({ status: CommissionTransactionStatus.CALCULATED })
        .populate('vendorId', 'firstName lastName email')
        .populate('customerId', 'firstName lastName')
        .sort({ calculatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      CommissionTransaction.countDocuments({ status: CommissionTransactionStatus.CALCULATED })
    ]);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          total,
          hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
          hasPrevPage: Number(page) > 1
        }
      }
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Bulk approve commissions
 * @route POST /api/admin/commission-bulk-approve
 */
export const bulkApproveCommissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    return await approveCommissionTransactions(req, res, next);
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Bulk reject commissions
 * @route POST /api/admin/commission-bulk-reject
 */
export const bulkRejectCommissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { transactionIds, reason } = req.body;

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return next(new AppError('Transaction IDs are required', 400));
    }

    if (!reason) {
      return next(new AppError('Rejection reason is required', 400));
    }

    const rejectedIds: string[] = [];
    const errors: string[] = [];

    for (const id of transactionIds) {
      try {
        const transaction = await CommissionTransaction.findById(id);
        if (transaction) {
          await transaction.cancel(reason);
          rejectedIds.push(id);
        }
      } catch (error) {
        errors.push(`Failed to reject transaction ${id}: ${(error as Error).message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `${rejectedIds.length} commission(s) rejected`,
      data: {
        rejectedIds,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};
