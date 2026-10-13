import { AuthRequest } from "../types/index";
import Vendor from "../models/Vendor";
import Employee from "../models/Employee";

/**
 * Resolve vendor profile _id from the logged-in user.
 * Events store event.vendorId = Vendor._id (not User._id).
 *
 * Extracted from routes/analytics.routes.ts so it can be reused by other
 * report/insights routes without duplicating the User -> Vendor lookup.
 */
export async function resolveVendorId(
  req: AuthRequest,
): Promise<string | undefined> {
  if (req.user?.role !== "vendor") return undefined;
  const userId = req.user._id || req.user.id;
  const profile = await Vendor.findOne({ userId }).select("_id").lean();
  return profile?._id?.toString();
}

/**
 * Which vendor's data a staff user may touch:
 *   null      → admin, any vendor
 *   string    → vendor (own profile) or employee (their employer)
 *   undefined → nobody (other roles, or no vendor/employee record)
 */
export async function resolveStaffVendorId(
  req: AuthRequest,
): Promise<string | null | undefined> {
  const role = req.user?.role;
  if (role === "admin") return null;
  if (role === "vendor") return resolveVendorId(req);
  if (role === "employee") {
    const employee = await Employee.findOne({ userId: req.user!._id || req.user!.id })
      .select("vendorId")
      .lean();
    return employee?.vendorId?.toString();
  }
  return undefined;
}

/** True when the logged-in admin/vendor/employee may act on data owned by `vendorId` (a Vendor._id). */
export async function canStaffAccessVendor(
  req: AuthRequest,
  vendorId: unknown,
): Promise<boolean> {
  const mine = await resolveStaffVendorId(req);
  if (mine === null) return true;
  const target = (vendorId as { _id?: unknown } | null)?._id ?? vendorId;
  return !!mine && !!target && String(target) === mine;
}
