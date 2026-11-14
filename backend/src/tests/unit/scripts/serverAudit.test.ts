/**
 * deployment/audit/server-audit.sh is run on the production server and its report is shared,
 * so the part that must never regress is redaction: no secret, e-mail or full visitor IP may
 * reach the report. Skipped when bash is not installed.
 */
import { spawnSync } from "child_process";
import path from "path";

const script = path
  .resolve(__dirname, "../../../../../deployment/audit/server-audit.sh")
  .replace(/\\/g, "/");
const hasBash = spawnSync("bash", ["--version"]).status === 0;
const suite = hasBash ? describe : describe.skip;

suite("server-audit.sh", () => {
  it("has valid bash syntax", () => {
    const r = spawnSync("bash", ["-n", script], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  });

  // Sourcing the script defines redact() without running the audit.
  const redact = (input: string, maskIps = "1") =>
    spawnSync("bash", ["-c", 'source "$1"; MASK_IPS=$2; redact', "_", script, maskIps], {
      input,
      encoding: "utf8",
    }).stdout;

  it.each([
    ["mongodb+srv://dbuser:Sup3rS3cret@h.example.net/app", "Sup3rS3cret"],
    ["node server.js --password hunter2 --port 5000", "hunter2"],
    ["node app --api-key=abcd1234 --other x", "abcd1234"],
    ["contact owner@example.com about it", "owner@example.com"],
    ["token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9abcdefghijklmnopqrstuvwxyz0123456789", "eyJhbGci"],
  ])("never lets a secret through: %s", (line, secret) => {
    expect(redact(`${line}\n`)).not.toContain(secret);
  });

  it("masks the last octet of IPv4 addresses, leaving paths and timestamps alone", () => {
    expect(redact('203.0.113.77 [14/Nov/2026:12:07:33 +0000] GET /var/www/x/uploads\n')).toBe(
      '203.0.113.x [14/Nov/2026:12:07:33 +0000] GET /var/www/x/uploads\n',
    );
  });

  it("keeps full IPv4 addresses when MASK_IPS=0", () => {
    expect(redact("from 203.0.113.77\n", "0")).toBe("from 203.0.113.77\n");
  });
});
