import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AppError } from "../middleware/index";
import { AuthRequest } from "../types/index";
import VendorServicePackage, {
  IVendorServicePackage,
  IServicePackageItem,
  ServiceItemType,
  PackageStatus,
  PackagePaymentStatus,
  PackageSource,
} from "../models/VendorServicePackage";
import VendorServiceUsage from "../models/VendorServiceUsage";
import Vendor from "../models/Vendor";
import Event from "../models/Event";
import { Blog } from "../models/Blog";
import { PROMOTION_TIERS, PromotionTier } from "../config/promotionPricing";
import { invalidateEventCaches } from "../utils/cache.utils";
import logger from "../config/logger";

/**
 * Recompute a package's items[].used from the VendorServiceUsage ledger
 * (source of truth) and persist the derived cache + status.
 * Call this after every grant/cancel so the cache can never drift.
 */
async function recomputePackageUsage(
  pkg: IVendorServicePackage,
  session?: mongoose.ClientSession,
): Promise<void> {
  const activeUsage = await VendorServiceUsage.find({
    packageId: pkg._id,
    status: "active",
  }).session(session || null);

  const usedByType = new Map<ServiceItemType, number>();
  for (const row of activeUsage) {
    usedByType.set(
      row.itemType,
      (usedByType.get(row.itemType) || 0) + row.quantityUsed,
    );
  }

  // Distribute used counts across items of the same type in declaration order.
  const remainingByType = new Map(usedByType);
  for (const item of pkg.items) {
    const remaining = remainingByType.get(item.type) || 0;
    if (remaining <= 0) {
      item.used = 0;
      continue;
    }
    const consume = Math.min(remaining, item.quantity);
    item.used = consume;
    remainingByType.set(item.type, remaining - consume);
  }

  // Recompute stored status (cancelled is sticky and set elsewhere).
  if (pkg.status !== PackageStatus.CANCELLED) {
    const now = new Date();
    if (now > pkg.endDate) {
      pkg.status = PackageStatus.EXPIRED;
    } else {
      const countItems = pkg.items.filter((i) => i.unit === "count");
      const allUsed =
        countItems.length > 0 && countItems.every((i) => i.used >= i.quantity);
      pkg.status = allUsed ? PackageStatus.COMPLETED : PackageStatus.ACTIVE;
    }
  }

  await pkg.save({ session });
}

/**
 * Create a service package for a vendor
 * @route POST /api/admin/service-packages
 */
export const createPackage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      vendorId,
      name,
      description,
      price,
      currency,
      paymentStatus,
      source,
      paymentReference,
      items,
      startDate,
      endDate,
      adminNotes,
      vendorNotes,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return next(new AppError("Invalid vendor ID", 400));
    }
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return next(new AppError("Vendor not found", 404));
    }

    if (!Array.isArray(items) || items.length === 0) {
      return next(new AppError("Package must have at least one item", 400));
    }
    for (const item of items as IServicePackageItem[]) {
      if (!Object.values(ServiceItemType).includes(item.type)) {
        return next(new AppError(`Invalid item type: ${item.type}`, 400));
      }
      if (item.type === ServiceItemType.OTHER && !item.label?.trim()) {
        return next(
          new AppError("label is required when item type is 'other'", 400),
        );
      }
      if (!item.quantity || item.quantity < 1) {
        return next(new AppError("Each item quantity must be at least 1", 400));
      }
    }

    if (typeof price !== "number" || price < 0) {
      return next(new AppError("price must be a non-negative number", 400));
    }

    const start = startDate ? new Date(startDate) : new Date();
    if (!endDate) {
      return next(new AppError("endDate is required", 400));
    }
    const end = new Date(endDate);
    if (end <= start) {
      return next(new AppError("endDate must be after startDate", 400));
    }

    const pkg = await VendorServicePackage.create({
      vendorId,
      name,
      description,
      price,
      currency: currency || "AED",
      paymentStatus: paymentStatus || PackagePaymentStatus.PAID,
      source: source || PackageSource.OFFLINE_INVOICE,
      paymentReference,
      items,
      startDate: start,
      endDate: end,
      adminNotes,
      vendorNotes,
      createdBy: req.user?.id || req.user?._id,
    });

    res.status(201).json({ success: true, data: pkg });
  } catch (error) {
    next(error);
  }
};

