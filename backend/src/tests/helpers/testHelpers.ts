import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

/**
 * Test helper utilities for mocking and assertions
 */

/**
 * Create a mock Request object
 */
export const mockRequest = (overrides: any = {}): Request => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides,
  } as Request;
};

/**
 * Create a mock Response object with spy functions
 */
export const mockResponse = (): Response => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

/**
 * Create a mock NextFunction
 */
export const mockNext = (): NextFunction => {
  return jest.fn() as NextFunction;
};

/**
 * Generate a valid MongoDB ObjectId
 */
export const generateObjectId = (): string => {
  return new mongoose.Types.ObjectId().toString();
};

/**
 * Create a mock authenticated vendor user
 */
export const mockVendorUser = (vendorId?: string) => {
  return {
    _id: vendorId || generateObjectId(),
    id: vendorId || generateObjectId(),
    email: 'vendor@test.com',
    role: 'vendor',
    firstName: 'Test',
    lastName: 'Vendor',
  };
};

/**
 * Create a mock employee object
 */
export const mockEmployee = (overrides: any = {}) => {
  const vendorId = overrides.vendorId || generateObjectId();
  const userId = overrides.userId || generateObjectId();

  return {
    _id: generateObjectId(),
    vendorId,
    userId,
    employeeId: `EMP-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@test.com',
    phone: '+1234567890',
    role: 'scanner',
    permissions: [
      { action: 'scan_tickets', scope: 'assigned' }
    ],
    assignedEvents: [],
    assignedVenues: [],
    status: 'active',
    hiredAt: new Date('2024-01-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

/**
 * Create a mock event object
 */
export const mockEvent = (overrides: any = {}) => {
  return {
    _id: generateObjectId(),
    vendorId: overrides.vendorId || generateObjectId(),
    title: 'Test Event',
    category: 'Music',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-06-02'),
    location: 'Test Venue',
    ...overrides,
  };
};

/**
 * Wait for a promise to resolve (useful for testing async code)
 */
export const waitFor = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Assert that a function throws a specific error
 */
export const expectAsyncError = async (
  fn: () => Promise<any>,
  expectedError?: string | RegExp
): Promise<void> => {
  try {
    await fn();
    throw new Error('Expected function to throw an error');
  } catch (error: any) {
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect(error.message).toContain(expectedError);
      } else {
        expect(error.message).toMatch(expectedError);
      }
    }
  }
};

/**
 * Mock mongoose model methods
 */
export const mockModel = (modelName: string) => {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    save: jest.fn(),
  };
};

/**
 * Mock mongoose session for transactions
 */
export const mockMongooseSession = () => {
  return {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn(),
  };
};

/**
 * Create a chainable mock query (for .populate().sort().skip().limit().lean())
 */
export const createMockQuery = (result: any) => {
  const query: any = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  };

  // Make the query thenable (Promise-like)
  query.then = (resolve: any, reject?: any) => {
    return Promise.resolve(result).then(resolve, reject);
  };

  return query;
};
