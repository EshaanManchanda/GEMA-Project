/**
 * pm2 writes stdout to out_file and stderr to error_file. Setting log_file as well writes every line
 * a SECOND time into a third file that nothing rotates, which tripled the disk use of a log storm.
 */
import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "../../../../..");
const rootFile = path.join(root, "ecosystem.config.js");
const backendFile = path.join(root, "backend", "ecosystem.config.js");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const apps: Array<Record<string, unknown>> = require(rootFile).apps;

describe("ecosystem.config.js", () => {
  it.each(apps.map((a) => [a.name as string, a]))("%s: pm2 writes each log line once", (_name, app) => {
    expect(app.log_file).toBeUndefined();
    expect(app.out_file).toBeDefined();
    expect(app.error_file).toBeDefined();
    expect(app.out_file).not.toEqual(app.error_file);
  });

  it("defines the API and the worker", () => {
    expect(apps.map((a) => a.name)).toEqual(["gema-backend", "gema-worker"]);
  });

  it("the copy in backend/ is identical to the root one (they drifted before)", () => {
    expect(fs.readFileSync(backendFile, "utf8").replace(/\r\n/g, "\n")).toBe(
      fs.readFileSync(rootFile, "utf8").replace(/\r\n/g, "\n"),
    );
  });
});
