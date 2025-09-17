const fetch = require('node-fetch');

async function testBookingInitiation() {
  try {
    // You'll need to replace these with actual values from your system
    const testData = {
      eventId: "6747a1ce2cc7cf7ed632ca62", // Replace with actual event ID
      dateScheduleId: "6747a1ce2cc7cf7ed632ca63", // Replace with actual schedule ID
      seats: 2,
      paymentMethod: "test"
    };

    const response = await fetch('http://localhost:5001/api/bookings/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE' // Replace with actual token
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('API Error:', result);
    } else {
      console.log('✅ Booking initiation successful!');
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

console.log('🧪 Testing booking initiation API...');
testBookingInitiation();