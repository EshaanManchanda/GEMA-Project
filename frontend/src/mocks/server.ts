import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock API handlers
export const handlers = [
  // Authentication endpoints
  http.post('*/auth/login', () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          _id: '68b2867eedc0af7c0c8fdf65',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          role: 'customer',
          status: 'active',
          isEmailVerified: true
        },
        token: 'mock-jwt-token'
      }
    });
  }),

  // User management endpoints
  http.get('*/admin/users', () => {
    return HttpResponse.json({
      success: true,
      data: {
        users: [
          {
            _id: '68b2867eedc0af7c0c8fdf65',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            role: 'customer',
            status: 'active',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1
        }
      }
    });
  }),

  // Events endpoints
  http.get('*/events', () => {
    return HttpResponse.json({
      success: true,
      data: {
        events: [
          {
            _id: '507f1f77bcf86cd799439011',
            title: 'Test Event',
            description: 'Test event description',
            category: 'entertainment',
            isApproved: true,
            status: 'published',
            dateSchedule: [{
              startDate: '2024-12-01T10:00:00Z',
              endDate: '2024-12-01T18:00:00Z',
              availableSeats: 100,
              price: 25.00
            }]
          }
        ]
      }
    });
  }),

  // Employee endpoints
  http.get('*/admin/employees', () => {
    return HttpResponse.json({
      success: true,
      data: {
        employees: [
          {
            _id: '507f1f77bcf86cd799439012',
            employeeId: 'EMP001',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            role: 'coordinator',
            status: 'active'
          }
        ]
      }
    });
  }),

  // Analytics endpoints
  http.get('*/admin/analytics/revenue', () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalRevenue: 125000,
        monthlyRevenue: [
          { month: 'Jan', revenue: 10000 },
          { month: 'Feb', revenue: 15000 }
        ],
        topCategories: [
          { category: 'entertainment', revenue: 50000 },
          { category: 'education', revenue: 35000 }
        ]
      }
    });
  })
];

export const server = setupServer(...handlers);