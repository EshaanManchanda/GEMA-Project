import { Router, Request, Response } from "express";
import { authenticate, authorize, adminLimiter } from "../middleware/index";
import { UserRole } from "../models/index";
import LeadPage from "../models/LeadPage";
import { Event } from "../models/index";

const router = Router();

router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));
router.use(adminLimiter);

/**
 * @route   POST /api/admin/lead-pages
 * @desc    Create a lead page for an event
 * @access  Admin only
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ success: false, message: "eventId is required" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const existing = await LeadPage.findOne({ event: eventId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A lead page already exists for this event",
        data: existing,
      });
    }

    const leadPage = await LeadPage.create({
      event: eventId,
      isActive: true,
      createdBy: (req as any).user._id,
    });

    const populated = await leadPage.populate({
      path: "event",
      select: "title images imageUrls imageAssets slug _id",
      populate: { path: "imageAssets", select: "url thumbnailUrl secureUrl" }
    });

    return res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    console.error("Create lead page error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   GET /api/admin/lead-pages
 * @desc    List all lead pages with event info and leads
 * @access  Admin only
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { search, status } = req.query;

    let query: any = {};
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    let leadPages = await LeadPage.find(query)
      .populate({
        path: "event",
        select: "title images imageUrls imageAssets slug category location vendor teacher _id",
        populate: { path: "imageAssets", select: "url thumbnailUrl secureUrl" }
      })
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    // Filter by event title if search provided
    if (search && typeof search === "string") {
      const s = search.toLowerCase();
      leadPages = leadPages.filter((lp: any) =>
        lp.event?.title?.toLowerCase().includes(s)
      );
    }

    return res.json({ success: true, data: leadPages, total: leadPages.length });
  } catch (error: any) {
    console.error("Get lead pages error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   PATCH /api/admin/lead-pages/:id/toggle
 * @desc    Toggle active status of a lead page
 * @access  Admin only
 */
router.patch("/:id/toggle", async (req: Request, res: Response) => {
  try {
    const leadPage = await LeadPage.findById(req.params.id);
    if (!leadPage) {
      return res.status(404).json({ success: false, message: "Lead page not found" });
    }
    leadPage.isActive = !leadPage.isActive;
    await leadPage.save();
    return res.json({ success: true, data: leadPage });
  } catch (error: any) {
    console.error("Toggle lead page error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   DELETE /api/admin/lead-pages/:id
 * @desc    Delete a lead page
 * @access  Admin only
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const leadPage = await LeadPage.findByIdAndDelete(req.params.id);
    if (!leadPage) {
      return res.status(404).json({ success: false, message: "Lead page not found" });
    }
    return res.json({ success: true, message: "Lead page deleted successfully" });
  } catch (error: any) {
    console.error("Delete lead page error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   DELETE /api/admin/lead-pages/:id/leads/:leadId
 * @desc    Delete a specific lead from a lead page
 * @access  Admin only
 */
router.delete("/:id/leads/:leadId", async (req: Request, res: Response) => {
  try {
    const leadPage = await LeadPage.findById(req.params.id);
    if (!leadPage) {
      return res.status(404).json({ success: false, message: "Lead page not found" });
    }
    leadPage.leads = leadPage.leads.filter(
      (lead: any) => lead._id.toString() !== req.params.leadId
    );
    await leadPage.save();
    return res.json({ success: true, message: "Lead deleted successfully" });
  } catch (error: any) {
    console.error("Delete lead error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
