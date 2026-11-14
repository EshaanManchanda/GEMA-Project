/**
 * Log files must have a hard disk budget. The deployed logger used plain Winston File
 * transports (no size limit, no rotation) and wrote ~18 GB each to combined.log and
 * error.log; the first rotating version only pruned by age, so one runaway day was still
 * unbounded. logRotation() adds a per-file size limit and a file-count limit.
 */
import fs from "fs";
import os from "os";
import path from "path";
import * as winston from "winston";
import { logRotation, rotatingFile } from "../../config/logger";

describe("logRotation", () => {
  it("defaults to 50 MB files, 20 kept: at most 2 GB across the combined and error logs", () => {
    expect(logRotation({})).toEqual({ maxSize: "50m", maxFiles: 20 });
  });

  it("is configurable from env", () => {
    expect(logRotation({ LOG_MAX_FILE_MB: "10", LOG_MAX_FILES: "5" })).toEqual({ maxSize: "10m", maxFiles: 5 });
  });

  it.each(["", "0", "-3", "abc"])("ignores the unusable value %p and keeps the default", (bad) => {
    expect(logRotation({ LOG_MAX_FILE_MB: bad, LOG_MAX_FILES: bad })).toEqual({ maxSize: "50m", maxFiles: 20 });
  });
});

describe("rotatingFile", () => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "logrot-"));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const logFiles = () => fs.readdirSync(dir).filter((f) => !f.endsWith("audit.json"));

  it("keeps a flood of logging within the file-count and size budget", async () => {
    // 1 MB files, 3 kept. ~7 MB written in a steady stream, as a runaway error loop would.
    const transport = rotatingFile(dir, "combined", undefined, { LOG_MAX_FILE_MB: "1", LOG_MAX_FILES: "3" });
    const logger = winston.createLogger({ transports: [transport] });
    const line = "x".repeat(1000);
    for (let batch = 0; batch < 70; batch++) {
      for (let i = 0; i < 100; i++) logger.info(line);
      await sleep(60);
    }

    // Rotation, gzip and pruning finish asynchronously.
    const deadline = Date.now() + 8000;
    while (logFiles().length > 3 && Date.now() < deadline) await sleep(200);
    transport.close();

    const files = logFiles();
    expect(files.length).toBeLessThanOrEqual(3);
    const bytes = files.reduce((sum, f) => sum + fs.statSync(path.join(dir, f)).size, 0);
    expect(bytes).toBeLessThan(3 * 1024 * 1024 + 64 * 1024); // 3 files x 1 MB, plus slack
    expect(files.some((f) => f.endsWith(".gz"))).toBe(true); // rotated files are compressed
  }, 30000);

  it("never grows a single file past its size limit in one day", async () => {
    const transport = rotatingFile(dir, "error", "error", { LOG_MAX_FILE_MB: "1", LOG_MAX_FILES: "20" });
    const logger = winston.createLogger({ transports: [transport] });
    const line = "e".repeat(1000);
    for (let batch = 0; batch < 40; batch++) {
      for (let i = 0; i < 100; i++) logger.error(line);
      await sleep(60);
    }
    await sleep(1500);
    transport.close();

    const biggest = Math.max(...logFiles().map((f) => fs.statSync(path.join(dir, f)).size));
    expect(biggest).toBeLessThan(1024 * 1024 + 64 * 1024);
  }, 30000);
});
