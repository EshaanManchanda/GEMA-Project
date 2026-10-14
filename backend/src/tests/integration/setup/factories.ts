/**
 * Small shared fixtures for integration tests. Raw collection inserts so model
 * validation doesn't get in the way — only ownership fields matter.
 */
import { Application } from "express";
import { Types } from "mongoose";
import User from "../../../models/User";
import Teacher from "../../../models/Teacher";
import Order from "../../../models/Order";
import { signUp, Session } from "./session";

export type AnyRole = "customer" | "vendor" | "teacher" | "employee" | "parent" | "student";

/** Sign up and log in as any non-admin role (non-public roles are set directly in the DB). */
export async function signUpAs(app: Application, role: AnyRole): Promise<Session> {
  const s = await signUp(app, role === "vendor" ? "vendor" : "customer");
  if (role !== "vendor" && role !== "customer") await User.updateOne({ _id: s.userId }, { role });
  return s;
}

export const teacherIdOf = async (s: Session) => {
  const existing = await Teacher.findOne({ userId: s.userId }).select("_id").lean();
  if (existing) return String(existing._id);
  const _id = new Types.ObjectId();
  await Teacher.collection.insertOne({ _id, userId: new Types.ObjectId(s.userId) });
  return String(_id);
};

export async function insertOrder(userId: string, eventId: string, extra: Record<string, unknown> = {}) {
  const _id = new Types.ObjectId();
  await Order.collection.insertOne({
    _id,
    orderNumber: `GM-${_id}`,
    userId: new Types.ObjectId(userId),
    items: [{ eventId: new Types.ObjectId(eventId), eventTitle: "Owned Event", quantity: 1, unitPrice: 50, totalPrice: 50, currency: "AED", scheduleDate: new Date(Date.now() + 864e6) }],
    billingAddress: { firstName: "T", lastName: "U", email: "billing@example.com", phone: "+971500000000", country: "AE" },
    subtotal: 50,
    total: 50,
    status: "confirmed",
    paymentStatus: "paid",
    createdAt: new Date(),
    ...extra,
  });
  return String(_id);
}
