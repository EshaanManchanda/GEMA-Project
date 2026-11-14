/**
 * Every log line goes through one sanitizer before it is written (config/logger.ts):
 * secrets never reach a file, and one huge value (an ioredis error carrying a whole Lua script,
 * a request body, a Buffer) can no longer turn a single line into thousands.
 */
import { Writable } from "stream";
import mongoose from "mongoose";
import * as winston from "winston";
import { fileLogFormat, sanitizeLogValue } from "../../config/logger";

const sanitize = (value: unknown, key = ""): any =>
  sanitizeLogValue(value, key);

describe("sanitizeLogValue", () => {
  it("redacts sensitive keys at any depth, in any case", () => {
    const out = sanitize({
      email: "a@b.c",
      password: "hunter2",
      Password: "hunter3",
      user: { profile: { accessToken: "t1", refreshToken: "t2" } },
      headers: {
        Authorization: "Bearer abc",
        "set-cookie": ["sid=1"],
        "x-api-key": "k1",
        cookie: "a=b",
      },
      apiKey: "k2",
      api_key: "k3",
      JWT_SECRET: "s",
      otp: "123456",
    });
    expect(out.email).toBe("a@b.c");
    for (const v of [
      out.password,
      out.Password,
      out.user.profile.accessToken,
      out.user.profile.refreshToken,
      out.headers.Authorization,
      out.headers["set-cookie"],
      out.headers["x-api-key"],
      out.headers.cookie,
      out.apiKey,
      out.api_key,
      out.JWT_SECRET,
      out.otp,
    ]) {
      expect(v).toBe("[REDACTED]");
    }
    expect(JSON.stringify(out)).not.toMatch(/hunter|Bearer abc|sid=1|123456/);
  });

  it("only matches keys that END in a sensitive word, so counters and flags stay readable", () => {
    const out = sanitize({
      tokenCount: 5,
      otpSent: true,
      secretary: "Ann",
      userToken: "t",
      passwordResetRequested: false,
    });
    expect(out.tokenCount).toBe(5);
    expect(out.otpSent).toBe(true);
    expect(out.secretary).toBe("Ann");
    expect(out.passwordResetRequested).toBe(false);
    expect(out.userToken).toBe("[REDACTED]");
  });

  it("leaves an empty sensitive field empty (nothing to hide, and the absence is useful)", () => {
    const out = sanitize({ password: null, token: undefined });
    expect(out.password).toBeNull();
    expect(out.token).toBeUndefined();
  });

  it("keeps numbers, booleans, null, dates and ObjectIds as they were", () => {
    const id = new mongoose.Types.ObjectId();
    const when = new Date("2026-11-14T10:00:00Z");
    const out = sanitize({ n: 1, b: false, z: null, when, id });
    expect(out.n).toBe(1);
    expect(out.b).toBe(false);
    expect(out.z).toBeNull();
    expect(JSON.stringify(out.when)).toBe(JSON.stringify(when));
    expect(JSON.stringify(out.id)).toBe(JSON.stringify(id));
    expect(JSON.stringify(out.id)).toContain(id.toHexString());
  });

  it("truncates a string over 8 KB and says how much was cut", () => {
    const out = sanitize({ body: "x".repeat(20_000) });
    expect(out.body.length).toBeLessThan(8_300);
    expect(out.body).toMatch(/\[\+11808 chars\]$/);
    expect(sanitize({ body: "x".repeat(8_192) }).body).toHaveLength(8_192);
  });

  it("replaces a Buffer with its size", () => {
    expect(sanitize({ file: Buffer.from("abc") }).file).toBe(
      "[Buffer 3 bytes]",
    );
  });

  it("replaces the args of an ioredis-style command with their count (the 1,600-line Lua dumps)", () => {
    const script = "local x = redis.call('get', KEYS[1])\n".repeat(500);
    const out = sanitize({
      command: {
        name: "evalsha",
        args: [script, "11", "bull:certificate-generation:wait"],
      },
    });
    expect(out.command.name).toBe("evalsha");
    expect(out.command.args).toBe("[3 args]");
    expect(JSON.stringify(out)).not.toContain("redis.call");
  });

  it("copes with circular references", () => {
    const a: any = { name: "a" };
    a.self = a;
    a.list = [a];
    const out = sanitize(a);
    expect(out.self).toBe("[Circular]");
    expect(out.list[0]).toBe("[Circular]");
  });

  it("does not call a shared (non-circular) reference circular", () => {
    const shared = { v: 1 };
    const out = sanitize({ a: shared, b: shared });
    expect(out.a).toEqual({ v: 1 });
    expect(out.b).toEqual({ v: 1 });
  });

  it("stops at a depth limit instead of walking forever", () => {
    let deep: any = { leaf: true };
    for (let i = 0; i < 12; i++) deep = { child: deep };
    expect(JSON.stringify(sanitize(deep))).toContain("[Truncated]");
  });

  it("caps long arrays", () => {
    const out = sanitize({ ids: Array.from({ length: 500 }, (_, i) => i) });
    expect(out.ids).toHaveLength(101);
    expect(out.ids[100]).toBe("[+400 more]");
    expect(sanitize({ ids: [1, 2, 3] }).ids).toEqual([1, 2, 3]);
  });

  it("never throws, even when toJSON does", () => {
    const evil = {
      toJSON() {
        throw new Error("boom");
      },
    };
    expect(() => sanitize({ evil })).not.toThrow();
    expect(sanitize({ evil }).evil).toBe("[Unserializable]");
  });
});

describe("fileLogFormat (the real format chain behind the log files)", () => {
  const capture = () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _enc, cb) {
        lines.push(chunk.toString());
        cb();
      },
    });
    const logger = winston.createLogger({
      level: "debug",
      format: fileLogFormat,
      defaultMeta: { service: "test" },
      transports: [new winston.transports.Stream({ stream })],
    });
    return { logger, lines };
  };

  it("writes a normal line unchanged: level, message, timestamp, service, metadata", () => {
    const { logger, lines } = capture();
    logger.info("Order created", { orderId: "o1", total: 42 });
    const line = JSON.parse(lines[0]);
    expect(line).toMatchObject({
      level: "info",
      message: "Order created",
      service: "test",
      orderId: "o1",
      total: 42,
    });
    expect(line.timestamp).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("redacts secrets in the metadata of a logged line", () => {
    const { logger, lines } = capture();
    logger.warn("Login failed", {
      email: "a@b.c",
      password: "hunter2",
      headers: { authorization: "Bearer abc" },
    });
    const line = JSON.parse(lines[0]);
    expect(line.email).toBe("a@b.c");
    expect(line.password).toBe("[REDACTED]");
    expect(line.headers.authorization).toBe("[REDACTED]");
    expect(lines[0]).not.toMatch(/hunter2|Bearer abc/);
  });

  it("keeps an Error's message and stack and sanitizes its extra fields (what BullMQ/ioredis errors look like)", () => {
    const { logger, lines } = capture();
    const err: any = new Error(
      "OOM command not allowed when used memory > 'maxmemory'",
    );
    err.command = {
      name: "evalsha",
      args: ["local x = 1\n".repeat(2000), "11", "bull:email:wait"],
    };
    logger.error("Worker error", err);
    const line = JSON.parse(lines[0]);
    expect(line.message).toContain("OOM command not allowed");
    expect(line.stack).toContain("OOM command not allowed");
    expect(line.command.args).toBe("[3 args]");
    expect(lines[0].length).toBeLessThan(4_000);
  });
});