/**
 * List packages for a vendor (admin)
 * @route GET /api/admin/service-packages?vendorId=
 */
export const listVendorPackages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { vendorId } = req.query;
    const query: Record<string, unknown> = {};
    if (vendorId) {
      if (!mongoose.Types.ObjectId.isValid(vendorId as string)) {
        return next(new AppError("Invalid vendor ID", 400));
      }
      query.vendorId = vendorId;
    }

    const packages = await VendorServicePackage.find(query)
      .sort({ createdAt: -1 })
      .populate("vendorId", "businessName email")
      .lean({ virtuals: true });

    res.status(200).json({ success: true, data: packages });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single package (admin)
 * @route GET /api/admin/service-packages/:id
 */
export const getPackage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const pkg = await VendorServicePackage.findById(req.params.id).populate(
      "vendorId",
      "businessName email",
    );
    if (!pkg) return next(new AppError("Package not found", 404));

    const usage = await VendorServiceUsage.find({
      packageId: pkg._id,
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: { package: pkg, usage } });
  } catch (error) {
    next(error);
  }
};

/**
 * Update package metadata (not items[].used — that's ledger-derived)
 * @route PUT /api/admin/service-packages/:id
 */
export const updatePackage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const pkg = await VendorServicePackage.findById(req.params.id);
    if (!pkg) return next(new AppError("Package not found", 404));
    if (pkg.status === PackageStatus.CANCELLED) {
      return next(new AppError("Cannot edit a cancelled package", 400));
    }

    const editable = [
      "name",
      "description",
      "price",
      "currency",
      "paymentStatus",
      "paymentReference",
      "endDate",
      "adminNotes",
      "vendorNotes",
    ] as const;

    for (const field of editable) {
      if (req.body[field] !== undefined) {
        (pkg as any)[field] = req.body[field];
      }
    }

    if (pkg.endDate <= pkg.startDate) {
      return next(new AppError("endDate must be after startDate", 400));
    }

    await recomputePackageUsage(pkg);

    res.status(200).json({ success: true, data: pkg });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a package. Already-granted features are left active until their
 * own featuredUntil (not retroactively unpublished) — cancellation only
 * blocks further grants from this package.
 * @route DELETE /api/admin/service-packages/:id
 */
export const cancelPackage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const pkg = await VendorServicePackage.findById(req.params.id);
    if (!pkg) return next(new AppError("Package not found", 404));

    pkg.status = PackageStatus.CANCELLED;
    if (req.body?.reason) {
      pkg.adminNotes = `${pkg.adminNotes || ""}\nCancelled: ${req.body.reason} (${new Date().toISOString()})`;
    }
    await pkg.save();

    res.status(200).json({ success: true, data: pkg });
  } catch (error) {
    next(error);
  }
};

/**
 * Grant an event feature (Boost/Featured/Premium) from a vendor's package,
 * with NO Stripe charge. Atomic: slot check + ledger insert + event update
 * all happen in a single transaction so two admins can't consume the same
 * last slot, and a failure anywhere rolls the whole thing back.
 * @route POST /api/admin/service-packages/grant-feature
 * @body { packageId, eventId, tier, extend?: boolean }
 */
