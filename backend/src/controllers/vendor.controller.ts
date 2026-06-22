import { Response, NextFunction } from "express";
import { AppError, catchAsync } from "../middleware/index";
import { uploadSingle } from "../middleware/upload";
import { AuthRequest } from "../types/index";
import vendorService from "../services/vendor.service";

// @desc    Get vendor dashboard statistics
// @route   GET /api/vendors/stats
export const getVendorDashboardStats = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const data = await vendorService.getDashboardStats(userId.toString());

    res.status(200).json({
      success: true,
      message: "Vendor dashboard statistics retrieved successfully",
      data,
    });
  },
);

// @desc    Get events created by the authenticated vendor
// @route   GET /api/vendors/events
export const getVendorEvents = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const events = await vendorService.getEvents(userId.toString());

    res.status(200).json({
      success: true,
      message: "Vendor events retrieved successfully",
      data: { events },
    });
  },
);

// @desc    Get bookings for the authenticated vendor's events
// @route   GET /api/vendors/bookings
export const getVendorBookings = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const data = await vendorService.getBookings(userId.toString(), {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      search: req.query.search as string,
      status: req.query.status as string,
      paymentStatus: req.query.paymentStatus as string,
      eventId: req.query.eventId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      minAmount: req.query.minAmount
        ? parseFloat(req.query.minAmount as string)
        : undefined,
      maxAmount: req.query.maxAmount
        ? parseFloat(req.query.maxAmount as string)
        : undefined,
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortOrder: (req.query.sortOrder as string) || "desc",
    });

    res.status(200).json({
      success: true,
      message: "Vendor bookings retrieved successfully",
      data,
    });
  },
);

// @desc    Get single booking by ID for vendor
// @route   GET /api/vendors/bookings/:id
export const getVendorBookingById = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const booking = await vendorService.getBookingById(
      userId.toString(),
      req.params.id,
    );

    res.status(200).json({
      success: true,
      message: "Booking retrieved successfully",
      data: { booking },
    });
  },
);

// @desc    Update booking (limited edit)
// @route   PUT /api/vendors/bookings/:id
export const updateVendorBooking = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const booking = await vendorService.updateBooking(
      userId.toString(),
      req.params.id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      data: { booking },
    });
  },
);

// @desc    Export vendor bookings
// @route   GET /api/vendors/bookings/export
export const exportVendorBookings = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const { format = "csv", ...filters } = req.query;
    const result = await vendorService.exportBookings(
      userId.toString(),
      format as string,
      filters,
    );

    if (result.type === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="bookings-${Date.now()}.json"`,
      );
      return res.json({
        success: true,
        data: result.data,
        exportedAt: new Date(),
        totalRecords: (result.data as any[]).length,
      });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="bookings-${Date.now()}.csv"`,
    );
    return res.send(result.data);
  },
);

// @desc    Export participants for a specific event
// @route   GET /api/vendors/events/:eventId/participants/export
export const exportEventParticipants = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const { eventId } = req.params;
    const { format = "csv" } = req.query;
    const result = await vendorService.exportEventParticipants(
      userId.toString(),
      eventId,
      format as string,
    );

    if (result.type === "json") {
      return res.json({ success: true, data: result.data });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="participants-${eventId}-${Date.now()}.csv"`,
    );
    return res.send(result.data);
  },
);

// @desc    Import vendor bookings from CSV
// @route   POST /api/vendors/bookings/import
export const importVendorBookings = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const { csvData } = req.body;
    if (!csvData || !Array.isArray(csvData)) {
      return next(
        new AppError("CSV data is required and must be an array", 400),
      );
    }

    const results = await vendorService.importBookings(
      userId.toString(),
      csvData,
    );

    res.status(200).json({
      success: true,
      message: `Import completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results,
    });
  },
);

// @desc    Get vendor profile
// @route   GET /api/vendors/profile
export const getVendorProfile = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const data = await vendorService.getProfile(userId.toString());

    res.status(200).json({
      success: true,
      message: "Vendor profile retrieved successfully",
      data,
    });
  },
);

// @desc    Update vendor profile
// @route   PUT /api/vendors/profile
export const updateVendorProfile = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const data = await vendorService.updateProfile(userId.toString(), req.body);

    res.status(200).json({
      success: true,
      message: "Vendor profile updated successfully",
      data,
    });
  },
);

