import mongoose from 'mongoose';
import { Banner, MediaAsset } from '../models/index';
import { config } from '../config/index';
import seedBanners from './seedBanners';

/**
 * Fix Script: Re-seed Banners with Real Cloudinary Assets
 *
 * This script fixes the homepage banner placeholder issue by:
 * 1. Deleting existing banners and their MediaAssets
 * 2. Re-running the seeding script which now uploads to Cloudinary
 *
 * Run with: npm run db:fix-banners
 * Or: ts-node src/scripts/fix-banner-assets.ts
 */

const MONGODB_URI = config.mongodbUri;

async function fixBannerAssets() {
  try {
    console.log('🔧 Starting Banner MediaAsset Fix...\n');
    console.log(`📡 Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find existing banners
    console.log('🔍 Finding existing banners...');
    const existingBanners = await Banner.find();
    console.log(`📊 Found ${existingBanners.length} existing banners`);

    if (existingBanners.length > 0) {
      // Get MediaAsset IDs from banners
      const mediaAssetIds = existingBanners
        .map(b => b.imageAsset)
        .filter(id => id != null);

      console.log(`🗑️  Deleting ${mediaAssetIds.length} associated MediaAssets...`);
      const deletedAssets = await MediaAsset.deleteMany({
        _id: { $in: mediaAssetIds }
      });
      console.log(`✅ Deleted ${deletedAssets.deletedCount} MediaAssets`);

      console.log('🗑️  Deleting banners...');
      const deletedBanners = await Banner.deleteMany({});
      console.log(`✅ Deleted ${deletedBanners.deletedCount} Banners\n`);
    } else {
      console.log('ℹ️  No existing banners found\n');
    }

    // Close connection before re-seeding (seedBanners will reconnect)
    await mongoose.connection.close();
    console.log('✅ Disconnected from MongoDB\n');

    console.log('🌱 Re-seeding banners with Cloudinary uploads...\n');
    console.log('=' .repeat(50));

    // Re-run seeding script
    await seedBanners();

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Banner fix completed successfully!');
    console.log('✅ Banners now have real Cloudinary assets');
    console.log('✅ Homepage images should load correctly\n');

  } catch (error: any) {
    console.error('❌ Fix failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run fix if executed directly
if (require.main === module) {
  fixBannerAssets();
}

export default fixBannerAssets;
