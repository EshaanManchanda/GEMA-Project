/**
 * Shared login/fixture helpers for integration tests that hit the full testApp.
 * Test files still declare their own jest.mock blocks (mocks are per-file).
 */
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import User, { UserStatus } from "../../../models/User";
import Vendor from "../../../models/Vendor";
import Event from "../../../models/Event";

export type Session = { accessToken: string; csrfToken: string; userId: string };

export const uniqueEmail = (label: string) =>
  `${label}.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;

export const cookie = (s: Session) => `accessToken=${s.accessToken}; XSRF-TOKEN=${s.csrfToken}`;

export const extractCookie = (cookies: string[], name: string) => {
  const c = cookies.find((h) => h.startsWith(`${name}=`));
  return c ? c.split(";")[0].replace(`${name}=`, "") : "";
};

export async function login(app: Application, email: string, password: string, userId: string): Promise<Session> {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  const cookies: string[] = (res.headers["set-cookie"] as unknown as string[]) || [];
  return { accessToken: extractCookie(cookies, "accessToken"), csrfToken: extractCookie(cookies, "XSRF-TOKEN"), userId };
}

export async function signUp(app: Application, role: "vendor" | "customer") {
  const payload = { firstName: "T", lastName: "U", email: uniqueEmail(role), password: "Test@1234!", role };
  const reg = await request(app).post("/api/auth/register").send(payload);
  await User.findOneAndUpdate({ email: payload.email }, { isEmailVerified: true, status: UserStatus.ACTIVE });
  return login(app, payload.email, payload.password, reg.body.data.user.id);
}

export async function signUpAdmin(app: Application) {
  const payload = { firstName: "T", lastName: "A", email: uniqueEmail("admin"), password: "Test@1234!", adminSecretKey: process.env.ADMIN_SECRET_KEY };
  await request(app).post("/api/auth/register-admin").send(payload);
  const user = await User.findOne({ email: payload.email }).select("_id").lean();
  return login(app, payload.email, payload.password, String(user!._id));
}

export const vendorIdOf = async (s: Session) => String((await Vendor.findOne({ userId: s.userId }).select("_id").lean())!._id);

export async function insertEvent(vendorId: string, extra: Record<string, unknown> = {}) {
  const _id = new Types.ObjectId();
  await Event.collection.insertOne({
    _id,
    title: "Owned Event",
    slug: `owned-${_id}`,
    type: "Event",
    vendorId: new Types.ObjectId(vendorId),
    status: "published",
    isApproved: true,
    claimStatus: "not_claimable",
    ...extra,
  });
  return String(_id);
}

