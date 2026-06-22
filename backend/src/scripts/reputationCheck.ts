/**
 * Weekly reputation monitoring for Kidrove domains.
 *
 * Usage:
 *   npx ts-node src/scripts/reputationCheck.ts
 *
 * What it does:
 *   1. Verifies each domain is reachable and returns correct security headers (HSTS, X-Frame-Options, etc.)
 *   2. Checks Google Safe Browsing API if GOOGLE_SAFE_BROWSING_API_KEY is set in .env
 *   3. Prints pre-filled lookup URLs for manual checks (VirusTotal, FortiGuard, Talos, etc.)
 *   4. Appends a JSON result entry to reputation-history.json for trend tracking
 *
 * Set GOOGLE_SAFE_BROWSING_API_KEY in .env to enable automated Safe Browsing checks.
 */
import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const DOMAINS = [
  "https://kidrove.com",
  "https://kidrove.in",
  "https://kidrove.ae",
  "https://api.kidrove.com",
];

const HISTORY_FILE = path.resolve(process.cwd(), "reputation-history.json");

const MANUAL_CHECKS: Record<string, string> = {
  "Google Safe Browsing": "https://transparencyreport.google.com/safe-browsing/search?url=",
  VirusTotal: "https://www.virustotal.com/gui/domain/",
  FortiGuard: "https://www.fortiguard.com/webfilter?q=",
  "Cisco Talos": "https://talosintelligence.com/reputation_center/lookup?search=",
  URLVoid: "https://www.urlvoid.com/scan/",
  Sucuri: "https://sitecheck.sucuri.net/results/",
  "Microsoft SmartScreen": "https://www.microsoft.com/en-us/wdsi/support/report-unsafe-site-guest",
  Spamhaus: "https://check.spamhaus.org/",
};

interface DomainResult {
  domain: string;
  reachable: boolean;
  statusCode?: number;
  hsts: boolean;
  xFrameOptions: boolean;
  xContentTypeOptions: boolean;
  referrerPolicy: boolean;
  permissionsPolicy: boolean;
  safeBrowsing?: "clean" | "flagged" | "unchecked";
  error?: string;
}

function fetchHead(url: string): Promise<{ statusCode: number; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.request(url, { method: "HEAD", timeout: 8000 }, (res) => {
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.headers)) {
        if (typeof v === "string") headers[k.toLowerCase()] = v;
        else if (Array.isArray(v)) headers[k.toLowerCase()] = v.join(", ");
      }
      resolve({ statusCode: res.statusCode || 0, headers });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.end();
  });
}

async function checkGoogleSafeBrowsing(domains: string[]): Promise<Record<string, "clean" | "flagged">> {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!apiKey) return {};

  const body = JSON.stringify({
    client: { clientId: "kidrove-monitor", clientVersion: "1.0" },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: domains.map((d) => ({ url: d })),
    },
  });

  return new Promise((resolve) => {
    const url = new URL(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`);
    const req = https.request(
      { hostname: url.hostname, path: url.pathname + url.search, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            const results: Record<string, "clean" | "flagged"> = {};
            for (const d of domains) results[d] = "clean";
            if (json.matches) {
              for (const m of json.matches) results[m.threat.url] = "flagged";
            }
            resolve(results);
          } catch {
            resolve({});
          }
        });
      },
    );
    req.on("error", () => resolve({}));
    req.write(body);
    req.end();
  });
}

async function checkDomain(domain: string, safeBrowsing: Record<string, "clean" | "flagged">): Promise<DomainResult> {
  const result: DomainResult = {
    domain,
    reachable: false,
    hsts: false,
    xFrameOptions: false,
    xContentTypeOptions: false,
    referrerPolicy: false,
    permissionsPolicy: false,
  };

  try {
    const { statusCode, headers } = await fetchHead(domain);
    result.reachable = statusCode >= 200 && statusCode < 400;
    result.statusCode = statusCode;
    result.hsts = !!headers["strict-transport-security"];
    result.xFrameOptions = !!headers["x-frame-options"];
    result.xContentTypeOptions = headers["x-content-type-options"] === "nosniff";
    result.referrerPolicy = !!headers["referrer-policy"];
    result.permissionsPolicy = !!headers["permissions-policy"];
  } catch (err: any) {
    result.error = err.message;
  }

  const sbResult = safeBrowsing[domain];
  result.safeBrowsing = sbResult ?? "unchecked";

  return result;
}

function printHeader(text: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(` ${text}`);
  console.log("─".repeat(60));
}

function tick(val: boolean) { return val ? "✅" : "❌"; }

async function main() {
  console.log(`\n🔍 Kidrove Reputation Check — ${new Date().toISOString()}`);

  const safeBrowsing = await checkGoogleSafeBrowsing(DOMAINS);
  if (!process.env.GOOGLE_SAFE_BROWSING_API_KEY) {
    console.log("ℹ️  GOOGLE_SAFE_BROWSING_API_KEY not set — Safe Browsing check skipped.");
  }

  printHeader("Security Header Checks");

  const results: DomainResult[] = [];
  for (const domain of DOMAINS) {
    const r = await checkDomain(domain, safeBrowsing);
    results.push(r);

    const status = r.reachable ? `HTTP ${r.statusCode}` : `UNREACHABLE (${r.error || "unknown"})`;
    console.log(`\n  ${domain}`);
    console.log(`    Reachable          ${tick(r.reachable)} ${status}`);
    console.log(`    HSTS               ${tick(r.hsts)}`);
    console.log(`    X-Frame-Options    ${tick(r.xFrameOptions)}`);
    console.log(`    X-Content-Type     ${tick(r.xContentTypeOptions)}`);
    console.log(`    Referrer-Policy    ${tick(r.referrerPolicy)}`);
    console.log(`    Permissions-Policy ${tick(r.permissionsPolicy)}`);
    if (r.safeBrowsing !== "unchecked") {
      console.log(`    Safe Browsing      ${r.safeBrowsing === "clean" ? "✅ clean" : "🚨 FLAGGED"}`);
    }
  }

  printHeader("Manual Reputation Lookups (open these URLs)");
  const primaryDomain = "kidrove.com";
  for (const [service, baseUrl] of Object.entries(MANUAL_CHECKS)) {
    if (service === "Microsoft SmartScreen" || service === "Spamhaus") {
      console.log(`  ${service}: ${baseUrl}`);
    } else {
      console.log(`  ${service}: ${baseUrl}${primaryDomain}`);
    }
  }

  // Persist history
  let history: any[] = [];
  if (fs.existsSync(HISTORY_FILE)) {
    try { history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8")); } catch { /**/ }
  }
  history.push({ timestamp: new Date().toISOString(), results });
  // Keep last 52 entries (~1 year of weekly checks)
  if (history.length > 52) history = history.slice(-52);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  console.log(`\n📄 Results saved to reputation-history.json (${history.length} entries)\n`);

  const hasIssues = results.some((r) => !r.reachable || r.safeBrowsing === "flagged");
  if (hasIssues) {
    console.log("🚨 Issues found — review the results above and consult FIREWALL_UNBLOCK_RUNBOOK.md\n");
    process.exit(1);
  } else {
    console.log("✅ All checks passed.\n");
  }
}

main();
