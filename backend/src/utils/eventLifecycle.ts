import cron from 'node-cron';
import mongoose from 'mongoose';
import { Event } from '../models';

// Function to archive expired events using raw MongoDB queries for reliability
export const archiveExpiredEvents = async () => {
  try {
    console.log('Running event expiration job...');

    const now = new Date();

    // Use raw MongoDB collection for reliable data access
    const db = mongoose.connection.db!;
    const eventsCollection = db.collection('events');

    // Find all active published events
    const activeEvents = await eventsCollection.find({
      isActive: true,
      isApproved: true,
      status: 'published',
      isDeleted: false
    }).toArray();

    let archivedCount = 0;

    for (const event of activeEvents) {
      // Get the latest endDate from dateSchedule array
      let latestEndDate: Date | null = null;

      if (event.dateSchedule && event.dateSchedule.length > 0) {
        for (const schedule of event.dateSchedule) {
          const endDate = schedule.endDate || schedule.date;
          if (endDate) {
            const endDateObj = new Date(endDate);
            if (!latestEndDate || endDateObj > latestEndDate) {
              latestEndDate = endDateObj;
            }
          }
        }
      }

      if (latestEndDate) {
        // Add 24-hour buffer after the last event date
        const expirationDate = new Date(latestEndDate.getTime() + 24 * 60 * 60 * 1000);
        const isExpired = now > expirationDate;

        if (isExpired) {
          // Archive the event
          await eventsCollection.updateOne(
            { _id: event._id },
            {
              $set: {
                isActive: false,
                status: 'archived'
              }
            }
          );

          archivedCount++;
          console.log(`Archived expired event: ${event.title} (ID: ${event._id})`);
        }
      }
    }

    console.log(`Event expiration job completed. Archived ${archivedCount} events.`);

    return {
      success: true,
      archivedCount,
      message: `Archived ${archivedCount} expired events`
    };

  } catch (error) {
    console.error('Error in event expiration job:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Function to reactivate events that are not yet expired (in case they were incorrectly archived)
export const reactivateValidEvents = async () => {
  try {
    console.log('Running event reactivation check...');

    // Find archived events that might still be valid
    const archivedEvents = await Event.find({
      isActive: false,
      status: 'archived',
      isApproved: true,
      isDeleted: false
    });

    let reactivatedCount = 0;

    for (const event of archivedEvents) {
      // Check if event is actually not expired
      if (!event.isExpired()) {
        // Reactivate the event
        event.isActive = true;
        event.status = 'published';
        await event.save();
        reactivatedCount++;

        console.log(`Reactivated valid event: ${event.title} (ID: ${event._id})`);
      }
    }

    console.log(`Event reactivation check completed. Reactivated ${reactivatedCount} events.`);

    return {
      success: true,
      reactivatedCount,
      message: `Reactivated ${reactivatedCount} valid events`
    };

  } catch (error) {
    console.error('Error in event reactivation job:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Function to get event lifecycle statistics
export const getEventLifecycleStats = async () => {
  try {
    const stats = await Event.aggregate([
      {
        $match: { isDeleted: false }
      },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          activeEvents: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          archivedEvents: {
            $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] }
          },
          publishedEvents: {
            $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
          },
          pendingEvents: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          draftEvents: {
            $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
          },
          rejectedEvents: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      }
    ]);

    return stats[0] || {
      totalEvents: 0,
      activeEvents: 0,
      archivedEvents: 0,
      publishedEvents: 0,
      pendingEvents: 0,
      draftEvents: 0,
      rejectedEvents: 0
    };
  } catch (error) {
    console.error('Error getting event lifecycle stats:', error);
    throw error;
  }
};

// Combined function to run all lifecycle maintenance tasks
export const runEventLifecycleMaintenance = async () => {
  try {
    console.log('Starting event lifecycle maintenance...');

    const archiveResult = await archiveExpiredEvents();
    const reactivateResult = await reactivateValidEvents();
    const stats = await getEventLifecycleStats();

    console.log('Event lifecycle maintenance completed.');
    console.log('Current stats:', stats);

    return {
      success: true,
      archiveResult,
      reactivateResult,
      stats
    };
  } catch (error) {
    console.error('Error in event lifecycle maintenance:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Schedule event lifecycle jobs
export const scheduleEventLifecycleJobs = () => {
  try {
    // Run event lifecycle maintenance daily at midnight (00:00)
    cron.schedule('0 0 * * *', runEventLifecycleMaintenance);

    // Run a quick check every 6 hours to catch any urgent expirations
    cron.schedule('0 */6 * * *', archiveExpiredEvents);

    console.log('Event lifecycle management jobs scheduled successfully');
    console.log('- Full maintenance: Daily at 00:00 UTC');
    console.log('- Quick expiration check: Every 6 hours');

    return true;
  } catch (error) {
    console.error('Error scheduling event lifecycle jobs:', error);
    return false;
  }
};

// Manual functions that can be called via API or admin interface
export const manualArchiveExpiredEvents = archiveExpiredEvents;
export const manualReactivateValidEvents = reactivateValidEvents;
export const manualEventLifecycleMaintenance = runEventLifecycleMaintenance;
export const manualGetEventLifecycleStats = getEventLifecycleStats;