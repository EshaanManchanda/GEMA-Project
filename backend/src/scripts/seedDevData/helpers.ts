import crypto from "crypto";
import { Model, Types } from "mongoose";
import User from "../../models/User";
import Event from "../../models/Event";
import Order from "../../models/Order";
import Vendor from "../../models/Vendor";

export type Batch = { label: string; model: Model<any>; docs: any[] & { _id?: any }[] };
export type Section = (ctx: Ctx) => Promise<Batch[]>;

/** Deterministic ObjectId so re-runs replace exactly the mock rows. */
export const mockId = (ns: string, i: number) =>
  new Types.ObjectId(crypto.createHash("md5").update(`kidrove-mock:${ns}:${i}`).digest("hex").slice(0, 24));

/** Tiny seeded PRNG so mock data is stable between runs. */
let s = 42;
export const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
export const pick = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
export const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
export const chance = (p: number) => rnd() < p;
export const daysAgo = (n: number, hour = 10) => {
  const d = new Date(); d.setUTCDate(d.getUTCDate() - n); d.setUTCHours(hour, int(0, 59), 0, 0); return d;
};
/** n rows, each built from (index) with a deterministic _id. */
export const make = <T>(ns: string, n: number, build: (i: number) => T) =>
  Array.from({ length: n }, (_, i) => ({ _id: mockId(ns, i), ...build(i) }));

export const FIRST = ["Aisha", "Omar", "Layla", "Yusuf", "Noor", "Khalid", "Mariam", "Zayed", "Fatima", "Hamdan", "Sara", "Rashid", "Dana", "Ali", "Hessa", "Tariq"];
export const LAST = ["Al Mansoori", "Khan", "Hassan", "Al Nahyan", "Patel", "Ibrahim", "Al Suwaidi", "Rahman", "Farouk", "Nair", "Al Ketbi", "Siddiqui"];
export const EMIRATES = ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"] as const;
export const SCHOOLS = ["Gems Modern Academy", "Dubai British School", "Al Ain American School", "Sharjah English School", "Emirates National School", "Jumeirah Primary"];
export const fullName = () => `${pick(FIRST)} ${pick(LAST)}`;
export const emailOf = (name: string, i: number) => `${name.toLowerCase().replace(/[^a-z]+/g, ".")}.${i}@example.com`;
export const phone = () => `+9715${int(0, 9)}${int(1000000, 9999999)}`;

/** Existing local data (from `npm run db:seed`) that mock rows link to. */
export class Ctx {
  constructor(
    public users: any[],
    public events: any[],
    public orders: any[],
    public vendors: any[],
  ) {}

  static async load() {
    const [users, events, orders, vendors] = await Promise.all([
      User.find().select("_id role email firstName lastName").limit(200).lean(),
      Event.find().select("_id title vendorId price").limit(200).lean(),
      Order.find().select("_id userId totalAmount").limit(200).lean(),
      Vendor.find().select("_id userId").limit(50).lean(),
    ]);
    if (!users.length || !events.length) console.warn("No users/events found - run `npm run db:seed` first; linked sections will be empty.");
    return new Ctx(users, events, orders, vendors);
  }
  byRole = (role: string) => this.users.filter((u) => u.role === role);
}
