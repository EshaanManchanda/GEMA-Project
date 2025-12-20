import AnnouncementBar, { IAnnouncementBar } from '../models/AnnouncementBar';
import { AppError } from '../middleware/error';

class AnnouncementBarService {
  /**
   * Get active announcements for public display (optionally filtered by current route)
   */
  async getActiveAnnouncements(currentRoute?: string): Promise<IAnnouncementBar[]> {
    const now = new Date();

    console.log('[getActiveAnnouncements] Querying announcements:', {
      currentRoute,
      now: now.toISOString()
    });

    // Debug: Check all announcements in DB
    const allAnnouncements = await AnnouncementBar.find({}).lean();
    console.log('[getActiveAnnouncements] ALL announcements in DB:', {
      count: allAnnouncements.length,
      announcements: allAnnouncements.map(a => ({
        id: a._id,
        message: a.message,
        status: a.status,
        isActive: a.isActive,
        startDate: a.startDate,
        endDate: a.endDate,
        targetPages: a.targetPages
      }))
    });

    const announcements = await AnnouncementBar.find({
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
    .sort({ displayOrder: 1 })
    .lean();

    console.log('[getActiveAnnouncements] Found announcements:', {
      count: announcements.length,
      announcements: announcements.map(a => ({
        id: a._id,
        message: a.message,
        status: a.status,
        isActive: a.isActive,
        startDate: a.startDate,
        endDate: a.endDate
      }))
    });

    // Filter by route if provided
    if (currentRoute) {
      return announcements.filter(announcement => {
        // If targetPages is 'all', show everywhere
        if (announcement.targetPages === 'all') {
          // Check excludePages
          if (announcement.excludePages && announcement.excludePages.length > 0) {
            return !this.matchesAnyPattern(currentRoute, announcement.excludePages);
          }
          return true;
        }

        // If targetPages is 'specific', check specificPages
        if (announcement.specificPages && announcement.specificPages.length > 0) {
          const matchesSpecific = this.matchesAnyPattern(currentRoute, announcement.specificPages);

          // Also check excludePages
          if (announcement.excludePages && announcement.excludePages.length > 0) {
            const matchesExclude = this.matchesAnyPattern(currentRoute, announcement.excludePages);
            return matchesSpecific && !matchesExclude;
          }

          return matchesSpecific;
        }

        return false;
      });
    }

    return announcements;
  }

  /**
   * Check if a route matches any pattern in the list (supports wildcards)
   */
  private matchesAnyPattern(route: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      // Convert glob pattern to regex: /events/* -> /^\/events\/.*$/
      const regexPattern = '^' + pattern.replace(/\*/g, '.*') + '$';
      const regex = new RegExp(regexPattern);
      return regex.test(route);
    });
  }

  /**
   * Admin: Get all announcements with filters
   */
  async getAllAnnouncements(filters: {
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
        { message: new RegExp(search, 'i') },
        { linkText: new RegExp(search, 'i') }
      ];
    }

    const skip = (page - 1) * limit;

    const [announcements, total] = await Promise.all([
      AnnouncementBar.find(query)
        .populate('createdBy', 'firstName lastName email')
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AnnouncementBar.countDocuments(query)
    ]);

    return {
      announcements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Admin: Get announcement by ID
   */
  async getAnnouncementById(id: string): Promise<IAnnouncementBar | null> {
    return await AnnouncementBar.findById(id)
      .populate('createdBy', 'firstName lastName email');
  }

  /**
   * Admin: Create announcement
   */
  async createAnnouncement(data: Partial<IAnnouncementBar>, userId: string): Promise<IAnnouncementBar> {
    console.log('[announcementBarService.createAnnouncement] Input data:', {
      status: data.status,
      isActive: data.isActive,
      fullData: data
    });

    // Remove null/undefined dates so they don't exist in the document
    const announcementData: any = { ...data, createdBy: userId };
    if (!announcementData.startDate) delete announcementData.startDate;
    if (!announcementData.endDate) delete announcementData.endDate;
    if (!announcementData.dismissalDuration) delete announcementData.dismissalDuration;

    // Set defaults for analytics if not provided
    announcementData.impressions = 0;
    announcementData.clicks = 0;
    announcementData.dismissals = 0;

    console.log('[announcementBarService.createAnnouncement] Prepared data:', {
      status: announcementData.status,
      isActive: announcementData.isActive
    });

    const announcement = await AnnouncementBar.create(announcementData);

    console.log('[announcementBarService.createAnnouncement] Created document:', {
      status: announcement.status,
      isActive: announcement.isActive
    });

    return announcement;
  }

  /**
   * Admin: Update announcement
   */
  async updateAnnouncement(id: string, data: Partial<IAnnouncementBar>): Promise<IAnnouncementBar | null> {
    console.log('[announcementBarService.updateAnnouncement] Input data:', {
      status: data.status,
      isActive: data.isActive,
      fullData: data
    });

    const existingAnnouncement = await AnnouncementBar.findById(id);
    if (!existingAnnouncement) throw new AppError('Announcement not found', 404);

    console.log('[announcementBarService.updateAnnouncement] Existing announcement:', {
      status: existingAnnouncement.status,
      isActive: existingAnnouncement.isActive
    });

    // Remove null/undefined dates so they don't exist in the document
    const updateData: any = { ...data };
    if (!updateData.startDate) delete updateData.startDate;
    if (!updateData.endDate) delete updateData.endDate;
    if (!updateData.dismissalDuration) delete updateData.dismissalDuration;

    console.log('[announcementBarService.updateAnnouncement] Update data after cleanup:', {
      status: updateData.status,
      isActive: updateData.isActive
    });

    Object.assign(existingAnnouncement, updateData);
    await existingAnnouncement.save();

    console.log('[announcementBarService.updateAnnouncement] Updated document:', {
      status: existingAnnouncement.status,
      isActive: existingAnnouncement.isActive
    });

    return existingAnnouncement;
  }

  /**
   * Admin: Delete announcement
   */
  async deleteAnnouncement(id: string): Promise<void> {
    const announcement = await AnnouncementBar.findById(id);
    if (!announcement) throw new AppError('Announcement not found', 404);

    await AnnouncementBar.findByIdAndDelete(id);
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

    await AnnouncementBar.bulkWrite(bulkOps);
  }

  /**
   * Public: Record impression (atomic increment)
   */
  async recordImpression(id: string): Promise<void> {
    await AnnouncementBar.findByIdAndUpdate(
      id,
      { $inc: { impressions: 1 } },
      { runValidators: false }
    );
  }

  /**
   * Public: Record click (atomic increment)
   */
  async recordClick(id: string): Promise<void> {
    await AnnouncementBar.findByIdAndUpdate(
      id,
      { $inc: { clicks: 1 } },
      { runValidators: false }
    );
  }

  /**
   * Public: Record dismissal (atomic increment)
   */
  async recordDismissal(id: string): Promise<void> {
    await AnnouncementBar.findByIdAndUpdate(
      id,
      { $inc: { dismissals: 1 } },
      { runValidators: false }
    );
  }
}

export const announcementBarService = new AnnouncementBarService();
