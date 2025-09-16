const express = require('express');
const cors = require('cors');

const app = express();

// Basic middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Basic health check
app.get('/health/basic', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Test server is running',
    timestamp: new Date().toISOString()
  });
});

// Mock authentication middleware
app.use('/api/bookings', (req, res, next) => {
  // Simulate authentication check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authorization required',
      error: 'No valid token provided'
    });
  }

  // Mock user object
  req.user = {
    id: 'test-user-123',
    email: 'test@example.com',
    role: 'user'
  };
  next();
});

// Test booking endpoints
app.post('/api/bookings/initiate', (req, res) => {
  console.log('Booking initiate request:', req.body);
  console.log('User:', req.user);

  const { eventId, dateScheduleId, seats, paymentMethod } = req.body;

  // Validate required fields
  if (!eventId || !dateScheduleId || !seats) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
      error: 'eventId, dateScheduleId, and seats are required'
    });
  }

  res.json({
    success: true,
    message: 'Booking initiated successfully',
    data: {
      bookingId: `booking-${eventId}-${Date.now()}`,
      orderId: `order-${Date.now()}`,
      paymentIntentId: `pi_test_${Date.now()}`,
      clientSecret: `test_client_secret_${Date.now()}`,
      amount: seats * 50, // Mock price calculation
      currency: 'AED',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    }
  });
});

app.post('/api/bookings/confirm', (req, res) => {
  console.log('Booking confirm request:', req.body);
  console.log('User:', req.user);

  const { paymentIntentId, orderId } = req.body;

  if (!paymentIntentId || !orderId) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
      error: 'paymentIntentId and orderId are required'
    });
  }

  res.json({
    success: true,
    message: 'Booking confirmed successfully',
    data: {
      bookingId: `booking-confirmed-${Date.now()}`,
      eventTitle: 'Adventure Playground Experience',
      date: new Date().toISOString(),
      seats: 2,
      amountPaid: 100,
      currency: 'AED',
      status: 'confirmed',
      tickets: [
        {
          ticketId: `tkt_${Date.now()}_1`,
          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?data=ticket_${Date.now()}_1&size=200x200`
        }
      ]
    }
  });
});

// Mock events endpoint for testing
app.get('/api/events/:id', (req, res) => {
  const eventId = req.params.id;
  console.log('Get event request for ID:', eventId);

  res.json({
    success: true,
    message: 'Event retrieved successfully',
    data: {
      _id: eventId,
      title: 'Adventure Playground Experience',
      description: 'A fun-filled adventure playground experience for kids and families. Enjoy climbing, sliding, and playing in our safe and supervised environment.',
      location: {
        name: 'Adventure Zone Dubai',
        address: '123 Fun Street, Dubai Marina, Dubai',
        city: 'Dubai',
        coordinates: [25.0760, 55.1390]
      },
      category: 'Family Fun',
      subcategory: 'Playground',
      ageRange: '3-12 years',
      capacity: 50,
      price: 50,
      currency: 'AED',
      images: [
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800'
      ],
      dateSchedules: [
        {
          _id: 'test-schedule-123',
          startDateTime: new Date().toISOString(),
          endDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          availableSeats: 25,
          price: 50
        },
        {
          _id: 'test-schedule-456',
          startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
          availableSeats: 30,
          price: 50
        }
      ],
      amenities: ['Parking', 'Restrooms', 'Snack Bar', 'First Aid'],
      tags: ['family-friendly', 'outdoor', 'active'],
      status: 'active',
      isFeatured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
});

// Other booking endpoints
app.get('/api/bookings', (req, res) => {
  console.log('Get user bookings request');
  res.json({
    success: true,
    message: 'Bookings retrieved successfully',
    data: {
      bookings: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalBookings: 0
      }
    }
  });
});

const port = process.env.PORT || 5002;
app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health/basic`);
});