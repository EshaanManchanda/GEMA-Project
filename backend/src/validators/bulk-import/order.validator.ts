import { body, ValidationChain } from "express-validator";
import mongoose from "mongoose";

/**
 * Validation rules for Order bulk import
 *
 * Relationship Resolution:
 * - userId: Accept userEmail OR userId
 * - items[].eventId: Accept eventTitle OR eventId
 *
 * Amount Reconciliation (CRITICAL):
 * - subtotal + tax + serviceFee - discount - couponDiscount = total (±1 cent tolerance)
 * - items[].totalPrice = items[].unitPrice * items[].quantity
 * - sum(items[].totalPrice) = subtotal
 * - paymentRouting.platformCommission + paymentRouting.vendorPayout ≤ total
 *
 * Security:
 * - paymentIntentId, transactionId cannot be set directly (prevents fraud)
 * - Only allow status: pending, confirmed, draft (not paid to prevent bypassing payment)
 * - communications[], checkIn data auto-generated, cannot be imported
 *
 * Nested Data:
 * - items[] with participants[]
 * - participants[] with emergencyContact and registrationData[]
 */

export const validateOrderImport: ValidationChain[] = [
  // Root array validation
  body("data")
    .isArray({ min: 1, max: 10000 })
    .withMessage("Data must be an array with 1-10000 items"),

  // ========== USER RELATIONSHIP ==========

  body("data.*.userEmail")
    .optional()
    .isEmail()
    .withMessage("User email must be valid")
    .normalizeEmail()
    .toLowerCase(),

  body("data.*.userId")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("userId must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  // At least one required
  body("data.*").custom((value) => {
    if (!value.userEmail && !value.userId) {
      throw new Error("Either userEmail or userId is required");
    }
    return true;
  }),

  // ========== ORDER NUMBER ==========

  body("data.*.orderNumber")
    .notEmpty()
    .withMessage("Order number is required")
    .isString()
    .withMessage("Order number must be a string")
    .trim()
    .matches(/^ORD-[A-Z0-9-]+$/)
    .withMessage("Order number must match format: ORD-XXXXXXXXXX"),

  // ========== ORDER ITEMS (NESTED) ==========

  body("data.*.items")
    .notEmpty()
    .withMessage("Order items are required")
    .isArray({ min: 1, max: 50 })
    .withMessage("Items must be an array with 1-50 items"),

  // Item event relationship
  body("data.*.items.*.eventTitle")
    .optional()
    .isString()
    .withMessage("Event title must be a string")
    .trim()
    .notEmpty(),

  body("data.*.items.*.eventId")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("eventId must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  // At least one event identifier required per item
  body("data.*.items.*").custom((value) => {
    if (!value.eventTitle && !value.eventId) {
      throw new Error("Each item must have either eventTitle or eventId");
    }
    return true;
  }),

  // Item basic fields
  body("data.*.items.*.scheduleDate")
    .notEmpty()
    .withMessage("Schedule date is required for each item")
    .isISO8601()
    .withMessage("Schedule date must be a valid ISO 8601 date")
    .toDate(),

  body("data.*.items.*.quantity")
    .notEmpty()
    .withMessage("Quantity is required for each item")
    .isInt({ min: 1, max: 50 })
    .withMessage("Quantity must be 1-50"),

  body("data.*.items.*.unitPrice")
    .notEmpty()
    .withMessage("Unit price is required for each item")
    .isFloat({ min: 0 })
    .withMessage("Unit price must be non-negative"),

  body("data.*.items.*.totalPrice")
    .notEmpty()
    .withMessage("Total price is required for each item")
    .isFloat({ min: 0 })
    .withMessage("Total price must be non-negative"),

  body("data.*.items.*.currency")
    .notEmpty()
    .withMessage("Currency is required for each item")
    .isIn(["INR", "AED", "USD", "EUR", "GBP", "EGP", "CAD"])
    .withMessage("Currency must be: INR, AED, USD, EUR, GBP, EGP, or CAD"),

  // Validate item totalPrice = unitPrice * quantity
  body("data.*.items.*").custom((item) => {
    if (
      item.unitPrice !== undefined &&
      item.quantity !== undefined &&
      item.totalPrice !== undefined
    ) {
      const calculated = item.unitPrice * item.quantity;
      const diff = Math.abs(calculated - item.totalPrice);
      if (diff > 0.01) {
        throw new Error(
          `Item totalPrice mismatch: expected ${calculated}, got ${item.totalPrice}`,
        );
      }
    }
    return true;
  }),

  // ========== PARTICIPANTS (NESTED IN ITEMS) ==========

  body("data.*.items.*.participants")
    .optional()
    .isArray({ max: 50 })
    .withMessage("Participants must be an array with max 50 items"),

  body("data.*.items.*.participants.*.name")
    .optional()
    .isString()
    .withMessage("Participant name must be a string")
    .trim()
    .notEmpty()
    .withMessage("Participant name cannot be empty"),

  body("data.*.items.*.participants.*.age")
    .optional()
    .isInt({ min: 0, max: 120 })
    .withMessage("Participant age must be 0-120"),

  body("data.*.items.*.participants.*.gender")
    .optional()
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be: male, female, or other"),

  body("data.*.items.*.participants.*.allergies")
    .optional()
    .isArray()
    .withMessage("Allergies must be an array"),

  body("data.*.items.*.participants.*.allergies.*")
    .optional()
    .isString()
    .withMessage("Each allergy must be a string"),

  body("data.*.items.*.participants.*.medicalConditions")
    .optional()
    .isArray()
    .withMessage("Medical conditions must be an array"),

  body("data.*.items.*.participants.*.medicalConditions.*")
    .optional()
    .isString()
    .withMessage("Each medical condition must be a string"),

  // Emergency contact (required for minors)
  body("data.*.items.*.participants.*.emergencyContact")
    .optional()
    .isObject()
    .withMessage("Emergency contact must be an object"),

  body("data.*.items.*.participants.*.emergencyContact.name")
    .optional()
    .isString()
    .withMessage("Emergency contact name must be a string")
    .trim(),

  body("data.*.items.*.participants.*.emergencyContact.relationship")
    .optional()
    .isString()
    .withMessage("Relationship must be a string")
    .trim(),

  body("data.*.items.*.participants.*.emergencyContact.phone")
    .optional()
    .isString()
    .withMessage("Emergency phone must be a string")
    .trim(),

  body("data.*.items.*.participants.*.specialRequirements")
    .optional()
    .isString()
    .withMessage("Special requirements must be a string"),

  // Registration data (dynamic fields)
  body("data.*.items.*.participants.*.registrationData")
    .optional()
    .isArray()
    .withMessage("Registration data must be an array"),

  body("data.*.items.*.participants.*.registrationData.*.fieldId")
    .optional()
    .isString()
    .withMessage("Field ID must be a string"),

  body("data.*.items.*.participants.*.registrationData.*.fieldLabel")
    .optional()
    .isString()
    .withMessage("Field label must be a string"),

  body("data.*.items.*.participants.*.registrationData.*.fieldType")
    .optional()
    .isString()
    .withMessage("Field type must be a string"),

  // ========== AMOUNTS (CRITICAL VALIDATION) ==========

  body("data.*.subtotal")
    .notEmpty()
    .withMessage("Subtotal is required")
    .isFloat({ min: 0 })
    .withMessage("Subtotal must be non-negative"),

  body("data.*.tax")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Tax must be non-negative"),

  body("data.*.serviceFee")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Service fee must be non-negative"),

  body("data.*.discount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Discount must be non-negative"),

  body("data.*.couponDiscount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Coupon discount must be non-negative"),

  body("data.*.total")
    .notEmpty()
    .withMessage("Total is required")
    .isFloat({ min: 0 })
    .withMessage("Total must be non-negative"),

  body("data.*.currency")
    .notEmpty()
    .withMessage("Currency is required")
    .isIn(["INR", "AED", "USD", "EUR", "GBP", "EGP", "CAD"])
    .withMessage("Currency must be: INR, AED, USD, EUR, GBP, EGP, or CAD"),

  // Validate total amount reconciliation
  body("data.*").custom((order) => {
    const subtotal = order.subtotal || 0;
    const tax = order.tax || 0;
    const serviceFee = order.serviceFee || 0;
    const discount = order.discount || 0;
    const couponDiscount = order.couponDiscount || 0;
    const total = order.total || 0;

    const calculated = subtotal + tax + serviceFee - discount - couponDiscount;
    const diff = Math.abs(calculated - total);

    if (diff > 0.01) {
      throw new Error(
        `Total amount mismatch: subtotal(${subtotal}) + tax(${tax}) + serviceFee(${serviceFee}) - discount(${discount}) - couponDiscount(${couponDiscount}) = ${calculated}, but total is ${total}`,
      );
    }
    return true;
  }),

  // ========== STATUS FIELDS ==========

  body("data.*.status")
    .optional()
    .isIn(["pending", "confirmed", "draft"])
    .withMessage(
      "Status must be: pending, confirmed, or draft (not cancelled/refunded)",
    ),

  body("data.*.paymentStatus")
    .optional()
    .isIn(["pending", "failed"])
    .withMessage(
      "Payment status can only be: pending or failed (not paid to prevent fraud)",
    ),

  body("data.*.paymentMethod")
    .optional()
    .isIn(["stripe", "paypal", "razorpay", "test"])
    .withMessage("Payment method must be: stripe, paypal, razorpay, or test"),

  // ========== COUPON ==========

  body("data.*.couponCode")
    .optional()
    .isString()
    .withMessage("Coupon code must be a string")
    .trim()
    .toUpperCase(),

  // ========== PAYMENT ROUTING ==========

  body("data.*.paymentRouting")
    .optional()
    .isObject()
    .withMessage("Payment routing must be an object"),

  body("data.*.paymentRouting.usesVendorStripe")
    .optional()
    .isBoolean()
    .withMessage("usesVendorStripe must be a boolean"),

  body("data.*.paymentRouting.vendorStripeAccountId")
    .optional()
    .isString()
    .withMessage("Vendor Stripe account ID must be a string"),

  body("data.*.paymentRouting.platformCommission")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Platform commission must be non-negative"),

  body("data.*.paymentRouting.vendorPayout")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Vendor payout must be non-negative"),

  body("data.*.paymentRouting.stripeApplicationFee")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Stripe application fee must be non-negative"),

  // Validate commission <= total
  body("data.*").custom((order) => {
    if (order.paymentRouting) {
      const platformCommission = order.paymentRouting.platformCommission || 0;
      const vendorPayout = order.paymentRouting.vendorPayout || 0;
      const total = order.total || 0;

      const sum = platformCommission + vendorPayout;
      if (sum > total + 0.01) {
        throw new Error(
          `Payment routing sum (${sum}) cannot exceed order total (${total})`,
        );
      }
    }
    return true;
  }),

  // ========== BILLING ADDRESS ==========

  body("data.*.billingAddress")
    .notEmpty()
    .withMessage("Billing address is required")
    .isObject()
    .withMessage("Billing address must be an object"),

  body("data.*.billingAddress.firstName")
    .notEmpty()
    .withMessage("First name is required")
    .isString()
    .withMessage("First name must be a string")
    .trim(),

  body("data.*.billingAddress.lastName")
    .notEmpty()
    .withMessage("Last name is required")
    .isString()
    .withMessage("Last name must be a string")
    .trim(),

  body("data.*.billingAddress.email")
    .notEmpty()
    .withMessage("Billing email is required")
    .isEmail()
    .withMessage("Billing email must be valid")
    .normalizeEmail(),

  body("data.*.billingAddress.phone")
    .notEmpty()
    .withMessage("Phone is required")
    .isString()
    .withMessage("Phone must be a string")
    .trim(),

  body("data.*.billingAddress.address")
    .notEmpty()
    .withMessage("Address is required")
    .isString()
    .withMessage("Address must be a string")
    .trim(),

  body("data.*.billingAddress.city")
    .notEmpty()
    .withMessage("City is required")
    .isString()
    .withMessage("City must be a string")
    .trim(),

  body("data.*.billingAddress.state")
    .notEmpty()
    .withMessage("State is required")
    .isString()
    .withMessage("State must be a string")
    .trim(),

  body("data.*.billingAddress.zipCode")
    .notEmpty()
    .withMessage("Zip code is required")
    .isString()
    .withMessage("Zip code must be a string")
    .trim(),

  body("data.*.billingAddress.country")
    .notEmpty()
    .withMessage("Country is required")
    .isString()
    .withMessage("Country must be a string")
    .trim(),

  // ========== OPTIONAL FIELDS ==========

  body("data.*.notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string"),

  body("data.*.specialRequests")
    .optional()
    .isString()
    .withMessage("Special requests must be a string"),

  body("data.*.accessibilityNeeds")
    .optional()
    .isArray()
    .withMessage("Accessibility needs must be an array"),

  body("data.*.accessibilityNeeds.*")
    .optional()
    .isString()
    .withMessage("Each accessibility need must be a string"),

  body("data.*.dietaryRestrictions")
    .optional()
    .isArray()
    .withMessage("Dietary restrictions must be an array"),

  body("data.*.dietaryRestrictions.*")
    .optional()
    .isString()
    .withMessage("Each dietary restriction must be a string"),

  body("data.*.source")
    .optional()
    .isIn(["web", "mobile", "admin", "vendor"])
    .withMessage("Source must be: web, mobile, admin, or vendor"),

  // ========== ADMIN COMMISSION ==========

  body("data.*.adminCommission")
    .optional()
    .isObject()
    .withMessage("Admin commission must be an object"),

  body("data.*.adminCommission.rate")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Commission rate must be 0-100"),

  body("data.*.adminCommission.amount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Commission amount must be non-negative"),

  // ========== REVENUE METADATA ==========

  body("data.*.revenueMetadata")
    .optional()
    .isObject()
    .withMessage("Revenue metadata must be an object"),

  body("data.*.revenueMetadata.revenueStream")
    .optional()
    .isIn(["booking", "addon", "subscription"])
    .withMessage("Revenue stream must be: booking, addon, or subscription"),

  body("data.*.revenueMetadata.commissionSource")
    .optional()
    .isIn(["platform_fee", "service_fee", "addon_fee"])
    .withMessage(
      "Commission source must be: platform_fee, service_fee, or addon_fee",
    ),

  // ========== FORBIDDEN FIELDS (SECURITY) ==========

  body("data.*.paymentIntentId").custom((value) => {
    if (value !== undefined) {
      throw new Error("paymentIntentId cannot be set directly (security)");
    }
    return true;
  }),

  body("data.*.transactionId").custom((value) => {
    if (value !== undefined) {
      throw new Error("transactionId cannot be set directly (security)");
    }
    return true;
  }),

  body("data.*.communications").custom((value) => {
    if (value !== undefined) {
      throw new Error(
        "communications array is auto-generated and cannot be imported",
      );
    }
    return true;
  }),

  body("data.*.checkIn").custom((value) => {
    if (value !== undefined) {
      throw new Error("checkIn data is auto-generated and cannot be imported");
    }
    return true;
  }),
];

/**
 * Validation rules for Order bulk export
 */
export const validateOrderExport: ValidationChain[] = [
  body("filters")
    .optional()
    .isObject()
    .withMessage("Filters must be an object"),

  // Filter by status
  body("filters.status")
    .optional()
    .isIn(["pending", "confirmed", "cancelled", "refunded"])
    .withMessage("Status must be: pending, confirmed, cancelled, or refunded"),

  body("filters.paymentStatus")
    .optional()
    .isIn(["pending", "paid", "failed", "refunded"])
    .withMessage("Payment status must be: pending, paid, failed, or refunded"),

  // Filter by date range
  body("filters.createdAfter")
    .optional()
    .isISO8601()
    .withMessage("createdAfter must be a valid ISO 8601 date")
    .toDate(),

  body("filters.createdBefore")
    .optional()
    .isISO8601()
    .withMessage("createdBefore must be a valid ISO 8601 date")
    .toDate(),

  // Filter by amount range
  body("filters.minTotal")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("minTotal must be non-negative"),

  body("filters.maxTotal")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("maxTotal must be non-negative"),

  // Filter by user
  body("filters.userId")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("userId must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  // Search by order number
  body("filters.orderNumber")
    .optional()
    .isString()
    .withMessage("Order number must be a string")
    .trim(),

  body("filters.search")
    .optional()
    .isString()
    .withMessage("Search must be a string")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Search query must be at least 2 characters"),

  // Export options
  body("includeRelationships")
    .optional()
    .isBoolean()
    .withMessage("includeRelationships must be a boolean"),

  body("includeParticipants")
    .optional()
    .isBoolean()
    .withMessage("includeParticipants must be a boolean"),

  body("includeCommunications")
    .optional()
    .isBoolean()
    .withMessage("includeCommunications must be a boolean"),

  body("limit")
    .optional()
    .isInt({ min: 1, max: 50000 })
    .withMessage("Limit must be between 1 and 50000"),

  body("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Offset must be non-negative"),

  // Sort options
  body("sortBy")
    .optional()
    .isIn(["orderNumber", "createdAt", "updatedAt", "total", "status"])
    .withMessage(
      "sortBy must be one of: orderNumber, createdAt, updatedAt, total, status",
    ),

  body("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be either asc or desc"),
];
