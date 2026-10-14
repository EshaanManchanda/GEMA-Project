/**
 * Search text is matched literally: user input used to go straight into
 * $regex / new RegExp, so "(" crashed the query (500) and patterns like
 * "(a+)+$" could pin MongoDB CPU.
 */
import request from "supertest";
import { Application } from "express";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";

jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

it.each(["/api/blogs", "/api/venues/public"])("%s treats regex syntax in ?search= as text", async (path) => {
  for (const search of ["(", "(a+)+$", "C++", "[a-z"]) {
    const res = await request(app).get(path).query({ search });
    expect(res.status).toBe(200);
  }
});
