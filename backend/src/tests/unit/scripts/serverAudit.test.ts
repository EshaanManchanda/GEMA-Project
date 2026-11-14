/**
 * deployment/audit/server-audit.sh is run on the production server and its report is shared,
 * so the part that must never regress is redaction: no secret, e-mail or full visitor IP may
 * reach the report. Skipped when bash is not installed.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
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

  const source = fs.readFileSync(script, "utf8");
  const code = source
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");

  // It runs as root on production: it may only look, never change anything.
  it("is read-only: no command that changes the server", () => {
    expect(code).not.toMatch(
      /\b(rm|truncate|kill|pkill|killall|reboot|shutdown|chmod|chown|mv|dd|mkfs)\s/,
    );
    expect(code).not.toMatch(/systemctl\s+(restart|stop|start|disable|enable|mask)/);
    expect(code).not.toMatch(/pm2\s+(restart|reload|stop|delete|flush|install|set|save|kill)/);
    expect(code).not.toMatch(/apt(-get)?\s+(install|remove|upgrade|purge)/);
    expect(code).not.toMatch(/redis-cli\s+(flushall|flushdb|config\s+set|shutdown|del|set)\b/i);
  });

  it("measures per-process CPU, log growth per minute and the deployed commit (baseline)", () => {
    const r = spawnSync("bash", ["-c", 'source "$1"; type -t baseline', "_", script], {
      encoding: "utf8",
    });
    expect(r.stdout.trim()).toBe("function");
    expect(code).toMatch(/^\s*baseline\s*$/m); // main() runs it
    expect(code).toMatch(/growth/i);
    expect(code).toMatch(/rev-parse|log -1/); // deployed commit
    expect(code).toMatch(/SLOWLOG/i);
    expect(code).toMatch(/error\.log/); // nginx error log (500/502 cause)
  });

  // The script runs as root, the checkout and ~/.pm2 belong to another user: git config
  // (core.fsmonitor) or a pm2 daemon there must not execute with root privileges.
  it("never overrides git's safe.directory and drops privileges for foreign-owned directories", () => {
    expect(code).not.toMatch(/safe\.directory/);
    expect(code).toMatch(/runuser -u/);
    expect(code).toMatch(/as_owner "\$APP_DIR" git/);
    expect(code).toMatch(/-S "\$h\/\.pm2\/rpc\.sock"/); // only talk to a daemon that already runs
    expect(code).not.toMatch(/^\s*(have node && have pm2 && )?PM2_HOME=/m);
    // every other pm2 command would start a daemon if none runs: it must sit behind pm2_running
    const bare = code
      .split("\n")
      .filter((l) => /\bpm2 (ls|list|logs|jlist|describe|status)\b/.test(l))
      .filter((l) => !/pm2_running|as_owner/.test(l));
    const guarded = (l: string) => {
      const i = code.split("\n").indexOf(l);
      return code.split("\n").slice(Math.max(0, i - 3), i).some((p) => /pm2_running/.test(p));
    };
    expect(bare.filter((l) => !guarded(l))).toEqual([]);
  });

  it("as_owner runs the command directly when the directory is ours", () => {
    const r = spawnSync("bash", ["-c", 'source "$1"; as_owner "$2" echo hello', "_", script, os.tmpdir().replace(/\\/g, "/")], {
      encoding: "utf8",
    });
    expect(r.stdout.trim()).toBe("hello");
    expect(r.status).toBe(0);
  });

  it("samples log growth only for the configured window and prints bytes per minute", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-growth-"));
    const f = path.join(dir, "a.log").replace(/\\/g, "/");
    fs.writeFileSync(f, "x".repeat(100));
    const r = spawnSync(
      "bash",
      [
        "-c",
        'source "$1"; (sleep 1; printf %0600d 0 >> "$2") & log_growth 2 "$2"; wait',
        "_",
        script,
        f,
      ],
      { encoding: "utf8" },
    );
    expect(r.status).toBe(0);
    // 600 bytes in a 2 s window = 18000 bytes/min
    expect(r.stdout).toMatch(/18000 B\/min/);
    expect(r.stdout).toContain(f);
  });
});
