import Banner, { IBanner } from '../models/Banner';
import { mediaService } from './media.service';
import mongoose from 'mongoose';
import { AppError } from '../middleware/error';

class BannerService {
  /**
   * Get active banners for public display
   */
  async getActiveBanners(): Promise<IBanner[]> {
    const now = new Date();

    return await Banner.find({
      isActive: true,
      status: { $in: ['active', 'scheduled'] },
      $and: [
        {
          $or: [
            { startDate: { $exists: false } },
            { startDate: null },
            { startDate: { $lte: now } }
          ]
        },
        {
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: now } }
          ]
        }
      ]
    })
    .populate('imageAsset', 'url filename width height')
    .sort({ displayOrder: 1 })
    .lean();
  }

  /**
   * Admin: Get all banners with filters
   */
  async getAllBanners(filters: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, search, page = 1, limit = 20 } = filters;

    const query: any = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const skip = (page - 1) * limit;

    const [banners, total] = await Promise.all([
      Banner.find(query)
        .populate('imageAsset', 'url filename width height')
        .populate('createdBy', 'firstName lastName email')
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Banner.countDocuments(query)
    ]);

    return {
      banners,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Admin: Get banner by ID
   */
  async getBannerById(id: string): Promise<IBanner | null> {
    return await Banner.findById(id)
      .populate('imageAsset')
      .populate('createdBy', 'firstName lastName email');
  }

  /**
   * Admin: Create banner with media tracking
   */
  async createBanner(data: Partial<IBanner>, userId: string): Promise<IBanner> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Remove null/undefined dates so they don't exist in the document
      const bannerData: any = { ...data, createdBy: userId };
      if (!bannerData.startDate) delete bannerData.startDate;
      if (!bannerData.endDate) delete bannerData.endDate;

      // Create banner
      const banner = await Banner.create([bannerData], { session });

      // Track media usage with the newly created banner ID
      if (data.imageAsset) {
        await mediaService.trackUsage(
          data.imageAsset.toString(),
          'Banner' as any, // Model name
          'imageAsset',
          banner[0]._id as mongoose.Types.ObjectId,
          session
        );
      }

      await session.commitTransaction();
      return banner[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Admin: Update banner
   */
  async updateBanner(id: string, data: Partial<IBanner>): Promise<IBanner | null> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const existingBanner = await Banner.findById(id).session(session);
      if (!existingBanner) throw new AppError('Banner not found', 404);

      // Handle image change
      if (data.imageAsset && data.imageAsset.toString() !== existingBanner.imageAsset.toString()) {
        // Untrack old image usage
        await mediaService.untrackUsage(
          existingBanner.imageAsset.toString(),
          'Banner',
          existingBanner._id as mongoose.Types.ObjectId,
          session
        );

        // Track new image usage
        await mediaService.trackUsage(
          data.imageAsset.toString(),
          'Banner' as any,
          'imageAsset',
          existingBanner._id as mongoose.Types.ObjectId,
          session
        );
      }

      // Remove null/undefined dates so they don't exist in the document
      const updateData: any = { ...data };
      if (!updateData.startDate) delete updateData.startDate;
      if (!updateData.endDate) delete updateData.endDate;

      Object.assign(existingBanner, updateData);
      await existingBanner.save({ session });

      await session.commitTransaction();
      return existingBanner;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Admin: Delete banner
   */
  async deleteBanner(id: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const banner = await Banner.findById(id).session(session);
      if (!banner) throw new AppError('Banner not found', 404);

      // Untrack image usage
      await mediaService.untrackUsage(
        banner.imageAsset.toString(),
        'Banner',
        banner._id as mongoose.Types.ObjectId,
        session
      );

      await Banner.findByIdAndDelete(id).session(session);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Admin: Update display order (bulk)
   */
  async updateDisplayOrders(orders: { id: string; displayOrder: number }[]): Promise<void> {
    const bulkOps = orders.map(({ id, displayOrder }) => ({
      updateOne: {
        filter: { _id: id },
        update: { displayOrder }
      }
    }));

    await Banner.bulkWrite(bulkOps);
  }
}

export const bannerService = new BannerService();