export const grantFeatureFromPackage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { packageId, eventId, tier, extend } = req.body as {
    packageId: string;
    eventId: string;
    tier: PromotionTier;
    extend?: boolean;
  };

  if (
    !mongoose.Types.ObjectId.isValid(packageId) ||
    !mongoose.Types.ObjectId.isValid(eventId)
  ) {
    return next(new AppError("Invalid packageId or eventId", 400));
  }

  const tierConfig = PROMOTION_TIERS[tier];
  if (!tierConfig) {
    return next(new AppError("Invalid promotion tier", 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const pkg = await VendorServicePackage.findById(packageId).session(session);
    if (!pkg) {
      throw new AppError("Package not found", 404);
    }
    if (pkg.status === PackageStatus.CANCELLED) {
      throw new AppError("Package is cancelled", 400);
    }
    if (new Date() > pkg.endDate) {
      throw new AppError("Package has expired", 400);
    }

    const event = await Event.findById(eventId).session(session);
    if (!event || event.isDeleted) {
      throw new AppError("Event not found", 404);
    }
    if (event.vendorId?.toString() !== pkg.vendorId.toString()) {
      throw new AppError("Event does not belong to this package's vendor", 403);
    }
    if (!event.isApproved) {
      throw new AppError("Event must be approved before promotion", 400);
    }

    // Duplicate guard: don't silently burn a second slot on an event that
    // already has an active package-granted feature — require explicit extend.
    const existingActiveUsage = await VendorServiceUsage.findOne({
      refModel: "Event",
      refId: event._id,
      status: "active",
    }).session(session);

    if (existingActiveUsage && !extend) {
      throw new AppError(
        "This event already has an active package-granted feature. Pass extend:true to add to it.",
        409,
      );
    }

    // No-shorten rule: don't let a package grant shorten a longer existing
    // featuredUntil that came from a paid/admin_comp promotion.
    const now = new Date();
    const newFeaturedUntil = new Date(
      now.getTime() + tierConfig.days * 24 * 60 * 60 * 1000,
    );
    if (
      event.featuredUntil &&
      event.featuredUntil > newFeaturedUntil &&
      event.promotionSource !== "package"
    ) {
      throw new AppError(
        "Event already has a longer active promotion; grant would shorten it. Cancel/extend explicitly if intended.",
        409,
      );
    }

    let slotItem: IServicePackageItem | undefined;
    if (!extend || !existingActiveUsage) {
      slotItem = pkg.items.find(
        (i) => i.type === ServiceItemType.FEATURED_EVENT && i.used < i.quantity,
      );
      if (!slotItem) {
        throw new AppError("No featured-event slots remaining", 400);
      }
    }

    const oldFeaturedUntil = event.featuredUntil;

    event.promotionTier = tier;
    event.featuredUntil = newFeaturedUntil;
    event.promotionPaidAt = now;
    event.promotionSource = "package";
    event.isFeatured = true;
    await event.save({ session });

    if (extend && existingActiveUsage) {
      existingActiveUsage.endDate = newFeaturedUntil;
      existingActiveUsage.tier = tier;
      await existingActiveUsage.save({ session });
    } else {
      await VendorServiceUsage.create(
        [
          {
            vendorId: pkg.vendorId,
            packageId: pkg._id,
            itemType: ServiceItemType.FEATURED_EVENT,
            refModel: "Event",
            refId: event._id,
            quantityUsed: 1,
            tier,
            startDate: now,
            endDate: newFeaturedUntil,
            status: "active",
            usedBy: req.user?.id || req.user?._id,
          },
        ],
        { session },
      );
    }

    await recomputePackageUsage(pkg, session);

    await session.commitTransaction();

    await invalidateEventCaches(event._id.toString());

    logger.info("Vendor service package: feature granted", {
      adminId: req.user?.id || req.user?._id,
      vendorId: pkg.vendorId.toString(),
      eventId: event._id.toString(),
      packageId: pkg._id.toString(),
      tier,
      oldFeaturedUntil,
      newFeaturedUntil,
      source: "package",
    });

    res.status(200).json({
      success: true,
      message: `Event featured as ${tierConfig.label} until ${newFeaturedUntil.toLocaleDateString()} (from package, no charge)`,
      data: { promotionTier: tier, featuredUntil: newFeaturedUntil },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Cancel a granted usage — e.g. admin featured the wrong event. Optionally
 * strips the feature from the event and always restores the package slot
 * (via recomputePackageUsage, since it only counts `active` ledger rows).
 * @route POST /api/admin/service-packages/cancel-usage
 * @body { usageId, restoreEvent?: boolean }
 */
export const cancelUsage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { usageId, restoreEvent } = req.body as {
      usageId: string;
      restoreEvent?: boolean;
    };

    if (!mongoose.Types.ObjectId.isValid(usageId)) {
      return next(new AppError("Invalid usage ID", 400));
    }

    const usage = await VendorServiceUsage.findById(usageId);
    if (!usage) return next(new AppError("Usage record not found", 404));
    if (usage.status === "cancelled") {
      return next(new AppError("Usage already cancelled", 400));
    }

    usage.status = "cancelled";
    usage.cancelledBy = req.user?.id || req.user?._id;
    usage.cancelledAt = new Date();
    await usage.save();

    if (
      restoreEvent &&
      usage.refModel === "Event" &&
      usage.refId &&
      usage.itemType === ServiceItemType.FEATURED_EVENT
    ) {
      const event = await Event.findById(usage.refId);
      if (event && event.promotionSource === "package") {
        event.isFeatured = false;
        event.featuredUntil = undefined;
        event.promotionTier = undefined;
        event.promotionSource = undefined;
        await event.save();
        await invalidateEventCaches(event._id.toString());
      }
    }

    const pkg = await VendorServicePackage.findById(usage.packageId);
    if (pkg) {
      await recomputePackageUsage(pkg);
    }

    res.status(200).json({ success: true, data: usage });
  } catch (error) {
    next(error);
  }
};

/**
 * Explicitly consume a blog_post slot for a blog already attributed to the
 * vendor. Setting Blog.vendorId alone (attribution) never burns credit —
 * this is a separate deliberate action so old/manual attribution can't
 * accidentally consume a package slot.
 * @route POST /api/admin/service-packages/consume-blog
 * @body { packageId, blogId }
 */
export const consumeBlogSlot = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { packageId, blogId } = req.body as {
      packageId: string;
      blogId: string;
    };

    if (
      !mongoose.Types.ObjectId.isValid(packageId) ||
      !mongoose.Types.ObjectId.isValid(blogId)
    ) {
      return next(new AppError("Invalid packageId or blogId", 400));
    }

    const pkg = await VendorServicePackage.findById(packageId);
    if (!pkg) return next(new AppError("Package not found", 404));
    if (pkg.status === PackageStatus.CANCELLED) {
      return next(new AppError("Package is cancelled", 400));
    }

    const blog = await Blog.findById(blogId);
    if (!blog) return next(new AppError("Blog not found", 404));
    if (blog.vendorId?.toString() !== pkg.vendorId.toString()) {
      return next(
        new AppError("Blog is not attributed to this package's vendor", 403),
      );
    }

    const existing = await VendorServiceUsage.findOne({
      refModel: "Blog",
      refId: blog._id,
      status: "active",
    });
    if (existing) {
      return next(
        new AppError("This blog has already consumed a package slot", 409),
      );
    }

    const slotItem = pkg.items.find(
      (i) => i.type === ServiceItemType.BLOG_POST && i.used < i.quantity,
    );
    if (!slotItem) {
      return next(new AppError("No blog-post slots remaining", 400));
    }

    await VendorServiceUsage.create({
      vendorId: pkg.vendorId,
      packageId: pkg._id,
      itemType: ServiceItemType.BLOG_POST,
      refModel: "Blog",
      refId: blog._id,
      quantityUsed: 1,
      status: "active",
      usedBy: req.user?.id || req.user?._id,
    });

    await recomputePackageUsage(pkg);

    res.status(200).json({ success: true, data: pkg });
  } catch (error) {
    next(error);
  }
};
