import mongoose from "mongoose";
import { config } from "../config/env";
import "../models"; // Import all models to ensure they're registered

/**
 * Migration script to ensure blog content is compatible with TipTap editor
 * This script wraps plain text content in <p> tags if needed
 */

const migrateBlogContent = async () => {
  try {
    console.log("🔄 Starting blog content migration to TipTap format...");

    // Connect to MongoDB
    await mongoose.connect(config.mongodbUri);
    console.log("✅ Connected to MongoDB");

    // Fetch all blogs
    const Blog = mongoose.model("Blog");
    const blogs = await Blog.find({});
    console.log(`📚 Found ${blogs.length} blogs to process`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const blog of blogs) {
      try {
        let content = blog.content;
        let needsMigration = false;

        // Check if content is plain text (no HTML tags)
        if (!content.includes("<")) {
          console.log(
            `  ⚠️  Blog "${blog.title}" has plain text content - wrapping in paragraphs`,
          );
          // Split by newlines and wrap each paragraph
          content = content
            .split("\n\n")
            .filter((para) => para.trim())
            .map((para) => `<p>${para.trim()}</p>`)
            .join("\n");
          needsMigration = true;
        }
        // Check if content has minimal HTML structure (needs proper wrapping)
        else if (!content.match(/<(p|h[1-6]|div|ul|ol|blockquote)/i)) {
          console.log(
            `  ⚠️  Blog "${blog.title}" has minimal HTML - wrapping content`,
          );
          content = `<p>${content}</p>`;
          needsMigration = true;
        }

        if (needsMigration) {
          blog.content = content;
          await blog.save();
          migratedCount++;
          console.log(`  ✅ Migrated blog: "${blog.title}"`);
        } else {
          skippedCount++;
          console.log(
            `  ⏭️  Skipped blog: "${blog.title}" (already has proper HTML)`,
          );
        }
      } catch (error) {
        console.error(`  ❌ Error migrating blog "${blog.title}":`, error);
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`  Total blogs: ${blogs.length}`);
    console.log(`  Migrated: ${migratedCount}`);
    console.log(`  Skipped: ${skippedCount}`);
    console.log("\n✨ Blog content migration completed successfully!");

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run migration
migrateBlogContent();
