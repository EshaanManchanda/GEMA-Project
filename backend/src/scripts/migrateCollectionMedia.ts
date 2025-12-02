import mongoose from 'mongoose';
import Collection from '../models/Collection';
import { connectDB } from '../config/database';

/**
 * Migration script to update existing collections with MediaAsset references
 * Matches icon/featuredImage URLs to existing MediaAsset documents
 */
async function migrateCollectionMedia() {
  try {
    await connectDB();
    console.log('Connected to database');

    // Import MediaAsset model dynamically to avoid circular dependencies
    const MediaAsset = (await import('../models/MediaAsset')).default;

    // Find collections without iconAsset or featuredImageAsset
    const collections = await Collection.find({
      $or: [
        { iconAsset: { $exists: false } },
        { iconAsset: null },
        { featuredImageAsset: { $exists: false } },
        { featuredImageAsset: null }
      ]
    });

    console.log(`Found ${collections.length} collections to potentially migrate`);

    let migratedCount = 0;
    let iconCount = 0;
    let featuredImageCount = 0;

    for (const collection of collections) {
      let updated = false;

      // Migrate icon: Check if URL matches any MediaAsset
      if (collection.icon && !collection.iconAsset) {
        // Try to find MediaAsset by URL
        const asset = await MediaAsset.findOne({ url: collection.icon });
        if (asset) {
          collection.iconAsset = asset._id as mongoose.Types.ObjectId;
          updated = true;
          iconCount++;
          console.log(`✓ Migrated icon for collection: ${collection.title}`);
        } else {
          console.log(`⚠ No MediaAsset found for icon URL in collection: ${collection.title}`);
        }
      }

      // Migrate featured image
      if (collection.featuredImage && !collection.featuredImageAsset) {
        const asset = await MediaAsset.findOne({ url: collection.featuredImage });
        if (asset) {
          collection.featuredImageAsset = asset._id as mongoose.Types.ObjectId;
          updated = true;
          featuredImageCount++;
          console.log(`✓ Migrated featured image for collection: ${collection.title}`);
        } else {
          console.log(`⚠ No MediaAsset found for featured image URL in collection: ${collection.title}`);
        }
      }

      if (updated) {
        await collection.save();
        migratedCount++;
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Total collections processed: ${collections.length}`);
    console.log(`Collections updated: ${migratedCount}`);
    console.log(`Icons migrated: ${iconCount}`);
    console.log(`Featured images migrated: ${featuredImageCount}`);

    await mongoose.disconnect();
    console.log('Disconnected from database');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  migrateCollectionMedia()
    .then(() => {
      console.log('Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateCollectionMedia;
