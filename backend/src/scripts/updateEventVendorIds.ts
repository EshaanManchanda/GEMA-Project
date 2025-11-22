/**
 * Migration Script: Update Event.vendorId from User._id to Vendor._id
 *
 * CRITICAL: This script updates all Event.vendorId references from User._id to Vendor._id
 * Run this AFTER the code has been updated to use the new Vendor model.
 *
 * Usage:
 *   npx ts-node src/scripts/updateEventVendorIds.ts
 */

import mongoose from 'mongoose';
import { Event, User, Vendor } from '../models';
import { config } from '../config';

interface MigrationResult {
  totalEvents: number;
  updatedEvents: number;
  skippedEvents: number;
  failedEvents: number;
  errors: Array<{ eventId: string; error: string }>;
}

async function updateEventVendorIds(): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalEvents: 0,
    updatedEvents: 0,
    skippedEvents: 0,
    failedEvents: 0,
    errors: []
  };

  try {
    console.log('🚀 Starting Event vendorId migration...\n');

    // Get all events
    const events = await Event.find({}).select('_id vendorId title');
    result.totalEvents = events.length;

    console.log(`📊 Found ${result.totalEvents} events to process\n`);

    for (const event of events) {
      try {
        const oldVendorId = event.vendorId;

        // Check if vendorId is a User._id (old format)
        const user = await User.findById(oldVendorId).select('role');

        if (!user) {
          console.log(`⚠️  Event ${event._id} (${event.title}): User not found for vendorId ${oldVendorId}`);
          result.skippedEvents++;
          continue;
        }

        if (user.role !== 'vendor') {
          console.log(`⚠️  Event ${event._id} (${event.title}): User ${oldVendorId} is not a vendor (role: ${user.role})`);
          result.skippedEvents++;
          continue;
        }

        // Find corresponding Vendor profile
        const vendor = await Vendor.findOne({ userId: oldVendorId });

        if (!vendor) {
          console.log(`❌ Event ${event._id} (${event.title}): No Vendor profile found for userId ${oldVendorId}`);
          result.errors.push({
            eventId: event._id.toString(),
            error: `No Vendor profile for userId ${oldVendorId}`
          });
          result.failedEvents++;
          continue;
        }

        // Update event's vendorId to Vendor._id
        if (event.vendorId.toString() !== vendor._id.toString()) {
          await Event.updateOne(
            { _id: event._id },
            { $set: { vendorId: vendor._id } }
          );

          console.log(`✅ Event ${event._id} (${event.title}): Updated vendorId from ${oldVendorId} to ${vendor._id}`);
          result.updatedEvents++;
        } else {
          console.log(`ℹ️  Event ${event._id} (${event.title}): Already using Vendor._id, skipping`);
          result.skippedEvents++;
        }

      } catch (error: any) {
        console.error(`❌ Error processing event ${event._id}:`, error.message);
        result.errors.push({
          eventId: event._id.toString(),
          error: error.message
        });
        result.failedEvents++;
      }
    }

    return result;

  } catch (error: any) {
    console.error('❌ Fatal error during migration:', error);
    throw error;
  }
}

async function main() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB\n');

    // Run migration
    const result = await updateEventVendorIds();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Events:    ${result.totalEvents}`);
    console.log(`✅ Updated:      ${result.updatedEvents}`);
    console.log(`ℹ️  Skipped:      ${result.skippedEvents}`);
    console.log(`❌ Failed:       ${result.failedEvents}`);
    console.log('='.repeat(60));

    if (result.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      result.errors.forEach(err => {
        console.log(`  - Event ${err.eventId}: ${err.error}`);
      });
    }

    if (result.updatedEvents > 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log(`   ${result.updatedEvents} events now reference Vendor._id`);
    } else {
      console.log('\nℹ️  No events were updated (already migrated or no valid events found)');
    }

    // Close connection
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { updateEventVendorIds };
