import mongoose from "mongoose";
import { Collection } from "../models/index";
import { connectDB } from "../config/database";
import dotenv from "dotenv";

dotenv.config();

const collections = [
  {
    title: "Summer Camps",
    description: "Keep your kids active and engaged during summer break",
    icon: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=80&h=80&fit=crop&crop=center",
    count: "45+ activities",
    category: "Education",
    events: [],
    isActive: true,
    sortOrder: 1,
  },
  {
    title: "Top Daycation Spots",
    description: "Perfect day trips for the whole family",
    icon: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&crop=center",
    count: "32+ locations",
    category: "Adventure",
    events: [],
    isActive: true,
    sortOrder: 2,
  },
  {
    title: "Pool, Brunch & more",
    description: "Relaxing experiences for parents and kids",
    icon: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=80&h=80&fit=crop&crop=center",
    count: "28+ venues",
    category: "Food",
    events: [],
    isActive: true,
    sortOrder: 3,
  },
  {
    title: "Top Kids Play Areas",
    description: "Safe and fun indoor play experiences",
    icon: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=80&h=80&fit=crop&crop=center",
    count: "50+ play zones",
    category: "Entertainment",
    events: [],
    isActive: true,
    sortOrder: 4,
  },
  {
    title: "Waterparks & Splash Fun",
    description: "Cool off with exciting water activities",
    icon: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=80&h=80&fit=crop&crop=center",
    count: "15+ parks",
    category: "Adventure",
    events: [],
    isActive: true,
    sortOrder: 5,
  },
  {
    title: "Have A Pool Day",
    description: "Swimming fun for all ages and abilities",
    icon: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=80&h=80&fit=crop&crop=center",
    count: "25+ pools",
    category: "Sports",
    events: [],
    isActive: true,
    sortOrder: 6,
  },
  {
    title: "Plan a Birthday",
    description: "Unforgettable birthday celebrations",
    icon: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=80&h=80&fit=crop&crop=center",
    count: "40+ venues",
    category: "Entertainment",
    events: [],
    isActive: true,
    sortOrder: 7,
  },
  {
    title: "Arts & Crafts",
    description: "Creative workshops and art classes for kids",
    icon: "https://images.unsplash.com/photo-1607462109225-6b64ae2dd3cb?w=80&h=80&fit=crop&crop=center",
    count: "35+ workshops",
    category: "Arts",
    events: [],
    isActive: true,
    sortOrder: 8,
  },
  {
    title: "Science & Discovery",
    description: "Interactive science museums and labs",
    icon: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=80&h=80&fit=crop&crop=center",
    count: "20+ experiences",
    category: "Education",
    events: [],
    isActive: true,
    sortOrder: 9,
  },
  {
    title: "Outdoor Adventures",
    description: "Nature parks and outdoor exploration",
    icon: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=80&h=80&fit=crop&crop=center",
    count: "30+ locations",
    category: "Nature",
    events: [],
    isActive: true,
    sortOrder: 10,
  },
];

async function seedCollections() {
  try {
    console.log("🌱 Starting Collections Seed Script...");

    // Connect to MongoDB
    await connectDB();
    console.log("✅ Connected to MongoDB");

    // Clear existing collections
    const existingCount = await Collection.countDocuments();
    if (existingCount > 0) {
      console.log(`🗑️  Found ${existingCount} existing collections`);
      const deleteResult = await Collection.deleteMany({});
      console.log(
        `🗑️  Deleted ${deleteResult.deletedCount} existing collections`,
      );
    }

    // Insert new collections
    console.log(`📝 Inserting ${collections.length} collections...`);
    const insertedCollections = await Collection.insertMany(collections);
    console.log(
      `✅ Successfully inserted ${insertedCollections.length} collections`,
    );

    // Display results
    console.log("\n📊 Seeded Collections:");
    console.log("=".repeat(50));
    insertedCollections.forEach((collection, index) => {
      console.log(`${index + 1}. ${collection.title} (${collection.count})`);
    });
    console.log("=".repeat(50));

    console.log("\n🎉 Collections seed completed successfully!");
    console.log("\n💡 You can now:");
    console.log("   • View collections at: GET /api/collections");
    console.log("   • See them in the frontend Collections carousel");
    console.log("   • Manage them via admin endpoints");
  } catch (error) {
    console.error("❌ Error seeding collections:", error);
    process.exit(1);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
}

// Run the seed script
if (require.main === module) {
  seedCollections();
}

export default seedCollections;
