/**
 * Migration: Deduplicate firebaseUid before adding unique index (H2)
 *
 * Mongoose will add `{ firebaseUid: 1 }, { unique: true, sparse: true }` at
 * startup. If duplicate firebaseUid values exist from the old race condition,
 * MongoDB will refuse to create the index and the server will fail to start.
 *
 * This script:
 *   1. Finds all firebaseUid values with more than one user document.
 *   2. Keeps the OLDEST document (first registration) and removes the rest.
 *   3. Reports all removed duplicates.
 *
 * Run ONCE before deploying the unique-index code:
 *   cd backend && npx ts-node src/scripts/migrate-firebaseuid-unique-index.ts
 */
import mongoose from "mongoose";
import { config } from "../config/env";

async function run() {
  await mongoose.connect(config.mongodbUri);
  console.log("Connected to MongoDB");

  const users = mongoose.connection.collection("users");

  // Find all firebaseUid values that appear more than once
  const duplicates = await users
    .aggregate([
      { $match: { firebaseUid: { $exists: true, $ne: null } } },
      { $group: { _id: "$firebaseUid", count: { $sum: 1 }, ids: { $push: "$_id" }, dates: { $push: "$createdAt" } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  if (duplicates.length === 0) {
    console.log("No duplicate firebaseUid values found. Safe to add unique index.");
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${duplicates.length} duplicated firebaseUid(s). Deduplicating...`);

  let removed = 0;
  for (const dup of duplicates) {
    // Sort ids by createdAt ascending — keep the oldest, remove the rest
    const sorted = (dup.ids as mongoose.Types.ObjectId[])
      .map((id: mongoose.Types.ObjectId, i: number) => ({ id, date: dup.dates[i] as Date }))
      .sort((a: { date: Date }, b: { date: Date }) => a.date.getTime() - b.date.getTime());

    const [keep, ...toRemove] = sorted;
    console.log(`  firebaseUid=${dup._id}: keeping ${keep.id}, removing ${toRemove.map((x: { id: mongoose.Types.ObjectId }) => x.id).join(", ")}`);

    const res = await users.deleteMany({ _id: { $in: toRemove.map((x: { id: mongoose.Types.ObjectId }) => x.id) } });
    removed += res.deletedCount;
  }

  console.log(`Removed ${removed} duplicate user document(s). Safe to add unique index now.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
