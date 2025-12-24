import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AppError } from '../middleware/error';
import { bulkDataService } from '../services/bulk-data.service';
import { ImportOptions, ExportOptions, ModelName } from '../types/bulk-import.types';

/**
 * Admin Bulk Import/Export Controller
 * Handles validation, execution, and export for all models
 */

/**
 * Step 1: Validate import data
 * POST /api/admin/bulk-import/validate
 */
export const validateBulkImport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const { model, mode, matchBy, data } = req.body;
    const userId = req.user?.email || req.user?._id?.toString() || 'unknown';

    // Validate options
    const options: ImportOptions = {
      model: model as ModelName,
      mode: mode || 'upsert',
      matchBy: matchBy || 'slug',
      allowPartialSuccess: false // Strict by default
    };

    // Validate data is array
    if (!Array.isArray(data)) {
      return next(new AppError('data must be an array', 400));
    }

    if (data.length === 0) {
      return next(new AppError('data array cannot be empty', 400));
    }

    if (data.length > 10000) {
      return next(new AppError('data array cannot exceed 10,000 records', 400));
    }

    // Call validation service
    const report = await bulkDataService.validateImport(data, options, userId);

    res.status(200).json({
      success: true,
      validationId: report.validationId,
      report
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Step 2: Execute import after validation
 * POST /api/admin/bulk-import/execute
 */
export const executeBulkImport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { validationId, confirmedAt } = req.body;
    const userId = req.user?.email || req.user?._id?.toString() || 'unknown';

    if (!validationId) {
      return next(new AppError('validationId is required', 400));
    }

    if (!confirmedAt) {
      return next(new AppError('confirmedAt timestamp is required', 400));
    }

    // Execute import
    const result = await bulkDataService.executeImport(validationId, userId);

    res.status(200).json({
      success: true,
      result
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Export data for a model
 * POST /api/admin/bulk-export/:model
 */
export const exportBulkData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { model } = req.params;
    const userId = req.user?.email || req.user?._id?.toString() || 'unknown';

    const { format, filters, includeRelationships, fields } = req.body;

    // Validate model
    const validModels: ModelName[] = [
      'Category',
      'User',
      'Event',
      'Blog',
      'Collection',
      'Coupon',
      'Order',
      'Payment',
      'Payout',
      'CommissionTransaction'
    ];

    if (!validModels.includes(model as ModelName)) {
      return next(new AppError(`Invalid model: ${model}`, 400));
    }

    const options: ExportOptions = {
      model: model as ModelName,
      format: format || 'json',
      filters: filters || {},
      includeRelationships: includeRelationships !== false, // Default true
      fields: fields || undefined
    };

    // Call export service
    const result = await bulkDataService.exportData(options, userId);

    // Stream JSON response
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${model.toLowerCase()}-export-${Date.now()}.json"`
    );

    res.status(200).json(result);

  } catch (error) {
    next(error);
  }
};

/**
 * Get list of supported models
 * GET /api/admin/bulk-import/models
 */
export const getSupportedModels = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const models = [
      {
        name: 'Category',
        matchFields: ['slug', 'id'],
        description: 'Event categories with hierarchical structure'
      },
      {
        name: 'User',
        matchFields: ['email', 'id'],
        description: 'Users (admin, customer, vendor, employee)'
      },
      {
        name: 'Event',
        matchFields: ['slug', 'id'],
        description: 'Events with schedules, vendors, and categories'
      },
      {
        name: 'Blog',
        matchFields: ['slug', 'id'],
        description: 'Blog posts with categories and authors'
      },
      {
        name: 'Collection',
        matchFields: ['slug', 'id'],
        description: 'Event collections'
      },
      {
        name: 'Coupon',
        matchFields: ['code', 'id'],
        description: 'Discount coupons with complex rules'
      },
      {
        name: 'Order',
        matchFields: ['orderNumber', 'id'],
        description: 'Orders with items and participants'
      },
      {
        name: 'Payment',
        matchFields: ['transactionId', 'id'],
        description: 'Payment records (sensitive data)'
      },
      {
        name: 'Payout',
        matchFields: ['id'],
        description: 'Vendor payouts (sensitive data)'
      },
      {
        name: 'CommissionTransaction',
        matchFields: ['transactionId', 'id'],
        description: 'Commission transactions (financial data)'
      }
    ];

    res.status(200).json({
      success: true,
      models
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get import/export statistics
 * GET /api/admin/bulk-import/stats
 */
export const getBulkImportStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // TODO: Fetch from audit logs
    // For now, return placeholder
    res.status(200).json({
      success: true,
      stats: {
        totalImports: 0,
        totalExports: 0,
        lastImportAt: null,
        lastExportAt: null
      }
    });

  } catch (error) {
    next(error);
  }
};
