import mongoose from 'mongoose';
import Event from '../models/Event';
import MediaAsset from '../models/MediaAsset';
import { config } from '../config/env';

/**
 * Migration Script: Event Images to MediaAssets
 *
 * Migrates event images from URL strings array to MediaAsset references
 * Uses model save to trigger usage tracking hooks
 */
async function migrateEventImages() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB');

    console.log('\n=== Starting Event Image Migration ===\n');

    // Find events with old field populated but new field empty
    const events = await Event.find({
      images: { $exists: true, $ne: [] },
      $or: [
        { imageAssets: { $exists: false } },
        { imageAssets: { $size: 0 } }
      ]
    });

    console.log(`Found ${events.length} events to migrate\n`);

    if (events.length === 0) {
      console.log('No events to migrate. All events are already using MediaAssets or have no images.');
      await mongoose.connection.close();
      return;
    }

    let migrated = 0;
    let skipped = 0;
    let totalImagesMigrated = 0;
    let totalImagesSkipped = 0;
    const errors: { eventId: string; title: string; error: string }[] = [];

    for (const event of events) {
      try {
        console.log(`Processing event: "${event.title}" (${event._id})`);
        console.log(`  Images count: ${event.images.length}`);

        const imageAssetIds: mongoose.Types.ObjectId[] = [];
        let eventImagesMigrated = 0;
        let eventImagesSkipped = 0;

        // Process each image URL
        for (const imageUrl of event.images) {
          try {
            // Try to find corresponding MediaAsset by URL
            const mediaAsset = await MediaAsset.findOne({ url: imageUrl });

            if (!mediaAsset) {
              console.warn(`    ⚠ No MediaAsset found for URL: ${imageUrl}`);
              eventImagesSkipped++;
              continue;
            }

            console.log(`    ✓ Found MediaAsset: ${mediaAsset.filename}`);
            imageAssetIds.push(mediaAsset._id as mongoose.Types.ObjectId);
            eventImagesMigrated++;

          } catch (error: any) {
            console.error(`    ❌ Error processing image URL ${imageUrl}:`, error.message);
            eventImagesSkipped++;
          }
        }

        // Update event if we found any matching MediaAssets
        if (imageAssetIds.length > 0) {
          event.imageAssets = imageAssetIds;
          await event.save();  // Model hooks will handle usage tracking

          console.log(`  ✅ Migrated ${eventImagesMigrated} images successfully`);
          if (eventImagesSkipped > 0) {
            console.log(`  ⚠  Skipped ${eventImagesSkipped} images (no matching MediaAsset)`);
          }

          migrated++;
          totalImagesMigrated += eventImagesMigrated;
          totalImagesSkipped += eventImagesSkipped;
        } else {
          console.warn(`  ⚠ No images could be migrated for this event`);
          skipped++;
          errors.push({
            eventId: event._id.toString(),
            title: event.title,
            error: 'No matching MediaAssets found for any image URLs'
          });
        }

        console.log('');

      } catch (error: any) {
        console.error(`  ❌ Error migrating event ${event._id}:`, error.message);
        skipped++;
        errors.push({
          eventId: event._id.toString(),
          title: event.title,
          error: error.message
        });
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`✅ Events migrated: ${migrated}`);
    console.log(`⚠  Events skipped: ${skipped}`);
    console.log(`📊 Total events: ${events.length}`);
    console.log(`📸 Total images migrated: ${totalImagesMigrated}`);
    console.log(`⚠️  Total images skipped: ${totalImagesSkipped}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((err, index) => {
        console.log(`${index + 1}. Event: "${err.title}" (${err.eventId})`);
        console.log(`   Error: ${err.error}`);
      });
    }

    // Validation: Check if any events still have only old field
    const remainingOldEvents = await Event.countDocuments({
      images: { $exists: true, $ne: [] },
      $or: [
        { imageAssets: { $exists: false } },
        { imageAssets: { $size: 0 } }
      ]
    });

    console.log(`\n📋 Validation: ${remainingOldEvents} events still using old field`);

    if (remainingOldEvents === 0) {
      console.log('✅ All events successfully migrated!');
    }

    await mongoose.connection.close();
    console.log('\n✅ Migration script completed');

  } catch (error) {
    console.error('Fatal error during migration:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
migrateEventImages().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
