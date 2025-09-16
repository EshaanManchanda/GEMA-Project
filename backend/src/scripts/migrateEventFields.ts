import mongoose from 'mongoose';
import { Event } from '../models';
import { config, connectDB, logger } from '../config';

/**
 * Migration script to update existing events with new lifecycle fields
 * This fixes the issue where no events show on search page after adding isActive and status fields
 */

const migrateEventFields = async () => {
  try {
    console.log('🚀 Starting event fields migration...');

    // Connect to database
    await connectDB();

    // Get total count of events that need migration
    const totalEvents = await Event.countDocuments({ isDeleted: false });
    console.log(`📊 Found ${totalEvents} total events to check`);

    // Find events that don't have isActive or status fields set
    const eventsWithoutFields = await Event.countDocuments({
      isDeleted: false,
      $or: [
        { isActive: { $exists: false } },
        { status: { $exists: false } },
        { status: null }
      ]
    });

    console.log(`🔄 Events needing field updates: ${eventsWithoutFields}`);

    if (eventsWithoutFields === 0) {
      console.log('✅ All events already have the required fields. No migration needed.');
      return;
    }

    let updatedCount = 0;

    // Update approved events to be active and published
    const approvedEventsUpdate = await Event.updateMany(
      {
        isDeleted: false,
        isApproved: true,
        $or: [
          { isActive: { $exists: false } },
          { status: { $exists: false } },
          { status: null }
        ]
      },
      {
        $set: {
          isActive: true,
          status: 'published'
        }
      }
    );

    updatedCount += approvedEventsUpdate.modifiedCount;
    console.log(`✅ Updated ${approvedEventsUpdate.modifiedCount} approved events to active/published`);

    // Update non-approved events to be inactive and pending
    const nonApprovedEventsUpdate = await Event.updateMany(
      {
        isDeleted: false,
        isApproved: false,
        $or: [
          { isActive: { $exists: false } },
          { status: { $exists: false } },
          { status: null }
        ]
      },
      {
        $set: {
          isActive: false,
          status: 'pending'
        }
      }
    );

    updatedCount += nonApprovedEventsUpdate.modifiedCount;
    console.log(`✅ Updated ${nonApprovedEventsUpdate.modifiedCount} non-approved events to inactive/pending`);

    // Handle events with isApproved not set (legacy)
    const legacyEventsUpdate = await Event.updateMany(
      {
        isDeleted: false,
        isApproved: { $exists: false },
        $or: [
          { isActive: { $exists: false } },
          { status: { $exists: false } },
          { status: null }
        ]
      },
      {
        $set: {
          isApproved: false,
          isActive: false,
          status: 'pending'
        }
      }
    );

    updatedCount += legacyEventsUpdate.modifiedCount;
    console.log(`✅ Updated ${legacyEventsUpdate.modifiedCount} legacy events (no isApproved field)`);

    // Verify the migration
    const verificationStats = await Event.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          activeEvents: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          publishedEvents: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
          pendingEvents: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          approvedEvents: { $sum: { $cond: [{ $eq: ['$isApproved', true] }, 1, 0] } }
        }
      }
    ]);

    const stats = verificationStats[0];

    console.log('\n📈 Migration Results:');
    console.log(`   Total Events: ${stats.totalEvents}`);
    console.log(`   Active Events: ${stats.activeEvents}`);
    console.log(`   Published Events: ${stats.publishedEvents}`);
    console.log(`   Pending Events: ${stats.pendingEvents}`);
    console.log(`   Approved Events: ${stats.approvedEvents}`);
    console.log(`   Total Updated: ${updatedCount}`);

    console.log('\n🎉 Event fields migration completed successfully!');
    console.log('   Search page should now show events again.');

    return {
      success: true,
      totalUpdated: updatedCount,
      stats
    };

  } catch (error) {
    console.error('❌ Error during migration:', error);
    logger.error('Event migration failed:', error);
    throw error;
  }
};

// Run migration if script is executed directly
if (require.main === module) {
  migrateEventFields()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateEventFields;