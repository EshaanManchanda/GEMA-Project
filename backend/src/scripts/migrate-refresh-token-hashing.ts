/**
 * Migration: Hash existing plain-text refresh tokens
 * 
 * This script migrates the RefreshToken collection from storing plain JWT tokens
 * to storing only SHA-256 hashes of the tokens (for security). 
 * 
 * Old behavior: token = raw JWT string
 * New behavior: token = SHA-256(raw JWT string)
 * 
 * Run: cd backend && npx ts-node src/scripts/migrate-refresh-token-hashing.ts
 */

import crypto from "crypto";
import mongoose from "mongoose";
import RefreshToken from "../models/RefreshToken";
import { config } from "../config/index";
import logger from "../config/logger";

/**
 * Check if a string is already a SHA-256 hash (64 lowercase hex chars)
 */
const isSHA256Hash = (str: string): boolean => /^[a-f0-9]{64}$/.test(str);

/**
 * One-way hash of a refresh token
 */
const hashToken = (raw: string): string =>
  crypto.createHash("sha256").update(raw).digest("hex");

/**
 * Main migration function
 */
const migrateRefreshTokens = async (): Promise<void> => {
  try {
    console.log("[MIGRATION] Starting refresh token hashing migration...");
    logger.info("[MIGRATION] Starting refresh token hashing migration...");

    // Connect to MongoDB
    if (!mongoose.connection.readyState) {
      await mongoose.connect(config.mongodbUri, {
        maxPoolSize: 10,
        minPoolSize: 2,
      });
      console.log("[MIGRATION] Connected to MongoDB");
      logger.info("[MIGRATION] Connected to MongoDB");
    }

    // Find all refresh tokens
    const allTokens = await RefreshToken.find({}).lean();
    console.log(`[MIGRATION] Found ${allTokens.length} refresh token(s) to process`);
    logger.info(`[MIGRATION] Found ${allTokens.length} refresh token(s) to process`);

    let hashCount = 0;
    let skipCount = 0;
    const errors: Array<{ docId: string; error: string }> = [];

    // Process each token
    for (const doc of allTokens) {
      try {
        const token = (doc as any).token;

        if (!token) {
          console.warn(`[MIGRATION] Skipping doc ${doc._id} - empty token field`);
          logger.warn(`[MIGRATION] Skipping doc ${doc._id} - empty token field`);
          skipCount++;
          continue;
        }

        // Check if already hashed
        if (isSHA256Hash(token)) {
          console.debug(
            `[MIGRATION] Token for user ${doc.user} already hashed, skipping`
          );
          logger.debug(
            `[MIGRATION] Token for user ${doc.user} already hashed, skipping`
          );
          skipCount++;
          continue;
        }

        // Hash the token
        const hashedToken = hashToken(token);

        // Update the document
        await RefreshToken.updateOne(
          { _id: doc._id },
          { $set: { token: hashedToken } }
        );

        hashCount++;
        console.log(
          `[MIGRATION] Hashed token for user ${doc.user} (doc: ${doc._id})`
        );
        logger.debug(
          `[MIGRATION] Hashed token for user ${doc.user} (doc: ${doc._id})`
        );
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        console.error(`[MIGRATION] Error processing doc ${doc._id}: ${errorMsg}`);
        logger.error(`[MIGRATION] Error processing doc ${doc._id}: ${errorMsg}`);
        errors.push({
          docId: String(doc._id),
          error: errorMsg,
        });
      }
    }

    // Summary
    console.log(
      `[MIGRATION] Migration complete: ${hashCount} hashed, ${skipCount} skipped`
    );
    logger.info(
      `[MIGRATION] Migration complete: ${hashCount} hashed, ${skipCount} skipped`
    );

    if (errors.length > 0) {
      console.error(`[MIGRATION] ${errors.length} errors occurred:`, errors);
      logger.error(`[MIGRATION] ${errors.length} errors occurred:`, errors);
      process.exit(1);
    }

    console.log("[MIGRATION] ✓ All refresh tokens successfully migrated to hashed format");
    logger.info("[MIGRATION] ✓ All refresh tokens successfully migrated to hashed format");
    process.exit(0);
  } catch (error: any) {
    console.error("[MIGRATION] Fatal error:", error);
    logger.error("[MIGRATION] Fatal error:", error);
    process.exit(1);
  }
};

// Run migration
migrateRefreshTokens();
