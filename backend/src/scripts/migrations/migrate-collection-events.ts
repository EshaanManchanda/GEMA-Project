import mongoose from "mongoose";
import { Collection } from "../models/index";
import { collectionSyncService } from "../services/collection-sync.service";
import logger from "../config/logger";

/**
 * Migration Script: Collection Events to Embedded Documents
 *
 * Converts Collection.events from ObjectId[] to embedded event documents
 * Uses CollectionSyncService for consistency with live sync logic
 */

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{
    collectionId: string;
    title: string;
    error: string;
  }>;
}

async function migrateCollectionEvents(dryRun: boolean = true) {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/gema";
    await mongoose.connect(mongoUri);
    logger.info("Connected to MongoDB");

    logger.info("\n=== Collection Events Migration ===\n");
    logger.info(
      `Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE (will modify data)"}\n`,
    );

    // Find collections needing migration
    const collections = await Collection.find({
      $or: [{ eventsData: { $exists: false } }, { eventsData: { $size: 0 } }],
      events: { $exists: true, $ne: [] },
    });

    logger.info(`Found ${collections.length} collections to migrate\n`);

    if (collections.length === 0) {
      logger.info("No collections need migration. All done!");
      await mongoose.connection.close();
      return;
    }

    const stats: MigrationStats = {
      total: collections.length,
      migrated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (const collection of collections) {
      try {
        logger.info(`Processing: "${collection.title}" (${collection._id})`);
        logger.info(`  Events count: ${collection.events.length}`);

        if (dryRun) {
          logger.info(
            `  [DRY RUN] Would sync ${collection.events.length} events`,
          );
          stats.migrated++;
        } else {
          // Use sync service to populate eventsData
          const syncedCount = await collectionSyncService.syncCollection(
            collection._id.toString(),
          );

          if (syncedCount !== null && syncedCount > 0) {
            logger.info(`  ✅ Synced ${syncedCount} events`);
            stats.migrated++;
          } else {
            logger.warn(`  ⚠ No events synced (may be unapproved/deleted)`);
            stats.skipped++;
          }
        }

        logger.info("");
      } catch (error: any) {
        logger.error(`  ❌ Error: ${error.message}`);
        stats.failed++;
        stats.errors.push({
          collectionId: collection._id.toString(),
          title: collection.title,
          error: error.message,
        });
      }
    }

    // Summary
    logger.info("\n=== Migration Complete ===");
    logger.info(`Total collections: ${stats.total}`);
    logger.info(`✅ Migrated: ${stats.migrated}`);
    logger.info(`⚠ Skipped: ${stats.skipped}`);
    logger.info(`❌ Failed: ${stats.failed}`);

    if (stats.errors.length > 0) {
      logger.info("\n❌ Errors:");
      stats.errors.forEach((err, i) => {
        logger.info(`${i + 1}. "${err.title}" (${err.collectionId})`);
        logger.info(`   ${err.error}`);
      });
    }

    // Validation
    if (!dryRun) {
      const remaining = await Collection.countDocuments({
        $or: [{ eventsData: { $exists: false } }, { eventsData: { $size: 0 } }],
        events: { $exists: true, $ne: [] },
      });

      logger.info(
        `\n📋 Validation: ${remaining} collections still need migration`,
      );

      if (remaining === 0) {
        logger.info("✅ All collections successfully migrated!");
      }
    }

    await mongoose.connection.close();
    logger.info("\n✅ Migration script completed\n");
  } catch (error) {
    logger.error("Fatal error during migration:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Parse command-line args
const args = process.argv.slice(2);
const dryRun = !args.includes("--live");

if (!dryRun) {
  console.log("\n⚠️  WARNING: Running in LIVE mode. Data will be modified!");
  console.log("⚠️  Press Ctrl+C within 5 seconds to cancel...\n");

  setTimeout(() => {
    migrateCollectionEvents(false).catch((error) => {
      console.error("Unhandled error:", error);
      process.exit(1);
    });
  }, 5000);
} else {
  console.log("\n📋 Running in DRY RUN mode (no changes will be made)");
  console.log("📋 Run with --live flag to apply changes\n");

  migrateCollectionEvents(true).catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
