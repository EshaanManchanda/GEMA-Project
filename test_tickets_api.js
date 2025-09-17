const fetch = require('node-fetch');

async function testTicketsAPI() {
  try {
    // Test without authentication first to see the error
    console.log('Testing tickets API without auth...');
    const unauthResponse = await fetch('http://localhost:5001/api/tickets/order/68c9a04a7759aa02302b7e50');
    console.log('Unauth Status:', unauthResponse.status);
    console.log('Unauth Response:', await unauthResponse.text());

    // Test booking API
    console.log('\nTesting booking API without auth...');
    const bookingResponse = await fetch('http://localhost:5001/api/bookings/68c9a04a7759aa02302b7e50');
    console.log('Booking Status:', bookingResponse.status);
    console.log('Booking Response:', await bookingResponse.text());

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTicketsAPI();