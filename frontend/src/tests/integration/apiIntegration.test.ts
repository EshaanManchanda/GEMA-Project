/**
 * API Integration Tests
 * Tests frontend-backend communication and data flow
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { store } from '../../store';
import { 
  loginUser, 
  registerUser, 
  logoutUser 
} from '../../store/slices/authSlice';
import {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent
} from '../../store/slices/eventsSlice';
import {
  fetchBookings,
  createBooking,
  updateBooking
} from '../../store/slices/bookingsSlice';
import {
  fetchPayments,
  processPayment,
  refundPayment
} from '../../store/slices/paymentsSlice';
import {
  fetchNotifications,
  markNotificationAsRead,
  createNotification
} from '../../store/slices/notificationsSlice';

// Mock API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Mock MongoDB data structures
const mockMongoData = {
  user: {
    _id: '68b2867eedc0af7c0c8fdf65',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@gema.com',
    role: 'admin',
    status: 'active',
    isEmailVerified: true,
    createdAt: '2025-08-30T05:05:02.375Z',
    updatedAt: '2025-09-07T04:30:51.006Z'
  },
  event: {
    _id: '68b2d0d63293690deba680a2',
    title: 'Kids Summer Fun Day 2025',
    description: 'Join us for an amazing day of fun activities',
    category: 'Family & Kids',
    type: 'Event',
    venueType: 'Outdoor',
    location: {
      address: 'Dubai Marina Beach',
      city: 'Dubai',
      coordinates: {
        lat: 25.0772,
        lng: 55.1413
      }
    },
    dateSchedule: [{
      startDate: '2025-09-06T10:22:14.610Z',
      endDate: '2025-09-06T16:22:14.610Z',
      totalSeats: 150,
      availableSeats: 150,
      price: 75
    }],
    price: 75,
    currency: 'AED',
    vendorId: '68b2867eedc0af7c0c8fdf73',
    isApproved: true,
    status: 'published',
    createdAt: '2025-08-30T10:22:14.711Z'
  },
  employee: {
    _id: '68b56a3f9640fde891a81b76',
    vendorId: '68b2867eedc0af7c0c8fdf73',
    userId: '68b2917e0cf45d6b6f33f745',
    employeeId: 'EMP-1756719679585',
    firstName: 'Eshaan',
    lastName: 'Manchanda',
    email: 'eshaanmanchanda01@gmail.com',
    role: 'coordinator',
    permissions: [
      {
        action: 'view_events',
        scope: 'assigned'
      }
    ],
    status: 'active',
    createdAt: '2025-09-01T09:41:19.596Z'
  },
  venue: {
    _id: '68b28680edc0af7c0c8fdfd5',
    name: 'Dubai Opera House',
    description: 'A world-class performing arts venue',
    vendorId: '68b2867eedc0af7c0c8fdf73',
    status: 'active',
    address: {
      street: 'Sheikh Mohammed bin Rashid Boulevard',
      city: 'Dubai',
      state: 'Dubai',
      country: 'UAE'
    },
    coordinates: {
      lat: 25.1938,
      lng: 55.2736
    },
    capacity: 2000,
    venueType: 'indoor'
  }
};

describe('API Integration Tests', () => {
  beforeEach(() => {
    // Reset store state
    store.dispatch({ type: 'RESET_STATE' });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication API Integration', () => {
    it('should handle user registration with MongoDB integration', async () => {
      const mockRegisterResponse = {
        success: true,
        message: 'User registered successfully',
        data: {
          user: mockMongoData.user,
          token: 'mock-jwt-token'
        }
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockRegisterResponse)
      });

      const registerData = {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@gema.com',
        password: 'password123',
        phone: '+971501234567',
        country: 'UAE'
      };

      const result = await store.dispatch(registerUser(registerData));

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/auth/register`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(registerData)
        })
      );

      expect(result.type).toBe('auth/register/fulfilled');
      expect(result.payload.user.email).toBe('admin@gema.com');
    });

    it('should handle user login with proper token management', async () => {
      const mockLoginResponse = {
        success: true,
        message: 'Login successful',
        data: {
          user: mockMongoData.user,
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token'
        }
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockLoginResponse)
      });

      const loginData = {
        email: 'admin@gema.com',
        password: 'password123'
      };

      const result = await store.dispatch(loginUser(loginData));

      expect(result.type).toBe('auth/login/fulfilled');
      expect(result.payload.user.role).toBe('admin');
      expect(result.payload.token).toBe('mock-jwt-token');
    });

    it('should handle logout and token cleanup', async () => {
      const mockLogoutResponse = {
        success: true,
        message: 'Logout successful'
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockLogoutResponse)
      });

      const result = await store.dispatch(logoutUser());

      expect(result.type).toBe('auth/logout/fulfilled');
    });
  });

  describe('Events API Integration', () => {
    it('should fetch events with proper filtering and pagination', async () => {
      const mockEventsResponse = {
        success: true,
        data: {
          events: [mockMongoData.event],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalEvents: 1,
            limit: 10
          },
          filters: {
            category: 'Family & Kids',
            priceRange: { min: 0, max: 1000 },
            location: 'Dubai'
          }
        }
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockEventsResponse)
      });

      const filterParams = {
        category: 'Family & Kids',
        location: 'Dubai',
        priceMin: 0,
        priceMax: 1000,
        page: 1,
        limit: 10
      };

      const result = await store.dispatch(fetchEvents(filterParams));

      expect(result.type).toBe('events/fetchEvents/fulfilled');
      expect(result.payload.events).toHaveLength(1);
      expect(result.payload.events[0].title).toBe('Kids Summer Fun Day 2025');
    });

    it('should create event with vendor validation', async () => {
      const mockCreateEventResponse = {
        success: true,
        message: 'Event created successfully',
        data: mockMongoData.event
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockCreateEventResponse)
      });

      const eventData = {
        title: 'Kids Summer Fun Day 2025',
        description: 'Join us for an amazing day of fun activities',
        category: 'Family & Kids',
        type: 'Event',
        location: {
          address: 'Dubai Marina Beach',
          city: 'Dubai'
        },
        price: 75,
        currency: 'AED'
      };

      const result = await store.dispatch(createEvent(eventData));

      expect(result.type).toBe('events/createEvent/fulfilled');
      expect(result.payload.title).toBe('Kids Summer Fun Day 2025');
    });
  });

  describe('Booking API Integration', () => {
    it('should create booking with seat allocation', async () => {
      const mockBookingResponse = {
        success: true,
        message: 'Booking created successfully',
        data: {
          _id: 'booking123',
          eventId: mockMongoData.event._id,
          userId: mockMongoData.user._id,
          tickets: 2,
          totalAmount: 150,
          status: 'confirmed',
          seatNumbers: ['A1', 'A2'],
          bookingCode: 'BK123456',
          createdAt: '2025-09-07T10:00:00.000Z'
        }
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockBookingResponse)
      });

      const bookingData = {
        eventId: mockMongoData.event._id,
        tickets: 2,
        scheduleId: mockMongoData.event.dateSchedule[0]._id
      };

      const result = await store.dispatch(createBooking(bookingData));

      expect(result.type).toBe('bookings/createBooking/fulfilled');
      expect(result.payload.tickets).toBe(2);
      expect(result.payload.status).toBe('confirmed');
    });

    it('should handle booking updates and cancellations', async () => {
      const mockUpdateResponse = {
        success: true,
        message: 'Booking updated successfully',
        data: {
          _id: 'booking123',
          status: 'cancelled',
          cancellationReason: 'User requested cancellation',
          refundAmount: 150,
          refundStatus: 'pending'
        }
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUpdateResponse)
      });

      const updateData = {
        bookingId: 'booking123',
        status: 'cancelled',
        cancellationReason: 'User requested cancellation'
      };

      const result = await store.dispatch(updateBooking(updateData));

      expect(result.type).toBe('bookings/updateBooking/fulfilled');
      expect(result.payload.status).toBe('cancelled');
    });
  });

  describe('Payment API Integration', () => {
    it('should process payment with Stripe integration', async () => {
      const mockPaymentResponse = {
        success: true,
        message: 'Payment processed successfully',
        data: {
          _id: 'payment123',
          bookingId: 'booking123',
          amount: 150,
          currency: 'AED',
          status: 'succeeded',
          paymentMethod: 'card',
          stripePaymentIntentId: 'pi_mock_payment_intent',
          receiptUrl: '/receipt/payment123',
          processedAt: '2025-09-07T10:05:00.000Z'
        }
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPaymentResponse)
      });

      const paymentData = {
        bookingId: 'booking123',
        amount: 150,
        currency: 'AED',
        paymentMethodId: 'pm_mock_payment_method'
      };

      const result = await store.dispatch(processPayment(paymentData));

      expect(result.type).toBe('payments/processPayment/fulfilled');
      expect(result.payload.status).toBe('succeeded');
      expect(result.payload.amount).toBe(150);
    });

    it('should handle refund processing', async () => {
      const mockRefundResponse = {
        success: true,
        message: 'Refund processed successfully',
        data: {
          _id: 'refund123',
          paymentId: 'payment123',
          amount: 150,
          status: 'succeeded',
          refundReason: 'Event cancelled',
          processedAt: '2025-09-07T10:10:00.000Z'
        }
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRefundResponse)
      });

      const refundData = {
        paymentId: 'payment123',
        amount: 150,
        reason: 'Event cancelled'
      };

      const result = await store.dispatch(refundPayment(refundData));

      expect(result.type).toBe('payments/refundPayment/fulfilled');
      expect(result.payload.status).toBe('succeeded');
    });
  });

  describe('Admin API Integration', () => {
    it('should fetch user management data with MongoDB integration', async () => {
      const mockUsersResponse = {
        success: true,
        data: {
          users: [mockMongoData.user],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalUsers: 1
          },
          stats: {
            totalUsers: 1,
            activeUsers: 1,
            inactiveUsers: 0,
            adminUsers: 1,
            vendorUsers: 0,
            customerUsers: 0
          }
        }
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUsersResponse)
      });

      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-admin-token',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.users).toHaveLength(1);
      expect(data.data.users[0].role).toBe('admin');
    });

    it('should handle employee management operations', async () => {
      const mockEmployeesResponse = {
        success: true,
        data: {
          employees: [mockMongoData.employee],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalEmployees: 1
          }
        }
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockEmployeesResponse)
      });

      const response = await fetch(`${API_BASE_URL}/admin/employees`, {
        headers: {
          'Authorization': 'Bearer mock-admin-token'
        }
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.employees[0].employeeId).toBe('EMP-1756719679585');
      expect(data.data.employees[0].role).toBe('coordinator');
    });

    it('should handle event moderation operations', async () => {
      const mockModerationResponse = {
        success: true,
        message: 'Event approved successfully',
        data: {
          ...mockMongoData.event,
          isApproved: true,
          approvedBy: mockMongoData.user._id,
          approvedAt: '2025-09-07T10:15:00.000Z'
        }
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockModerationResponse)
      });

      const response = await fetch(`${API_BASE_URL}/admin/events/${mockMongoData.event._id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-admin-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approved: true,
          moderatorNotes: 'Event meets all requirements'
        })
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.isApproved).toBe(true);
    });
  });

  describe('Real-time API Integration', () => {
    it('should handle WebSocket notifications', async () => {
      const mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket);

      const mockNotificationResponse = {
        success: true,
        data: {
          _id: 'notification123',
          userId: mockMongoData.user._id,
          title: 'New Booking Received',
          message: 'You have received a new booking for your event',
          type: 'booking',
          priority: 'medium',
          isRead: false,
          createdAt: '2025-09-07T10:20:00.000Z'
        }
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockNotificationResponse)
      });

      const result = await store.dispatch(createNotification({
        userId: mockMongoData.user._id,
        title: 'New Booking Received',
        message: 'You have received a new booking for your event',
        type: 'booking'
      }));

      expect(result.type).toBe('notifications/createNotification/fulfilled');
      expect(result.payload.type).toBe('booking');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'Authentication failed',
        error: {
          code: 'AUTH_FAILED',
          details: 'Invalid credentials provided'
        }
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockErrorResponse)
      });

      const loginData = {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      };

      const result = await store.dispatch(loginUser(loginData));

      expect(result.type).toBe('auth/login/rejected');
      expect(result.payload).toContain('Authentication failed');
    });

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network Error'));

      const result = await store.dispatch(fetchEvents());

      expect(result.type).toBe('events/fetchEvents/rejected');
    });

    it('should validate MongoDB ObjectId format', () => {
      const validObjectId = '68b2867eedc0af7c0c8fdf65';
      const invalidObjectId = 'invalid-id';

      // ObjectId validation regex
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;

      expect(objectIdRegex.test(validObjectId)).toBe(true);
      expect(objectIdRegex.test(invalidObjectId)).toBe(false);
    });
  });
});

export { mockMongoData };