import { Order } from "../models/index";
import TeacherBooking from "../models/TeacherBooking";
import { AppError } from "../middleware/index";

/**
 * A permanent delete must not orphan orders, tickets or teacher bookings
 * (customers' tickets and vendor payouts point at the event). Returns the
 * error to send, or null when the event has never been booked.
 */
export async function permanentDeleteBlocker(eventId: unknown): Promise<AppError | null> {
  const booked =
    (await Order.exists({ "items.eventId": eventId })) ||
    (await TeacherBooking.exists({ teachingEventId: eventId }));
  return booked
    ? new AppError("This event has bookings, so it can only be archived, not permanently deleted", 409)
    : null;
}
