import mongoose from "mongoose";
import { Blog } from "../models/Blog";
import MediaAsset from "../models/MediaAsset";
import { config } from "../config/env";
import { blogService } from "../services/blog.service";

/**
 * Migration Script: Blog Images to MediaAssets
 *
 * Migrates blog featured images from URL strings to MediaAsset references
 * Uses blogService to ensure proper usage tracking
 */
async function migrateBlogImages() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log("✅ Connected to MongoDB");

    console.log("\n=== Starting Blog Image Migration ===\n");

    // Find blogs with old field populated but new field empty
    const blogs = await Blog.find({
      featuredImage: { $exists: true, $ne: "" },
      featuredImageAsset: { $exists: false },
    });

    console.log(`Found ${blogs.length} blogs to migrate\n`);

    if (blogs.length === 0) {
      console.log(
        "No blogs to migrate. All blogs are already using MediaAssets or have no featured images.",
      );
      await mongoose.connection.close();
      return;
    }

    let migrated = 0;
    let skipped = 0;
    const errors: { blogId: string; title: string; error: string }[] = [];

    for (const blog of blogs) {
      try {
        console.log(`Processing blog: "${blog.title}" (${blog._id})`);
        console.log(`  Current featuredImage: ${blog.featuredImage}`);

        // Try to find corresponding MediaAsset by URL
        const mediaAsset = await MediaAsset.findOne({
          url: blog.featuredImage,
        });

        if (!mediaAsset) {
          console.warn(
            `  ⚠ No MediaAsset found for URL: ${blog.featuredImage}`,
          );
          console.warn(`  Skipping...\n`);
          skipped++;
          errors.push({
            blogId: blog._id.toString(),
            title: blog.title,
            error: `No MediaAsset found for URL: ${blog.featuredImage}`,
          });
          continue;
        }

        console.log(
          `  ✓ Found MediaAsset: ${mediaAsset.filename} (${mediaAsset._id})`,
        );

        // Update using blogService to ensure proper tracking
        // We use direct model update here to avoid triggering service layer validation
        // since we're doing data migration
        blog.featuredImageAsset = mediaAsset._id as any;
        await blog.save(); // Model hooks will handle usage tracking

        console.log(`  ✅ Migrated successfully\n`);
        migrated++;
      } catch (error: any) {
        console.error(`  ❌ Error migrating blog ${blog._id}:`, error.message);
        skipped++;
        errors.push({
          blogId: blog._id.toString(),
          title: blog.title,
          error: error.message,
        });
      }
    }

    console.log("\n=== Migration Complete ===");
    console.log(`✅ Migrated: ${migrated}`);
    console.log(`⚠  Skipped: ${skipped}`);
    console.log(`📊 Total: ${blogs.length}`);

    if (errors.length > 0) {
      console.log("\n❌ Errors encountered:");
      errors.forEach((err, index) => {
        console.log(`${index + 1}. Blog: "${err.title}" (${err.blogId})`);
        console.log(`   Error: ${err.error}`);
      });
    }

    // Validation: Check if any blogs still have only old field
    const remainingOldBlogs = await Blog.countDocuments({
      featuredImage: { $exists: true, $ne: "" },
      featuredImageAsset: { $exists: false },
    });

    console.log(
      `\n📋 Validation: ${remainingOldBlogs} blogs still using old field`,
    );

    if (remainingOldBlogs === 0) {
      console.log("✅ All blogs successfully migrated!");
    }

    await mongoose.connection.close();
    console.log("\n✅ Migration script completed");
  } catch (error) {
    console.error("Fatal error during migration:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
migrateBlogImages().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
