/**
 * BullMQ retries a failing job fetch immediately, so one persistent error (the auto-pipelining bug,
 * a dead Redis) fires thousands of 'error' events a second. Each one used to write a full stack to
 * the log files, which is how the VPS disk filled. The listener logs the first error of a window,
 * then one summary line per window with the number of repeats.
 */
import { EventEmitter } from "events";
import fs from "fs";
import path from "path";

const mockError = jest.fn();
const mockWarn = jest.fn();
jest.mock("../../../config/logger", () => ({
  __esModule: true,
  default: {
    error: (...a: unknown[]) => mockError(...a),
    warn: (...a: unknown[]) => mockWarn(...a),
    info: jest.fn(),
  },
}));

import { attachThrottledErrorListener } from "../../../workers/errorListener";

const fakeWorker = () => new EventEmitter() as unknown as import("bullmq").Worker;
const fire = (w: import("bullmq").Worker, n: number, err: Error = new Error("boom")) => {
  for (let i = 0; i < n; i++) (w as unknown as EventEmitter).emit("error", err);
};

describe("attachThrottledErrorListener", () => {
  let clock = 0;
  const now = () => clock;
  beforeEach(() => {
    clock = 1_000_000;
    mockError.mockClear();
    mockWarn.mockClear();
  });

  it("logs one line for a storm of 1,000 identical errors in a window", () => {
    const w = fakeWorker();
    attachThrottledErrorListener(w, "email", 60_000, now);
    fire(w, 1000);
    expect(mockError).toHaveBeenCalledTimes(1);
    expect(mockError.mock.calls[0][0]).toContain("email worker error");
  });

  it("logs a summary with the repeat count once the window has passed", () => {
    const w = fakeWorker();
    attachThrottledErrorListener(w, "email", 60_000, now);
    fire(w, 1000);
    clock += 60_001;
    fire(w, 1);
    expect(mockError).toHaveBeenCalledTimes(2);
    expect(mockError.mock.calls[1][0]).toContain("999 more");
  });

  it("keeps windows independent per worker", () => {
    const a = fakeWorker();
    const b = fakeWorker();
    attachThrottledErrorListener(a, "qr-generation", 60_000, now);
    attachThrottledErrorListener(b, "payout", 60_000, now);
    fire(a, 50);
    fire(b, 50);
    expect(mockError).toHaveBeenCalledTimes(2);
  });

  it("treats Redis connection errors as warnings, also throttled", () => {
    const w = fakeWorker();
    attachThrottledErrorListener(w, "email", 60_000, now);
    fire(w, 200, Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:6379"), { code: "ECONNREFUSED" }));
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockError).not.toHaveBeenCalled();
  });

  it("is a no-op for a worker that failed to initialise (null)", () => {
    expect(() => attachThrottledErrorListener(null, "email", 60_000, now)).not.toThrow();
  });
});

describe("worker error listeners (static guard)", () => {
  const dir = path.resolve(__dirname, "../../../workers");
  const read = (f: string) => fs.readFileSync(path.join(dir, f), "utf8");

  it("no worker module registers its own unthrottled 'error' listener", () => {
    const offenders = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".worker.ts"))
      .filter((f) => /\.on\(\s*["']error["']/.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it("run.ts attaches the throttled listener to every worker in its loop", () => {
    expect(read("run.ts")).toMatch(/for \(const \{ worker, dlqName \} of WORKERS\)[\s\S]*attachThrottledErrorListener\(worker, dlqName\)/);
  });
});
