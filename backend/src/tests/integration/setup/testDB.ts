/**
 * In-memory MongoDB setup for integration tests.
 * Uses mongodb-memory-server so no real DB is needed and each test suite
 * starts with a clean, isolated database.
 */
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer;

/**
 * Start the in-memory MongoDB instance and connect Mongoose.
 * Call this in beforeAll().
 */
export const connectTestDB = async (): Promise<void> => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
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
 * Disconnect and stop the in-memory server.
 * Call this in afterAll().
 */
export const closeTestDB = async (): Promise<void> => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
};
