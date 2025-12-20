import PopupNotification, { IPopupNotification } from '../models/PopupNotification';
import { AppError } from '../middleware/error';

interface UserContext {
  isAuthenticated: boolean;
  role?: string;
}

class PopupService {
  /**
   * Get active popups for display (filtered by user context and route)
   */
  async getActivePopups(userContext: UserContext, currentRoute?: string): Promise<IPopupNotification[]> {
    const now = new Date();

    // Base query for active popups
    const query: any = {
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
    };

    const popups = await PopupNotification.find(query)
      .populate('image', 'url filename width height')
      .sort({ displayOrder: 1 })
      .lean();

    // Filter by user authentication status and role
    let filtered = popups.filter(popup => {
      // Check target audience
      if (popup.targetAudience === 'authenticated' && !userContext.isAuthenticated) {
        return false;
      }
      if (popup.targetAudience === 'anonymous' && userContext.isAuthenticated) {
        return false;
      }

      // Check target roles (only for authenticated users)
      if (userContext.isAuthenticated && popup.targetRoles && popup.targetRoles.length > 0) {
        if (!userContext.role || !popup.targetRoles.includes(userContext.role as any)) {
          return false;
        }
      }

      return true;
    });

    // Filter by route if provided
    if (currentRoute) {
      filtered = filtered.filter(popup => {
        // If targetPages is 'all', show everywhere
        if (popup.targetPages === 'all') {
          // Check excludePages
          if (popup.excludePages && popup.excludePages.length > 0) {
            return !this.matchesAnyPattern(currentRoute, popup.excludePages);
          }
          return true;
        }

        // If targetPages is 'specific', check specificPages
        if (popup.specificPages && popup.specificPages.length > 0) {
          const matchesSpecific = this.matchesAnyPattern(currentRoute, popup.specificPages);

          // Also check excludePages
          if (popup.excludePages && popup.excludePages.length > 0) {
            const matchesExclude = this.matchesAnyPattern(currentRoute, popup.excludePages);
            return matchesSpecific && !matchesExclude;
          }

          return matchesSpecific;
        }

        return false;
      });
    }

    return filtered;
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
   * Admin: Get all popups with filters
   */
  async getAllPopups(filters: {
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
        { message: new RegExp(search, 'i') }
      ];
    }

    const skip = (page - 1) * limit;

    const [popups, total] = await Promise.all([
      PopupNotification.find(query)
        .populate('image', 'url filename width height')
        .populate('createdBy', 'firstName lastName email')
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PopupNotification.countDocuments(query)
    ]);

    return {
      popups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Admin: Get popup by ID
   */
  async getPopupById(id: string): Promise<IPopupNotification | null> {
    return await PopupNotification.findById(id)
      .populate('image')
      .populate('createdBy', 'firstName lastName email');
  }

  /**
   * Admin: Create popup
   */
  async createPopup(data: Partial<IPopupNotification>, userId: string): Promise<IPopupNotification> {
    // Remove null/undefined dates so they don't exist in the document
    const popupData: any = { ...data, createdBy: userId };
    if (!popupData.startDate) delete popupData.startDate;
    if (!popupData.endDate) delete popupData.endDate;
    if (!popupData.triggerValue) delete popupData.triggerValue;

    // Set defaults for analytics if not provided
    popupData.impressions = 0;
    popupData.clicks = 0;
    popupData.dismissals = 0;

    const popup = await PopupNotification.create(popupData);
    return popup;
  }

  /**
   * Admin: Update popup
   */
  async updatePopup(id: string, data: Partial<IPopupNotification>): Promise<IPopupNotification | null> {
    const existingPopup = await PopupNotification.findById(id);
    if (!existingPopup) throw new AppError('Popup not found', 404);

    // Remove null/undefined dates so they don't exist in the document
    const updateData: any = { ...data };
    if (!updateData.startDate) delete updateData.startDate;
    if (!updateData.endDate) delete updateData.endDate;
    if (!updateData.triggerValue) delete updateData.triggerValue;

    Object.assign(existingPopup, updateData);
    await existingPopup.save();

    return existingPopup;
  }

  /**
   * Admin: Delete popup
   */
  async deletePopup(id: string): Promise<void> {
    const popup = await PopupNotification.findById(id);
    if (!popup) throw new AppError('Popup not found', 404);

    await PopupNotification.findByIdAndDelete(id);
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

    await PopupNotification.bulkWrite(bulkOps);
  }

  /**
   * Public: Record impression (atomic increment)
   */
  async recordImpression(id: string): Promise<void> {
    await PopupNotification.findByIdAndUpdate(
      id,
      { $inc: { impressions: 1 } },
      { runValidators: false }
    );
  }

  /**
   * Public: Record click (atomic increment)
   */
  async recordClick(id: string): Promise<void> {
    await PopupNotification.findByIdAndUpdate(
      id,
      { $inc: { clicks: 1 } },
      { runValidators: false }
    );
  }

  /**
   * Public: Record dismissal (atomic increment)
   */
  async recordDismissal(id: string): Promise<void> {
    await PopupNotification.findByIdAndUpdate(
      id,
      { $inc: { dismissals: 1 } },
      { runValidators: false }
    );
  }
}

export const popupService = new PopupService();
