/**
 * Cleanup Orphaned Media Assets Script
 *
 * This script identifies and optionally removes media assets that are not referenced
 * by any blog or event (usageCount = 0).
 *
 * Usage:
 *   npm run script:cleanup-media [--dry-run] [--delete]
 *
 * Options:
 *   --dry-run    Show what would be deleted without actually deleting (default)
 *   --delete     Actually delete orphaned media assets
 */

import mongoose from 'mongoose';
import MediaAsset from '../models/MediaAsset';
import { CloudinaryProvider } from '../services/storage/CloudinaryProvider';
import { config } from '../config/env';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = !args.includes('--delete');

// Initialize Cloudinary provider
const cloudinaryProvider = new CloudinaryProvider();

async function cleanupOrphanedMedia() {
  try {
    console.log('=== Orphaned Media Cleanup Script ===\n');
    console.log('Connecting to database...');

    // Connect to database
    await mongoose.connect(config.mongodbUri);
    console.log('✓ Connected to database\n');

    // Find orphaned media assets (usageCount = 0)
    console.log('Searching for orphaned media assets...');
    const orphanedAssets = await MediaAsset.find({
      usageCount: { $eq: 0 }
    }).sort({ createdAt: -1 });

    console.log(`\nFound ${orphanedAssets.length} orphaned media asset(s)\n`);

    if (orphanedAssets.length === 0) {
      console.log('✓ No orphaned media assets found. Your media library is clean!');
      return;
    }

    // Display orphaned assets
    console.log('Orphaned Media Assets:');
    console.log('─────────────────────────────────────────────────────────────');

    let totalSize = 0;
    orphanedAssets.forEach((asset, index) => {
      const sizeMB = (asset.size / (1024 * 1024)).toFixed(2);
      totalSize += asset.size;

      console.log(`${index + 1}. ${asset.originalName}`);
      console.log(`   ID: ${asset._id}`);
      console.log(`   Type: ${asset.mimeType}`);
      console.log(`   Size: ${sizeMB} MB`);
      console.log(`   Folder: ${asset.folder || 'root'}`);
      console.log(`   Created: ${asset.createdAt.toLocaleDateString()}`);
      console.log(`   Cloudinary ID: ${asset.publicId || 'N/A'}`);
      console.log('');
    });

    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`Total orphaned assets: ${orphanedAssets.length}`);
    console.log(`Total size: ${totalSizeMB} MB`);
    console.log('─────────────────────────────────────────────────────────────\n');

    if (isDryRun) {
      console.log('ℹ DRY RUN MODE - No files will be deleted');
      console.log('To actually delete these files, run with --delete flag:');
      console.log('  npm run script:cleanup-media -- --delete\n');
    } else {
      console.log('⚠ DELETE MODE - Removing orphaned assets...\n');

      let successCount = 0;
      let failCount = 0;
      const errors: Array<{ asset: string; error: string }> = [];

      for (const asset of orphanedAssets) {
        try {
          // Delete from Cloudinary
          if (asset.publicId) {
            await cloudinaryProvider.delete(asset.publicId);
            console.log(`✓ Deleted from Cloudinary: ${asset.originalName}`);
          }

          // Delete from database
          await MediaAsset.findByIdAndDelete(asset._id);
          console.log(`✓ Deleted from database: ${asset.originalName}\n`);

          successCount++;
        } catch (error: any) {
          console.error(`✗ Failed to delete ${asset.originalName}: ${error.message}\n`);
          errors.push({
            asset: asset.originalName,
            error: error.message
          });
          failCount++;
        }
      }

      console.log('\n=== Cleanup Summary ===');
      console.log(`Successfully deleted: ${successCount} asset(s)`);
      console.log(`Failed to delete: ${failCount} asset(s)`);

      if (errors.length > 0) {
        console.log('\nErrors encountered:');
        errors.forEach(({ asset, error }) => {
          console.log(`  - ${asset}: ${error}`);
        });
      }
    }

  } catch (error: any) {
    console.error('Error running cleanup script:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from database');
  }
}

// Run the script
cleanupOrphanedMedia()
  .then(() => {
    console.log('\n✓ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });
