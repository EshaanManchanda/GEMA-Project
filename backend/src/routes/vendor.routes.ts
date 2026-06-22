import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { UserRole } from "../models/index";
import {
  getAllPublicVendors,
  getVendorDashboardStats,
  getVendorEvents,
  getVendorBookings,
  getVendorBookingById,
  updateVendorBooking,
  exportVendorBookings,
  importVendorBookings,
  getVendorProfile,
  updateVendorProfile,
  uploadVendorImage,
  deleteVendorImage,
  updateVendorBusinessHours,
  updateVendorSocialMedia,
  getPublicVendorProfile,
  getVendorPaymentInfo,
  // Employee management functions
  getVendorEmployees,
  getVendorEmployeeById,
  createVendorEmployee,
  updateVendorEmployee,
  deleteVendorEmployee,
  assignEmployeeToEvent,
  removeEmployeeFromEvent,
  exportVendorEmployees,
  // New profile endpoints
  sendVendorPhoneVerificationOTP,
  verifyVendorPhoneOTP,
  updateVendorBankDetails,
  uploadVendorDocument,
  deleteVendorDocument,
  getVendorDocuments,
  exportEventParticipants,
} from "../controllers/vendor.controller";
import {
  getVendorEventById,
  createVendorEvent,
  updateVendorEvent,
  deleteVendorEvent,
  restoreVendorEvent,
} from "../controllers/vendor.event.controller";
import {
  validateEmployeeListQuery,
  validateCreateEmployee,
  validateUpdateEmployee,
  validateAssignEvents,
  validateExportEmployees,
  validateGetEmployeeById,
  validateDeleteEmployee,
  validateRemoveFromEvent,
} from "../validators/employee.validator";
import {
  validateUpdateProfile,
  validateBankDetails,
  validateBusinessHours,
  validateSocialMedia,
  validatePhoneVerificationSend,
  validatePhoneVerificationConfirm,
  validateDocumentType,
  validateUpdateBooking,
} from "../validators/vendor.validator";

const router = Router();

/**
 * @route   GET /api/vendors
 * @desc    Get all public vendors (active & verified)
 * @access  Public
 * @query   page, limit, search, sortBy, sortOrder
 */
router.get("/", getAllPublicVendors);

/**
 * @route   GET /api/vendors/public/:id
 * @desc    Get public vendor profile by ID
 * @access  Public
 */
router.get("/public/:id", getPublicVendorProfile);

/**
 * @route   GET /api/vendors/:vendorId/payment-info
 * @desc    Get vendor payment information (for booking flow)
 * @access  Public
 */
router.get("/:vendorId/payment-info", getVendorPaymentInfo);

// All vendor routes below require authentication and vendor role
router.use(authenticate);
router.use(authorize([UserRole.VENDOR]));

/**
 * @route   GET /api/vendors/stats
 * @desc    Get vendor dashboard statistics
 * @access  Vendor only
 */
router.get("/stats", getVendorDashboardStats);

/**
 * @route   GET /api/vendors/events
 * @desc    Get events created by the authenticated vendor
 * @access  Vendor only
 */
router.get("/events", getVendorEvents);

/**
 * @route   POST /api/vendors/events
 * @desc    Create a new event
 * @access  Vendor only
 */
router.post("/events", createVendorEvent);

/**
 * @route   GET /api/vendors/events/:id
 * @desc    Get single event by ID
 * @access  Vendor only
 */
router.get("/events/:id", getVendorEventById);

/**
 * @route   PUT /api/vendors/events/:id
 * @desc    Update vendor's own event
 * @access  Vendor only
 */
router.put("/events/:id", updateVendorEvent);

/**
 * @route   DELETE /api/vendors/events/:id
 * @desc    Delete vendor's own event (soft or permanent)
 * @access  Vendor only
 */
router.delete("/events/:id", deleteVendorEvent);

/**
 * @route   PUT /api/vendors/events/:id/restore
 * @desc    Restore deleted event
 * @access  Vendor only
 */
router.put("/events/:id/restore", restoreVendorEvent);

/**
 * @route   GET /api/vendors/events/:eventId/participants/export
 * @desc    Export participant-level rows for a specific event
 * @access  Vendor only
 */
router.get("/events/:eventId/participants/export", exportEventParticipants);

/**
 * @route   GET /api/vendors/bookings/export
 * @desc    Export vendor bookings to CSV or JSON
 * @access  Vendor only
 */
router.get("/bookings/export", exportVendorBookings);

/**
 * @route   POST /api/vendors/bookings/import
 * @desc    Import vendor bookings from CSV
 * @access  Vendor only
 */
router.post("/bookings/import", importVendorBookings);

/**
 * @route   GET /api/vendors/bookings/:id
 * @desc    Get single booking by ID
 * @access  Vendor only
 */
router.get("/bookings/:id", getVendorBookingById);

/**
 * @route   PUT /api/vendors/bookings/:id
 * @desc    Update booking (limited edit - status, notes, fulfillment)
 * @access  Vendor only
 */
router.put("/bookings/:id", validateUpdateBooking, validate, updateVendorBooking);

