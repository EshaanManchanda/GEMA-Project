import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import MediaAsset from "../models/MediaAsset";
import { config } from "../config/env";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Migration: Add UUID to existing MediaAsset records
 *
 * This script:
 * 1. Adds uuid field to all existing MediaAsset records
 * 2. Updates URLs to use UUID-based format for local provider
 * 3. Keeps Cloudinary URLs unchanged
 */

async function migrateMediaAssets() {
  try {
    console.log("🚀 Starting Media Asset UUID Migration...\n");
    console.log("Connecting to MongoDB...");
    await mongoose.connect(config.mongodbUri);
    console.log("✅ Connected to MongoDB\n");

    // Find all media assets without UUID
    const assetsWithoutUuid = await MediaAsset.find({
      $or: [{ uuid: { $exists: false } }, { uuid: null }, { uuid: "" }],
    });

    console.log(
      `📊 Found ${assetsWithoutUuid.length} media assets to migrate\n`,
    );

    if (assetsWithoutUuid.length === 0) {
      console.log(
        "✅ No media assets need migration. All assets already have UUIDs.",
      );
      return;
    }

    let updated = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const asset of assetsWithoutUuid) {
      try {
        // Generate UUID
        const uuid = uuidv4();

        // Update asset
        asset.uuid = uuid;

        // Update URL to UUID-based format (only for local provider)
        if (asset.provider === "local") {
          const secureUrl = `${config.upload.baseUrl}/api/media/file/${uuid}`;
          asset.url = secureUrl;
          console.log(`  📝 Updated ${asset.filename}: ${secureUrl}`);
        } else {
          console.log(`  ☁️  Kept Cloudinary URL for ${asset.filename}`);
        }

        await asset.save();
        updated++;

        if (updated % 10 === 0) {
          console.log(
            `\n📈 Progress: ${updated}/${assetsWithoutUuid.length}\n`,
          );
        }
      } catch (error: any) {
        console.error(
          `❌ Failed to migrate asset ${asset._id}:`,
          error.message,
        );
        failed++;
        errors.push({
          id: asset._id.toString(),
          error: error.message,
        });
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 MIGRATION COMPLETE");
    console.log("=".repeat(50));
    console.log(`Total processed: ${assetsWithoutUuid.length}`);
    console.log(`✅ Successfully updated: ${updated}`);
    console.log(`❌ Failed: ${failed}`);

    if (errors.length > 0) {
      console.log("\n❌ Errors:");
      errors.forEach((err) => {
        console.log(`  - Asset ID ${err.id}: ${err.error}`);
      });
    }

    console.log("\n✅ Migration finished successfully!\n");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run migration
migrateMediaAssets();
