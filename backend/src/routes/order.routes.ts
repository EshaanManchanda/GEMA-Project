import { Router } from "express";
import { body, param, query } from "express-validator";
import {
  createOrder,
  getUserOrders,
  getOrder,
  cancelOrder,
  processPayment,
  getAdminOrders,
  getOrderAdmin,
  getOrderAnalytics,
  getVendorOrders,
  confirmOrderAdmin,
  refundOrderAdmin,
  updateOrderAdmin,
  deleteOrderAdmin,
  bulkUpdateOrders,
} from "../controllers/order.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Customer routes
router.post(
  "/",
  authorize(["customer"]),
  [
    body("items")
      .isArray({ min: 1 })
      .withMessage("Items array is required and cannot be empty"),
    body("items.*.eventId")
      .isMongoId()
      .withMessage("Valid event ID is required for each item"),
    body("items.*.scheduleDate")
      .isISO8601()
      .withMessage("Valid schedule date is required for each item"),
    body("items.*.quantity")
      .isInt({ min: 1, max: 50 })
      .withMessage("Quantity must be between 1 and 50"),
    body("billingAddress.firstName")
      .trim()
      .notEmpty()
      .withMessage("First name is required"),
    body("billingAddress.lastName")
      .trim()
      .notEmpty()
      .withMessage("Last name is required"),
    body("billingAddress.email")
      .isEmail()
      .withMessage("Valid email is required"),
    body("billingAddress.phone")
      .trim()
      .notEmpty()
      .withMessage("Phone number is required"),
    body("billingAddress.address")
      .trim()
      .notEmpty()
      .withMessage("Address is required"),
    body("billingAddress.city")
      .trim()
      .notEmpty()
      .withMessage("City is required"),
    body("billingAddress.state")
      .trim()
      .notEmpty()
      .withMessage("State is required"),
    body("billingAddress.zipCode")
      .trim()
      .notEmpty()
      .withMessage("Zip code is required"),
    body("billingAddress.country")
      .trim()
      .notEmpty()
      .withMessage("Country is required"),
    body("notes")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Notes cannot exceed 500 characters"),
    body("couponCode").optional().trim(),
    body("affiliateCode").optional().trim(),
  ],
  createOrder,
);

router.get(
  "/",
  authorize(["customer"]),
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
    query("status")
      .optional()
      .isIn(["pending", "confirmed", "cancelled", "refunded"])
      .withMessage("Invalid status value"),
    query("sortBy")
      .optional()
      .isIn(["createdAt", "total", "status"])
      .withMessage("Invalid sortBy value"),
    query("sortOrder")
      .optional()
      .isIn(["asc", "desc"])
      .withMessage("Invalid sortOrder value"),
  ],
  getUserOrders,
);

router.get(
  "/:id",
  authorize(["customer"]),
  [param("id").isMongoId().withMessage("Invalid order ID")],
  getOrder,
);

router.put(
  "/:id/cancel",
  authorize(["customer"]),
  [
    param("id").isMongoId().withMessage("Invalid order ID"),
    body("reason")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Reason cannot exceed 200 characters"),
  ],
  cancelOrder,
);

router.post(
  "/:id/payment",
  authorize(["customer"]),
  [
    param("id").isMongoId().withMessage("Invalid order ID"),
    body("paymentMethod")
      .isIn(["stripe", "paypal", "razorpay"])
      .withMessage("Invalid payment method"),
    body("paymentIntentId")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Payment intent ID cannot be empty"),
  ],
  processPayment,
);

// Vendor routes
router.get("/vendor/my-orders", authorize(["vendor"]), getVendorOrders);

// Admin routes
router.get(
  "/admin/all",
  authorize(["admin"]),
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("status")
      .optional()
      .isIn(["pending", "confirmed", "cancelled", "refunded"])
      .withMessage("Invalid status value"),
    query("paymentStatus")
      .optional()
      .isIn(["pending", "paid", "failed", "refunded", "free"])
      .withMessage("Invalid payment status value"),
    query("sortBy")
      .optional()
      .isIn(["createdAt", "total", "status", "paymentStatus"])
      .withMessage("Invalid sortBy value"),
    query("sortOrder")
      .optional()
      .isIn(["asc", "desc"])
      .withMessage("Invalid sortOrder value"),
  ],
  getAdminOrders,
);

router.get(
  "/admin/analytics",
  authorize(["admin"]),
  [
    query("period")
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage("Period must be between 1 and 365 days"),
  ],
  getOrderAnalytics,
);

router.get(
  "/admin/:id",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid order ID")],
  getOrderAdmin,
);

router.post(
  "/admin/:id/confirm",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid order ID")],
  confirmOrderAdmin,
);

router.post(
  "/admin/:id/refund",
  authorize(["admin"]),
  [
    param("id").isMongoId().withMessage("Invalid order ID"),
    body("amount")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Refund amount must be a positive number"),
    body("reason")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Reason cannot exceed 500 characters"),
  ],
  refundOrderAdmin,
);

router.put(
  "/admin/:id",
  authorize(["admin"]),
  [
    param("id").isMongoId().withMessage("Invalid order ID"),
    body("status")
      .optional()
      .isIn(["pending", "confirmed", "cancelled", "refunded"])
      .withMessage("Invalid status value"),
    body("paymentStatus")
      .optional()
      .isIn(["pending", "paid", "failed", "refunded", "free"])
      .withMessage("Invalid payment status value"),
    body("notes")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Notes cannot exceed 500 characters"),
  ],
  updateOrderAdmin,
);

router.delete(
  "/admin/:id",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid order ID")],
  deleteOrderAdmin,
);

router.patch(
  "/admin/bulk",
  authorize(["admin"]),
  [
    body("orderIds")
      .isArray({ min: 1 })
      .withMessage("Order IDs array is required and cannot be empty"),
    body("orderIds.*").isMongoId().withMessage("All order IDs must be valid"),
    body("action")
      .isIn(["confirm", "cancel", "refund", "update"])
      .withMessage("Invalid action value"),
    body("data").optional().isObject().withMessage("Data must be an object"),
  ],
  bulkUpdateOrders,
);

export default router;
