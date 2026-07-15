import { Router, Request, Response } from "express";
import LeadPage from "../models/LeadPage";
import { Event } from "../models/index";

const router = Router();

/**
 * @route   GET /api/lead-pages
 * @desc    Get all active lead pages (public)
 * @access  Public
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const leadPages = await LeadPage.find({ isActive: true })
      .populate({
        path: "event",
        select: "title description images imageUrls imageAssets slug category location ageRange price currency vendorId teacherId faqs dateSchedule",
        populate: { path: "imageAssets", select: "url thumbnailUrl secureUrl" }
      })
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: leadPages });
  } catch (error: any) {
    console.error("Get public lead pages error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   GET /api/lead-pages/:eventId
 * @desc    Get lead page data for a specific event (public)
 * @access  Public
 */
router.get("/:eventId", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const leadPage = await LeadPage.findOne({ event: eventId, isActive: true }).populate({
      path: "event",
      select: "title description images imageUrls imageAssets slug category location ageRange price currency vendorId teacherId faqs dateSchedule tags",
      populate: [
        { path: "imageAssets", select: "url thumbnailUrl secureUrl" },
        { path: "vendorId", select: "businessName fullName logo about" },
        { path: "teacherId", select: "fullName" }
      ]
    });

    if (!leadPage) {
      return res.status(404).json({ success: false, message: "Lead page not found or inactive" });
    }

    // Increment view count (fire and forget)
    LeadPage.findByIdAndUpdate(leadPage._id, { $inc: { viewCount: 1 } }).exec();

    // Return without leads for privacy
    const data = {
      _id: leadPage._id,
      event: leadPage.event,
      isActive: leadPage.isActive,
      viewCount: leadPage.viewCount,
      leadCount: leadPage.leads.length,
    };

    return res.json({ success: true, data });
  } catch (error: any) {
    console.error("Get public lead page event error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   POST /api/lead-pages/:eventId/lead
 * @desc    Submit a lead for an event
 * @access  Public
 */
router.post("/:eventId/lead", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { name, email, phone, message } = req.body;

    if (!name || (!email && !phone)) {
      return res.status(400).json({
        success: false,
        message: "Name and at least one contact (email or phone) are required",
      });
    }

    const leadPage = await LeadPage.findOne({ event: eventId, isActive: true });
    if (!leadPage) {
      return res.status(404).json({ success: false, message: "Lead page not found or inactive" });
    }

    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress;

    leadPage.leads.push({
      name: name.trim(),
      email: email?.trim()?.toLowerCase(),
      phone: phone?.trim(),
      message: message?.trim(),
      submittedAt: new Date(),
      ipAddress,
    });

    await leadPage.save();

    return res.status(201).json({
      success: true,
      message: "Your interest has been registered! We'll get in touch soon.",
    });
  } catch (error: any) {
    console.error("Submit lead error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
