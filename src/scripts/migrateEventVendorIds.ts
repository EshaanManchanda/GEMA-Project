import mongoose from "mongoose";
import { Event, Vendor, User } from "../models/index";
import dotenv from "dotenv";

dotenv.config();

/**
 * Migrate Event.vendorId from User._id to Vendor._id
 * This script finds all events that have vendorId pointing to User._id
 * and updates them to point to the corresponding Vendor._id
 */
async function migrateEventVendorIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "");
    console.log("✅ Connected to MongoDB");

    // Get all events
    const events = await Event.find({});
    console.log(`\n📊 Found ${events.length} total events`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const event of events) {
      try {
        // Check if vendorId is a valid ObjectId
        if (!event.vendorId) {
          console.log(`⚠️  Event ${event._id} has no vendorId, skipping`);
          skippedCount++;
          continue;
        }

        // Try to find if this vendorId is actually a User._id
        const user = await User.findById(event.vendorId);

        if (user && user.role === "vendor") {
          // This vendorId is a User._id, need to migrate
          const vendor = await Vendor.findOne({ userId: user._id });

          if (vendor) {
            // Update the event with the correct Vendor._id
            event.vendorId = vendor._id as any;
            await event.save();
            console.log(
              `✅ Updated event ${event._id} (${event.title}) - User ${user._id} → Vendor ${vendor._id}`,
            );
            updatedCount++;
          } else {
            console.log(
              `⚠️  Event ${event._id} (${event.title}) - User ${user._id} found but no Vendor profile exists`,
            );
            skippedCount++;
          }
        } else {
          // vendorId might already be a Vendor._id or user not found
          const vendor = await Vendor.findById(event.vendorId);
          if (vendor) {
            console.log(
              `✓  Event ${event._id} (${event.title}) - Already has correct Vendor._id`,
            );
            skippedCount++;
          } else {
            console.log(
              `❌ Event ${event._id} (${event.title}) - vendorId ${event.vendorId} not found as User or Vendor`,
            );
            errorCount++;
          }
        }
      } catch (error) {
        console.error(`❌ Error processing event ${event._id}:`, error);
        errorCount++;
      }
    }

    console.log("\n📈 Migration Summary:");
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ⚠️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total: ${events.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
migrateEventVendorIds();
