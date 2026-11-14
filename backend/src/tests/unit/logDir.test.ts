/**
 * Production keeps its logs in /var/log (LOG_FILE_PATH), not inside the app folder, so a release
 * never carries them and the disk they fill is the one the operator already watches.
 * resolveLogDir() must honour that path, and must never stop the API from starting if it is wrong.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { resolveLogDir } from "../../config/logger";

describe("resolveLogDir", () => {
  let cwd: string;
  let stderr: jest.SpyInstance;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "logdir-"));
    stderr = jest.spyOn(process.stderr, "write").mockImplementation(() => true);
  });
  afterEach(() => {
    stderr.mockRestore();
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it("defaults to ./logs under the working directory", () => {
    expect(resolveLogDir(undefined, cwd)).toBe(path.join(cwd, "logs"));
    expect(fs.existsSync(path.join(cwd, "logs"))).toBe(true);
  });

  it("treats a blank value like an unset one", () => {
    expect(resolveLogDir("", cwd)).toBe(path.join(cwd, "logs"));
  });

  it("uses an absolute path as given and creates it", () => {
    const target = path.join(cwd, "var-log", "GEMA-Project", "backend");
    expect(resolveLogDir(target, cwd)).toBe(target);
    expect(fs.statSync(target).isDirectory()).toBe(true);
    expect(stderr).not.toHaveBeenCalled();
  });

  it("resolves a relative path against the working directory", () => {
    expect(resolveLogDir("custom/out/", cwd)).toBe(path.join(cwd, "custom", "out"));
  });

  it("falls back to ./logs and says so when the configured path cannot be created", () => {
    // A directory cannot be created underneath a regular file, on any platform.
    const blocker = path.join(cwd, "blocker");
    fs.writeFileSync(blocker, "x");
    const result = resolveLogDir(path.join(blocker, "sub"), cwd);
    expect(result).toBe(path.join(cwd, "logs"));
    expect(fs.statSync(result).isDirectory()).toBe(true);
    expect(String(stderr.mock.calls[0][0])).toMatch(/cannot use log directory .*falling back to .*logs/);
  });

  // Production must never quietly log into the app folder: that is how a release ends up carrying
  // (and a disk ends up filling with) logs nobody was watching. It stops with a clear message instead.
  describe("in production", () => {
    it("uses an absolute folder as given and creates it", () => {
      const target = path.join(cwd, "var-log", "GEMA-Project", "backend");
      expect(resolveLogDir(target, cwd, true)).toBe(target);
      expect(fs.statSync(target).isDirectory()).toBe(true);
    });

    it("refuses a relative path and creates nothing", () => {
      expect(() => resolveLogDir("logs/", cwd, true)).toThrow(/LOG_FILE_PATH=logs\/ cannot be used in production.*absolute/);
      expect(fs.existsSync(path.join(cwd, "logs"))).toBe(false);
    });

    it.each([undefined, "", "   "])("refuses an unset value (%j)", (value) => {
      expect(() => resolveLogDir(value, cwd, true)).toThrow(/LOG_FILE_PATH.*cannot be used in production.*absolute/);
      expect(fs.existsSync(path.join(cwd, "logs"))).toBe(false);
    });

    it("refuses a folder that cannot be created and does not fall back to ./logs", () => {
      const blocker = path.join(cwd, "blocker");
      fs.writeFileSync(blocker, "x");
      expect(() => resolveLogDir(path.join(blocker, "sub"), cwd, true)).toThrow(/cannot be used in production/);
      expect(fs.existsSync(path.join(cwd, "logs"))).toBe(false);
      expect(stderr).not.toHaveBeenCalled();
    });

    it("names the folder production is expected to use", () => {
      expect(() => resolveLogDir("logs/", cwd, true)).toThrow(/\/var\/log\/GEMA-Project\/backend/);
    });
  });
});
