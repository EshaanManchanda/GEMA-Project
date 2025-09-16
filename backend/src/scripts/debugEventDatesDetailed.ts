import { Event } from '../models';
import { connectDB } from '../config';

async function debugEventDatesDetailed() {
  try {
    console.log('🔍 Debugging event dates with detailed analysis...');

    // Connect to database
    await connectDB();

    // Get all events
    const events = await Event.find({ isDeleted: false }).select('title dateSchedule');

    console.log(`Found ${events.length} events:`);

    for (const event of events) {
      console.log(`\n📅 Event: "${event.title}"`);
      console.log('   Raw Date Schedule:', JSON.stringify(event.dateSchedule, null, 2));

      // Direct date analysis
      if (event.dateSchedule && event.dateSchedule.length > 0) {
        for (const schedule of event.dateSchedule) {
          console.log(`\n   Schedule Item:`);
          console.log(`     startDate: ${schedule.startDate} -> ${new Date(schedule.startDate)}`);
          console.log(`     endDate: ${schedule.endDate} -> ${new Date(schedule.endDate)}`);
          console.log(`     endDate exists: ${!!schedule.endDate}`);
          console.log(`     date exists: ${!!schedule.date}`);

          // Check if endDate is valid
          const endDate = new Date(schedule.endDate);
          const isValidEndDate = !isNaN(endDate.getTime());
          console.log(`     endDate is valid: ${isValidEndDate}`);

          if (isValidEndDate) {
            const now = new Date();
            const isPast = now > endDate;
            const daysDiff = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24);

            console.log(`     Current time: ${now}`);
            console.log(`     End date: ${endDate}`);
            console.log(`     Is past: ${isPast}`);
            console.log(`     Days difference: ${daysDiff.toFixed(2)}`);

            // Check with 24-hour buffer
            const expirationDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
            const isExpiredWithBuffer = now > expirationDate;
            console.log(`     Expiration date (with 24h buffer): ${expirationDate}`);
            console.log(`     Is expired with buffer: ${isExpiredWithBuffer}`);
          }
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error debugging events:', error);
    process.exit(1);
  }
}

// Run the debug
debugEventDatesDetailed();