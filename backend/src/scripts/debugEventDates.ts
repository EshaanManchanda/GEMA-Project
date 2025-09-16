import { Event } from '../models';
import { connectDB } from '../config';

async function debugEventDates() {
  try {
    console.log('🔍 Debugging event dates...');

    // Connect to database
    await connectDB();

    // Get all events
    const events = await Event.find({ isDeleted: false }).select('title dateSchedule');

    console.log(`Found ${events.length} events:`);

    for (const event of events) {
      console.log(`\n📅 Event: "${event.title}"`);
      console.log('   Date Schedule:', JSON.stringify(event.dateSchedule, null, 2));

      // Test the getEndDate method
      const endDate = event.getEndDate();
      console.log('   Calculated End Date:', endDate);

      // Test the isExpired method
      const isExpired = event.isExpired();
      console.log('   Is Expired:', isExpired);

      // Show current time for reference
      console.log('   Current Time:', new Date());

      if (endDate) {
        const expirationDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
        console.log('   Expiration Date (with 24h buffer):', expirationDate);
        console.log('   Days since expiration:', (new Date().getTime() - expirationDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error debugging events:', error);
    process.exit(1);
  }
}

// Run the debug
debugEventDates();