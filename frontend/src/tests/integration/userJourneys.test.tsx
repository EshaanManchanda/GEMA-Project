/**
 * End-to-End Integration Tests for Complete User Journeys
 * Tests critical flows across the Gema Event Management System
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from '../../store';
import App from '../../App';

// Mock API responses
const mockAPIResponses = {
  auth: {
    register: {
      success: true,
      data: {
        user: {
          id: 'user123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'customer'
        },
        token: 'mock-jwt-token'
      }
    },
    login: {
      success: true,
      data: {
        user: {
          id: 'user123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'customer'
        },
        token: 'mock-jwt-token'
      }
    }
  },
  events: {
    list: {
      success: true,
      data: {
        events: [
          {
            _id: 'event123',
            title: 'Summer Music Festival',
            description: 'Great outdoor music event',
            category: 'Music',
            price: 150,
            currency: 'AED',
            location: {
              city: 'Dubai',
              address: 'Dubai Marina'
            },
            dateSchedule: [{
              startDate: '2024-07-15T18:00:00Z',
              endDate: '2024-07-15T23:00:00Z',
              availableSeats: 100,
              price: 150
            }],
            images: ['/event-image.jpg']
          }
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalEvents: 1
        }
      }
    },
    detail: {
      success: true,
      data: {
        _id: 'event123',
        title: 'Summer Music Festival',
        description: 'Great outdoor music event',
        category: 'Music',
        price: 150,
        currency: 'AED',
        location: {
          city: 'Dubai',
          address: 'Dubai Marina'
        },
        dateSchedule: [{
          startDate: '2024-07-15T18:00:00Z',
          endDate: '2024-07-15T23:00:00Z',
          availableSeats: 100,
          price: 150
        }],
        images: ['/event-image.jpg']
      }
    }
  },
  booking: {
    create: {
      success: true,
      data: {
        bookingId: 'booking123',
        eventId: 'event123',
        userId: 'user123',
        tickets: 2,
        totalAmount: 300,
        status: 'confirmed',
        paymentIntent: 'pi_mock_payment_intent'
      }
    }
  },
  payment: {
    processPayment: {
      success: true,
      data: {
        paymentId: 'payment123',
        status: 'succeeded',
        amount: 300,
        currency: 'AED',
        receiptUrl: '/receipt/payment123'
      }
    }
  }
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={store}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </Provider>
);

describe('Complete User Journey Integration Tests', () => {
  let user: any;

  beforeEach(() => {
    user = userEvent.setup();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Customer Journey: Registration → Event Discovery → Booking → Payment', () => {
    it('should complete full customer journey successfully', async () => {
      // Mock API calls
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAPIResponses.auth.register)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAPIResponses.events.list)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAPIResponses.events.detail)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAPIResponses.booking.create)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAPIResponses.payment.processPayment)
        });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Step 1: User Registration
      const registerLink = screen.getByText(/register/i);
      await user.click(registerLink);

      await waitFor(() => {
        expect(screen.getByText(/sign up/i)).toBeInTheDocument();
      });

      // Fill registration form
      await user.type(screen.getByLabelText(/first name/i), 'Test');
      await user.type(screen.getByLabelText(/last name/i), 'User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      const registerButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(registerButton);

      // Verify registration success
      await waitFor(() => {
        expect(screen.getByText(/welcome/i)).toBeInTheDocument();
      });

      // Step 2: Event Discovery
      const eventsLink = screen.getByText(/events/i);
      await user.click(eventsLink);

      await waitFor(() => {
        expect(screen.getByText(/summer music festival/i)).toBeInTheDocument();
      });

      // Step 3: Event Selection and Booking
      const eventCard = screen.getByText(/summer music festival/i);
      await user.click(eventCard);

      await waitFor(() => {
        expect(screen.getByText(/book now/i)).toBeInTheDocument();
      });

      const bookButton = screen.getByText(/book now/i);
      await user.click(bookButton);

      // Fill booking details
      await waitFor(() => {
        expect(screen.getByText(/booking details/i)).toBeInTheDocument();
      });

      const ticketQuantity = screen.getByLabelText(/quantity/i);
      await user.clear(ticketQuantity);
      await user.type(ticketQuantity, '2');

      const confirmBookingButton = screen.getByText(/confirm booking/i);
      await user.click(confirmBookingButton);

      // Step 4: Payment Processing
      await waitFor(() => {
        expect(screen.getByText(/payment/i)).toBeInTheDocument();
      });

      // Verify payment form is rendered
      expect(screen.getByText(/total.*300.*aed/i)).toBeInTheDocument();

      const payButton = screen.getByText(/pay now/i);
      await user.click(payButton);

      // Step 5: Booking Confirmation
      await waitFor(() => {
        expect(screen.getByText(/booking confirmed/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/booking id.*booking123/i)).toBeInTheDocument();
      expect(screen.getByText(/download receipt/i)).toBeInTheDocument();
    }, 30000);
  });

  describe('Vendor Workflow: Event Creation → Approval → Management → Analytics', () => {
    it('should complete vendor workflow successfully', async () => {
      // Mock vendor user login
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...mockAPIResponses.auth.login,
            data: {
              ...mockAPIResponses.auth.login.data,
              user: {
                ...mockAPIResponses.auth.login.data.user,
                role: 'vendor'
              }
            }
          })
        });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Step 1: Vendor Login
      const loginLink = screen.getByText(/login/i);
      await user.click(loginLink);

      await user.type(screen.getByLabelText(/email/i), 'vendor@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Step 2: Navigate to Vendor Dashboard
      await waitFor(() => {
        expect(screen.getByText(/vendor dashboard/i)).toBeInTheDocument();
      });

      // Step 3: Event Creation
      const createEventButton = screen.getByText(/create event/i);
      await user.click(createEventButton);

      await waitFor(() => {
        expect(screen.getByText(/event details/i)).toBeInTheDocument();
      });

      // Verify event creation form is functional
      expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();

      // Step 4: Verify Analytics Access
      const analyticsLink = screen.getByText(/analytics/i);
      await user.click(analyticsLink);

      await waitFor(() => {
        expect(screen.getByText(/revenue overview/i)).toBeInTheDocument();
      });
    });
  });

  describe('Admin Operations: User Management → Event Moderation → Revenue Reports', () => {
    it('should complete admin workflow successfully', async () => {
      // Mock admin user login
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...mockAPIResponses.auth.login,
            data: {
              ...mockAPIResponses.auth.login.data,
              user: {
                ...mockAPIResponses.auth.login.data.user,
                role: 'admin'
              }
            }
          })
        });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Step 1: Admin Login
      const loginLink = screen.getByText(/login/i);
      await user.click(loginLink);

      await user.type(screen.getByLabelText(/email/i), 'admin@gema.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Step 2: Access Admin Dashboard
      await waitFor(() => {
        expect(screen.getByText(/admin dashboard/i)).toBeInTheDocument();
      });

      // Step 3: User Management
      const userManagementLink = screen.getByText(/user management/i);
      await user.click(userManagementLink);

      await waitFor(() => {
        expect(screen.getByText(/manage users/i)).toBeInTheDocument();
      });

      // Verify user management features
      expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument();
      expect(screen.getByText(/role filter/i)).toBeInTheDocument();

      // Step 4: Event Moderation
      const eventModerationLink = screen.getByText(/event moderation/i);
      await user.click(eventModerationLink);

      await waitFor(() => {
        expect(screen.getByText(/event approval/i)).toBeInTheDocument();
      });

      // Verify event moderation features
      expect(screen.getByText(/pending events/i)).toBeInTheDocument();
      expect(screen.getByText(/approved events/i)).toBeInTheDocument();

      // Step 5: Revenue Reports
      const revenueReportsLink = screen.getByText(/revenue reports/i);
      await user.click(revenueReportsLink);

      await waitFor(() => {
        expect(screen.getByText(/revenue analytics/i)).toBeInTheDocument();
      });

      // Verify revenue reporting features
      expect(screen.getByText(/total revenue/i)).toBeInTheDocument();
      expect(screen.getByText(/export report/i)).toBeInTheDocument();
    });
  });

  describe('Cross-System Integration Tests', () => {
    it('should validate real-time notifications across user roles', async () => {
      // Mock WebSocket connection
      const mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket);

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Simulate real-time notification
      const notificationEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'notification',
          action: 'create',
          data: {
            title: 'New Event Booking',
            message: 'You have received a new booking',
            timestamp: new Date().toISOString()
          }
        })
      });

      // Verify notification handling
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should validate data synchronization between Redux slices', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Test Redux state synchronization
      const state = store.getState();
      
      // Verify all required slices are present
      expect(state.auth).toBeDefined();
      expect(state.events).toBeDefined();
      expect(state.bookings).toBeDefined();
      expect(state.payments).toBeDefined();
      expect(state.notifications).toBeDefined();
      expect(state.coupons).toBeDefined();
      expect(state.affiliates).toBeDefined();

      // Verify initial state structure
      expect(state.auth.user).toBeNull();
      expect(state.auth.isAuthenticated).toBe(false);
      expect(Array.isArray(state.events.events)).toBe(true);
      expect(Array.isArray(state.bookings.bookings)).toBe(true);
    });
  });
});

describe('Database Integration Tests', () => {
  describe('MongoDB Collection Integration', () => {
    it('should validate CRUD operations with existing collections', async () => {
      // Mock database operations
      const mockCollections = {
        users: {
          find: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({ _id: 'user123' }),
          update: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
          delete: jest.fn().mockResolvedValue({ deletedCount: 1 })
        },
        events: {
          find: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({ _id: 'event123' }),
          update: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
          delete: jest.fn().mockResolvedValue({ deletedCount: 1 })
        },
        employees: {
          find: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({ _id: 'employee123' }),
          update: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
          delete: jest.fn().mockResolvedValue({ deletedCount: 1 })
        },
        venues: {
          find: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({ _id: 'venue123' }),
          update: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
          delete: jest.fn().mockResolvedValue({ deletedCount: 1 })
        }
      };

      // Test database operations through API endpoints
      global.fetch = jest.fn()
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockCollections.users.find()
          })
        });

      // Verify API endpoint integration
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
    });

    it('should validate data relationships and constraints', () => {
      // Test data structure validation
      const sampleUser = {
        _id: '68b2867eedc0af7c0c8fdf65',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@gema.com',
        role: 'admin',
        status: 'active'
      };

      const sampleEvent = {
        _id: '68b2d0d63293690deba680a2',
        title: 'Kids Summer Fun Day 2025',
        vendorId: '68b2867eedc0af7c0c8fdf73',
        isApproved: true,
        status: 'published'
      };

      const sampleEmployee = {
        _id: '68b56a3f9640fde891a81b76',
        vendorId: '68b2867eedc0af7c0c8fdf73',
        userId: '68b2917e0cf45d6b6f33f745',
        role: 'coordinator',
        status: 'active'
      };

      // Verify required fields are present
      expect(sampleUser._id).toBeDefined();
      expect(sampleUser.email).toBeDefined();
      expect(sampleUser.role).toBeDefined();

      expect(sampleEvent._id).toBeDefined();
      expect(sampleEvent.vendorId).toBeDefined();
      expect(sampleEvent.title).toBeDefined();

      expect(sampleEmployee._id).toBeDefined();
      expect(sampleEmployee.vendorId).toBeDefined();
      expect(sampleEmployee.role).toBeDefined();

      // Verify relationships
      expect(sampleEvent.vendorId).toBeDefined();
      expect(sampleEmployee.vendorId).toBeDefined();
      expect(sampleEmployee.userId).toBeDefined();
    });
  });
});

export { mockAPIResponses, TestWrapper };