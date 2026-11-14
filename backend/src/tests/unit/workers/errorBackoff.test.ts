/**
 * BullMQ waits runRetryDelay (15 s) only after a Redis CONNECTION error. Any other error from the job fetch,
 * such as "OOM command not allowed when used memory > 'maxmemory'" from a full Redis, is emitted and the fetch is
 * retried immediately: a busy loop (pm2 reported the API "still alive after 5000ms" and SIGKILLed it, and the
 * log grew 3-5 ms at a time). attachErrorBackoff pauses a worker that errors in a burst, then resumes it after
 * a delay that doubles while the trouble lasts, so a broken Redis costs a trickle of CPU instead of a core.
 */
import { EventEmitter } from "events";
import fs from "fs";
import path from "path";

const mockWarn = jest.fn();
jest.mock("../../../config/logger", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: (...a: unknown[]) => mockWarn(...a),
    info: jest.fn(),
  },
}));

import { attachErrorBackoff } from "../../../workers/errorListener";

type FakeWorker = EventEmitter & { pause: jest.Mock; resume: jest.Mock };
const fakeWorker = (): FakeWorker => {
  const w = new EventEmitter() as FakeWorker;
  w.pause = jest.fn().mockResolvedValue(undefined);
  w.resume = jest.fn();
  return w;
};
const asWorker = (w: FakeWorker) => w as unknown as import("bullmq").Worker;
const oom = () =>
  new Error("OOM command not allowed when used memory > 'maxmemory'.");
const fire = (w: EventEmitter, n: number, err: Error = oom()) => {
  for (let i = 0; i < n; i++) w.emit("error", err);
};

describe("attachErrorBackoff", () => {
  let clock: number;
  let timers: Array<{ fn: () => void; ms: number }>;
  const opts = () => ({
    now: () => clock,
    schedule: (fn: () => void, ms: number) => {
      timers.push({ fn, ms });
    },
  });
  const runTimer = () => {
    const t = timers.shift()!;
    clock += t.ms;
    t.fn();
  };
  beforeEach(() => {
    clock = 1_000_000;
    timers = [];
    mockWarn.mockClear();
  });

  it("leaves a worker alone below the burst size", () => {
    const w = fakeWorker();
    attachErrorBackoff(asWorker(w), "certificate", opts());
    fire(w, 19);
    expect(w.pause).not.toHaveBeenCalled();
    expect(timers).toHaveLength(0);
  });

  it("pauses once on a burst, however many more errors arrive while it is paused, and logs one line", () => {
    const w = fakeWorker();
    attachErrorBackoff(asWorker(w), "certificate", opts());
    fire(w, 20);
    fire(w, 5000);
    expect(w.pause).toHaveBeenCalledTimes(1);
    expect(w.pause).toHaveBeenCalledWith(true); // do not wait for active jobs: nothing is being fetched
    expect(timers).toHaveLength(1);
    expect(timers[0].ms).toBe(30_000);
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn.mock.calls[0][0]).toContain("certificate worker");
  });

  it("resumes after the delay", () => {
    const w = fakeWorker();
    attachErrorBackoff(asWorker(w), "certificate", opts());
    fire(w, 20);
    expect(w.resume).not.toHaveBeenCalled();
    runTimer();
    expect(w.resume).toHaveBeenCalledTimes(1);
  });

  it("doubles the pause for each burst that follows, up to the cap", () => {
    const w = fakeWorker();
    attachErrorBackoff(asWorker(w), "certificate", opts());
    const delays: number[] = [];
    for (let i = 0; i < 6; i++) {
      fire(w, 20);
      delays.push(timers[0].ms);
      runTimer();
    }
    expect(delays).toEqual([
      30_000, 60_000, 120_000, 240_000, 300_000, 300_000,
    ]);
  });

  it("starts again from the short pause after a long quiet spell", () => {
    const w = fakeWorker();
    attachErrorBackoff(asWorker(w), "certificate", opts());
    fire(w, 20);
    runTimer(); // 30 s
    fire(w, 20);
    runTimer(); // 60 s
    clock += 11 * 60_000; // quiet for 11 minutes
    fire(w, 20);
    expect(timers[0].ms).toBe(30_000);
  });

  it("does not count errors that are spread out (a slow trickle is not a loop)", () => {
    const w = fakeWorker();
    attachErrorBackoff(asWorker(w), "certificate", opts());
    for (let i = 0; i < 200; i++) {
      w.emit("error", oom());
      clock += 1_000; // one a second for 200 s
    }
    expect(w.pause).not.toHaveBeenCalled();
  });

  it("ignores Redis connection errors: BullMQ already waits 15 s after those", () => {
    const w = fakeWorker();
    attachErrorBackoff(asWorker(w), "certificate", opts());
    fire(w, 1000, new Error("connect ECONNREFUSED 127.0.0.1:6379"));
    expect(w.pause).not.toHaveBeenCalled();
  });

  it("still resumes if pause() itself fails", async () => {
    const w = fakeWorker();
    w.pause.mockRejectedValue(new Error("pause failed"));
    attachErrorBackoff(asWorker(w), "certificate", opts());
    fire(w, 20);
    await new Promise((r) => setImmediate(r));
    runTimer();
    expect(w.resume).toHaveBeenCalledTimes(1);
  });

  it("does not resume a worker that has been closed in the meantime (graceful shutdown)", () => {
    const w = fakeWorker();
    attachErrorBackoff(asWorker(w), "certificate", opts());
    fire(w, 20);
    w.emit("closing");
    runTimer();
    expect(w.resume).not.toHaveBeenCalled();
  });

  it("accepts a null worker (queues disabled)", () => {
    expect(() => attachErrorBackoff(null, "certificate", opts())).not.toThrow();
  });
});

describe("error back-off wiring (static guard)", () => {
  const read = (f: string) =>
    fs.readFileSync(path.resolve(__dirname, "../../../workers", f), "utf8");
  it("run.ts attaches the back-off to every worker in its loop", () => {
    expect(read("run.ts")).toMatch(
      /for \(const \{ worker, dlqName \} of WORKERS\)[\s\S]*attachErrorBackoff\(worker, dlqName\)/,
    );
  });
});
