/**
 * Script to fix MongoDB event data for event ID: 68e2076e58c257675833514d
 *
 * Issues to fix:
 * 1. Add missing endDate field to dateSchedule
 * 2. Set availableSeats to a value > 0 (currently 0)
 * 3. Set totalSeats to match availableSeats
 *
 * Run this script with: node backend/fix-event-schedule.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables from backend directory
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gema';

async function fixEventSchedule() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log('URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials in log

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    const db = mongoose.connection.db;
    const eventsCollection = db.collection('events');

    const eventId = '68e2076e58c257675833514d';
    console.log(`\n🔍 Looking for event with ID: ${eventId}`);

    // Find the event first
    const event = await eventsCollection.findOne({ _id: new mongoose.Types.ObjectId(eventId) });

    if (!event) {
      console.error('❌ Event not found!');
      process.exit(1);
    }

    console.log('\n📋 Current event data:');
    console.log('Title:', event.title);
    console.log('Current dateSchedule:', JSON.stringify(event.dateSchedule, null, 2));

    // Update the event with fixed schedule
    const result = await eventsCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(eventId) },
      {
        $set: {
          'dateSchedule.0.endDate': new Date('2025-10-16T20:50:00.000Z'), // 2 hours after start
          'dateSchedule.0.endDateTime': new Date('2025-10-16T20:50:00.000Z'), // Also set endDateTime for consistency
          'dateSchedule.0.availableSeats': 100,
          'dateSchedule.0.totalSeats': 100
        }
      }
    );

    if (result.modifiedCount === 1) {
      console.log('\n✅ Event schedule updated successfully!');

      // Fetch and display the updated event
      const updatedEvent = await eventsCollection.findOne({ _id: new mongoose.Types.ObjectId(eventId) });
      console.log('\n📋 Updated dateSchedule:');
      console.log(JSON.stringify(updatedEvent.dateSchedule, null, 2));
    } else {
      console.log('\n⚠️ No changes made (event might already be updated)');
    }

  } catch (error) {
    console.error('\n❌ Error fixing event schedule:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the fix
fixEventSchedule();
