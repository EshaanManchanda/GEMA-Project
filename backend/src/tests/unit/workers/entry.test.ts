/**
 * The worker process must connect to MongoDB BEFORE any worker module is loaded: workers start
 * consuming jobs the moment they are imported, and seat-expiry, automation, snapshot, payout and
 * collection-sync jobs all run Mongoose queries. Before this entry existed the worker process never
 * connected (only server.ts called connectDB), so every one of those jobs failed.
 */
const mockOrder: string[] = [];
let mockQueuesEnabled = true;
let mockConnect: () => Promise<void>;
let mockRunThrows = false;

const mockLogError = jest.fn();
jest.mock("../../../config/logger", () => ({
  __esModule: true,
  default: { error: (...a: unknown[]) => mockLogError(...a), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("../../../config/queue", () => ({
  get areQueuesEnabled() {
    return mockQueuesEnabled;
  },
}));
jest.mock("../../../config/database", () => ({
  connectDB: () => mockConnect(),
}));
jest.mock("../../../workers/run", () => {
  mockOrder.push("workers loaded");
  if (mockRunThrows) throw new Error("boom");
  return {};
});

const flush = () => new Promise((r) => setImmediate(r));
const startEntry = async () => {
  jest.resetModules(); // a fresh registry per start: mock factories run again
  require("../../../workers/index");
  await flush();
  await flush();
};

describe("worker process entry", () => {
  let exit: jest.SpyInstance;
  beforeEach(() => {
    mockOrder.length = 0;
    mockQueuesEnabled = true;
    mockRunThrows = false;
    mockConnect = async () => {
      mockOrder.push("mongo connected");
    };
    exit = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);
  });
  afterEach(() => exit.mockRestore());

  it("connects to MongoDB first, then loads the workers", async () => {
    await startEntry();
    expect(mockOrder).toEqual(["mongo connected", "workers loaded"]);
    expect(exit).not.toHaveBeenCalled();
  });

  it("does not load a single worker while MongoDB is still connecting", async () => {
    mockConnect = () => new Promise(() => undefined); // never resolves
    await startEntry();
    expect(mockOrder).toEqual([]);
  });

  it("does not connect when queues are disabled (the workers module exits cleanly)", async () => {
    mockQueuesEnabled = false;
    let connected = false;
    mockConnect = async () => {
      connected = true;
    };
    await startEntry();
    expect(connected).toBe(false);
    expect(mockOrder).toEqual(["workers loaded"]);
  });

  it("exits non-zero when the workers fail to start instead of hanging", async () => {
    mockRunThrows = true;
    await startEntry();
    expect(mockLogError).toHaveBeenCalledWith("Worker process failed to start:", expect.any(Error));
    expect(exit).toHaveBeenCalledWith(1);
  });
});
