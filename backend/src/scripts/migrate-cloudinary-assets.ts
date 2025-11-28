import cloudinary from '../config/cloudinary';
import MediaAsset from '../models/MediaAsset';
import mongoose from 'mongoose';
import { config } from '../config/env';
import { v4 as uuidv4 } from 'uuid';

/**
 * Cloudinary Asset Migration Script
 *
 * This script migrates existing Cloudinary assets to the MediaAsset database model
 * It scans Cloudinary folders and creates corresponding MediaAsset documents
 */

// Folder mapping: Cloudinary folder -> Category and Virtual folder
const FOLDER_MAPPING: Record<string, { category: string; folder: string }> = {
  'gema/blogs': { category: 'blog', folder: 'blogs.upload' },
  'gema/blogContent': { category: 'blog', folder: 'blogs.upload' },
  'gema/events': { category: 'event', folder: 'event.uploads' },
  'gema/users': { category: 'profile', folder: 'profile.upload' },
  'gema/venues': { category: 'event', folder: 'event.uploads' },
  'gema/documents': { category: 'document', folder: 'documents' },
  'gema/registrations': { category: 'document', folder: 'registrations' },
  'gema/tickets': { category: 'document', folder: 'tickets' },
  'gema/misc': { category: 'misc', folder: 'misc' }
};

// System user ID placeholder (will be used for uploadedBy field)
const SYSTEM_USER_ID = new mongoose.Types.ObjectId('000000000000000000000000');

async function connectDB() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function migrateFolder(cloudinaryFolder: string, mapping: { category: string; folder: string }) {
  let nextCursor: string | undefined = undefined;
  let folderCount = 0;

  console.log(`\n📁 Processing folder: ${cloudinaryFolder}`);

  do {
    try {
      // Fetch resources from Cloudinary
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: cloudinaryFolder,
        max_results: 500,
        next_cursor: nextCursor
      });

      // Process each resource
      for (const resource of result.resources) {
        try {
          // Check if already migrated
          const exists = await MediaAsset.findOne({ publicId: resource.public_id });

          if (exists) {
            console.log(`   ⏭️  Skipped (already exists): ${resource.public_id}`);
            continue;
          }

          // Determine file extension
          const extension = `.${resource.format}`;

          // Generate UUID for secure access
          const uuid = uuidv4();

          // Create MediaAsset document
          await MediaAsset.create({
            uuid,
            filename: resource.public_id.split('/').pop() || 'unknown',
            originalName: resource.public_id.split('/').pop() || 'unknown',
            mimeType: `${resource.resource_type}/${resource.format}`,
            fileExtension: extension,
            provider: 'cloudinary',
            url: `${config.upload.baseUrl}/api/media/file/${uuid}`,
            publicId: resource.public_id,
            cloudinaryFolder: cloudinaryFolder,
            size: resource.bytes,
            width: resource.width,
            height: resource.height,
            category: mapping.category as any,
            folder: mapping.folder,
            tags: resource.tags || [],
            uploadedBy: SYSTEM_USER_ID,
            usageCount: 0,
            isPublic: true,
            createdAt: new Date(resource.created_at)
          });

          folderCount++;
          console.log(`   ✅ Migrated: ${resource.public_id}`);

        } catch (error: any) {
          console.error(`   ❌ Error processing ${resource.public_id}:`, error.message);
        }
      }

      nextCursor = result.next_cursor;

    } catch (error: any) {
      console.error(`❌ Error fetching resources from ${cloudinaryFolder}:`, error.message);
      break;
    }
  } while (nextCursor);

  console.log(`📊 Migrated ${folderCount} assets from ${cloudinaryFolder}`);
  return folderCount;
}

async function migrateAllAssets() {
  console.log('🚀 Starting Cloudinary Asset Migration\n');
  console.log('=====================================\n');

  let totalMigrated = 0;

  // Migrate each folder
  for (const [cloudinaryFolder, mapping] of Object.entries(FOLDER_MAPPING)) {
    const count = await migrateFolder(cloudinaryFolder, mapping);
    totalMigrated += count;
  }

  console.log('\n=====================================');
  console.log('🎉 Migration Complete!');
  console.log(`📊 Total Assets Migrated: ${totalMigrated}`);
  console.log('=====================================\n');
}

// Main execution
async function main() {
  try {
    // Connect to database
    await connectDB();

    // Run migration
    await migrateAllAssets();

    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');

    process.exit(0);
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled Rejection:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

export default main;
