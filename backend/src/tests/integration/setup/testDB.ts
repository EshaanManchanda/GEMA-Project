/**
 * In-memory MongoDB setup for integration tests: one replica set per jest
 * run (jest.globalSetup.js), an isolated database per test file.
 */
import mongoose from "mongoose";

/**
 * Connect Mongoose to a fresh database. Call this in beforeAll().
 */
export const connectTestDB = async (): Promise<void> => {
  // Shared replica set from jest.globalSetup.js; a fresh database per file.
  const uri = process.env.MONGO_TEST_URI;
  if (!uri) throw new Error("MONGO_TEST_URI not set: run tests through jest (jest.globalSetup.js)");
  await mongoose.connect(uri, { dbName: `test_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` });
};

/**
 * Drop all collections between test cases.
 * Call this in beforeEach() to start every test with a clean slate.
 */
export const clearTestDB = async (): Promise<void> => {
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((col) => col.deleteMany({}))
  );
};

/**
 * Drop this file's database and disconnect. Call this in afterAll().
 */
export const closeTestDB = async (): Promise<void> => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};
