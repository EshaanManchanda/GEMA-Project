/**
 * Self-service privacy requests: a copy of the user's own data, and account
 * deletion by anonymisation. Orders are kept (financial records the platform
 * must retain), but no longer point to a person who can be identified.
 */
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import User, { UserRole, UserStatus } from "../models/User";
import { Order, Ticket } from "../models/index";
import Review from "../models/Review";
import RefreshToken from "../models/RefreshToken";
import UserPushSubscription from "../models/UserPushSubscription";
import { AppError } from "../middleware/error";
import { generateTempPassword } from "../utils/otp";

/** Roles whose accounts hold no listings, payouts or staff duties. */
const SELF_DELETABLE = [UserRole.CUSTOMER, UserRole.PARENT, UserRole.STUDENT];

export async function exportUserData(userId: string) {
  const [user, orders, tickets, reviews] = await Promise.all([
    User.findById(userId)
      .select("firstName lastName email phone role gender dateOfBirth addresses favoriteEvents acquisition createdAt")
      .lean(),
    Order.find({ userId }).select("orderNumber items.eventId items.quantity total currency status paymentStatus billingAddress createdAt").lean(),
    Ticket.find({ userId }).select("ticketNumber eventId attendeeName attendeeEmail status createdAt").lean(),
    Review.find({ user: userId }).select("type targetId rating title comment createdAt").lean(),
  ]);
  if (!user) throw new AppError("User not found", 404);
  return { exportedAt: new Date().toISOString(), profile: user, orders, tickets, reviews };
}

/**
 * Anonymise the account and end every session. `password` is required for
 * accounts that have one; Google-only accounts confirm by typing DELETE.
 */
export async function deleteOwnAccount(userId: string, opts: { password?: string; confirm?: string }) {
  const user = await User.findById(userId).select("+passwordHash role email firebaseUid socialLogins");
  if (!user) throw new AppError("User not found", 404);
  if (!SELF_DELETABLE.includes(user.role)) {
    throw new AppError("Accounts with listings, payouts or staff access are closed by support. Please contact us.", 409);
  }
  const hasPassword = !user.firebaseUid && !user.socialLogins?.length;
  const confirmed = hasPassword
    ? !!opts.password && (await user.comparePassword(opts.password))
    : opts.confirm === "DELETE";
  if (!confirmed) {
    throw new AppError(hasPassword ? "Password is incorrect" : 'Type DELETE to confirm', 400);
  }

  const id = new Types.ObjectId(userId);
  const anonEmail = `deleted-${userId}@deleted.invalid`;
  await Promise.all([
    // updateOne skips schema validators (phone/address rules) on purpose: the record is being emptied
    User.updateOne(
      { _id: id },
      {
        $set: {
          firstName: "Deleted",
          lastName: "User",
          email: anonEmail,
          status: UserStatus.INACTIVE,
          isEmailVerified: false,
          passwordHash: await bcrypt.hash(generateTempPassword(), 10), // a password nobody knows
        },
        $unset: { phone: 1, avatar: 1, addresses: 1, dateOfBirth: 1, gender: 1, firebaseUid: 1, socialLogins: 1, favoriteEvents: 1, acquisition: 1 },
      },
    ),
    RefreshToken.updateMany({ user: id }, { isRevoked: true }),
    UserPushSubscription.deleteMany({ userId: id }),
    Ticket.updateMany({ userId: id }, { $set: { attendeeName: "Deleted User", attendeeEmail: anonEmail } }),
    Order.updateMany(
      { userId: id },
      { $set: { "billingAddress.firstName": "Deleted", "billingAddress.lastName": "User", "billingAddress.email": anonEmail, "billingAddress.phone": "0000000" } },
    ),
  ]);
}