// @desc    Upload vendor images (logo, cover image)
// @route   POST /api/vendors/upload-image
export const uploadVendorImage = [
  uploadSingle("image"),
  catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User ID not found", 401));
    if (!req.file) {
      return next(new AppError("No image file provided", 400));
    }

    const imageType = req.body.imageType || "logo";
    const data = await vendorService.uploadImage(
      userId.toString(),
      req.file,
      imageType,
    );

    res.status(200).json({
      success: true,
      message: `Vendor ${imageType} uploaded successfully`,
      data,
    });
  }),
];

// @desc    Delete vendor image (logo, cover image)
// @route   DELETE /api/vendors/image/:imageType
export const deleteVendorImage = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;
  if (!userId) return next(new AppError("User ID not found", 401));

  const { imageType } = req.params;
  if (imageType !== "logo" && imageType !== "coverImage") {
    return next(new AppError("Invalid image type", 400));
  }

  const data = await vendorService.deleteImage(userId.toString(), imageType);

  res.status(200).json({
    success: true,
    message: `Vendor ${imageType} deleted successfully`,
    data,
  });
});

// @desc    Update vendor business hours
// @route   PUT /api/vendors/business-hours
export const updateVendorBusinessHours = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const vendor = await vendorService.updateBusinessHours(
      userId.toString(),
      req.body.businessHours,
    );

    res.status(200).json({
      success: true,
      message: "Vendor business hours updated successfully",
      data: { vendor },
    });
  },
);

// @desc    Update vendor social media links
// @route   PUT /api/vendors/social-media
export const updateVendorSocialMedia = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const vendor = await vendorService.updateSocialMedia(
      userId.toString(),
      req.body.socialMedia,
    );

    res.status(200).json({
      success: true,
      message: "Vendor social media links updated successfully",
      data: { vendor },
    });
  },
);

// @desc    Get all public vendors
// @route   GET /api/vendors
export const getAllPublicVendors = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const data = await vendorService.getAllPublicVendors({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 12,
      search: req.query.search as string,
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortOrder: (req.query.sortOrder as string) || "desc",
    });

    res.status(200).json({
      success: true,
      message: "Public vendors retrieved successfully",
      data,
    });
  },
);

// @desc    Get public vendor profile by ID
// @route   GET /api/vendors/public/:id
export const getPublicVendorProfile = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const data = await vendorService.getPublicVendorProfile(req.params.id);

    res.status(200).json({
      success: true,
      message: "Vendor profile retrieved successfully",
      data,
    });
  },
);

// @desc    Get vendor payment information
// @route   GET /api/vendors/:vendorId/payment-info
export const getVendorPaymentInfo = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { vendorId } = req.params;
    if (!vendorId) {
      return next(new AppError("Vendor ID is required", 400));
    }

    const data = await vendorService.getPaymentInfo(vendorId);

    res.status(200).json({
      success: true,
      message: data.hasCustomStripe
        ? "Vendor payment information retrieved successfully"
        : "Using platform payment settings",
      data,
    });
  },
);

// ===================== EMPLOYEE MANAGEMENT =====================

// @desc    Get employees for the authenticated vendor
// @route   GET /api/vendors/employees
export const getVendorEmployees = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User ID not found", 401));

    const data = await vendorService.getEmployees(userId.toString(), {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      search: req.query.search as string,
      role: req.query.role as string,
      status: req.query.status as string,
      assignedEvent: req.query.assignedEvent as string,
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortOrder: (req.query.sortOrder as string) || "desc",
    });

    res.status(200).json({
      success: true,
      message: "Vendor employees retrieved successfully",
      data,
    });
  },
);

// @desc    Get single employee by ID
// @route   GET /api/vendors/employees/:id
export const getVendorEmployeeById = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("Vendor ID not found", 401));

    const employee = await vendorService.getEmployeeById(
      userId.toString(),
      req.params.id,
    );

    res.status(200).json({
      success: true,
      message: "Employee retrieved successfully",
      data: { employee },
    });
  },
);

// @desc    Create a new employee
// @route   POST /api/vendors/employees
export const createVendorEmployee = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User ID not found", 401));

    const result = await vendorService.createEmployee(
      userId.toString(),
      req.body,
    );

    res.status(201).json({
      success: true,
      message: result.tempPasswordSent
        ? "Employee created successfully. Welcome email sent with login credentials."
        : "Employee created successfully.",
      data: { employee: result.employee },
    });
  },
);

// @desc    Update employee
// @route   PUT /api/vendors/employees/:id
export const updateVendorEmployee = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User ID not found", 401));

    const employee = await vendorService.updateEmployee(
      userId.toString(),
      req.params.id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: { employee },
    });
  },
);

