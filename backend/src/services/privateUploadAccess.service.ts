import Certificate from "../models/Certificate";
import Event from "../models/Event";
import Booking from "../models/Booking";
import { AuthRequest } from "../types/index";
import { canViewCertificate } from "../utils/certificateAccess";
import { canStaffAccessVendor } from "../utils/vendorResolve";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whether the signed-in user may fetch a private local upload (`rel` is the path under the upload
 * folder). Admin: always. Certificates: whoever may view the certificate record that points at the
 * file. Booking attachments: staff of the event's vendor, or a user with a confirmed booking for
 * that event. Every other private folder has no owning record, so only admins (or a signed link).
 *
 * The record is found by the url's tail because stored urls carry the base url of the day they were
 * issued. ponytail: unindexed regex lookups; fine for the few legacy local files, and the route is
 * behind authentication, so index or exact-match if this ever serves volume.
 */
export async function userMayReadPrivateUpload(
  req: AuthRequest,
  rel: string,
): Promise<boolean> {
  const user = req.user;
  if (!user) return false;
  if (user.role === "admin") return true;

  const tail = new RegExp(`${escapeRegExp(`/api/uploads/files/${rel}`)}$`);
  switch (rel.split("/")[0].toLowerCase()) {
    case "certificates": {
      const cert = await Certificate.findOne({ pdfUrl: tail })
        .select("userId eventId recipient")
        .lean();
      return !!cert && canViewCertificate(req, cert);
    }
    case "booking-attachments": {
      const event = await Event.findOne({ "bookingAttachments.url": tail })
        .select("vendorId")
        .lean();
      if (!event) return false;
      if (
        ["vendor", "employee"].includes(user.role) &&
        (await canStaffAccessVendor(req, event.vendorId))
      )
        return true;
      return !!(await Booking.exists({
        eventId: event._id,
        userId: user._id,
        status: "confirmed",
      }));
    }
    default:
      return false;
  }
}
