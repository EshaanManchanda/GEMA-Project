import { Request, Response } from "express";
import { Event } from "../models/index";
import AffiliateVenueClick from "../models/AffiliateVenueClick";
import Vendor from "../models/Vendor";
import mongoose from "mongoose";

/**
 * Track affiliate venue click
 * POST /api/venues/:id/track-click
 */
export const trackAffiliateClick = async (req: Request, res: Response) => {
  try {
    const { id: venueId } = req.params;
    const { sessionId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      return res.status(400).json({ message: "Invalid venue ID" });
    }

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const venue = await Event.findOne({ _id: venueId, type: "Venue" });
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    if (!venue.isAffiliateEvent) {
      return res
        .status(400)
        .json({ message: "This is not an affiliate venue" });
    }

    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip;
    const userAgent = req.headers["user-agent"] || "";
    const referrer = req.headers["referer"] || req.headers["referrer"] || "";

    let deviceType: "desktop" | "mobile" | "tablet" | "unknown" = "unknown";
    if (userAgent) {
      if (/mobile/i.test(userAgent)) {
        deviceType = "mobile";
      } else if (/tablet|ipad/i.test(userAgent)) {
        deviceType = "tablet";
      } else if (/desktop|windows|mac|linux/i.test(userAgent)) {
        deviceType = "desktop";
      }
    }

    const existingClick = await AffiliateVenueClick.findOne({
      venueId,
      sessionId,
    });

    const isUniqueClick = !existingClick;

    await AffiliateVenueClick.create({
      venueId,
      sessionId,
      ipAddress,
      userAgent,
      deviceType,
      referrer,
      userId: (req as any).user?.id || undefined,
    });

    const updateData: any = {
      "affiliateClickTracking.totalClicks":
        venue.affiliateClickTracking.totalClicks + 1,
      "affiliateClickTracking.lastClickedAt": new Date(),
    };

    if (isUniqueClick) {
      updateData["affiliateClickTracking.uniqueClicks"] =
        venue.affiliateClickTracking.uniqueClicks + 1;
    }

    await Event.findByIdAndUpdate(venueId, { $set: updateData });

    res.status(200).json({
      message: "Click tracked successfully",
      externalUrl: venue.externalBookingLink,
    });
  } catch (error: any) {
    console.error("Error tracking affiliate click:", error);
    res
      .status(500)
      .json({ message: "Error tracking click", error: error.message });
  }
};

/**
 * Claim an affiliate venue (vendor only)
 * POST /api/vendor/venues/:id/claim
 */
export const claimAffiliateVenue = async (req: Request, res: Response) => {
  try {
    const { id: venueId } = req.params;
    const userId = (req as any).user?.id;

    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      return res.status(400).json({ message: "Invalid venue ID" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    // Read current vendorId before atomic update
    const existing = await Event.findOne({ _id: venueId, type: "Venue" })
      .select("vendorId isAffiliateEvent claimStatus")
      .lean();

    if (!existing) {
      return res.status(404).json({ message: "Venue not found" });
    }
    if (!existing.isAffiliateEvent) {
      return res
        .status(400)
        .json({ message: "This is not an affiliate venue" });
    }
    if (existing.claimStatus === "claimed") {
      return res
        .status(400)
        .json({ message: "This venue has already been claimed" });
    }
    if (existing.claimStatus !== "unclaimed") {
      return res
        .status(400)
        .json({ message: "This venue is not available for claiming" });
    }

    // Atomic findOneAndUpdate to prevent race conditions
    const venue = await Event.findOneAndUpdate(
      {
        _id: venueId,
        type: "Venue",
        isAffiliateEvent: true,
        claimStatus: "unclaimed",
      },
      {
        $set: {
          claimStatus: "claimed",
          claimedBy: vendor._id,
          claimedAt: new Date(),
          originalAffiliateVendorId: existing.vendorId, // Keep original vendor (e.g. admin or placeholder)
          vendorId: vendor._id, // Assign to new vendor
          isApproved: false, // Require re-approval?
        },
      },
      { new: true },
    );

    if (!venue) {
      return res
        .status(409)
        .json({ message: "This venue was claimed by another vendor" });
    }

    res.status(200).json({
      message: "Venue claimed successfully. It will require admin re-approval.",
      venue: {
        _id: venue._id,
        name: venue.title,
        claimedAt: venue.claimedAt,
      },
    });
  } catch (error: any) {
    console.error("Error claiming affiliate venue:", error);
    res
      .status(500)
      .json({ message: "Error claiming venue", error: error.message });
  }
};

/**
 * Get vendor's claimed venues
 * GET /api/vendor/claimed-venues
 */
export const getClaimedVenues = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    const claimedVenues = await Event.find({
      type: "Venue",
      claimedBy: vendor._id,
      claimStatus: "claimed",
    })
      .select(
        "title slug description images location affiliateClickTracking claimedAt externalBookingLink isApproved",
      )
      .sort({ claimedAt: -1 })
      .lean();

    // Map title to name and location to address for frontend compatibility if needed
    // Or just send as is and update frontend
    const mappedVenues = claimedVenues.map((v) => ({
      ...v,
      name: v.title,
      address: v.location, // Map location to address field for frontend
    }));

    res.status(200).json({
      claimedVenues: mappedVenues,
      totalClaimed: claimedVenues.length,
    });
  } catch (error: any) {
    console.error("Error fetching claimed venues:", error);
    res
      .status(500)
      .json({ message: "Error fetching claimed venues", error: error.message });
  }
};

