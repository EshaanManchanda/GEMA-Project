// Use built-in fetch in Node.js 18+

async function testGenerateMissingTickets() {
  try {
    // First, let's login to get a valid token
    console.log('🔐 Logging in to get auth token...');
    const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'customer2@gema.com',
        password: 'Password123!', // Strong password format
      })
    });

    const loginResult = await loginResponse.json();
    console.log('Login status:', loginResponse.status);

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResult);
      return;
    }

    const token = loginResult.token;
    console.log('✅ Login successful, token length:', token.length);

    // Test generating missing tickets
    const orderId = '68ca50fcf3e9d517f8bf1522';
    console.log('\n🎫 Testing generate missing tickets for order:', orderId);

    const generateResponse = await fetch('http://localhost:5001/api/tickets/generate-missing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ orderId })
    });

    const generateResult = await generateResponse.json();
    console.log('Generate tickets status:', generateResponse.status);
    console.log('Generate tickets response:', JSON.stringify(generateResult, null, 2));

    if (generateResponse.ok) {
      console.log('✅ Tickets generated successfully!');

      // Now test fetching the tickets
      console.log('\n📋 Fetching tickets for order:', orderId);
      const fetchResponse = await fetch(`http://localhost:5001/api/tickets/order/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const fetchResult = await fetchResponse.json();
      console.log('Fetch tickets status:', fetchResponse.status);
      console.log('Fetch tickets response:', JSON.stringify(fetchResult, null, 2));

      if (fetchResult.tickets && fetchResult.tickets.length > 0) {
        console.log(`✅ Found ${fetchResult.tickets.length} tickets!`);
      } else {
        console.log('❌ No tickets found');
      }
    } else {
      console.error('❌ Ticket generation failed:', generateResult);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

console.log('🧪 Testing generate missing tickets API...');
testGenerateMissingTickets();