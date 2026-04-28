import mongoose from "mongoose";
import MediaAsset from "../models/MediaAsset";
import { config } from "../config/env";

/**
 * Migration Script: Update MediaAsset folder names
 *
 * This script removes the `.upload` suffix from folder names in the database.
 *
 * Before running:
 * 1. Backup your database: mongodump --db=gema --collection=mediaassets --out=./backup
 * 2. Document current state: db.mediaassets.aggregate([{$group: {_id: "$folder", count: {$sum: 1}}}])
 *
 * To run:
 * cd backend
 * npx ts-node src/scripts/migrate-folder-names.ts
 */

const migrateFolderNames = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodbUri);
    console.log("Connected to MongoDB");
    console.log("Database:", config.mongodbUri);

    // Mapping of old folder names to new ones
    const folderMapping: Record<string, string> = {
      "blogs.upload": "blogs",
      "events.upload": "events",
      "event.uploads": "events", // Fix typo if it exists
      "profile.upload": "profile",
      "partners.upload": "partners",
      "venues.upload": "venues",
      "documents.upload": "documents",
      "misc.upload": "misc",
    };

    console.log("\n=== Starting Migration ===\n");

    // Update each folder type
    let totalUpdated = 0;
    for (const [oldFolder, newFolder] of Object.entries(folderMapping)) {
      const result = await MediaAsset.updateMany(
        { folder: oldFolder },
        { $set: { folder: newFolder } },
      );

      if (result.modifiedCount > 0) {
        console.log(
          `✓ Updated ${result.modifiedCount} assets from "${oldFolder}" to "${newFolder}"`,
        );
        totalUpdated += result.modifiedCount;
      } else {
        console.log(`- No assets found with folder "${oldFolder}"`);
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Total assets updated: ${totalUpdated}`);

    // Verify no .upload folders remain
    const remainingUploadFolders = await MediaAsset.find({
      folder: /\.upload$/,
    });

    if (remainingUploadFolders.length > 0) {
      console.log(
        `\n⚠ Warning: ${remainingUploadFolders.length} assets still have .upload suffix:`,
      );
      const uniqueFolders = [
        ...new Set(remainingUploadFolders.map((a) => a.folder)),
      ];
      uniqueFolders.forEach((folder) => {
        console.log(`  - ${folder}`);
      });
    } else {
      console.log("\n✓ No assets with .upload suffix remaining");
    }

    // Display final folder distribution
    console.log("\n=== Final Folder Distribution ===");
    const distribution = await MediaAsset.aggregate([
      {
        $group: {
          _id: "$folder",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    distribution.forEach(({ _id, count }) => {
      console.log(`  ${_id}: ${count} assets`);
    });

    console.log("\n✓ Migration completed successfully\n");
    process.exit(0);
  } catch (error) {
    console.error("\n✗ Migration failed:", error);
    process.exit(1);
  }
};

// Run migration
migrateFolderNames();
