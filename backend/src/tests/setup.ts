/**
 * Jest test setup file
 * Runs before all tests to configure the test environment
 */

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-key-32chars!!!!!";
process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret-32chars!";
process.env.JWT_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.MONGODB_URI = "mongodb://localhost:27017/gema-test";
process.env.ADMIN_SECRET_KEY = "test-admin-secret";
process.env.BCRYPT_SALT_ROUNDS = "4";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
process.env.CLOUDINARY_API_KEY = "test-api-key";
process.env.CLOUDINARY_API_SECRET = "test-api-secret";

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};

// Mock email service to prevent actual emails during tests
jest.mock("../services/email.service", () => ({
  sendEmployeeWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

// Mock queue service to prevent actual queue operations during tests
jest.mock("../services/queue.service", () => ({
  addEmailJob: jest.fn().mockResolvedValue(undefined),
  addQRJob: jest.fn().mockResolvedValue(undefined),
}));

// Clean up after all tests
afterAll(async () => {
  // Close any open handles
  await new Promise((resolve) => setTimeout(resolve, 500));
});
