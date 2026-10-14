/**
 * Every route must reject anonymous callers unless it is on the reviewed
 * public allowlist (publicRoutes.ts). A new public route — or a route that
 * lost its `authenticate` — fails here until someone reviews it.
 *
 * Behavioural, not static: each route is actually called without a cookie.
 */
import request from "supertest";
import { Application } from "express";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { PUBLIC_ROUTES } from "./publicRoutes";
import { cookie, signUp } from "../setup/session";

jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));
jest.mock("../../../services/email.service", () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  emailService: new Proxy({}, { get: () => jest.fn().mockResolvedValue(undefined) }),
}));

type Route = { method: string; path: string };

// Express 4 keeps a mounted router's prefix only as a regexp; turn it back into a path.
const mountPath = (layer: any): string => {
  if (layer.path !== undefined) return layer.path; // set after a match; usually absent
  let src: string = layer.regexp.source;
  if (src === "^\\/?$" || src === "^\\/?(?=\\/|$)") return "";
  let i = 0;
  src = src.replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, () => `:${layer.keys[i++]?.name ?? "param"}`);
  return src
    .replace(/^\^/, "")
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, "")
    .replace(/\\\/\?\$$/, "")
    .replace(/\\\//g, "/")
    .replace(/\\\./g, ".")
    .replace(/\\-/g, "-");
};

const listRoutes = (stack: any[], prefix = ""): Route[] =>
  stack.flatMap((layer: any): Route[] => {
    if (layer.route) {
      const paths: string[] = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      return paths.flatMap((p) =>
        Object.keys(layer.route.methods)
          .filter((m) => m !== "_all")
          .map((m) => ({ method: m.toUpperCase(), path: prefix + p })),
      );
    }
    if (layer.name === "router" && layer.handle?.stack) {
      return listRoutes(layer.handle.stack, prefix + mountPath(layer));
    }
    return [];
  });

// Concrete URL for a route pattern: any :param becomes a valid ObjectId.
const concrete = (path: string) =>
  path.replace(/:[A-Za-z_]+(\([^)]*\))?\??/g, "507f1f77bcf86cd799439011").replace(/\*$/, "x");

const AUTH_REFUSAL = /not authori[sz]ed|login|token|authenticat/i;

const key = (r: Route) => `${r.method} ${r.path}`;

let app: Application;
let routes: Route[];

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
  const seen = new Set<string>();
  routes = listRoutes((app as any)._router.stack).filter((r) => {
    if (seen.has(key(r))) return false;
    seen.add(key(r));
    return true;
  });
});
afterEach(clearTestDB);
afterAll(closeTestDB);

it("finds the route table", () => {
  expect(routes.length).toBeGreaterThan(300);
});

it("allowlist has no stale entries", () => {
  const live = new Set(routes.map(key));
  const stale = Object.keys(PUBLIC_ROUTES).filter((k) => !live.has(k));
  expect(stale).toEqual([]);
});

it("every non-public route rejects anonymous callers", async () => {
  const open: string[] = [];
  for (const r of routes) {
    if (PUBLIC_ROUTES[key(r)]) continue;
    const res = await (request(app) as any)[r.method.toLowerCase()](concrete(r.path)).timeout(10000);
    // The refusal must come from an auth gate; a 401 thrown deeper in a
    // handler (e.g. Stripe rejecting a key) would hide an open route.
    const refused = (res.status === 401 || res.status === 403) && AUTH_REFUSAL.test(res.body?.message ?? "");
    if (!refused) open.push(`${key(r)} -> ${res.status} ${res.body?.message ?? ""}`.trim());
  }
  expect(open).toEqual([]);
}, 600000);

it("a logged-in customer is refused on every admin route", async () => {
  const customer = await signUp(app, "customer");
  const reachable: string[] = [];
  for (const r of routes.filter((x) => x.path.startsWith("/api/admin"))) {
    const res = await (request(app) as any)[r.method.toLowerCase()](concrete(r.path))
      .set("Cookie", cookie(customer))
      .set("x-csrf-token", customer.csrfToken)
      .timeout(10000);
    const refused = res.status === 403 && AUTH_REFUSAL.test(res.body?.message ?? "");
    if (!refused) reachable.push(`${key(r)} -> ${res.status} ${res.body?.message ?? ""}`.trim());
  }
  expect(reachable).toEqual([]);
}, 600000);
