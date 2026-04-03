# Backend Project Guidelines (Node.js/Express/MongoDB)

This document establishes the architectural standards, security protocols, and performance guidelines for the backend of this project.

---

## 1. Architectural Patterns & Code Structure

### Layered Architecture (Separation of Concerns)
* **Controllers:** Handle HTTP requests/responses only. Validate inputs and return formatted responses. **No business logic here.**
* **Services:** Contain the core business logic. They should be framework-agnostic (i.e., they shouldn't know about `req` or `res`).
* **Data Access Layer (DAL/Repository):** Handle direct database interactions. Mongoose queries belong here, not in controllers.

### Code Quality & TypeScript
* **Strict Typing:** Do not use `any`. Define interfaces for all Mongoose schemas, Service inputs, and DTOs (Data Transfer Objects).
* **Async/Await:** Use modern `async/await` syntax. Avoid nested `.then()` chains.
* **Configuration:** Use `dotenv` for environment variables. Never hardcode secrets or config values.

---

## 2. Database Optimization (MongoDB)

### Schema & Indexing
* **Indexing:** Ensure all fields used in `find()`, `sort()`, and `match` stages have compound indexes where appropriate.
* **Lean Queries:** Always use `.lean()` for read-only operations to bypass Mongoose hydration overhead.
    ```typescript
    // DO
    const users = await UserModel.find({ active: true }).lean();
    ```
* **Virtuals:** Use virtuals for computed properties to keep the database size low.

### Query Performance
* **Pagination:** Never return unbound arrays. Use cursor-based pagination or `skip/limit` with strict caps.
* **Projections:** Always select only the fields necessary (`.select('name email')`) to reduce network bandwidth.
* **N+1 Problem:** Avoid executing queries inside loops. Use `$in` operators or `Promise.all` judiciously.

---

## 3. Security Hardening

### Authentication & Authorization
* **JWT Handling:** Sign tokens with strong algorithms (HS256/RS256). Short-lived Access Tokens + Long-lived Refresh Tokens (stored in HTTP-only cookies or secured Redis).
* **Password Hashing:** Use `bcrypt` or `argon2`. Never store plain text passwords.

### Input Validation & Sanitization
* **Validation:** Use libraries like **Zod** or **Joi** to validate all incoming request bodies, params, and query strings in a middleware layer.
* **Sanitization:** Use `mongo-sanitize` to prevent NoSQL injection attacks.
* **Rate Limiting:** Implement `express-rate-limit` globally and stricter limits on auth routes.

### Headers & Transport
* **Helmet:** Always use `helmet()` middleware to set secure HTTP headers.
* **CORS:** Configure CORS strictly. Only allow whitelisted origins.

---

## 4. Performance & Scalability

### Caching Strategy
* **Redis:** Implement Redis caching for expensive database queries or computed responses.
* **Cache Invalidation:** Ensure proper TTL (Time To Live) and invalidation strategies are in place when data updates.

### Asynchronous Processing
* **Message Queues:** Offload heavy computations (image processing, email sending, report generation) to background queues (e.g., **BullMQ**, **RabbitMQ**). **Do not block the Event Loop.**

### Node.js Specifics
* **Compression:** Use `compression` middleware (Gzip/Brotli) for text-based responses.
* **Connection Pooling:** Configure MongoDB connection pool size (`poolSize`) based on the instance size (usually min 10, max 100).

---

## 5. Error Handling & Logging

### Centralized Error Handling
* **Custom Errors:** Use a custom `AppError` class extending the native `Error` to handle operational vs. programmer errors.
* **Global Middleware:** Catch all errors in a final error-handling middleware. Never leave unhandled promise rejections.

### Structured Logging
* **Logger:** Use **Winston** or **Pino**.
* **Format:** Log in JSON format for easy parsing by observability tools (Datadog, ELK stack).
* **Levels:** Use appropriate levels (Info, Warn, Error). *Never log sensitive data (PII, passwords, tokens).*

---

## 6. Testing Strategy
* **Unit Tests:** Test Services and Utilities in isolation (Jest/Mocha).
* **Integration Tests:** Test API endpoints using `supertest` with a test database.