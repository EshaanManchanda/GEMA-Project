/**
 * Manual script to seed admin revenue settings
 * Run this directly to create default admin settings in the database
 *
 * Usage: npx ts-node src/scripts/runSeedSettings.ts
 */

import mongoose from "mongoose";
import { config } from "../config/index";
import { ensureAdminRevenueSettings } from "./seedAdminSettings";

const runSeed = async () => {
  try {
    console.log("🚀 Starting admin settings seed script...\n");

    // Connect to MongoDB
    const mongoUri =
      config.mongodbUri ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/gema";
    console.log(
      "📡 Connecting to MongoDB:",
      mongoUri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@"),
    );

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Run seed function
    console.log("🌱 Running seed function...\n");
    const settings = await ensureAdminRevenueSettings();

    console.log("\n" + "=".repeat(60));
    console.log("✅ SEED COMPLETED SUCCESSFULLY");
    console.log("=".repeat(60));
    console.log("\n📋 Settings Summary:");
    console.log(`   ID: ${settings._id}`);
    console.log(`   Platform: ${settings.platformName}`);
    console.log(`   Active: ${settings.isActive}`);
    console.log(`   Commission Rate: ${settings.defaultCommissionRate}%`);
    console.log(
      `   Minimum Payout: ${settings.minimumPayoutAmount} ${settings.payoutCurrency}`,
    );
    console.log(`   Payout Frequency: ${settings.payoutFrequency}`);
    console.log("=".repeat(60) + "\n");

    // Disconnect
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
    console.log("\n✨ All done! Admin settings are now configured.\n");

    process.exit(0);
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ SEED FAILED");
    console.error("=".repeat(60));
    console.error("\nError:", error);
    if (error instanceof Error) {
      console.error("\nMessage:", error.message);
      console.error("\nStack:", error.stack);
    }
    console.error("\n" + "=".repeat(60) + "\n");

    process.exit(1);
  }
};

// Run the seed
runSeed();
