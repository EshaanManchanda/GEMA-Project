# Auth & Cookie Security System

How GEMA's authentication actually works in production, plus the 2026-08-15/16
refresh-token bug and fix.

## Domains involved

| Host | Role |
|---|---|
| `https://kidrove.com` | Frontend (React SPA, static build) |
| `https://api.kidrove.com` | Backend API (Node/Express, nginx → `127.0.0.1:5000`) |
| `.kidrove.in`, `.kidrove.ae` | Same setup, separate regions |

Frontend and API are **different subdomains of the same registrable domain**
(`kidrove.com`) — same-site, cross-origin. This matters for cookie rules below.

## Token model

- **accessToken** — JWT, 7 day expiry, `httpOnly` cookie, `Path=/` (sent on every request).
  Carries a `tv` (tokenVersion) claim, checked against `User.tokenVersion` on
  every authenticated request (`middleware/auth.ts`) — bumping `tokenVersion`
  (password reset, "log out everywhere") instantly invalidates all outstanding
  access tokens without a blocklist.
- **refreshToken** — JWT, 30 day expiry, `httpOnly` cookie, `Path=/api/auth`
  only (not sent on ordinary API calls). Hashed with SHA-256 before storage in
  the `RefreshToken` Mongo collection — the raw token only ever exists in the
  cookie. Verified two ways on `/api/auth/refresh-token`: JWT signature/exp
  first, then a DB lookup on the hash to confirm it was actually issued and
  isn't revoked.
- **Rotation**: every refresh call revokes the token it consumed and issues a
  brand new access+refresh pair (`rotateRefreshToken` in `auth.controller.ts`).
  Reusing an already-rotated refresh token is treated as theft and logged
  (`refresh_token_reuse` audit reason).
- **XSRF-TOKEN** — readable (non-`httpOnly`) cookie, double-submit CSRF token.
  Reissued alongside every access/refresh cookie set. Also returned in the
  JSON body of login/register/refresh/firebase responses, because a
  cross-registrable-domain frontend (e.g. `kidrove.in` calling
  `api.kidrove.com`) can never read a cookie set by a different site via JS —
  the body is the only channel available there.

## Cookie attributes (production)

```
Domain=.kidrove.com     — leading dot shares the cookie across all subdomains
                           (api.kidrove.com, kidrove.com, www.kidrove.com)
Secure                  — HTTPS only
HttpOnly                — accessToken/refreshToken only (XSRF-TOKEN is not,
                           by design — frontend JS must echo it back)
SameSite=None           — set via COOKIE_SAMESITE env; required because the
                           multi-TLD setup (kidrove.com/.in/.ae all calling
                           one of several api.* hosts) needs it in some
                           configs. Paired with Secure (mandatory pairing —
                           browsers drop SameSite=None cookies without Secure)
```

Config source: `getCookieOptions()` / `getRefreshCookieOptions()` in
`backend/src/controllers/auth.controller.ts`, driven by `COOKIE_DOMAIN` and
`COOKIE_SAMESITE` env vars. **Local dev must never set `COOKIE_DOMAIN`** — a
`Domain=.kidrove.com` cookie fails the browser's domain-match check against
`localhost` and gets silently dropped (documented inline in `backend/.env`).

## CSRF (double-submit pattern)

`backend/src/middleware/csrf.ts`, mounted globally in `server.ts`.

- Applies only to state-changing methods (`POST/PUT/PATCH/DELETE`) **and**
  only when the request already carries the `accessToken` cookie — Bearer/API
  clients are exempt by construction (a browser never auto-attaches a custom
  `Authorization` header cross-site, so they're not CSRF-vulnerable).
- Checks `X-CSRF-Token` header against the `XSRF-TOKEN` cookie value
  (`crypto.timingSafeEqual`), 403 on mismatch.
- `EXEMPT_EXACT_PATHS`: login/register/refresh/forgot-password/reset-password/
  verify-email/firebase — these mint a *new* session or are pre-auth
  email/OTP flows, so there's no existing CSRF token to check yet. Gated on
  the route's trust model, not on cookie presence, specifically so a browser
  carrying a stale/expired `accessToken` can still reach `login`/`refresh-token`
  to recover instead of getting stuck in a 403 loop.

## CORS

`server.ts`, allowlist built from `FRONTEND_URL` + `ALLOWED_ORIGINS` +
`ADDITIONAL_ALLOWED_ORIGINS` env vars (no domains hardcoded in source).
`credentials: true`, so only allowlisted origins can make cookie-authenticated
requests at all — origin spoofing via `Origin` header alone doesn't bypass
this since the browser enforces it, not the server.

## Rate limiting

Per-route limiters (`middleware/rateLimiter.ts`), keyed by `req.ip` (behind
`app.set("trust proxy", 1)` so the real client IP is used, not nginx's).
`refreshTokenLimiter`: 30 requests / 15 min, `skipSuccessfulRequests: true` —
only failed attempts count against the limit.

## Nginx layer

Single upstream (`backend_api` → `127.0.0.1:5000`, keepalive pool) shared by
`kidrove.com`, `kidrove.in`, `kidrove.ae` and their `api.*` subdomains — all
proxy through the same Node process via `snippets/api-proxy.conf`. No
per-domain routing divergence; confirmed during this investigation.

---

## Incident: 2026-08-15/16 — login succeeds, immediately logs out

**Symptom:** `POST /api/auth/login` → 200, cookies set correctly. Almost
immediately, `POST /api/auth/refresh-token` → 401, user forced to logout.

**Investigation path** (ruled out in order):
1. Cookie attributes on the `Set-Cookie` response — correct
   (`Domain=.kidrove.com`, `Secure`, `SameSite=None`, `HttpOnly`).
2. Nginx routing — single clean upstream, no split traffic between
   `gema-backend` and the unrelated `bulk-backend` app on the same box.
3. `JWT_SECRET`/`JWT_REFRESH_SECRET` — static from env, no random-per-boot
   fallback, so a process restart doesn't invalidate existing tokens.
4. **Root cause found in the actual failing request's `Cookie:` header**:
   two `refreshToken` values and two `accessToken` values sent in the same
   request, ~10 hours apart by `iat`. The browser was holding a **stale
   cookie from before `COOKIE_DOMAIN=.kidrove.com` was configured** (a
   different domain scope — host-only or bare-apex) alongside the current,
   correctly-scoped one. Both matched `api.kidrove.com` and got sent
   together; Express's `cookie` package keeps the *first* occurrence on
   duplicate names, which was the old, already-rotated refresh token — the
   server correctly rejected it as revoked.

**Fix:** `clearAuthCookies()` (auth.controller.ts) and `clearCsrfToken()`
(csrf.ts) previously only cleared cookies scoped to the *current*
`COOKIE_DOMAIN`, so a stale cookie under any other domain scope could never
be purged and lived forever. Both now sweep every plausible domain variant
(`.kidrove.com`, bare `kidrove.com`, host-only) on every clear call. Since
`clearAuthCookies` already fires on logout and on every failed refresh, this
self-heals automatically — the same failed refresh that used to just log
someone out now also wipes the stale duplicate, so their next login leaves
exactly one cookie per name.

**Deploy:**
```bash
cd backend && npm run build
pm2 restart gema-backend --update-env
```

**Follow-up (not yet investigated):** `gema-backend` had restarted 50 times
per `pm2 list` — cause unknown, common crash-keyword grep against the error
log came back empty. Worth a proper look separately.
