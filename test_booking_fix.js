const axios = require('axios');

// Test the booking flow to verify the fixes
async function testBookingFlow() {
  const baseURL = 'http://localhost:5001/api';

  console.log('🧪 Testing booking flow after bug fixes...\n');

  try {
    // 1. Test registration first, then login
    console.log('1. Testing user registration...');
    const registerResponse = await axios.post(`${baseURL}/auth/register`, {
      firstName: 'Test',
      lastName: 'User',
      email: 'test.booking@gema.com',
      password: 'Password123!',
      role: 'customer'
    });

    console.log('✅ Registration successful');

    // 2. Test login
    console.log('\n2. Testing login...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'test.booking@gema.com',
      password: 'password123'
    });

    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      const token = loginResponse.data.data.accessToken;

      // 3. Get events to find one with schedules
      console.log('\n3. Finding an event with schedules...');
      const eventsResponse = await axios.get(`${baseURL}/events`);
      const events = eventsResponse.data.data.events || eventsResponse.data.data || [];

      const eventWithSchedule = events.find(event =>
        event.dateSchedule &&
        event.dateSchedule.length > 0 &&
        event.dateSchedule.some(schedule =>
          (schedule.startDate || schedule.date) &&
          schedule.availableSeats > 0
        )
      );

      if (!eventWithSchedule) {
        console.log('❌ No event found with valid schedules and available seats');
        return;
      }

      console.log(`✅ Found event: ${eventWithSchedule.title}`);
      console.log(`   Event ID: ${eventWithSchedule._id}`);

      // Find a schedule with available seats
      const validSchedule = eventWithSchedule.dateSchedule.find(schedule =>
        (schedule.startDate || schedule.date) && schedule.availableSeats > 0
      );

      if (!validSchedule) {
        console.log('❌ No valid schedule found with available seats');
        return;
      }

      console.log(`   Schedule ID: ${validSchedule._id}`);
      console.log(`   Schedule Date: ${validSchedule.startDate || validSchedule.date}`);
      console.log(`   Available Seats: ${validSchedule.availableSeats}`);

      // 4. Test booking initiation
      console.log('\n4. Testing booking initiation...');
      const initiateBookingResponse = await axios.post(
        `${baseURL}/bookings/initiate`,
        {
          eventId: eventWithSchedule._id,
          dateScheduleId: validSchedule._id,
          seats: 1,
          paymentMethod: 'test'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (initiateBookingResponse.data.success) {
        console.log('✅ Booking initiation successful');
        const { paymentIntentId, orderId } = initiateBookingResponse.data.data;
        console.log(`   Order ID: ${orderId}`);
        console.log(`   Payment Intent ID: ${paymentIntentId}`);

        // 5. Test booking confirmation
        console.log('\n5. Testing booking confirmation...');
        const confirmBookingResponse = await axios.post(
          `${baseURL}/bookings/confirm`,
          {
            paymentIntentId: paymentIntentId
          },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (confirmBookingResponse.data.success) {
          console.log('✅ Booking confirmation successful!');
          console.log(`   Booking ID: ${confirmBookingResponse.data.data.booking.orderNumber}`);
          console.log(`   Status: ${confirmBookingResponse.data.data.booking.status}`);
          console.log(`   Payment Status: ${confirmBookingResponse.data.data.booking.paymentStatus}`);
        } else {
          console.log('❌ Booking confirmation failed:');
          console.log('   Response:', JSON.stringify(confirmBookingResponse.data, null, 2));
        }
      } else {
        console.log('❌ Booking initiation failed:');
        console.log('   Response:', JSON.stringify(initiateBookingResponse.data, null, 2));
      }

    } else {
      console.log('❌ Login failed:', loginResponse.data);
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

  console.log('\n🏁 Test completed');
}

// Run the test
testBookingFlow();