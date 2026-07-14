import { Router } from "express";
import {
  authenticate,
  authorize,
  validate,
  adminLimiter,
} from "../middleware/index";
import { UserRole } from "../models/index";
import {
  createPackage,
  listVendorPackages,
  getPackage,
  updatePackage,
  cancelPackage,
  grantFeatureFromPackage,
  cancelUsage,
  consumeBlogSlot,
} from "../controllers/admin.servicePackage.controller";
import { validateMongoId } from "../validators/common.validator";

const router = Router();

// Middleware: All routes require authentication and admin role
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));
router.use(adminLimiter);

/**
 * @route   POST /api/admin/service-packages
 * @desc    Create a vendor service package (offline-sold marketing bundle)
 * @access  Admin only
 * @body    { vendorId, name, price, currency?, paymentStatus?, source?, paymentReference?, items[], startDate?, endDate, adminNotes?, vendorNotes? }
 */
router.post("/", createPackage);

/**
 * @route   GET /api/admin/service-packages?vendorId=
 * @desc    List packages, optionally filtered by vendor
 * @access  Admin only
 */
router.get("/", listVendorPackages);

/**
 * @route   POST /api/admin/service-packages/grant-feature
 * @desc    Feature a vendor's event from an active package — no Stripe charge
 * @access  Admin only
 * @body    { packageId, eventId, tier, extend?: boolean }
 */
router.post("/grant-feature", grantFeatureFromPackage);

/**
 * @route   POST /api/admin/service-packages/cancel-usage
 * @desc    Cancel a granted usage (e.g. featured the wrong event); restores the slot
 * @access  Admin only
 * @body    { usageId, restoreEvent?: boolean }
 */
router.post("/cancel-usage", cancelUsage);

/**
 * @route   POST /api/admin/service-packages/consume-blog
 * @desc    Explicitly consume a blog_post slot for a blog already attributed to the vendor
 * @access  Admin only
 * @body    { packageId, blogId }
 */
router.post("/consume-blog", consumeBlogSlot);

/**
 * @route   GET /api/admin/service-packages/:id
 * @desc    Get a single package with its usage ledger
 * @access  Admin only
 */
router.get("/:id", validateMongoId("id", "param"), validate, getPackage);

/**
 * @route   PUT /api/admin/service-packages/:id
 * @desc    Update package metadata (not items[].used — ledger-derived)
 * @access  Admin only
 */
router.put("/:id", validateMongoId("id", "param"), validate, updatePackage);

/**
 * @route   DELETE /api/admin/service-packages/:id
 * @desc    Cancel a package (blocks further grants; leaves already-granted features live)
 * @access  Admin only
 */
router.delete("/:id", validateMongoId("id", "param"), validate, cancelPackage);

export default router;
