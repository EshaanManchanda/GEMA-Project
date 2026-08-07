import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { config } from "../config/env";

export const CSRF_COOKIE_NAME = "XSRF-TOKEN";
export const CSRF_HEADER_NAME = "x-csrf-token"; // Express lowercases incoming header names

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Raw-body webhook endpoints authenticate via provider signature, not cookies —
// they carry no CSRF cookie/header contract and must stay exempt.
const EXEMPT_PREFIXES = ["/api/payments/webhook", "/api/webhooks/cunnekt"];

const cookieSameSite = (): "lax" | "none" | "strict" =>
  (process.env.COOKIE_SAMESITE as "lax" | "none" | "strict") || "lax";

/**
 * Issue (or refresh) the CSRF cookie. Must be called alongside every place
 * that sets the httpOnly accessToken cookie (login, register, refresh) —
 * currently that's only auth.controller.ts's setAuthCookies().
 *
 * Deliberately NOT httpOnly: the frontend must be able to read this value
 * to echo it back in the X-CSRF-Token header (double-submit pattern).
 */
export const issueCsrfToken = (res: Response): string => {
  const token = crypto.randomBytes(32).toString("hex");
  const isProduction = config.nodeEnv === "production";

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: isProduction,
    sameSite: cookieSameSite(),
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, // matches refresh cookie lifetime
  });

  return token;
};

export const clearCsrfToken = (res: Response): void => {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: config.nodeEnv === "production",
    sameSite: cookieSameSite(),
    path: "/",
  });
};

/**
 * Double-submit CSRF check for cookie-authenticated, state-changing requests.
 *
 * Only enforced when the request carries the httpOnly accessToken cookie —
 * Bearer-token API clients are not vulnerable to CSRF (a browser never
 * auto-attaches a custom Authorization header cross-site), so they're
 * exempt by construction, not by an allowlist that could rot.
 */
export const verifyCsrfToken = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    return next();
  }

  if (EXEMPT_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  const usesCookieAuth = !!req.cookies?.accessToken;
  if (!usesCookieAuth) {
    return next();
  }

  const cookieToken: unknown = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (
    typeof cookieToken !== "string" ||
    typeof headerToken !== "string" ||
    cookieToken.length === 0 ||
    headerToken.length === 0 ||
    cookieToken.length !== headerToken.length ||
    !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
  ) {
    res.status(403).json({
      success: false,
      message: "Invalid or missing CSRF token.",
    });
    return;
  }

  next();
};
