import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Migration Script: tax -> vat field rename
 *
 * Renames the pricing "tax" fields to "vat" on Order, CancellationLog, and
 * TeacherBooking, to match the code's Mongoose schema rename (see plan: VAT
 * rename + service-fee removal). Uses `$rename`, which is atomic per
 * document — no dual-read window, one-shot inside a deploy/maintenance
 * window with backend + frontend deployed together.
 *
 * Does NOT touch vendor KYC fields (Vendor.taxInformation, taxId,
 * taxCertificate, vatNumber, registrationNumber) — those are legal document
 * identifiers, unrelated to this rename, and are never referenced here.
 *
 * IMPORTANT: take a `mongodump` of `orders`, `cancellationlogs`, and
 * `teacherbookings`, and verify it restores cleanly into a scratch DB,
 * BEFORE running this against production. See the plan's Phase 3 backup
 * gate.
 *
 * Usage:
 *   npm run migrate:tax-to-vat -- --dry-run   # report counts, no writes
 *   npm run migrate:tax-to-vat                # perform the rename
 */

interface CollectionRenameSpec {
  collectionName: string;
  rename: Record<string, string>;
}

const RENAMES: CollectionRenameSpec[] = [
  { collectionName: "orders", rename: { tax: "vat", taxRate: "vatRate" } },
  { collectionName: "cancellationlogs", rename: { tax: "vat" } },
  { collectionName: "teacherbookings", rename: { tax: "vat" } },
];

async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/gema";
  await mongoose.connect(mongoUri);
  console.log(`✓ Connected to MongoDB (${mongoUri})`);
}

async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log("✓ Disconnected from MongoDB");
}

async function countPendingRename(
  collection: mongoose.mongo.Collection,
  fieldNames: string[],
): Promise<number> {
  return collection.countDocuments({
    $or: fieldNames.map((field) => ({ [field]: { $exists: true } })),
  });
}

async function runRename(spec: CollectionRenameSpec, dryRun: boolean): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) throw new Error("No active MongoDB connection");

  const collection = db.collection(spec.collectionName);
  const fieldNames = Object.keys(spec.rename);

  const pendingBefore = await countPendingRename(collection, fieldNames);
  console.log(
    `\n[${spec.collectionName}] ${pendingBefore} document(s) with ${fieldNames.join(
      "/",
    )} present`,
  );

  if (pendingBefore === 0) {
    console.log(`[${spec.collectionName}] nothing to do`);
    return;
  }

  if (dryRun) {
    console.log(`[${spec.collectionName}] --dry-run: no writes performed`);
    return;
  }

  const result = await collection.updateMany(
    { $or: fieldNames.map((field) => ({ [field]: { $exists: true } })) },
    { $rename: spec.rename },
  );
  console.log(
    `[${spec.collectionName}] matched ${result.matchedCount}, modified ${result.modifiedCount}`,
  );

  // Verify: no document should still carry the old field name.
  const remaining = await countPendingRename(collection, fieldNames);
  if (remaining > 0) {
    throw new Error(
      `[${spec.collectionName}] ${remaining} document(s) still carry the old field name after rename — aborting`,
    );
  }
  console.log(`[${spec.collectionName}] verified: no residual old field names`);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`Running tax->vat migration (${dryRun ? "DRY RUN" : "LIVE"})`);

  await connectDatabase();
  try {
    for (const spec of RENAMES) {
      await runRename(spec, dryRun);
    }
    console.log(dryRun ? "\n✓ Dry run complete — no data was modified" : "\n✓ Migration complete");
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  console.error("✗ Migration failed:", error);
  process.exitCode = 1;
});
