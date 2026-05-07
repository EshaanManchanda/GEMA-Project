import mongoose from "mongoose";
import MediaAsset from "../models/MediaAsset";
import { config } from "../config/env";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Migration Script: Convert Cloudinary URLs to UUID-based URLs
 *
 * This script migrates existing MediaAsset records that have direct Cloudinary URLs
 * and converts them to use UUID-based URLs for provider flexibility.
 */
async function migrateCloudinaryUrls() {
  try {
    console.log("🚀 Starting Cloudinary URL to UUID Migration...\n");
    console.log("=====================================\n");

    // Connect to MongoDB
    await mongoose.connect(config.mongodbUri);
    console.log("✅ Connected to MongoDB\n");

    // Find all Cloudinary assets with direct Cloudinary URLs
    const cloudinaryAssets = await MediaAsset.find({
      provider: "cloudinary",
      url: { $regex: "^https://res.cloudinary.com" },
      publicId: { $exists: true, $ne: null },
    });

    console.log(
      `📊 Found ${cloudinaryAssets.length} Cloudinary assets to migrate\n`,
    );

    if (cloudinaryAssets.length === 0) {
      console.log(
        "✅ No assets need migration. All assets already use UUID URLs.",
      );
      await mongoose.disconnect();
      return;
    }

    let updated = 0;
    let failed = 0;
    const errors: Array<{ id: string; filename: string; error: string }> = [];

    // Process each asset
    for (const asset of cloudinaryAssets) {
      try {
        // Validate UUID exists
        if (!asset.uuid) {
          console.warn(
            `⚠️  Asset ${asset._id} (${asset.filename}) missing UUID, skipping...`,
          );
          failed++;
          errors.push({
            id: asset._id.toString(),
            filename: asset.filename,
            error: "Missing UUID field",
          });
          continue;
        }

        // Generate UUID-based URL
        const uuidUrl = `${config.upload.baseUrl}/api/media/file/${asset.uuid}`;

        // Update URL
        asset.url = uuidUrl;
        await asset.save();

        updated++;
        console.log(`  ✅ Updated: ${asset.filename}`);

        // Progress indicator every 10 assets
        if (updated % 10 === 0) {
          console.log(`\n📈 Progress: ${updated}/${cloudinaryAssets.length}\n`);
        }
      } catch (error: any) {
        console.error(
          `  ❌ Failed to migrate ${asset._id} (${asset.filename}):`,
          error.message,
        );
        failed++;
        errors.push({
          id: asset._id.toString(),
          filename: asset.filename,
          error: error.message,
        });
      }
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 MIGRATION COMPLETE");
    console.log("=".repeat(50));
    console.log(`Total Assets Found: ${cloudinaryAssets.length}`);
    console.log(`✅ Successfully Migrated: ${updated}`);
    console.log(`❌ Failed: ${failed}`);

    // Print errors if any
    if (errors.length > 0) {
      console.log("\n❌ ERRORS ENCOUNTERED:");
      console.log("=".repeat(50));
      errors.forEach((err, index) => {
        console.log(`${index + 1}. Asset: ${err.filename} (ID: ${err.id})`);
        console.log(`   Error: ${err.error}\n`);
      });
    }

    // Validation check
    const remainingDirectUrls = await MediaAsset.countDocuments({
      provider: "cloudinary",
      url: { $regex: "^https://res.cloudinary.com" },
    });

    console.log("\n📋 VALIDATION:");
    console.log(
      `${remainingDirectUrls} Cloudinary assets still have direct URLs`,
    );

    if (remainingDirectUrls === 0) {
      console.log(
        "✅ All Cloudinary assets successfully migrated to UUID URLs!",
      );
    } else {
      console.warn(
        `⚠️  ${remainingDirectUrls} assets still need migration (likely missing UUIDs)`,
      );
    }
  } catch (error: any) {
    console.error("\n❌ Migration failed with error:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Disconnect from database
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  }
}

// Handle unhandled rejections
process.on("unhandledRejection", (error) => {
  console.error("💥 Unhandled Rejection:", error);
  process.exit(1);
});

// Run migration if called directly
if (require.main === module) {
  migrateCloudinaryUrls();
}

export default migrateCloudinaryUrls;
