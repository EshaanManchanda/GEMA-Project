import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

/**
 * One-time (idempotent) migration for the LeadPage collection.
 *
 * The original schema had a plain `unique: true` index on `event`. Mongoose
 * cannot alter an existing index's options in place — a new `syncIndexes()`
 * call will silently keep the old index around unless it's dropped first.
 * This script:
 *   1. Drops the legacy `event_1` unique index (ignores "index not found").
 *   2. Creates the new partial unique index on `event` (only applies to docs
 *      that actually have an event — allows the event-less global bucket).
 *   3. Creates the partial unique index on `isGlobal` (DB-level guarantee
 *      that only one global "Kidrove Lead Collection" bucket can ever exist).
 *
 * Safe to run repeatedly — every step swallows "already exists" / "not
 * found" errors.
 *
 * Usage (from backend/):
 *   npx ts-node src/scripts/migrations/leadPagePartialIndexes.ts
 */

async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/gema";
  await mongoose.connect(mongoUri);
  console.log("✅  Connected to MongoDB");
}

async function dropLegacyEventIndex(
  collection: mongoose.mongo.Collection,
): Promise<void> {
  try {
    await collection.dropIndex("event_1");
    console.log("✅  Dropped legacy unique index event_1");
  } catch (error: any) {
    if (error?.codeName === "IndexNotFound" || error?.code === 27) {
      console.log("ℹ️  Legacy index event_1 not found — nothing to drop.");
    } else {
      throw error;
    }
  }
}

async function createIndexIfMissing(
  collection: mongoose.mongo.Collection,
  keys: Record<string, 1>,
  options: mongoose.mongo.CreateIndexesOptions,
): Promise<void> {
  try {
    const name = await collection.createIndex(keys, options);
    console.log(`✅  Ensured index ${name}`);
  } catch (error: any) {
    // 85 = IndexOptionsConflict, 86 = IndexKeySpecsConflict — an index with
    // the same name/spec already exists in an equivalent form.
    if (error?.code === 85 || error?.code === 86) {
      console.log(
        `ℹ️  Index on ${JSON.stringify(keys)} already present in an equivalent form — skipping.`,
      );
    } else {
      throw error;
    }
  }
}

async function main() {
  await connectDatabase();

  const collection = mongoose.connection.collection("leadpages");

  await dropLegacyEventIndex(collection);

  await createIndexIfMissing(
    collection,
    { event: 1 },
    {
      unique: true,
      partialFilterExpression: { event: { $type: "objectId" } },
      name: "event_1_partial",
    },
  );

  await createIndexIfMissing(
    collection,
    { isGlobal: 1 },
    {
      unique: true,
      partialFilterExpression: { isGlobal: true },
      name: "isGlobal_1_partial",
    },
  );

  console.log("\n✅  LeadPage index migration complete.");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error("❌  LeadPage index migration failed:", error);
  process.exit(1);
});
