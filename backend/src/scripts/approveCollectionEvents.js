const mongoose = require('mongoose');
require('dotenv').config();

const approveCollectionEvents = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Event = mongoose.model('Event', new mongoose.Schema({}, { strict: false, collection: 'events' }));

    const eventIds = [
      '69477bc6c4b97939698be362',
      '69477bc6c4b97939698be35c',
      '69477bc6c4b97939698be34e',
      '69477bc6c4b97939698be355'
    ];

    console.log('\n📋 Checking events...\n');

    for (const id of eventIds) {
      const event = await Event.findById(id);
      if (event) {
        console.log(`Event: ${event.title || 'Untitled'} (${id})`);
        console.log(`  Before - isApproved: ${event.isApproved}, status: ${event.status}, isDeleted: ${event.isDeleted}`);

        // Update to approved and published
        await Event.findByIdAndUpdate(id, {
          isApproved: true,
          status: 'published',
          isDeleted: false
        });

        console.log(`  After  - isApproved: true, status: published, isDeleted: false ✅`);
      } else {
        console.log(`❌ Event ${id}: NOT FOUND`);
      }
      console.log('');
    }

    console.log('✅ All events approved and published!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

approveCollectionEvents();
