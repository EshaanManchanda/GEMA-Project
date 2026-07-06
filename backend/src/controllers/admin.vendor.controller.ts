import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AppError } from "../middleware/index";
import { ApiResponse, AuthRequest } from "../types/index";
import Vendor, {
  PaymentMode,
  VendorSubscriptionStatus,
} from "../models/Vendor";
import User from "../models/User";

/**
 * Get all vendors with pagination
 * @route GET /api/admin/vendors
 */
export const getAllVendors = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search,
      paymentMode,
      status, // New parameter instead of isActive
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query: any = { isDeleted: { $ne: true } };

    // Search by business name or email
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by payment mode
    if (
      paymentMode &&
      Object.values(PaymentMode).includes(paymentMode as PaymentMode)
    ) {
      query["paymentSettings.paymentMode"] = paymentMode;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Default sorting to descending by createdAt
    const sortObj: any = {};
    const sortField = (sortBy as string) || "createdAt";
    const order = sortOrder ? (sortOrder === "asc" ? 1 : -1) : -1;
    sortObj[sortField] = order;

    // Fetch vendors and populate userId — vendors whose userId is null (user was hard-deleted) will have userId=null after populate
    const allVendors = await Vendor.find(query)
      .populate("userId", "firstName lastName email role status lastLogin")
      .sort(sortObj)
      .lean();

    // Filter out orphan vendors (userId is null) AND apply status filter if provided
    const validVendors = allVendors.filter((v) => {
      if (!v.userId) return false;
      if (status && status !== 'all') {
        return (v.userId as any).status === status;
      }
      return true;
    });

    // Apply pagination on the filtered list
    const total = validVendors.length;
    const paginatedVendors = validVendors.slice(skip, skip + limitNum);
    const totalPages = Math.ceil(total / limitNum);

    const response: ApiResponse = {
      success: true,
      message: "Vendors retrieved successfully",
      data: {
        vendors: paginatedVendors.map((vendor) => ({
          id: vendor._id,
          businessName: vendor.businessName,
          email: vendor.email,
          phone: vendor.phone,
          user: vendor.userId,
          paymentMode:
            vendor.paymentSettings?.paymentMode || PaymentMode.PLATFORM_STRIPE,
          commissionRate: vendor.paymentSettings?.commissionRate || 5,
          subscriptionStatus: vendor.paymentSettings?.subscriptionStatus,
          subscriptionPaidUntil: vendor.paymentSettings?.subscriptionPaidUntil,
          // Sync UI status with the actual User account status
          isActive: (vendor.userId as any)?.status === 'active',
          isSuspended: (vendor.userId as any)?.status === 'suspended',
          lastLogin: (vendor.userId as any)?.lastLogin,
          verificationStatus: vendor.verificationStatus,
          createdAt: vendor.createdAt,
        })),
        pagination: {
          currentPage: pageNum,
          totalPages,
          total,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
          limit: limitNum,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};


/**
 * Get vendor by ID
 * @route GET /api/admin/vendors/:id
 */
export const getVendorById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid vendor ID", 400));
    }

    const vendor = await Vendor.findById(id)
      .populate("userId", "firstName lastName email")
      .lean();

    if (!vendor) {
      return next(new AppError("Vendor not found", 404));
    }

    const response: ApiResponse = {
      success: true,
      message: "Vendor retrieved successfully",
      data: {
        vendor: {
          id: vendor._id,
          businessName: vendor.businessName,
          email: vendor.email,
          phone: vendor.phone,
          user: vendor.userId,
          paymentSettings: {
            paymentMode:
              vendor.paymentSettings?.paymentMode ||
              PaymentMode.PLATFORM_STRIPE,
            paymentModeChangedAt: vendor.paymentSettings?.paymentModeChangedAt,
            commissionRate: vendor.paymentSettings?.commissionRate || 5,
            customCommissionRate: vendor.paymentSettings?.customCommissionRate,
            subscriptionStatus: vendor.paymentSettings?.subscriptionStatus,
            subscriptionAmount:
              vendor.paymentSettings?.subscriptionAmount || 150,
            subscriptionStartDate:
              vendor.paymentSettings?.subscriptionStartDate,
            subscriptionPaidUntil:
              vendor.paymentSettings?.subscriptionPaidUntil,
            subscriptionHistory:
              vendor.paymentSettings?.subscriptionHistory || [],
          },
          isActive: vendor.isActive,
          isSuspended: vendor.isSuspended,
          suspensionReason: vendor.suspensionReason,
          verificationStatus: vendor.verificationStatus,
          verificationDocuments: vendor.verificationDocuments,
          logo: vendor.logo,
          stats: vendor.stats,
          createdAt: vendor.createdAt,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update vendor payment mode (commission/subscription)
 * @route PUT /api/admin/vendors/:id/payment-mode
 */
export const updateVendorPaymentMode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentMode, commissionRate, subscriptionAmount } = req.body;
    const adminId = req.user?._id || req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid vendor ID", 400));
    }

    // Validate payment mode
    if (!paymentMode || !Object.values(PaymentMode).includes(paymentMode)) {
      return next(
        new AppError(
          'Invalid payment mode. Must be "platform_stripe" or "custom_stripe"',
          400,
        ),
      );
    }

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return next(new AppError("Vendor not found", 404));
    }

    // Update payment mode
    vendor.paymentSettings.paymentMode = paymentMode;
    vendor.paymentSettings.paymentModeChangedAt = new Date();
    vendor.paymentSettings.paymentModeChangedBy = adminId;

    // Update commission rate if provided and in commission mode
    if (
      paymentMode === PaymentMode.PLATFORM_STRIPE &&
      commissionRate !== undefined
    ) {
      vendor.paymentSettings.commissionRate = Number(commissionRate);
    }

    // If switching to subscription mode, initialize subscription
    if (paymentMode === PaymentMode.CUSTOM_STRIPE) {
      // Set subscription amount if provided
      if (subscriptionAmount !== undefined) {
        vendor.paymentSettings.subscriptionAmount = Number(subscriptionAmount);
      }

      // If not already set, set status to pending (waiting for payment)
      if (
        !vendor.paymentSettings.subscriptionStatus ||
        vendor.paymentSettings.subscriptionStatus ===
          VendorSubscriptionStatus.INACTIVE
      ) {
        vendor.paymentSettings.subscriptionStatus =
          VendorSubscriptionStatus.PENDING;
      }
    }

    // If switching back to commission mode, keep subscription data but mark inactive
    if (paymentMode === PaymentMode.PLATFORM_STRIPE) {
      vendor.paymentSettings.subscriptionStatus =
        VendorSubscriptionStatus.INACTIVE;
    }

    await vendor.save();

    const response: ApiResponse = {
      success: true,
      message: `Vendor payment mode updated to ${paymentMode === PaymentMode.PLATFORM_STRIPE ? "Commission" : "Subscription"}`,
      data: {
        vendor: {
          id: vendor._id,
          businessName: vendor.businessName,
          paymentSettings: {
            paymentMode: vendor.paymentSettings.paymentMode,
            paymentModeChangedAt: vendor.paymentSettings.paymentModeChangedAt,
            commissionRate: vendor.paymentSettings.commissionRate,
            subscriptionStatus: vendor.paymentSettings.subscriptionStatus,
            subscriptionAmount: vendor.paymentSettings.subscriptionAmount,
            subscriptionPaidUntil: vendor.paymentSettings.subscriptionPaidUntil,
          },
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update vendor subscription status manually
 * @route PUT /api/admin/vendors/:id/subscription-status
 */
export const updateVendorSubscriptionStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { subscriptionStatus, subscriptionPaidUntil, addPayment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid vendor ID", 400));
    }

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return next(new AppError("Vendor not found", 404));
    }

    // Validate subscription status
    if (
      subscriptionStatus &&
      !Object.values(VendorSubscriptionStatus).includes(subscriptionStatus)
    ) {
      return next(new AppError("Invalid subscription status", 400));
    }

    // Update subscription status
    if (subscriptionStatus) {
      vendor.paymentSettings.subscriptionStatus = subscriptionStatus;
    }

    // Update paid until date
    if (subscriptionPaidUntil) {
      vendor.paymentSettings.subscriptionPaidUntil = new Date(
        subscriptionPaidUntil,
      );
    }

    // Add manual payment record if requested
    if (addPayment) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      if (!vendor.paymentSettings.subscriptionHistory) {
        vendor.paymentSettings.subscriptionHistory = [];
      }

      vendor.paymentSettings.subscriptionHistory.push({
        paymentDate: now,
        amount: vendor.paymentSettings.subscriptionAmount || 150,
        periodStart: now,
        periodEnd: periodEnd,
        status: "paid",
        transactionId: `MANUAL-${Date.now()}`,
      });

      // Update subscription dates
      if (!vendor.paymentSettings.subscriptionStartDate) {
        vendor.paymentSettings.subscriptionStartDate = now;
      }
      vendor.paymentSettings.subscriptionPaidUntil = periodEnd;
      vendor.paymentSettings.subscriptionStatus =
        VendorSubscriptionStatus.ACTIVE;
    }

    // Handle vendor status based on subscription
    if (subscriptionStatus === VendorSubscriptionStatus.ACTIVE) {
      vendor.isActive = true;
    } else if (
      subscriptionStatus === VendorSubscriptionStatus.EXPIRED ||
      subscriptionStatus === VendorSubscriptionStatus.SUSPENDED
    ) {
      // Optionally deactivate vendor when subscription expires
      // vendor.isActive = false;
    }

    await vendor.save();

    const response: ApiResponse = {
      success: true,
      message: "Vendor subscription status updated successfully",
      data: {
        vendor: {
          id: vendor._id,
          businessName: vendor.businessName,
          subscriptionStatus: vendor.paymentSettings.subscriptionStatus,
          subscriptionPaidUntil: vendor.paymentSettings.subscriptionPaidUntil,
          isActive: vendor.isActive,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update vendor active status
 * @route PUT /api/admin/vendors/:id/status
 */
export const updateVendorStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive, isSuspended, suspensionReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid vendor ID", 400));
    }

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return next(new AppError("Vendor not found", 404));
    }

    if (isActive !== undefined) {
      vendor.isActive = isActive;
    }

    if (isSuspended !== undefined) {
      vendor.isSuspended = isSuspended;
      if (isSuspended && suspensionReason) {
        vendor.suspensionReason = suspensionReason;
      } else if (!isSuspended) {
        vendor.suspensionReason = undefined;
      }
    }

    await vendor.save();

    const response: ApiResponse = {
      success: true,
      message: "Vendor status updated successfully",
      data: {
        vendor: {
          id: vendor._id,
          businessName: vendor.businessName,
          isActive: vendor.isActive,
          isSuspended: vendor.isSuspended,
          suspensionReason: vendor.suspensionReason,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update vendor verification status
 * @route PUT /api/admin/vendors/:id/verification
 */
export const updateVendorVerification = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { verificationStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid vendor ID", 400));
    }

    const allowed = ["verified", "pending", "unverified", "rejected"];
    if (!allowed.includes(verificationStatus)) {
      return next(new AppError("Invalid verification status", 400));
    }

    const vendor = await Vendor.findByIdAndUpdate(
      id,
      { verificationStatus },
      { new: true },
    );

    if (!vendor) {
      return next(new AppError("Vendor not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Vendor verification status updated",
      data: { verificationStatus: vendor.verificationStatus },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft delete vendor
 * @route DELETE /api/admin/vendors/:id
 */
export const deleteVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid vendor ID", 400));
    }

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return next(new AppError("Vendor not found", 404));
    }

    // Soft delete the vendor profile
    vendor.isDeleted = true;
    vendor.deletedAt = new Date();
    vendor.isActive = false;

    await vendor.save();

    // Also downgrade the linked User's role to 'customer' so admin/users stays in sync
    if (vendor.userId) {
      try {
        await User.findByIdAndUpdate(
          vendor.userId,
          { $set: { role: "customer" } },
          { runValidators: true }
        );
      } catch (userSyncError: any) {
        console.error("Failed to downgrade user role after vendor deletion:", userSyncError);
      }
    }

    res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve or reject a specific vendor verification document
 * @route PATCH /api/admin/vendors/:id/verify-document
 */
export const verifyVendorDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { docType, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid vendor ID", 400));
    }

    const allowedDocs = ["businessLicense", "taxCertificate", "identityDocument"];
    if (!allowedDocs.includes(docType)) {
      return next(new AppError("Invalid document type", 400));
    }

    if (!["approved", "rejected"].includes(status)) {
      return next(new AppError("Status must be 'approved' or 'rejected'", 400));
    }

    const vendor = await Vendor.findByIdAndUpdate(
      id,
      { [`verificationDocuments.${docType}.status`]: status },
      { new: true },
    );

    if (!vendor) {
      return next(new AppError("Vendor not found", 404));
    }

    res.status(200).json({
      success: true,
      message: `Document ${status}`,
      data: { verificationDocuments: vendor.verificationDocuments },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get simple vendors list for dropdowns
 * @route GET /api/admin/vendors/list
 */
export const getVendorsList = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { limit = "100" } = req.query;
    const limitNum = parseInt(limit as string);

    // Get active vendors, sorted by business name
    const vendors = await Vendor.find({ isActive: true, isDeleted: { $ne: true } })
      .select("_id businessName email")
      .sort({ businessName: 1 })
      .limit(limitNum)
      .lean();

    const response: ApiResponse = {
      success: true,
      message: "Vendors list retrieved successfully",
      data: {
        vendors: vendors.map((vendor) => ({
          _id: vendor._id,
          businessName: vendor.businessName,
          email: vendor.email,
        })),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get vendor statistics by payment mode
 * @route GET /api/admin/vendors/stats
 */
export const getVendorStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Use $lookup to join with User collection and filter out orphan vendors
    const [statsResult] = await Vendor.aggregate([
      // Only non-deleted vendors
      { $match: { isDeleted: { $ne: true } } },
      // Join with User collection to detect orphans
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      // Filter out vendors whose user no longer exists
      { $match: { "user.0": { $exists: true } } },
      // Group all into stats
      {
        $group: {
          _id: null,
          totalVendors: { $sum: 1 },
          activeVendors: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$isActive", true] }, { $ne: ["$isSuspended", true] }] }, 1, 0],
            },
          },
        },
      },
    ]);

    const totalVendors = statsResult?.totalVendors || 0;
    const activeVendors = statsResult?.activeVendors || 0;

    const [vendorsByPaymentMode, vendorsBySubscriptionStatus, expiringSoon] = await Promise.all([
      Vendor.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
        { $match: { "user.0": { $exists: true } } },
        { $group: { _id: "$paymentSettings.paymentMode", count: { $sum: 1 } } },
      ]),
      Vendor.aggregate([
        {
          $match: {
            "paymentSettings.paymentMode": PaymentMode.CUSTOM_STRIPE,
            isDeleted: { $ne: true },
          },
        },
        { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
        { $match: { "user.0": { $exists: true } } },
        {
          $group: {
            _id: "$paymentSettings.subscriptionStatus",
            count: { $sum: 1 },
          },
        },
      ]),
      // Vendors with subscription expiring in next 7 days
      Vendor.countDocuments({
        "paymentSettings.paymentMode": PaymentMode.CUSTOM_STRIPE,
        isDeleted: { $ne: true },
        "paymentSettings.subscriptionPaidUntil": {
          $gte: new Date(),
          $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    const response: ApiResponse = {
      success: true,
      message: "Vendor statistics retrieved successfully",
      data: {
        totalVendors,
        activeVendors,
        vendorsByPaymentMode: vendorsByPaymentMode.reduce(
          (acc, curr) => {
            acc[curr._id || "platform_stripe"] = curr.count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        vendorsBySubscriptionStatus: vendorsBySubscriptionStatus.reduce(
          (acc, curr) => {
            acc[curr._id || "inactive"] = curr.count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        subscriptionsExpiringSoon: expiringSoon,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }

};

/**
 * One-time data sync: fix vendor↔user inconsistencies
 * Marks orphan vendors (no linked user) as deleted,
 * and ensures all users with vendor role have a vendor profile.
 * @route POST /api/admin/vendors/sync
 */
export const syncVendorUserData = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // 1. Find all non-deleted vendors and check if their user still exists
    const allVendors = await Vendor.find({ isDeleted: { $ne: true } }).lean();
    const userIds = allVendors.map((v) => v.userId).filter(Boolean);

    const existingUsers = await User.find(
      { _id: { $in: userIds } },
      { _id: 1, role: 1 }
    ).lean();
    const existingUserIds = new Set(existingUsers.map((u) => u._id.toString()));

    // Mark orphan vendors (user no longer exists) as deleted
    const orphanVendorIds = allVendors
      .filter((v) => v.userId && !existingUserIds.has(v.userId.toString()))
      .map((v) => v._id);

    let orphansFixed = 0;
    if (orphanVendorIds.length > 0) {
      const result = await Vendor.updateMany(
        { _id: { $in: orphanVendorIds } },
        { $set: { isDeleted: true, deletedAt: new Date(), isActive: false } }
      );
      orphansFixed = result.modifiedCount;
    }

    // 2. Find vendor-role users who don't have a vendor profile, and create one
    const vendorUsers = await User.find({ role: "vendor" }).lean();
    const vendorDocs = await Vendor.find({
      userId: { $in: vendorUsers.map((u) => u._id) },
    }).lean();
    const usersWithVendorDoc = new Set(vendorDocs.map((v) => v.userId?.toString()));

    const usersWithoutProfile = vendorUsers.filter(
      (u) => !usersWithVendorDoc.has(u._id.toString())
    );

    let profilesCreated = 0;
    for (const u of usersWithoutProfile) {
      try {
        const { getOrCreateVendorProfile } = await import("../utils/vendorHelpers");
        await getOrCreateVendorProfile(u._id);
        profilesCreated++;
      } catch (e: any) {
        console.error(`Failed to create vendor profile for user ${u._id}:`, e.message);
      }
    }

    // 3. Re-activate soft-deleted vendors whose user role is still 'vendor'
    const deletedVendors = await Vendor.find({ isDeleted: true }).lean();
    const deletedVendorUserIds = deletedVendors.map((v) => v.userId).filter(Boolean);
    const vendorRoleUsers = await User.find({
      _id: { $in: deletedVendorUserIds },
      role: "vendor",
    }, { _id: 1 }).lean();
    const vendorRoleUserIdSet = new Set(vendorRoleUsers.map((u) => u._id.toString()));

    const toReactivate = deletedVendors
      .filter((v) => v.userId && vendorRoleUserIdSet.has(v.userId.toString()))
      .map((v) => v._id);

    let reactivated = 0;
    if (toReactivate.length > 0) {
      const result = await Vendor.updateMany(
        { _id: { $in: toReactivate } },
        { $set: { isDeleted: false, deletedAt: undefined, isActive: true } }
      );
      reactivated = result.modifiedCount;
    }

    res.status(200).json({
      success: true,
      message: "Vendor-User data sync complete",
      data: {
        orphanVendorsMarkedDeleted: orphansFixed,
        vendorProfilesCreated: profilesCreated,
        softDeletedVendorsReactivated: reactivated,
      },
    });
  } catch (error) {
    next(error);
  }
};

