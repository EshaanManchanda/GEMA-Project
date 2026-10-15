/**
 * Small shared fixtures for integration tests. Raw collection inserts so model
 * validation doesn't get in the way — only ownership fields matter.
 */
import { Application } from "express";
import mongoose, { Types } from "mongoose";
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
  // email/fullName are required on save, as on real profiles (getOrCreateTeacherProfile).
  await Teacher.collection.insertOne({
    _id,
    userId: new Types.ObjectId(s.userId),
    email: `teacher.${_id}@example.com`,
    fullName: "Test Teacher",
  });
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

/** Fields that let a raw-inserted Event pass Mongoose validation on .save(). */
export const savableEventFields = {
  description: "Desc",
  shortDescription: "Short",
  category: "Arts",
  venueType: "Online",
  ageRange: [3, 12],
  price: 0,
  currency: "AED",
  isDeleted: false,
};

/** A bare MediaAsset row, for routes that track image usage. */
export async function insertMedia(extra: Record<string, unknown> = {}) {
  const _id = new Types.ObjectId();
  await mongoose.connection.collection("mediaassets").insertOne({
    _id,
    url: `https://res.cloudinary.com/test/${_id}.jpg`,
    provider: "cloudinary",
    usedBy: [],
    usageCount: 0,
    ...extra,
  });
  return String(_id);
}

/**
 * Create every model's collection up front. Services that write inside a
 * transaction otherwise create collections implicitly mid-transaction, which
 * the shared replica set intermittently rejects under parallel load (500).
 */
export const ensureCollections = () =>
  Promise.all(Object.values(mongoose.models).map((m) => m.createCollection().catch(() => undefined)));
