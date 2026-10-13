/**
 * READ-ONLY pre-deploy check for production. Writes nothing to the DB or Stripe.
 *
 *   npm run check:predeploy       (or: node dist/scripts/preDeployCheck.js)
 *
 * 1. Staff accounts still using a seed password  → change them before launch.
 * 2. vendorId values that aren't Vendor._id        → the ownership checks would
 *    lock those vendors out of their own events; run migrateEventVendorIds first.
 * 3. Orders paid in Stripe but not marked paid     → customers charged without a
 *    booking; reconcile/refund by hand.
 *
 * Exit code 1 when anything needs attention.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "../config/index";
import { stripe } from "../config/stripe";
import User from "../models/User";
import Vendor from "../models/Vendor";
import { Event, Ticket, Employee, Order } from "../models/index";

const SEED_PASSWORDS = ["admin123", "vendor123", "customer123", "password123"];
const STAFF_ROLES = ["admin", "vendor", "employee", "teacher"];

async function seedPasswordAccounts(): Promise<string[]> {
  const staff = await User.find({ role: { $in: STAFF_ROLES } })
    .select("+passwordHash email role")
    .lean();
  const hits: string[] = [];
  for (const u of staff as any[]) {
    if (!u.passwordHash) continue;
    for (const pw of SEED_PASSWORDS) {
      if (await bcrypt.compare(pw, u.passwordHash)) {
        hits.push(`${u.role} ${u.email}`);
        break;
      }
    }
  }
  return hits;
}

async function badVendorIds(): Promise<Record<string, number>> {
  const vendorIds = await Vendor.distinct("_id");
  const notAVendor = { vendorId: { $exists: true, $ne: null, $nin: vendorIds } };
  return {
    events: await Event.countDocuments(notAVendor),
    tickets: await Ticket.countDocuments(notAVendor),
    employees: await Employee.countDocuments(notAVendor),
  };
}

async function paidButNotMarked(): Promise<string[]> {
  const orders = await Order.find({
    paymentStatus: { $nin: ["paid", "refunded", "free"] },
    paymentIntentId: /^pi_/,
  })
    .select("orderNumber status paymentStatus paymentIntentId total currency createdAt")
    .lean();
  const hits: string[] = [];
  for (const o of orders as any[]) {
    try {
      const pi = await stripe.paymentIntents.retrieve(o.paymentIntentId);
      if (pi.status === "succeeded") {
        hits.push(
          `${o.orderNumber} (${o.status}/${o.paymentStatus}) ${o.currency} ${o.total} ${o.paymentIntentId} ${new Date(o.createdAt).toISOString()}`,
        );
      }
    } catch (err: any) {
      if (err?.code !== "resource_missing") hits.push(`${o.orderNumber}: Stripe lookup failed (${err?.message})`);
    }
  }
  return hits;
}

async function main() {
  await mongoose.connect(config.mongodbUri);
  let problems = 0;

  const orderSummary = await Order.aggregate([
    { $group: { _id: { status: "$status", paymentStatus: "$paymentStatus" }, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]);
  console.log("\nOrders by status/paymentStatus:");
  for (const r of orderSummary) console.log(`  ${r._id.status}/${r._id.paymentStatus}: ${r.n}`);

  const seeds = await seedPasswordAccounts();
  console.log(`\n[1] Staff accounts using a seed password: ${seeds.length}`);
  seeds.forEach((s) => console.log(`  - ${s}`));
  problems += seeds.length;

  const bad = await badVendorIds();
  const badTotal = bad.events + bad.tickets + bad.employees;
  console.log(`\n[2] vendorId not pointing at a Vendor profile: ${JSON.stringify(bad)}`);
  if (badTotal) console.log("  → run src/scripts/migrateEventVendorIds.ts (after a mongodump) before deploying");
  problems += badTotal;

  const lost = await paidButNotMarked();
  console.log(`\n[3] Orders paid in Stripe but not marked paid: ${lost.length}`);
  lost.forEach((s) => console.log(`  - ${s}`));
  problems += lost.length;

  console.log(problems ? `\nNEEDS ATTENTION (${problems})` : "\nAll checks passed");
  await mongoose.disconnect();
  process.exit(problems ? 1 : 0);
}

main().catch(async (err) => {
  console.error("preDeployCheck failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(2);
});
