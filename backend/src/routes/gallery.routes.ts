import { Router } from "express";
import { param, body } from "express-validator";
import {
  createGallery,
  updateGallery,
  getGalleryByEvent,
  deleteGallery,
} from "../controllers/gallery.controller";
import { authenticate, authorize } from "../middleware/auth";

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

export default router;
