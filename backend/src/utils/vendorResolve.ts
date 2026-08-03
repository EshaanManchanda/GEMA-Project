import { AuthRequest } from "../types/index";
import Vendor from "../models/Vendor";

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
