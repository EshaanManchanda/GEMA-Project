#!/usr/bin/env node
/**
 * Blocking dependency audit: fails on any high/critical advisory in
 * production dependencies unless it's on the reviewed exception list below.
 * A new advisory, or a new package on an old one, fails CI until reviewed.
 *
 *   node scripts/audit-deps.js backend|frontend
 */
const { execSync } = require("child_process");
const path = require("path");

// package name -> why it's accepted for now (and what removes it)
const EXCEPTIONS = {
  backend: {
    puppeteer: "browser download path only (install time); fixed by the puppeteer 25 upgrade",
    "puppeteer-core": "via puppeteer",
    "@puppeteer/browsers": "via puppeteer",
    "basic-ftp": "via puppeteer browser download",
    "extract-zip": "via puppeteer browser download",
    "get-uri": "via puppeteer browser download",
    "pac-proxy-agent": "via puppeteer browser download",
    "proxy-agent": "via puppeteer browser download",
  },
  frontend: {
    firebase: "grpc-js server paths; the web bundle uses Auth only, Firestore web uses WebChannel",
    "@firebase/firestore": "via firebase",
    "@firebase/firestore-compat": "via firebase",
    "@grpc/grpc-js": "server-side gRPC, not in the browser bundle",
  },
};

const app = process.argv[2];
if (!EXCEPTIONS[app]) {
  console.error("usage: node scripts/audit-deps.js backend|frontend");
  process.exit(2);
}

let raw;
try {
  raw = execSync("npm audit --omit=dev --json", { cwd: path.join(__dirname, "..", app), encoding: "utf8" });
} catch (e) {
  raw = e.stdout; // npm audit exits non-zero when it finds anything
}
const vulns = JSON.parse(raw).vulnerabilities || {};

const blocking = Object.entries(vulns).filter(
  ([name, v]) => (v.severity === "high" || v.severity === "critical") && !EXCEPTIONS[app][name],
);
for (const [name, v] of blocking) {
  const titles = v.via.filter((x) => typeof x === "object").map((x) => x.title);
  console.error(`${v.severity.toUpperCase()} ${name}: ${titles.join("; ") || "via " + v.via.join(", ")}`);
}
const stale = Object.keys(EXCEPTIONS[app]).filter((name) => !vulns[name]);
if (stale.length) console.log(`Exceptions no longer needed (remove them): ${stale.join(", ")}`);

if (blocking.length) {
  console.error(`\n${blocking.length} unreviewed high/critical advisories in ${app} production dependencies.`);
  process.exit(1);
}
console.log(`${app}: no unreviewed high/critical advisories.`);
