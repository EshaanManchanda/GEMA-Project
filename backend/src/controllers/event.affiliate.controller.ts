import { Request, Response } from 'express';
import Event from '../models/Event';
import AffiliateEventClick from '../models/AffiliateEventClick';
import Vendor from '../models/Vendor';
import mongoose from 'mongoose';

/**
 * Track affiliate event click
 * POST /api/events/:id/track-click
 */
export const trackAffiliateClick = async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;
    const { sessionId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.isAffiliateEvent) {
      return res.status(400).json({ message: 'This is not an affiliate event' });
    }

    // Extract request information
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || req.headers['referrer'] || '';

    // Simple device type detection
    let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
    if (userAgent) {
      if (/mobile/i.test(userAgent)) {
        deviceType = 'mobile';
      } else if (/tablet|ipad/i.test(userAgent)) {
        deviceType = 'tablet';
      } else if (/desktop|windows|mac|linux/i.test(userAgent)) {
        deviceType = 'desktop';
      }
    }

    // Check if this is a unique click (same session hasn't clicked before)
    const existingClick = await AffiliateEventClick.findOne({
      eventId,
      sessionId,
    });

    const isUniqueClick = !existingClick;

    // Create click record
    await AffiliateEventClick.create({
      eventId,
      sessionId,
      ipAddress,
      userAgent,
      deviceType,
      referrer,
      userId: (req as any).user?.id || undefined,
    });

    // Update event click tracking
    const updateData: any = {
      'affiliateClickTracking.totalClicks': event.affiliateClickTracking.totalClicks + 1,
      'affiliateClickTracking.lastClickedAt': new Date(),
    };

    if (isUniqueClick) {
      updateData['affiliateClickTracking.uniqueClicks'] = event.affiliateClickTracking.uniqueClicks + 1;
    }

    await Event.findByIdAndUpdate(eventId, { $set: updateData });

    res.status(200).json({
      message: 'Click tracked successfully',
      externalUrl: event.externalBookingLink,
    });
  } catch (error: any) {
    console.error('Error tracking affiliate click:', error);
    res.status(500).json({ message: 'Error tracking click', error: error.message });
  }
};

/**
 * Claim an affiliate event (vendor only)
 * POST /api/vendor/events/:id/claim
 */
export const claimAffiliateEvent = async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;
    const userId = (req as any).user?.id;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find the vendor for this user
    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Validate event is claimable
    if (!event.isAffiliateEvent) {
      return res.status(400).json({ message: 'This is not an affiliate event' });
    }

    if (event.claimStatus !== 'unclaimed') {
      return res.status(400).json({
        message: event.claimStatus === 'claimed'
          ? 'This event has already been claimed'
          : 'This event is not available for claiming'
      });
    }

    // Update event with claim information
    event.claimStatus = 'claimed';
    event.claimedBy = vendor._id as mongoose.Types.ObjectId;
    event.claimedAt = new Date();
    event.originalAffiliateVendorId = event.vendorId;
    event.vendorId = vendor._id as mongoose.Types.ObjectId;

    await event.save();

    res.status(200).json({
      message: 'Event claimed successfully',
      event: {
        _id: event._id,
        title: event.title,
        claimedAt: event.claimedAt,
      },
    });
  } catch (error: any) {
    console.error('Error claiming affiliate event:', error);
    res.status(500).json({ message: 'Error claiming event', error: error.message });
  }
};

/**
 * Get vendor's claimed events
 * GET /api/vendor/claimed-events
 */
export const getClaimedEvents = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find the vendor
    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }

    // Find all events claimed by this vendor
    const claimedEvents = await Event.find({
      claimedBy: vendor._id,
      claimStatus: 'claimed',
    })
      .select('title description images category type dateSchedule location affiliateClickTracking claimedAt externalBookingLink')
      .sort({ claimedAt: -1 });

    res.status(200).json({
      claimedEvents,
      totalClaimed: claimedEvents.length,
    });
  } catch (error: any) {
    console.error('Error fetching claimed events:', error);
    res.status(500).json({ message: 'Error fetching claimed events', error: error.message });
  }
};

/**
 * Get affiliate event analytics (admin only)
 * GET /api/admin/affiliate-analytics
 */
export const getAffiliateAnalytics = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.query;

    let matchFilter: any = { isAffiliateEvent: true };
    if (eventId && mongoose.Types.ObjectId.isValid(eventId as string)) {
      matchFilter._id = new mongoose.Types.ObjectId(eventId as string);
    }

    // Get aggregate statistics
    const stats = await Event.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalAffiliateEvents: { $sum: 1 },
          totalClicks: { $sum: '$affiliateClickTracking.totalClicks' },
          totalUniqueClicks: { $sum: '$affiliateClickTracking.uniqueClicks' },
          claimedEvents: {
            $sum: {
              $cond: [{ $eq: ['$claimStatus', 'claimed'] }, 1, 0]
            }
          },
          unclaimedEvents: {
            $sum: {
              $cond: [{ $eq: ['$claimStatus', 'unclaimed'] }, 1, 0]
            }
          },
        }
      }
    ]);

    // Get top performing events
    const topEvents = await Event.find({ isAffiliateEvent: true })
      .select('title affiliateClickTracking claimStatus externalBookingLink')
      .sort({ 'affiliateClickTracking.totalClicks': -1 })
      .limit(10);

    // Get device breakdown
    const deviceBreakdown = await AffiliateEventClick.aggregate([
      ...(eventId && mongoose.Types.ObjectId.isValid(eventId as string)
        ? [{ $match: { eventId: new mongoose.Types.ObjectId(eventId as string) } }]
        : []),
      {
        $group: {
          _id: '$deviceType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get click timeline (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const clickTimeline = await AffiliateEventClick.aggregate([
      {
        $match: {
          clickedAt: { $gte: thirtyDaysAgo },
          ...(eventId && mongoose.Types.ObjectId.isValid(eventId as string)
            ? { eventId: new mongoose.Types.ObjectId(eventId as string) }
            : {}),
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' }
          },
          clicks: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      statistics: stats[0] || {
        totalAffiliateEvents: 0,
        totalClicks: 0,
        totalUniqueClicks: 0,
        claimedEvents: 0,
        unclaimedEvents: 0,
      },
      topEvents,
      deviceBreakdown,
      clickTimeline,
    });
  } catch (error: any) {
    console.error('Error fetching affiliate analytics:', error);
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
};

/**
 * Get single event analytics
 * GET /api/events/:id/analytics
 */
export const getEventAnalytics = async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    const event = await Event.findById(eventId).select('title isAffiliateEvent affiliateClickTracking claimStatus');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.isAffiliateEvent) {
      return res.status(400).json({ message: 'This is not an affiliate event' });
    }

    // Get click records
    const clicks = await AffiliateEventClick.find({ eventId })
      .select('deviceType clickedAt country city')
      .sort({ clickedAt: -1 })
      .limit(100);

    // Get device breakdown
    const deviceBreakdown = await AffiliateEventClick.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
      {
        $group: {
          _id: '$deviceType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      event: {
        _id: event._id,
        title: event.title,
        affiliateClickTracking: event.affiliateClickTracking,
        claimStatus: event.claimStatus,
      },
      recentClicks: clicks,
      deviceBreakdown,
    });
  } catch (error: any) {
    console.error('Error fetching event analytics:', error);
    res.status(500).json({ message: 'Error fetching event analytics', error: error.message });
  }
};