/**
 * Get venue affiliate analytics (admin only)
 * GET /api/admin/venue-affiliate-analytics
 */
export const getVenueAffiliateAnalytics = async (
  req: Request,
  res: Response,
) => {
  try {
    const { venueId } = req.query;

    const matchFilter: any = { type: "Venue", isAffiliateEvent: true };
    if (venueId && mongoose.Types.ObjectId.isValid(venueId as string)) {
      matchFilter._id = new mongoose.Types.ObjectId(venueId as string);
    }

    const stats = await Event.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalAffiliateVenues: { $sum: 1 },
          totalClicks: { $sum: "$affiliateClickTracking.totalClicks" },
          totalUniqueClicks: { $sum: "$affiliateClickTracking.uniqueClicks" },
          claimedVenues: {
            $sum: {
              $cond: [{ $eq: ["$claimStatus", "claimed"] }, 1, 0],
            },
          },
          unclaimedVenues: {
            $sum: {
              $cond: [{ $eq: ["$claimStatus", "unclaimed"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const topVenues = await Event.find({
      type: "Venue",
      isAffiliateEvent: true,
    })
      .select("title affiliateClickTracking claimStatus externalBookingLink")
      .sort({ "affiliateClickTracking.totalClicks": -1 })
      .limit(10)
      .lean();

    const deviceBreakdown = await AffiliateVenueClick.aggregate([
      ...(venueId && mongoose.Types.ObjectId.isValid(venueId as string)
        ? [
            {
              $match: {
                venueId: new mongoose.Types.ObjectId(venueId as string),
              },
            },
          ]
        : []),
      {
        $group: {
          _id: "$deviceType",
          count: { $sum: 1 },
        },
      },
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const clickTimeline = await AffiliateVenueClick.aggregate([
      {
        $match: {
          clickedAt: { $gte: thirtyDaysAgo },
          ...(venueId && mongoose.Types.ObjectId.isValid(venueId as string)
            ? { venueId: new mongoose.Types.ObjectId(venueId as string) }
            : {}),
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$clickedAt" },
          },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      statistics: stats[0] || {
        totalAffiliateVenues: 0,
        totalClicks: 0,
        totalUniqueClicks: 0,
        claimedVenues: 0,
        unclaimedVenues: 0,
      },
      topVenues: topVenues.map((v) => ({ ...v, name: v.title })),
      deviceBreakdown,
      clickTimeline,
    });
  } catch (error: any) {
    console.error("Error fetching venue affiliate analytics:", error);
    res
      .status(500)
      .json({ message: "Error fetching analytics", error: error.message });
  }
};

/**
 * Get single venue analytics
 * GET /api/venues/:id/analytics
 */
export const getVenueAnalytics = async (req: Request, res: Response) => {
  try {
    const { id: venueId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      return res.status(400).json({ message: "Invalid venue ID" });
    }

    const venue = await Event.findOne({ _id: venueId, type: "Venue" })
      .select("title isAffiliateEvent affiliateClickTracking claimStatus")
      .lean();

    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    if (!venue.isAffiliateEvent) {
      return res
        .status(400)
        .json({ message: "This is not an affiliate venue" });
    }

    const clicks = await AffiliateVenueClick.find({ venueId })
      .select("deviceType clickedAt country city")
      .sort({ clickedAt: -1 })
      .limit(100);

    const deviceBreakdown = await AffiliateVenueClick.aggregate([
      { $match: { venueId: new mongoose.Types.ObjectId(venueId) } },
      {
        $group: {
          _id: "$deviceType",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      venue: {
        _id: venue._id,
        name: venue.title,
        affiliateClickTracking: venue.affiliateClickTracking,
        claimStatus: venue.claimStatus,
      },
      recentClicks: clicks,
      deviceBreakdown,
    });
  } catch (error: any) {
    console.error("Error fetching venue analytics:", error);
    res.status(500).json({
      message: "Error fetching venue analytics",
      error: error.message,
    });
  }
};
