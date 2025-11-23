import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express.d';
import Partnership from '../models/Partnership';
import { emailService } from '../services/email.service';
import { AppError } from '../middleware/error';

/**
 * Submit partnership form (public endpoint)
 */
export const submitPartnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, organization, partnershipType, website, message, agreeToTerms } = req.body;

    // Create partnership record in database
    const partnership = new Partnership({
      name,
      email,
      phone,
      organization,
      partnershipType,
      website,
      message,
      agreeToTerms,
      status: 'pending'
    });

    await partnership.save();

    // Send email notifications
    try {
      // Send notification to admin
      await emailService.sendPartnershipNotification({
        name,
        email,
        phone,
        organization,
        partnershipType,
        website,
        message,
        submittedAt: partnership.createdAt
      });

      // Send confirmation to user
      await emailService.sendPartnershipConfirmation({
        name,
        email,
        partnershipType
      });
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error('Failed to send partnership notification email:', emailError);
      // Continue anyway as the partnership was saved to database
    }

    res.status(201).json({
      success: true,
      message: 'Thank you for your partnership inquiry! We will review your submission and get back to you soon.',
      data: {
        partnership: {
          id: partnership._id,
          name: partnership.name,
          email: partnership.email,
          partnershipType: partnership.partnershipType,
          submittedAt: partnership.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all partnership submissions (admin only)
 */
export const getAllPartnerships = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return next(new AppError('Access denied. Admin privileges required.', 403));
    }

    const {
      page = 1,
      limit = 20,
      status,
      partnershipType,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query: any = {};
    if (status) {
      query.status = status;
    }
    if (partnershipType) {
      query.partnershipType = partnershipType;
    }

    // Parse pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [partnerships, totalCount] = await Promise.all([
      Partnership.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Partnership.countDocuments(query)
    ]);

    // Get statistics
    const stats = await Partnership.getPartnershipStats();

    res.status(200).json({
      success: true,
      message: 'Partnership submissions retrieved successfully',
      data: {
        partnerships,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalCount,
          limit: limitNum,
          hasNext: pageNum * limitNum < totalCount,
          hasPrev: pageNum > 1
        },
        stats
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single partnership submission by ID (admin only)
 */
export const getPartnershipById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return next(new AppError('Access denied. Admin privileges required.', 403));
    }

    const { id } = req.params;

    const partnership = await Partnership.findById(id);

    if (!partnership) {
      return next(new AppError('Partnership submission not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Partnership submission retrieved successfully',
      data: { partnership }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update partnership status (admin only)
 */
export const updatePartnershipStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return next(new AppError('Access denied. Admin privileges required.', 403));
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    const partnership = await Partnership.findById(id);

    if (!partnership) {
      return next(new AppError('Partnership submission not found', 404));
    }

    // Update status
    const oldStatus = partnership.status;
    partnership.status = status;

    // Update timestamp based on status
    if (status === 'contacted' && oldStatus !== 'contacted') {
      partnership.contactedAt = new Date();
    } else if (status === 'approved' && oldStatus !== 'approved') {
      partnership.approvedAt = new Date();
    } else if (status === 'rejected' && oldStatus !== 'rejected') {
      partnership.rejectedAt = new Date();
    }

    if (notes !== undefined) {
      partnership.notes = notes;
    }

    await partnership.save();

    res.status(200).json({
      success: true,
      message: `Partnership status updated to ${status}`,
      data: { partnership }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete partnership submission (admin only)
 */
export const deletePartnership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return next(new AppError('Access denied. Admin privileges required.', 403));
    }

    const { id } = req.params;

    const partnership = await Partnership.findByIdAndDelete(id);

    if (!partnership) {
      return next(new AppError('Partnership submission not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Partnership submission deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get partnership statistics (admin only)
 */
export const getPartnershipStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return next(new AppError('Access denied. Admin privileges required.', 403));
    }

    const stats = await Partnership.getPartnershipStats();

    res.status(200).json({
      success: true,
      message: 'Partnership statistics retrieved successfully',
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
};
