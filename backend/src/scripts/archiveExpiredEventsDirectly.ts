import { Event } from '../models';
import { connectDB } from '../config';

async function archiveExpiredEventsDirectly() {
  try {
    console.log('🚀 Archiving expired events directly...');

    // Connect to database
    await connectDB();

    const now = new Date();
    console.log(`Current time: ${now}`);

    // Find all active published events
    const activeEvents = await Event.find({
      isActive: true,
      isApproved: true,
      status: 'published',
      isDeleted: false
    });

    console.log(`Found ${activeEvents.length} active published events to check`);

    let archivedCount = 0;

    for (const event of activeEvents) {
      console.log(`\nChecking event: "${event.title}"`);

      // Get the latest endDate from dateSchedule array
      let latestEndDate: Date | null = null;

      if (event.dateSchedule && event.dateSchedule.length > 0) {
        for (const schedule of event.dateSchedule) {
          // Access the raw data which has startDate and endDate
          const rawSchedule = schedule as any;
          const endDate = rawSchedule.endDate || rawSchedule.date;

          if (endDate) {
            const endDateObj = new Date(endDate);
            if (!latestEndDate || endDateObj > latestEndDate) {
              latestEndDate = endDateObj;
            }
          }
        }
      }

      if (latestEndDate) {
        console.log(`  Latest end date: ${latestEndDate}`);

        // Add 24-hour buffer
        const expirationDate = new Date(latestEndDate.getTime() + 24 * 60 * 60 * 1000);
        console.log(`  Expiration date (with 24h buffer): ${expirationDate}`);

        const isExpired = now > expirationDate;
        console.log(`  Is expired: ${isExpired}`);

        if (isExpired) {
          // Archive the event
          await Event.updateOne(
            { _id: event._id },
            {
              isActive: false,
              status: 'archived'
            }
          );

          archivedCount++;
          console.log(`  ✅ Archived expired event: ${event.title}`);
        } else {
          console.log(`  ⏳ Event is not expired yet`);
        }
      } else {
        console.log(`  ❌ No valid end date found for event: ${event.title}`);
      }
    }

    console.log(`\n🎉 Archiving completed. Archived ${archivedCount} expired events.`);

    // Verify by checking remaining active events
    const remainingActiveEvents = await Event.countDocuments({
      isActive: true,
      isApproved: true,
      status: 'published',
      isDeleted: false
    });

    console.log(`Remaining active published events: ${remainingActiveEvents}`);

    return {
      success: true,
      archivedCount,
      remainingActiveEvents
    };

  } catch (error) {
    console.error('❌ Error archiving expired events:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  archiveExpiredEventsDirectly()
    .then((result) => {
      console.log('✅ Script completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export default archiveExpiredEventsDirectly;