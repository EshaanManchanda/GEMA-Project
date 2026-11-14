import Event from "../models/Event";
import { AuthRequest } from "../types/index";
import { canStaffAccessVendor } from "./vendorResolve";

/** Admin, the certificate's recipient, or staff of the vendor that owns its event. */
export async function canViewCertificate(
  req: AuthRequest,
  cert: { userId?: unknown; eventId?: unknown; recipient?: { email?: string } },
): Promise<boolean> {
  const user = req.user;
  if (!user) return false;
  if (user.role === "admin") return true;
  const owner = (cert.userId as { _id?: unknown } | null)?._id ?? cert.userId;
  if (owner && String(owner) === String(user._id)) return true;
  if (
    cert.recipient?.email &&
    user.email &&
    cert.recipient.email.toLowerCase() === String(user.email).toLowerCase()
  )
    return true;
  if (!["vendor", "employee"].includes(user.role)) return false;
  const eventId =
    (cert.eventId as { _id?: unknown } | null)?._id ?? cert.eventId;
  const event = await Event.findById(eventId).select("vendorId").lean();
  return !!event && (await canStaffAccessVendor(req, event.vendorId));
}
