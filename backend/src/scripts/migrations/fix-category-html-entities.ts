/**
 * One-time script to fix HTML entities in category names.
 * Converts &amp; → &, &lt; → <, etc.
 *
 * Usage: npx ts-node src/scripts/fix-category-html-entities.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "";

const decodeEntities = (str: string): string =>
  str
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");

async function fixCategoryEntities() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  if (!db) {
    console.error("DB connection not available");
    process.exit(1);
  }

  const collection = db.collection("categories");
  const categories = await collection
    .find({ name: { $regex: /&amp;|&lt;|&gt;|&quot;|&#39;/i } })
    .toArray();

  console.log(`Found ${categories.length} categories with HTML entities`);

  for (const cat of categories) {
    const decoded = decodeEntities(cat.name);
    console.log(`  "${cat.name}" → "${decoded}"`);
    await collection.updateOne({ _id: cat._id }, { $set: { name: decoded } });
  }

  console.log("Done");
  await mongoose.disconnect();
}

fixCategoryEntities().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
