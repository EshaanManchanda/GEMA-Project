import { Router } from "express";
import {
  applyAffiliate,
  getMyAffiliate,
  updateAffiliateProfile,
  generateTrackingUrl,
  recordClick,
  getDashboardStats,
  getCommissions,
  getAllAffiliates,
  updateAffiliateStatus,
  getTopPerformers,
  getAffiliateAnalytics,
  requestAffiliatePayout,
} from "../controllers/affiliate.controller";
import { authenticate, authorize } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import { body, param, query } from "express-validator";

const router = Router();

// Validation rules
const applyAffiliateValidation = [
  body("defaultCommissionRate")
    .isNumeric()
    .custom((value) => value >= 0 && value <= 100)
    .withMessage("Commission rate must be between 0 and 100"),
  body("commissionType")
    .optional()
    .isIn(["percentage", "fixed_amount", "tiered"])
    .withMessage("Commission type must be percentage, fixed_amount, or tiered"),
  body("businessName")
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage("Business name cannot exceed 200 characters"),
  body("website").optional().isURL().withMessage("Website must be a valid URL"),
  body("paymentMethod")
    .isIn(["bank_transfer", "paypal", "stripe", "wallet"])
    .withMessage(
      "Payment method must be bank_transfer, paypal, stripe, or wallet",
    ),
  body("paymentDetails").isObject().withMessage("Payment details are required"),
  body("paymentDetails.bankAccount")
    .if(body("paymentMethod").equals("bank_transfer"))
    .isObject()
    .withMessage("Bank account details required for bank transfer"),
  body("paymentDetails.bankAccount.accountHolderName")
    .if(body("paymentMethod").equals("bank_transfer"))
    .isString()
    .isLength({ min: 1 })
    .withMessage("Account holder name is required"),
  body("paymentDetails.bankAccount.accountNumber")
    .if(body("paymentMethod").equals("bank_transfer"))
    .isString()
    .isLength({ min: 1 })
    .withMessage("Account number is required"),
  body("paymentDetails.bankAccount.routingNumber")
    .if(body("paymentMethod").equals("bank_transfer"))
    .isString()
    .isLength({ min: 1 })
    .withMessage("Routing number is required"),
  body("paymentDetails.bankAccount.bankName")
    .if(body("paymentMethod").equals("bank_transfer"))
    .isString()
    .isLength({ min: 1 })
    .withMessage("Bank name is required"),
  body("paymentDetails.paypalEmail")
    .if(body("paymentMethod").equals("paypal"))
    .isEmail()
    .withMessage("Valid PayPal email is required"),
  body("minimumPayoutAmount")
    .optional()
    .isNumeric()
    .custom((value) => value >= 1)
    .withMessage("Minimum payout amount must be at least 1"),
  body("payoutFrequency")
    .optional()
    .isIn(["weekly", "bi_weekly", "monthly", "quarterly"])
    .withMessage(
      "Payout frequency must be weekly, bi_weekly, monthly, or quarterly",
    ),
  body("socialMedia")
    .optional()
    .isObject()
    .withMessage("Social media must be an object"),
  body("socialMedia.facebook")
    .optional()
    .isURL()
    .withMessage("Facebook URL must be valid"),
  body("socialMedia.instagram")
    .optional()
    .isURL()
    .withMessage("Instagram URL must be valid"),
  body("socialMedia.twitter")
    .optional()
    .isURL()
    .withMessage("Twitter URL must be valid"),
  body("socialMedia.youtube")
    .optional()
    .isURL()
    .withMessage("YouTube URL must be valid"),
];

const updateProfileValidation = [
  body("businessName")
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage("Business name cannot exceed 200 characters"),
  body("website").optional().isURL().withMessage("Website must be a valid URL"),
  body("paymentMethod")
    .optional()
    .isIn(["bank_transfer", "paypal", "stripe", "wallet"])
    .withMessage(
      "Payment method must be bank_transfer, paypal, stripe, or wallet",
    ),
  body("paymentDetails")
    .optional()
    .isObject()
    .withMessage("Payment details must be an object"),
  body("minimumPayoutAmount")
    .optional()
    .isNumeric()
    .custom((value) => value >= 1)
    .withMessage("Minimum payout amount must be at least 1"),
  body("payoutFrequency")
    .optional()
    .isIn(["weekly", "bi_weekly", "monthly", "quarterly"])
    .withMessage(
      "Payout frequency must be weekly, bi_weekly, monthly, or quarterly",
    ),
  body("socialMedia")
    .optional()
    .isObject()
    .withMessage("Social media must be an object"),
];

const generateUrlValidation = [
  body("eventId").optional().isMongoId().withMessage("Event ID must be valid"),
  body("customParams")
    .optional()
    .isObject()
    .withMessage("Custom parameters must be an object"),
];

const recordClickValidation = [
  param("affiliateCode")
    .isString()
    .isLength({ min: 4, max: 20 })
    .withMessage("Affiliate code must be between 4 and 20 characters"),
  body("countryCode")
    .optional()
    .isString()
    .isLength({ min: 2, max: 2 })
    .withMessage("Country code must be 2 characters"),
  body("deviceType")
    .optional()
    .isIn(["desktop", "mobile", "tablet"])
    .withMessage("Device type must be desktop, mobile, or tablet"),
];

const updateStatusValidation = [
  param("id").isMongoId().withMessage("Affiliate ID must be valid"),
  body("status")
    .isIn(["pending", "active", "suspended", "inactive"])
    .withMessage("Status must be pending, active, suspended, or inactive"),
  body("rejectionReason")
    .if(body("status").equals("suspended"))
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage("Rejection reason is required for suspended status"),
];

// Public routes
router.post(
  "/click/:affiliateCode",
  recordClickValidation,
  validateRequest,
  recordClick,
);

// Protected routes - Affiliate access
router.use(authenticate);

// Affiliate application and management
router.post(
  "/apply",
  applyAffiliateValidation,
  validateRequest,
  applyAffiliate,
);

router.get("/my", getMyAffiliate);

router.put(
  "/profile",
  updateProfileValidation,
  validateRequest,
  updateAffiliateProfile,
);

router.post(
  "/generate-url",
  generateUrlValidation,
  validateRequest,
  generateTrackingUrl,
);

router.get(
  "/dashboard/stats",
  query("period")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("Period must be between 1 and 365 days"),
  validateRequest,
  getDashboardStats,
);

router.get(
  "/commissions",
  query("status")
    .optional()
    .isIn(["pending", "approved", "paid", "cancelled"])
    .withMessage("Invalid commission status"),
  validateRequest,
  getCommissions,
);

router.post("/payout-request", requestAffiliatePayout);

// Admin only routes
router.get(
  "/",
  authorize(["admin"]),
  query("status")
    .optional()
    .isIn(["pending", "active", "suspended", "inactive"])
    .withMessage("Invalid status"),
  query("sortBy")
    .optional()
    .isIn(["totalRevenue", "totalConversions", "totalClicks", "createdAt"])
    .withMessage("Invalid sort field"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),
  validateRequest,
  getAllAffiliates,
);

router.put(
  "/:id/status",
  authorize(["admin"]),
  updateStatusValidation,
  validateRequest,
  updateAffiliateStatus,
);

router.get(
  "/top-performers",
  authorize(["admin"]),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
  query("period")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("Period must be between 1 and 365 days"),
  validateRequest,
  getTopPerformers,
);

router.get(
  "/analytics/overview",
  authorize(["admin"]),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be valid"),
  query("endDate").optional().isISO8601().withMessage("End date must be valid"),
  validateRequest,
  getAffiliateAnalytics,
);

export default router;
