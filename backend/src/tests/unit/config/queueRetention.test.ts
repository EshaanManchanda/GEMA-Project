/**
 * Redis on the server hit its maxmemory (noeviction) and every BullMQ write was refused. Failed jobs were kept
 * for 24 hours with no count limit, so a failure storm (each job carries its data and a stack trace, three
 * attempts each) could fill Redis by itself. Both retention rules need a count cap, not just an age.
 */
import fs from "fs";
import path from "path";

const source = fs.readFileSync(
  path.resolve(__dirname, "../../../config/queue.ts"),
  "utf8",
);
const block = (name: string) => {
  const m = source.match(new RegExp(String.raw`${name}:\s*\{([^}]*)\}`));
  return m ? m[1] : "";
};
const count = (name: string) => {
  const m = block(name).match(/count:\s*(\d+)/);
  return m ? Number(m[1]) : undefined;
};

describe("default job retention", () => {
  it("caps how many failed jobs are kept, not only for how long", () => {
    const n = count("removeOnFail");
    expect(n).toBeDefined();
    expect(n!).toBeGreaterThan(0);
    expect(n!).toBeLessThanOrEqual(1000);
  });

  it("caps how many completed jobs are kept", () => {
    const n = count("removeOnComplete");
    expect(n).toBeDefined();
    expect(n!).toBeLessThanOrEqual(1000);
  });

  it("still keeps failed jobs for a day for debugging", () => {
    expect(block("removeOnFail")).toMatch(/age:\s*24\s*\*\s*3600/);
  });
});
