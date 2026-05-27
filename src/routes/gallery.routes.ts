import { Router } from "express";
import { param, body } from "express-validator";
import {
  createGallery,
  updateGallery,
  getGalleryByEvent,
  deleteGallery,
} from "../controllers/gallery.controller";
import { authenticate, authorize, validate } from "../middleware";
import MediaAsset from "../models/MediaAsset";
import Gallery from "../models/Gallery";

const router = Router();

// Public
router.get(
  "/event/:eventId",
  [param("eventId").isMongoId().withMessage("Invalid event ID")],
  getGalleryByEvent,
);

// Admin / Vendor
router.use(authenticate);

router.post(
  "/",
  authorize(["admin", "vendor"]),
  [
    body("eventId").isMongoId().withMessage("Valid event ID required"),
    body("type").optional().isIn(["grid", "messy"]).withMessage("type must be grid or messy"),
    body("images").optional().isArray().withMessage("images must be an array"),
  ],
  createGallery,
);

router.put(
  "/:id",
  authorize(["admin", "vendor"]),
  [
    param("id").isMongoId().withMessage("Invalid gallery ID"),
    body("type").optional().isIn(["grid", "messy"]).withMessage("type must be grid or messy"),
    body("images").optional().isArray().withMessage("images must be an array"),
  ],
  updateGallery,
);

router.delete(
  "/:id",
  authorize(["admin", "vendor"]),
  [param("id").isMongoId().withMessage("Invalid gallery ID")],
  deleteGallery,
);

// Repair broken gallery images - validate and remove invalid URLs
router.post(
  "/repair/:id",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid gallery ID")],
  validate,
  async (req, res, next) => {
    try {
      const gallery = await Gallery.findById(req.params.id);
      if (!gallery) {
        return res.status(404).json({ success: false, message: "Gallery not found" });
      }

      const validImages = [];
      let removedCount = 0;

      for (const img of gallery.images) {
        // Extract UUID from URL if it's a media file URL
        const match = img.url.match(/\/media\/file\/([a-f0-9-]+)$/i);
        const uuid = match ? match[1] : null;

        if (uuid) {
          const asset = await MediaAsset.findOne({ uuid });
          if (asset) {
            validImages.push(img);
          } else {
            removedCount++;
          }
        } else {
          // Keep non-media URLs (external URLs)
          validImages.push(img);
        }
      }

      gallery.images = validImages;
      await gallery.save();

      res.status(200).json({
        success: true,
        message: `Removed ${removedCount} invalid images`,
        remaining: validImages.length,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
