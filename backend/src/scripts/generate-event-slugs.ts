import mongoose from 'mongoose';
import Event from '../models/Event';
import { connectDB } from '../config/database';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Helper to disconnect from database
const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('✅ Disconnected from MongoDB');
  }
};

/**
 * Helper function to generate slug from title
 */
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')        // Replace multiple hyphens with single hyphen
    .substring(0, 200);         // Limit length
};

/**
 * Generate unique slugs for all existing events that don't have one
 */
async function generateEventSlugs() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Find all events without slugs
    const eventsWithoutSlugs = await Event.find({
      $or: [
        { slug: { $exists: false } },
        { slug: null },
        { slug: '' }
      ]
    });

    console.log(`📊 Found ${eventsWithoutSlugs.length} events without slugs\n`);

    if (eventsWithoutSlugs.length === 0) {
      console.log('✅ All events already have slugs. Nothing to do.');
      await disconnectDB();
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ eventId: string; title: string; error: string }> = [];

    for (const event of eventsWithoutSlugs) {
      try {
        const baseSlug = generateSlug(event.title);
        let slug = baseSlug;
        let counter = 1;

        // Check for slug uniqueness, append counter if needed
        while (true) {
          const existing = await Event.findOne({
            slug,
            _id: { $ne: event._id }
          });

          if (!existing) {
            break;
          }

          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        // Update the event with the new slug
        event.slug = slug;
        await event.save({ validateBeforeSave: false }); // Skip validation to avoid other required field issues

        successCount++;
        console.log(`✅ [${successCount}/${eventsWithoutSlugs.length}] Generated slug for event: "${event.title}"`);
        console.log(`   Slug: ${slug}\n`);
      } catch (error: any) {
        errorCount++;
        const errorMsg = error.message || 'Unknown error';
        errors.push({
          eventId: event._id.toString(),
          title: event.title,
          error: errorMsg
        });
        console.error(`❌ [${successCount + errorCount}/${eventsWithoutSlugs.length}] Failed to generate slug for event: "${event.title}"`);
        console.error(`   Error: ${errorMsg}\n`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully generated slugs: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📝 Total processed: ${eventsWithoutSlugs.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  ERRORS:');
      errors.forEach((err, index) => {
        console.log(`${index + 1}. Event ID: ${err.eventId}`);
        console.log(`   Title: ${err.title}`);
        console.log(`   Error: ${err.error}\n`);
      });
    }

    console.log('\n✅ Migration completed successfully!');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    await disconnectDB();
    process.exit(1);
  }
}

// Run the migration
console.log('\n' + '='.repeat(60));
console.log('🚀 STARTING EVENT SLUG GENERATION MIGRATION');
console.log('='.repeat(60) + '\n');

generateEventSlugs();