/**
 * @route   GET /api/vendors/bookings
 * @desc    Get bookings for the authenticated vendor's events
 * @access  Vendor only
 */
router.get("/bookings", getVendorBookings);

/**
 * @route   GET /api/vendors/profile
 * @desc    Get vendor profile for the authenticated vendor
 * @access  Vendor only
 */
router.get("/profile", getVendorProfile);

/**
 * @route   PUT /api/vendors/profile
 * @desc    Update vendor profile for the authenticated vendor
 * @access  Vendor only
 */
router.put("/profile", validateUpdateProfile, validate, updateVendorProfile);

/**
 * @route   POST /api/vendors/upload-image
 * @desc    Upload vendor images (logo, cover image)
 * @access  Vendor only
 */
router.post("/upload-image", uploadVendorImage);

/**
 * @route   DELETE /api/vendors/image/:imageType
 * @desc    Delete vendor images (logo, cover image)
 * @access  Vendor only
 */
router.delete("/image/:imageType", deleteVendorImage);

/**
 * @route   PUT /api/vendors/business-hours
 * @desc    Update vendor business hours
 * @access  Vendor only
 */
router.put(
  "/business-hours",
  validateBusinessHours,
  validate,
  updateVendorBusinessHours,
);

/**
 * @route   PUT /api/vendors/social-media
 * @desc    Update vendor social media links
 * @access  Vendor only
 */
router.put(
  "/social-media",
  validateSocialMedia,
  validate,
  updateVendorSocialMedia,
);

// ===================== EMPLOYEE MANAGEMENT ROUTES =====================

/**
 * @route   POST /api/vendors/employees/export
 * @desc    Export vendor employees to CSV or JSON
 * @access  Vendor only
 */
router.post(
  "/employees/export",
  validateExportEmployees,
  validate,
  exportVendorEmployees,
);

/**
 * @route   GET /api/vendors/employees/:id
 * @desc    Get single employee by ID
 * @access  Vendor only
 */
router.get(
  "/employees/:id",
  validateGetEmployeeById,
  validate,
  getVendorEmployeeById,
);

/**
 * @route   PUT /api/vendors/employees/:id
 * @desc    Update employee
 * @access  Vendor only
 */
router.put(
  "/employees/:id",
  validateUpdateEmployee,
  validate,
  updateVendorEmployee,
);

/**
 * @route   DELETE /api/vendors/employees/:id
 * @desc    Delete/deactivate employee (soft or hard delete)
 * @access  Vendor only
 */
router.delete(
  "/employees/:id",
  validateDeleteEmployee,
  validate,
  deleteVendorEmployee,
);

/**
 * @route   POST /api/vendors/employees/:id/assign-event
 * @desc    Assign employee to one or more events
 * @access  Vendor only
 */
router.post(
  "/employees/:id/assign-event",
  validateAssignEvents,
  validate,
  assignEmployeeToEvent,
);

/**
 * @route   POST /api/vendors/employees/:id/remove-event
 * @desc    Remove employee from an event
 * @access  Vendor only
 */
router.post(
  "/employees/:id/remove-event",
  validateRemoveFromEvent,
  validate,
  removeEmployeeFromEvent,
);

/**
 * @route   GET /api/vendors/employees
 * @desc    Get employees for the authenticated vendor with filters and pagination
 * @access  Vendor only
 */
router.get(
  "/employees",
  validateEmployeeListQuery,
  validate,
  getVendorEmployees,
);

/**
 * @route   POST /api/vendors/employees
 * @desc    Create a new employee
 * @access  Vendor only
 */
router.post(
  "/employees",
  validateCreateEmployee,
  validate,
  createVendorEmployee,
);

// ===================== NEW VENDOR PROFILE ROUTES =====================

/**
 * @route   POST /api/vendors/verify-phone/send
 * @desc    Send phone verification OTP for vendor
 * @access  Vendor only
 */
router.post(
  "/verify-phone/send",
  validatePhoneVerificationSend,
  validate,
  sendVendorPhoneVerificationOTP,
);

/**
 * @route   POST /api/vendors/verify-phone/confirm
 * @desc    Verify phone OTP for vendor
 * @access  Vendor only
 */
router.post(
  "/verify-phone/confirm",
  validatePhoneVerificationConfirm,
  validate,
  verifyVendorPhoneOTP,
);

/**
 * @route   PUT /api/vendors/bank-details
 * @desc    Update vendor bank details
 * @access  Vendor only
 */
router.put(
  "/bank-details",
  validateBankDetails,
  validate,
  updateVendorBankDetails,
);

/**
 * @route   GET /api/vendors/documents
 * @desc    Get vendor documents status
 * @access  Vendor only
 */
router.get("/documents", getVendorDocuments);

/**
 * @route   POST /api/vendors/documents/upload
 * @desc    Upload vendor verification document
 * @access  Vendor only
 */
router.post("/documents/upload", uploadVendorDocument);

/**
 * @route   DELETE /api/vendors/documents/:type
 * @desc    Delete vendor verification document
 * @access  Vendor only
 */
router.delete(
  "/documents/:type",
  validateDocumentType,
  validate,
  deleteVendorDocument,
);

export default router;
