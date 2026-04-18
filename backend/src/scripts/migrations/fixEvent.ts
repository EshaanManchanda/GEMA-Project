import mongoose from "mongoose";
import { Event } from "../models/index";
import { config } from "../config/env";
import { cacheService } from "../services/cache.service";
import {
  getEventCacheKey,
  getEventListCachePattern,
} from "../utils/event.utils";

const EVENT_ID = "6901a340bc4f36db9e7ad85f";

async function fixEvent() {
  try {
    console.log("=".repeat(80));
    console.log("EVENT FIX SCRIPT");
    console.log("=".repeat(80));
    console.log(`\nFixing Event ID: ${EVENT_ID}\n`);

    // Connect to database
    console.log("Connecting to MongoDB...");
    await mongoose.connect(config.mongodbUri);
    console.log("✓ Connected to MongoDB\n");

    // Find the event
    console.log("Finding event...");
    const event = await Event.findById(EVENT_ID);

    if (!event) {
      console.log("❌ EVENT NOT FOUND");
      await mongoose.disconnect();
      return;
    }

    console.log(`✓ Found event: "${event.title}"\n`);

    // Show current state
    console.log("CURRENT STATE:");
    console.log(`  isApproved: ${event.isApproved}`);
    console.log(`  isActive: ${event.isActive}`);
    console.log(`  status: ${event.status}`);
    console.log(`  isDeleted: ${event.isDeleted}\n`);

    // Apply fixes
    console.log("Applying fixes...");

    if (!event.isApproved) {
      event.isApproved = true;
      console.log("  ✓ Set isApproved = true");
    }

    if (event.status !== "published") {
      event.status = "published";
      console.log('  ✓ Set status = "published"');
    }

    if (!event.isActive) {
      event.isActive = true;
      console.log("  ✓ Set isActive = true");
    }

    // Save changes
    await event.save();
    console.log("\n✓ Event saved successfully\n");

    // Show new state
    console.log("NEW STATE:");
    console.log(`  isApproved: ${event.isApproved}`);
    console.log(`  isActive: ${event.isActive}`);
    console.log(`  status: ${event.status}`);
    console.log(`  isDeleted: ${event.isDeleted}\n`);

    // Clear cache
    console.log("Clearing cache...");
    const cacheKey = getEventCacheKey(EVENT_ID);
    await cacheService.delete(cacheKey);
    console.log("  ✓ Cleared individual event cache");

    const listPattern = getEventListCachePattern();
    const deleted = await cacheService.deletePattern(listPattern);
    console.log(`  ✓ Cleared ${deleted} event list cache entries\n`);

    console.log("=".repeat(80));
    console.log("EVENT FIX COMPLETE");
    console.log("=".repeat(80));
    console.log("\nThe event should now be visible at:");
    console.log(`  GET /api/events/${EVENT_ID}\n`);

    await mongoose.disconnect();
    console.log("✓ Disconnected from MongoDB");
  } catch (error) {
    console.error("Error fixing event:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the fix
fixEvent();
