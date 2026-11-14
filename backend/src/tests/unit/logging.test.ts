/**
 * Production log volume must be controllable from env:
 *  - LOG_LEVEL sets the logger threshold (it was hard-coded, so the env var was ignored)
 *  - successful requests are not written to stdout unless ENABLE_REQUEST_LOGGING=true
 */
import { Request, Response } from "express";
import { resolveLogLevel } from "../../config/logger";
import { accessLogSkip } from "../../middleware/accessLog";

describe("resolveLogLevel", () => {
  it.each<[string | undefined, string, string]>([
    ["warn", "production", "warn"],
    [" WARN ", "production", "warn"],
    ["error", "production", "error"],
    ["debug", "production", "debug"], // an explicit request is honoured
    [undefined, "production", "info"],
    ["", "production", "info"],
    [undefined, "development", "debug"],
    [undefined, "test", "debug"],
    ["warning", "production", "info"], // typo: must not leave the logger without a threshold
    ["verbose", "development", "verbose"],
  ])("LOG_LEVEL=%p in %s gives %s", (requested, nodeEnv, expected) => {
    expect(resolveLogLevel(requested, nodeEnv)).toBe(expected);
  });
});

describe("shared logger level", () => {
  const load = (logLevel: string | undefined) => {
    const prev = process.env.LOG_LEVEL;
    if (logLevel === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = logLevel;
    try {
      let logger: any;
      // A fresh module instance, because the level is read when the logger is created.
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        logger = require("../../config/logger").default;
      });
      return logger;
    } finally {
      if (prev === undefined) delete process.env.LOG_LEVEL;
      else process.env.LOG_LEVEL = prev;
    }
  };

  it("takes its level from LOG_LEVEL", () => {
    const logger = load("error");
    expect(logger.level).toBe("error");
    expect(logger.isLevelEnabled("info")).toBe(false);
    expect(logger.isLevelEnabled("error")).toBe(true);
  });

  it("falls back to a working level when LOG_LEVEL is invalid", () => {
    const logger = load("warning");
    expect(logger.level).toBe("debug"); // test environment default
    expect(logger.isLevelEnabled("error")).toBe(true);
  });
});

describe("accessLogSkip", () => {
  const res = (statusCode: number) => ({ statusCode }) as Response;
  const req = {} as Request;

  it.each([200, 201, 204, 301, 304, 399])("skips a %d when request logging is off", (status) => {
    expect(accessLogSkip(false)(req, res(status))).toBe(true);
  });

  it.each([400, 401, 403, 404, 429, 500, 503])("still logs a %d when request logging is off", (status) => {
    expect(accessLogSkip(false)(req, res(status))).toBe(false);
  });

  it("logs everything when request logging is on", () => {
    expect(accessLogSkip(true)(req, res(200))).toBe(false);
    expect(accessLogSkip(true)(req, res(500))).toBe(false);
  });
});
