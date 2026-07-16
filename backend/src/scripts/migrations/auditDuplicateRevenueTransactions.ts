import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import RevenueTransaction from "../../models/RevenueTransaction";
import CommissionTransaction from "../../models/CommissionTransaction";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

/**
 * One-time migration: find and void duplicate RevenueTransaction /
 * CommissionTransaction documents that share the same orderId.
 *
 * MUST be run before the orderId partial-unique index takes effect on either
 * model — the index excludes settlementVoid:true docs by design, but any
 * NEW duplicate created before this script runs would still collide.
 *
 * For each duplicate group (same orderId, >1 doc):
 *   - Keep the earliest document (by createdAt) as the source of truth.
 *   - The rest get `status: "cancelled"` AND `settlementVoid: true` (the
 *     partial unique index on orderId filters on settlementVoid, not status,
 *     because MongoDB partial index filters don't support $ne) plus
 *     `metadata.voidedReason: "duplicate_writer_migration"`, instead of being
 *     hard-deleted — preserving the audit trail.
 *
 * Also backfills `settlementVoid: false` onto any existing document that
 * predates this field (schema `default: false` only applies to new writes,
 * not documents already in the database) — required so the partial index's
 * `settlementVoid: false` filter actually covers all legitimate records.
 *
 * Usage (from backend/):
 *   npx ts-node src/scripts/migrations/auditDuplicateRevenueTransactions.ts          # dry run (default)
 *   npx ts-node src/scripts/migrations/auditDuplicateRevenueTransactions.ts --apply  # actually void duplicates + backfill
 */

const APPLY = process.argv.includes("--apply");

async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/gema";
  await mongoose.connect(mongoUri);
  console.log(`✅  Connected to MongoDB (${APPLY ? "APPLY" : "DRY RUN"} mode)`);
}

interface DupGroup {
  _id: mongoose.Types.ObjectId; // orderId
  count: number;
  docs: Array<{ _id: mongoose.Types.ObjectId; createdAt: Date }>;
}

async function auditModel(
  Model: mongoose.Model<any>,
  label: string,
): Promise<void> {
  console.log(`\n🔍  Scanning ${label} for duplicate orderId...`);

  const dupGroups: DupGroup[] = await Model.aggregate([
    { $match: { orderId: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: "$orderId",
        count: { $sum: 1 },
        docs: { $push: { _id: "$_id", createdAt: "$createdAt" } },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (dupGroups.length === 0) {
    console.log(`✅  No duplicates found in ${label}.`);
    return;
  }

  console.log(
    `⚠️  Found ${dupGroups.length} orderId(s) with duplicate ${label} records.`,
  );

  let voided = 0;
  for (const group of dupGroups) {
    const sorted = [...group.docs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const [keep, ...rest] = sorted;
    console.log(
      `  orderId=${group._id} — keeping ${keep._id} (earliest), voiding ${rest.length}`,
    );

    if (APPLY) {
      await Model.updateMany(
        { _id: { $in: rest.map((d) => d._id) } },
        {
          $set: {
            status: "cancelled",
            settlementVoid: true,
            "metadata.voidedReason": "duplicate_writer_migration",
            "metadata.voidedAt": new Date(),
            "metadata.supersededBy": keep._id,
          },
        },
      );
    }
    voided += rest.length;
  }

  console.log(
    `${APPLY ? "✅  Voided" : "ℹ️  Would void"} ${voided} duplicate ${label} record(s) across ${dupGroups.length} order(s).`,
  );
}

/**
 * Backfill settlementVoid: false onto documents that predate the field, so
 * the partial unique index's `settlementVoid: false` filter covers them.
 */
async function backfillSettlementVoidFlag(
  Model: mongoose.Model<any>,
  label: string,
): Promise<void> {
  console.log(`\n🔧  Backfilling settlementVoid on ${label}...`);
  if (!APPLY) {
    const count = await Model.countDocuments({
      settlementVoid: { $exists: false },
    });
    console.log(`ℹ️  Would backfill settlementVoid:false on ${count} ${label} record(s).`);
    return;
  }
  const result = await Model.updateMany(
    { settlementVoid: { $exists: false } },
    { $set: { settlementVoid: false } },
  );
  console.log(
    `✅  Backfilled settlementVoid:false on ${result.modifiedCount} ${label} record(s).`,
  );
}

async function main() {
  await connectDatabase();

  await auditModel(RevenueTransaction, "RevenueTransaction");
  await auditModel(CommissionTransaction, "CommissionTransaction");

  await backfillSettlementVoidFlag(RevenueTransaction, "RevenueTransaction");
  await backfillSettlementVoidFlag(CommissionTransaction, "CommissionTransaction");

  if (!APPLY) {
    console.log(
      "\nℹ️  Dry run complete. Re-run with --apply to void duplicates before adding unique indexes.",
    );
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error("❌  Audit script failed:", error);
  process.exit(1);
});
