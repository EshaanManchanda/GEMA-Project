/**
 * The "failed-jobs" dead-letter queue has no consumer: its entries sit in `wait` forever, each holding the whole
 * payload of a job that failed all its attempts. With a worker that had no database connection, every repeating
 * job (seat expiry, automation, payouts, snapshots) landed there again and again. Nothing ever removed an entry
 * (removeOnComplete / removeOnFail only act on jobs that run), so Redis grew until it hit maxmemory, and a full
 * Redis is what turned every worker into a busy loop. Entries now expire, are capped in number, and are small.
 */
import fs from "fs";
import path from "path";

const mockWarn = jest.fn();
jest.mock("../../../config/logger", () => ({
  __esModule: true,
  default: {
    warn: (...a: unknown[]) => mockWarn(...a),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  snapshotJobData,
  trimDeadLetterQueue,
  startDeadLetterTrimmer,
} from "../../../workers/deadLetter";

type Q = import("bullmq").Queue;
const DAY = 24 * 3600 * 1000;

describe("snapshotJobData", () => {
  it("keeps a normal payload as it is, so a job can still be replayed by hand", () => {
    const data = { to: "a@b.c", subject: "Hi", n: 1 };
    expect(snapshotJobData(data)).toEqual(data);
  });

  it("replaces a huge payload (an email with an attachment, a certificate batch) with a small summary", () => {
    const big = { to: "a@b.c", attachment: "x".repeat(500_000) };
    const out = snapshotJobData(big) as Record<string, unknown>;
    expect(out.truncated).toBe(true);
    expect(out.bytes).toBeGreaterThan(500_000);
    expect(JSON.stringify(out).length).toBeLessThan(5_000);
    expect(String(out.preview)).toContain("a@b.c");
  });

  it("does not throw on a payload that cannot be serialised", () => {
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(() => snapshotJobData(loop)).not.toThrow();
    expect(
      (snapshotJobData(loop) as Record<string, unknown>).unserialisable,
    ).toBe(true);
  });

  it("copes with undefined and null", () => {
    expect(snapshotJobData(undefined)).toBeUndefined();
    expect(snapshotJobData(null)).toBeNull();
  });
});

describe("trimDeadLetterQueue", () => {
  const fakeQueue = (
    opts: {
      cleaned?: string[][];
      waiting?: number;
      oldest?: Array<{ remove: jest.Mock }>;
    } = {},
  ) => {
    const cleanResults = [...(opts.cleaned ?? [[]])];
    return {
      clean: jest.fn(async () => cleanResults.shift() ?? []),
      getWaitingCount: jest.fn(async () => opts.waiting ?? 0),
      getJobs: jest.fn(async () => opts.oldest ?? []),
    } as unknown as Q & {
      clean: jest.Mock;
      getWaitingCount: jest.Mock;
      getJobs: jest.Mock;
    };
  };

  it("does nothing without a queue (Redis disabled)", async () => {
    await expect(trimDeadLetterQueue(null)).resolves.toBe(0);
  });

  it("removes entries older than a week, in batches, until a batch comes back short", async () => {
    const ids = (n: number) => Array.from({ length: n }, (_, i) => String(i));
    const q = fakeQueue({ cleaned: [ids(500), ids(500), ids(120)] });
    const removed = await trimDeadLetterQueue(q);
    expect(removed).toBe(1120);
    expect(q.clean).toHaveBeenCalledTimes(3);
    expect(q.clean).toHaveBeenCalledWith(7 * DAY, 500, "wait");
  });

  it("leaves a queue under its cap alone", async () => {
    const q = fakeQueue({ waiting: 400 });
    await trimDeadLetterQueue(q);
    expect(q.getJobs).not.toHaveBeenCalled();
  });

  it("removes the OLDEST entries when the queue is over its cap, down to the cap", async () => {
    const jobs = Array.from({ length: 250 }, () => ({
      remove: jest.fn().mockResolvedValue(undefined),
    }));
    const q = fakeQueue({ waiting: 1250, oldest: jobs });
    const removed = await trimDeadLetterQueue(q);
    expect(q.getJobs).toHaveBeenCalledWith(["wait"], 0, 249, true); // asc=true: oldest first
    expect(jobs.every((j) => j.remove.mock.calls.length === 1)).toBe(true);
    expect(removed).toBe(250);
  });

  it("never throws: a failing queue is logged and ignored (it must not take the worker down)", async () => {
    const q = fakeQueue();
    q.clean.mockRejectedValue(new Error("OOM command not allowed"));
    await expect(trimDeadLetterQueue(q)).resolves.toBe(0);
    expect(mockWarn).toHaveBeenCalled();
  });

  it("keeps going if one entry cannot be removed", async () => {
    const bad = { remove: jest.fn().mockRejectedValue(new Error("locked")) };
    const good = { remove: jest.fn().mockResolvedValue(undefined) };
    const q = fakeQueue({ waiting: 1002, oldest: [bad, good] as never });
    await expect(trimDeadLetterQueue(q)).resolves.toBe(1);
    expect(good.remove).toHaveBeenCalled();
  });
});

describe("startDeadLetterTrimmer", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("trims at start and then every hour, and can be stopped", async () => {
    const trim = jest.fn().mockResolvedValue(0);
    const stop = startDeadLetterTrimmer({} as Q, 3_600_000, trim);
    await Promise.resolve();
    expect(trim).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(3_600_000);
    expect(trim).toHaveBeenCalledTimes(2);
    stop();
    await jest.advanceTimersByTimeAsync(3 * 3_600_000);
    expect(trim).toHaveBeenCalledTimes(2);
  });

  it("does nothing without a queue", () => {
    const trim = jest.fn();
    startDeadLetterTrimmer(null, 1000, trim)();
    expect(trim).not.toHaveBeenCalled();
  });
});

describe("dead-letter wiring (static guard)", () => {
  const run = fs.readFileSync(
    path.resolve(__dirname, "../../../workers/run.ts"),
    "utf8",
  );
  it("run.ts stores a bounded snapshot, not the raw payload, and starts the trimmer", () => {
    expect(run).toMatch(/jobData:\s*snapshotJobData\(job\.data\)/);
    expect(run).toMatch(/startDeadLetterTrimmer\(failedJobsQueue\)/);
  });
});
