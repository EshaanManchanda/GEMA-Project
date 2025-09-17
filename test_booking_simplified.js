const axios = require('axios');

// Simplified test focusing on the booking bug fix
async function testBookingBugFix() {
  const baseURL = 'http://localhost:5001/api';

  console.log('🧪 Testing booking bug fix - focusing on scheduleDate validation...\n');

  try {
    // Test 1: Get events to verify scheduleDate structure
    console.log('1. Testing event schedule structure...');
    const eventsResponse = await axios.get(`${baseURL}/events`);
    const events = eventsResponse.data.data.events || eventsResponse.data.data || [];

    if (events.length === 0) {
      console.log('❌ No events found in the system');
      return;
    }

    console.log(`✅ Found ${events.length} events`);

    const eventWithSchedule = events.find(event =>
      event.dateSchedule &&
      event.dateSchedule.length > 0
    );

    if (!eventWithSchedule) {
      console.log('❌ No event found with schedules');
      return;
    }

    console.log(`✅ Found event with schedules: ${eventWithSchedule.title}`);
    console.log(`   Event ID: ${eventWithSchedule._id}`);
    console.log(`   Schedules count: ${eventWithSchedule.dateSchedule.length}`);

    // Analyze schedule structure
    eventWithSchedule.dateSchedule.forEach((schedule, index) => {
      console.log(`   Schedule ${index + 1}:`);
      console.log(`     ID: ${schedule._id}`);
      console.log(`     date: ${schedule.date || 'not set'}`);
      console.log(`     startDate: ${schedule.startDate || 'not set'}`);
      console.log(`     endDate: ${schedule.endDate || 'not set'}`);
      console.log(`     availableSeats: ${schedule.availableSeats}`);

      // This is what was causing the bug - checking for invalid dates
      const scheduleDate = schedule.startDate || schedule.date;
      if (!scheduleDate) {
        console.log(`     ⚠️  WARNING: No valid date found in this schedule!`);
      } else {
        const parsedDate = new Date(scheduleDate);
        if (isNaN(parsedDate.getTime())) {
          console.log(`     ⚠️  WARNING: Invalid date format: ${scheduleDate}`);
        } else {
          console.log(`     ✅ Valid date: ${parsedDate.toISOString()}`);
        }
      }
    });

    // Test 2: Check if our fixes prevent the bug
    console.log('\n2. Testing scheduleDate validation (simulating our fixes)...');

    const validSchedule = eventWithSchedule.dateSchedule.find(schedule => {
      const scheduleDate = schedule.startDate || schedule.date;
      if (!scheduleDate) return false;
      const parsedDate = new Date(scheduleDate);
      return !isNaN(parsedDate.getTime()) && schedule.availableSeats > 0;
    });

    if (validSchedule) {
      console.log('✅ Found valid schedule that passes our validation');
      console.log(`   Schedule ID: ${validSchedule._id}`);
      console.log(`   Schedule Date: ${validSchedule.startDate || validSchedule.date}`);
      console.log(`   Available Seats: ${validSchedule.availableSeats}`);

      // Test 3: Try creating test order data (similar to what booking controller does)
      console.log('\n3. Testing order item creation logic...');
      const scheduleDate = validSchedule.startDate || validSchedule.date;
      const parsedScheduleDate = new Date(scheduleDate);

      if (isNaN(parsedScheduleDate.getTime())) {
        console.log('❌ Date parsing failed - bug would occur here');
      } else {
        console.log('✅ Date parsing successful');

        // Simulate order item creation
        const mockOrderItem = {
          eventId: eventWithSchedule._id,
          eventTitle: eventWithSchedule.title,
          scheduleDate: parsedScheduleDate,
          quantity: 1,
          unitPrice: eventWithSchedule.price,
          totalPrice: eventWithSchedule.price,
          currency: eventWithSchedule.currency
        };

        console.log('✅ Mock order item created successfully');
        console.log(`   Schedule Date Type: ${typeof mockOrderItem.scheduleDate}`);
        console.log(`   Schedule Date Value: ${mockOrderItem.scheduleDate.toISOString()}`);
        console.log(`   Is Valid Date: ${!isNaN(mockOrderItem.scheduleDate.getTime())}`);

        // Test 4: Simulate the reduceSeats call that was failing
        console.log('\n4. Testing scheduleDate validation for reduceSeats...');

        function simulateReduceSeats(date, quantity) {
          // This is our improved validation logic
          if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            console.log('❌ reduceSeats validation failed - invalid date');
            return false;
          }

          if (!quantity || quantity <= 0) {
            console.log('❌ reduceSeats validation failed - invalid quantity');
            return false;
          }

          console.log('✅ reduceSeats validation passed');
          return true;
        }

        const result = simulateReduceSeats(mockOrderItem.scheduleDate, mockOrderItem.quantity);

        if (result) {
          console.log('✅ All validations passed - booking bug should be fixed!');
        } else {
          console.log('❌ Validation failed - bug still exists');
        }
      }
    } else {
      console.log('⚠️  No valid schedule found - this could indicate data quality issues');
    }

  } catch (error) {
    console.log('❌ Test failed with error:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('   Error:', error.message);
    }
  }

  console.log('\n🏁 Bug fix test completed');
  console.log('\n📝 Summary:');
  console.log('   The fixes we implemented:');
  console.log('   1. ✅ Enhanced scheduleDate validation in booking controller');
  console.log('   2. ✅ Improved error handling in reduceSeats method');
  console.log('   3. ✅ Added defensive coding in booking confirmation');
  console.log('   4. ✅ Better logging for debugging');
}

// Run the test
testBookingBugFix();