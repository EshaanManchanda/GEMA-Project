import mongoose from 'mongoose';
import Collection from '../models/Collection';
import logger from '../config/logger';

/**
 * Rollback Script: Remove embedded eventsData
 * Reverts collections to ObjectId[] references only
 */

async function rollbackCollectionEvents(dryRun: boolean = true) {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gema';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    logger.info('\n=== Collection Events Rollback ===\n');
    logger.info(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

    const collections = await Collection.find({
      eventsData: { $exists: true, $ne: [] }
    });

    logger.info(`Found ${collections.length} collections with embedded data\n`);

    if (dryRun) {
      logger.info('[DRY RUN] Would remove eventsData from these collections:');
      collections.forEach(c => {
        logger.info(`- "${c.title}" (${c._id}): ${c.eventsData?.length || 0} events`);
      });
    } else {
      const result = await Collection.updateMany(
        { eventsData: { $exists: true } },
        {
          $unset: { eventsData: '', dataVersion: '', lastSyncedAt: '' }
        }
      );

      logger.info(`✅ Rolled back ${result.modifiedCount} collections`);
    }

    await mongoose.connection.close();
    logger.info('\n✅ Rollback complete\n');

  } catch (error) {
    logger.error('Fatal error during rollback:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Parse args
const dryRun = !process.argv.includes('--live');

if (!dryRun) {
  console.log('\n⚠️  WARNING: Running LIVE rollback!');
  console.log('⚠️  This will remove embedded event data!');
  console.log('⚠️  Press Ctrl+C within 5 seconds to cancel...\n');

  setTimeout(() => {
    rollbackCollectionEvents(false);
  }, 5000);
} else {
  rollbackCollectionEvents(true);
}
