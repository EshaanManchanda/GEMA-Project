/**
 * Migration: Revoke all existing refresh tokens (S1 — token hashing)
 *
 * The refresh token store now saves SHA-256(token) instead of the raw JWT.
 * Existing raw tokens can never match a hash lookup, so they must all be
 * revoked. Users will be prompted to log in again after this migration.
 *
 * Run ONCE before deploying the token-hashing code:
 *   cd backend && npx ts-node src/scripts/migrate-refresh-token-hashing.ts
 */
import mongoose from "mongoose";
import { config } from "../config/env";

async function run() {
  await mongoose.connect(config.mongodbUri);
  console.log("Connected to MongoDB");

  const result = await mongoose.connection
    .collection("refreshtokens")
    .updateMany({ isRevoked: false }, { $set: { isRevoked: true } });

  console.log(
    `Revoked ${result.modifiedCount} refresh tokens. All users will need to log in again.`,
  );

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
