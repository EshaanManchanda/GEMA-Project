import { Router } from "express";
import {
  cancelEvent,
  getCancellationStatus,
  getAffectedOrders,
  retryNotifications,
  cancelOrder,
  getRefundStatus,
} from "../controllers/event.cancellation.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Event cancellation routes (Vendor/Admin)
router.post(
  "/events/:id/cancel",
  authenticate,
  authorize(["vendor", "admin"]),
  cancelEvent,
);

router.get(
  "/events/:id/cancellation-status",
  authenticate,
  authorize(["vendor", "admin"]),
  getCancellationStatus,
);

router.get(
  "/events/:id/affected-orders",
  authenticate,
  authorize(["vendor", "admin"]),
  getAffectedOrders,
);

router.post(
  "/events/:id/retry-notifications",
  authenticate,
  authorize(["vendor", "admin"]),
  retryNotifications,
);

// Order cancellation routes (Customer)
router.put("/orders/:id/cancel", authenticate, cancelOrder);

router.get("/orders/:id/refund-status", authenticate, getRefundStatus);

export default router;
