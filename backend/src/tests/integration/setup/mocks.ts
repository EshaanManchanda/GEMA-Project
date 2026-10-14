/**
 * Side-effect mocks shared by the controller suites. Import this FIRST in a
 * test file (before testApp) so the mocks are registered before routes load.
 * Stubs are plain async no-ops, not jest.fn — jest's resetMocks would wipe a
 * jest.fn's resolved value and break `sendEmail(...).catch(...)` callers.
 * Redis is "disabled" (null), a mode production supports, so caches never hide DB changes.
 */
jest.mock("../../../services/email.service", () => {
  const noop = async () => undefined;
  const svc = new Proxy({} as Record<string | symbol, unknown>, { get: (t, k) => (k === "then" ? undefined : noop) });
  return { __esModule: true, default: svc, sendEmail: noop, emailService: svc };
});
jest.mock("../../../config/firebase", () => ({ initializeFirebase: () => undefined }));
jest.mock("../../../services/queue.service", () => {
  const noop = async () => undefined;
  const QueueService = new Proxy({} as Record<string | symbol, unknown>, { get: (t, k) => (k === "then" ? undefined : noop) });
  return { __esModule: true, default: QueueService, QueueService, addEmailJob: noop, addQRJob: noop };
});
jest.mock("../../../config/redis", () => ({
  __esModule: true,
  redisClient: null,
  redisPool: null,
  default: null,
  isRedisEnabled: false,
  checkRedisHealth: async () => false,
}));
jest.mock("../../../utils/mailer", () => ({ __esModule: true, default: async () => undefined, sendTicketByEmail: async () => undefined }));

// src/tests/setup.ts pins 10s, which shared-replica-set suites exceed under parallel load.
jest.setTimeout(30000);

export {};
