import { Router, Request, Response } from "express";
import LeadPage from "../models/LeadPage";
import { createResourceLimiter } from "../middleware/rateLimiter";

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX_LENGTH = 100;
const MESSAGE_MAX_LENGTH = 500;

/** Strip HTML tags and collapse whitespace — same trust boundary as any other public free-text field. */
const sanitizeText = (value?: string): string | undefined => {
  if (!value) return undefined;
  return value.replace(/<[^>]*>/g, "").trim();
};

const getClientIp = (req: Request): string | undefined =>
  (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
  req.socket?.remoteAddress;

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
        select:
          "title description images imageUrls imageAssets slug category location ageRange price currency vendorId teacherId faqs dateSchedule",
        populate: { path: "imageAssets", select: "url thumbnailUrl secureUrl" },
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

    const leadPage = await LeadPage.findOne({
      event: eventId,
      isActive: true,
    }).populate({
      path: "event",
      select:
        "title description images imageUrls imageAssets slug category location ageRange price currency vendorId teacherId faqs dateSchedule tags",
      populate: [
        { path: "imageAssets", select: "url thumbnailUrl secureUrl" },
        { path: "vendorId", select: "businessName fullName logo about" },
        { path: "teacherId", select: "fullName" },
      ],
    });

    if (!leadPage) {
      return res
        .status(404)
        .json({ success: false, message: "Lead page not found or inactive" });
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
 * @route   POST /api/lead-pages/global/lead
 * @desc    Submit a lead to the singleton "Kidrove Lead Collection" global
 *          bucket (used by the /lead-page landing page when no eventId is
 *          present). Registered ahead of "/:eventId/lead" so "global" is
 *          never mistaken for an eventId.
 * @access  Public
 */
router.post(
  "/global/lead",
  createResourceLimiter,
  async (req: Request, res: Response) => {
    try {
      const rawName =
        typeof req.body.name === "string" ? req.body.name.trim() : "";
      const rawEmail =
        typeof req.body.email === "string" ? req.body.email.trim() : undefined;
      const rawPhone =
        typeof req.body.phone === "string" ? req.body.phone.trim() : undefined;
      const rawMessage = sanitizeText(req.body.message);

      if (!rawName || (!rawEmail && !rawPhone)) {
        return res.status(400).json({
          success: false,
          message:
            "Name and at least one contact (email or phone) are required",
        });
      }
      if (rawName.length > NAME_MAX_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Name must be ${NAME_MAX_LENGTH} characters or fewer`,
        });
      }
      if (rawEmail && !EMAIL_REGEX.test(rawEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
        });
      }
      if (rawMessage && rawMessage.length > MESSAGE_MAX_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Message must be ${MESSAGE_MAX_LENGTH} characters or fewer`,
        });
      }

      const leadDoc = {
        name: rawName,
        email: rawEmail?.toLowerCase(),
        phone: rawPhone,
        message: rawMessage,
        submittedAt: new Date(),
        ipAddress: getClientIp(req),
      };

      let result;
      try {
        // Atomic upsert: creates the singleton bucket on first-ever submission,
        // or pushes onto it if already active. No findOne+create+save gap —
        // concurrent requests cannot create duplicate buckets or lose leads.
        result = await LeadPage.findOneAndUpdate(
          { isGlobal: true, isActive: true },
          {
            $push: { leads: leadDoc },
            $setOnInsert: { isGlobal: true, isActive: true },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            runValidators: true,
          },
        );
      } catch (error: any) {
        if (error?.code !== 11000) throw error;

        // Filter didn't match an *active* global doc, and the unique isGlobal
        // index blocked the upsert insert — either (a) another concurrent
        // request just created/activated the bucket a moment ago, or (b) the
        // existing bucket is deliberately deactivated. Re-check which.
        const existing = await LeadPage.findOne({ isGlobal: true });
        if (!existing) throw error; // shouldn't happen, but don't swallow silently

        if (!existing.isActive) {
          return res.status(403).json({
            success: false,
            message:
              "We're not accepting new registrations right now. Please check back soon.",
          });
        }

        result = await LeadPage.findOneAndUpdate(
          { isGlobal: true },
          { $push: { leads: leadDoc } },
          { new: true, runValidators: true },
        );
      }

      if (!result) {
        return res
          .status(500)
          .json({ success: false, message: "Server error" });
      }

      return res.status(201).json({
        success: true,
        message: "Your interest has been registered! We'll get in touch soon.",
      });
    } catch (error: any) {
      console.error("Submit global lead error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

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
      return res
        .status(404)
        .json({ success: false, message: "Lead page not found or inactive" });
    }

    leadPage.leads.push({
      name: name.trim(),
      email: email?.trim()?.toLowerCase(),
      phone: phone?.trim(),
      message: message?.trim(),
      submittedAt: new Date(),
      ipAddress: getClientIp(req),
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