// @desc    Delete/deactivate employee
// @route   DELETE /api/vendors/employees/:id
export const deleteVendorEmployee = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User ID not found", 401));

    const result = await vendorService.deleteEmployee(
      userId.toString(),
      req.params.id,
      req.query.hard === "true",
    );

    res.status(200).json({
      success: true,
      message:
        req.query.hard === "true"
          ? "Employee permanently deleted"
          : "Employee deactivated successfully",
      data: result ? { employee: result } : null,
    });
  },
);

// @desc    Assign employee to events
// @route   POST /api/vendors/employees/:id/assign-event
export const assignEmployeeToEvent = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User ID not found", 401));

    const result = await vendorService.assignEmployeeToEvent(
      userId.toString(),
      req.params.id,
      req.body.eventIds,
    );

    res.status(200).json({
      success: true,
      message:
        result.newCount === 0
          ? "All events are already assigned to this employee"
          : `Employee assigned to ${result.newCount} event(s) successfully`,
      data: { employee: result.employee },
    });
  },
);

// @desc    Remove employee from an event
// @route   POST /api/vendors/employees/:id/remove-event
export const removeEmployeeFromEvent = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User ID not found", 401));

    const employee = await vendorService.removeEmployeeFromEvent(
      userId.toString(),
      req.params.id,
      req.body.eventId,
    );

    res.status(200).json({
      success: true,
      message: "Employee removed from event successfully",
      data: { employee },
    });
  },
);

// @desc    Export vendor employees
// @route   POST /api/vendors/employees/export
export const exportVendorEmployees = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("Vendor ID not found", 401));

    const { format = "csv", filters = {} } = req.body;
    const result = await vendorService.exportEmployees(
      userId.toString(),
      format,
      filters,
    );

    if (result.type === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="employees-${Date.now()}.json"`,
      );
      return res.json({
        success: true,
        data: result.data,
        exportedAt: new Date(),
        totalRecords: (result.data as any[]).length,
      });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="employees-${Date.now()}.csv"`,
    );
    return res.send(result.data);
  },
);

// ==================== PHONE/BANK/DOCS ====================

// @desc    Send phone verification OTP
// @route   POST /api/vendors/verify-phone/send
export const sendVendorPhoneVerificationOTP = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const data = await vendorService.sendPhoneVerificationOTP(
      userId.toString(),
      req.body.phone,
    );

    res.status(200).json({
      success: true,
      message: "Verification code sent successfully",
      data,
    });
  },
);

// @desc    Verify phone OTP
// @route   POST /api/vendors/verify-phone/confirm
export const verifyVendorPhoneOTP = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const data = await vendorService.verifyPhoneOTP(
      userId.toString(),
      req.body.otp,
    );

    res.status(200).json({
      success: true,
      message: "Phone verified successfully",
      data,
    });
  },
);

// @desc    Update vendor bank details
// @route   PUT /api/vendors/bank-details
export const updateVendorBankDetails = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const bankDetails = await vendorService.updateBankDetails(
      userId.toString(),
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Bank details updated successfully",
      data: { bankAccountDetails: bankDetails },
    });
  },
);

// @desc    Upload vendor verification document
// @route   POST /api/vendors/documents/upload
export const uploadVendorDocument = [
  uploadSingle("document"),
  catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }
    if (!req.file) {
      return next(new AppError("No document file provided", 400));
    }

    const data = await vendorService.uploadDocument(
      userId.toString(),
      req.file,
      req.body.type,
    );

    res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
      data,
    });
  }),
];

// @desc    Delete vendor verification document
// @route   DELETE /api/vendors/documents/:type
export const deleteVendorDocument = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    await vendorService.deleteDocument(userId.toString(), req.params.type);

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  },
);

// @desc    Get vendor documents status
// @route   GET /api/vendors/documents
export const getVendorDocuments = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const documents = await vendorService.getDocuments(userId.toString());

    res.status(200).json({
      success: true,
      message: "Documents retrieved successfully",
      data: { documents },
    });
  },
);

// @desc    Initialize Stripe Connect onboarding
// @route   POST /api/vendors/stripe-connect/onboard
export const initializeStripeConnectOnboarding = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const data = await vendorService.initializeStripeConnect(userId.toString());

    res.status(200).json({
      success: true,
      message: "Stripe Connect onboarding initialized",
      data,
    });
  },
);

// @desc    Get Stripe Connect account status
// @route   GET /api/vendors/stripe-connect/status
export const getStripeConnectStatus = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const data = await vendorService.getStripeConnectStatus(userId.toString());

    res.status(200).json({
      success: true,
      message: "Stripe Connect status retrieved",
      data,
    });
  },
);
