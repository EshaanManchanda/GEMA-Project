/**
 * backfillCompetitionOrders.ts
 *
 * One-time migration: creates Order documents for all competition submissions
 * that have paymentStatus === "paid" but no corresponding Order record.
 *
 * HOW TO RUN ON YOUR SERVER:
 *   1. Pull latest code from GitHub
 *   2. cd backend
 *   3. NODE_OPTIONS=--max-old-space-size=4096 npm run build
 *   4. 
 *    ← NEW STEP
 *   5. pm2 restart all
 *
 * The script is 100% idempotent — safe to run multiple times. It will
 * never double-create an order for the same payment.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load .env from backend root directory (3 levels up from dist/scripts/migrations/)
dotenv.config({ path: path.resolve(__dirname, "../../..", ".env") });

import { connectDB } from "../../config/database";
import CompetitionSubmission from "../../models/CompetitionSubmission";
import NationalDaySubmission from "../../models/NationalDaySubmission";
import GCCSubmission from "../../models/GCCSubmission";
import ReelSubmission from "../../models/ReelSubmission";
import { createCompetitionOrder } from "../../utils/competitionOrder.utils";

interface BackfillResult {
  collection: string;
  total: number;
  created: number;
  skipped: number;
  errors: number;
}

async function backfillCollection(
  collection: "ai-art" | "national-day" | "gcc" | "reel"
): Promise<BackfillResult> {
  let Model: any;
  let competitionKey: string;
  let competitionTitle: string;
  let txnPrefix: string;
  let defaultAmountAED: number;

  switch (collection) {
    case "ai-art":
      Model = CompetitionSubmission;
      competitionKey = "ai-art";
      competitionTitle = "KidRove AI Art Competition 2026 — Entry Fee";
      txnPrefix = ""; // AI Art uses real Stripe checkout session IDs (cs_...)
      defaultAmountAED = 50;
      break;
    case "national-day":
      Model = NationalDaySubmission;
      competitionKey = "national-day";
      competitionTitle = "Kidrove Eid Al Etihad Children's Art Competition 2026 — Entry Fee";
      txnPrefix = ""; // National Day uses real Stripe checkout session IDs
      defaultAmountAED = 50;
      break;
    case "gcc":
      Model = GCCSubmission;
      competitionKey = "gcc-competition";
      competitionTitle = "Young Voices of the GCC 2027 — Entry Fee";
      txnPrefix = "gcc-"; // GCC has no Stripe session, use prefixed submission ID
      defaultAmountAED = 50;
      break;
    case "reel":
      Model = ReelSubmission;
      competitionKey = "reel-challenge";
      competitionTitle = "KIDROVE GCC Through My Lens — Reel Challenge 2027 — Entry Fee";
      txnPrefix = "reel-"; // Reel has no Stripe session, use prefixed submission ID
      defaultAmountAED = 50;
      break;
  }

  const submissions = await Model.find({ paymentStatus: "paid" }).lean();

  console.log(`   Found ${submissions.length} paid submission(s) for ${collection}`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const sub of submissions) {
    try {
      // Build the same transactionId that the live controller uses
      const txnId = txnPrefix
        ? `${txnPrefix}${sub._id.toString()}`
        : sub.checkoutSessionId || `${collection}-${sub._id.toString()}`;

      const result = await createCompetitionOrder({
        competitionKey,
        competitionTitle,
        submissionId: sub._id,
        transactionId: txnId,
        amountAED: (sub as any).paymentAmount || defaultAmountAED,
        parentEmail: sub.participant.parentEmail,
        parentName: sub.participant.parentName,
        parentPhone: sub.participant.parentPhone,
        studentName: sub.participant.studentFullName,
        ipAddress: sub.metadata?.ipAddress,
      });

      if (result) {
        created++;
        console.log(
          `   ✅ Created order ${(result as any).orderNumber} — ${sub.participant.parentEmail} — ${sub.participant.studentFullName}`
        );
      } else {
        skipped++;
        console.log(
          `   ⏭  Skipped (already exists or user not found) — ${sub.participant.parentEmail}`
        );
      }
    } catch (err: any) {
      errors++;
      console.error(
        `   ❌ Error for submission ${sub._id} (${sub.participant?.parentEmail}):`,
        err.message
      );
    }
  }

  return { collection, total: submissions.length, created, skipped, errors };
}

async function run(): Promise<void> {
  console.log("\n========================================");
  console.log("  Competition Orders Backfill Migration  ");
  console.log("========================================\n");

  // Connect to MongoDB using the same function your app uses
  await connectDB();
  console.log("✅ Database connected\n");

  const results: BackfillResult[] = [];

  for (const col of ["ai-art", "national-day", "gcc", "reel"] as const) {
    console.log(`\n── ${col.toUpperCase()} ──────────────────────────────────`);
    const result = await backfillCollection(col);
    results.push(result);
  }

  console.log("\n\n════════════════ SUMMARY ════════════════");
  let grandTotal = 0;
  let grandCreated = 0;
  for (const r of results) {
    console.log(
      `  ${r.collection.padEnd(14)} | total: ${r.total} | created: ${r.created} | skipped: ${r.skipped} | errors: ${r.errors}`
    );
    grandTotal += r.total;
    grandCreated += r.created;
  }
  console.log("─────────────────────────────────────────");
  console.log(`  TOTAL          | total: ${grandTotal} | created: ${grandCreated}`);
  console.log("\n✅ Backfill complete!\n");

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("\n❌ Migration failed:", err);
  process.exit(1);
});
