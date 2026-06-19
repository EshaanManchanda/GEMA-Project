# Pre-Deploy Security Checklist
**Auth & Google Signup hardening — complete before pushing to production server**

---

## Step 1 — Set environment variables

Add / update these in your production `.env` (or Render/VPS env panel):

```env
# Cookie behaviour — set "lax" if frontend + API share a domain (api.gema.com + app.gema.com)
# Set "none" only if they are on completely different domains (requires HTTPS)
COOKIE_SAMESITE=lax

# JWT secrets — MUST be at least 32 chars and MUST be different from each other
# Generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=<generate new 48-char secret>
JWT_REFRESH_SECRET=<generate different 48-char secret>

# Explicit allowed origins — comma-separated, no trailing slashes
ALLOWED_ORIGINS=https://kidrove.com,https://www.kidrove.com
ADDITIONAL_ALLOWED_ORIGINS=https://api.kidrove.com

# Frontend URL (used as primary allowed CORS origin)
FRONTEND_URL=https://kidrove.com
```

> **Why:** Server now enforces `JWT_SECRET` and `JWT_REFRESH_SECRET` ≥ 32 chars and different at startup. It will refuse to start if these are weak or identical.

---

## Step 2 — Run migration: revoke all refresh tokens

The refresh token store now saves a SHA-256 hash of the token, not the raw JWT. Existing raw tokens will never match a hash lookup, so they must all be revoked first.

**This will log out all currently logged-in users. Run it during off-peak hours.**

```bash
cd backend
npx ts-node src/scripts/migrate-refresh-token-hashing.ts
```

Expected output:
```
Connected to MongoDB
Revoked N refresh tokens. All users will need to log in again.
```

---

## Step 3 — Run migration: deduplicate firebaseUid before index

The `User` collection now has a unique sparse index on `firebaseUid`. If any duplicate `firebaseUid` values exist (from the old race condition), MongoDB will refuse to create the index and the server will crash on startup.

```bash
cd backend
npx ts-node src/scripts/migrate-firebaseuid-unique-index.ts
```

Expected output (if clean):
```
No duplicate firebaseUid values found. Safe to add unique index.
```

Expected output (if duplicates existed):
```
Found N duplicated firebaseUid(s). Deduplicating...
  firebaseUid=abc123: keeping <id>, removing <id>
Removed N duplicate user document(s). Safe to add unique index now.
```

> **What it keeps:** The oldest document (first registration) for each duplicated uid.

---

## Step 4 — Build and start

```bash
cd backend
npm run build
npm start
```

Watch the startup logs for these lines — if any are missing, check your env vars:

```
Firebase Admin SDK initialized with provided credentials
MongoDB connected
Server running on port 5001
```

If `JWT_SECRET` is too short or both secrets match, you will see:
```
Error: JWT_SECRET must be at least 32 characters in production.
```
Fix the env var and restart.

---

## Step 5 — Smoke tests

Run these from your local machine after deploy. Replace `https://api.kidrove.com` with your actual API base URL.

### 5a — CORS: malicious Vercel origin should be rejected
```bash
curl -i -H "Origin: https://evil-attacker.vercel.app" \
  https://api.kidrove.com/api/health
```
Expected: **no** `Access-Control-Allow-Origin` header in response.

### 5b — CORS: null origin should be rejected
```bash
curl -i -H "Origin: null" \
  https://api.kidrove.com/api/auth/login
```
Expected: **no** `Access-Control-Allow-Origin` header.

### 5c — CORS: your real frontend origin should be allowed
```bash
curl -i \
  -H "Origin: https://kidrove.com" \
  -H "Content-Type: application/json" \
  https://api.kidrove.com/api/health
```
Expected: `Access-Control-Allow-Origin: https://kidrove.com` and `Access-Control-Allow-Credentials: true`.

### 5d — Login works
```bash
curl -i -X POST https://api.kidrove.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```
Expected: `200`, `set-cookie: accessToken=...` and `set-cookie: refreshToken=...`.

Check cookie headers:
- `HttpOnly` — present
- `Secure` — present (production HTTPS)
- `SameSite=Lax` (or `None` if cross-site)
- `refreshToken` cookie path should be `/api/auth`, not `/`

### 5e — Token refresh works
Copy the `refreshToken` value from the cookie above, then:
```bash
curl -i -X POST https://api.kidrove.com/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -H "Cookie: refreshToken=<token from step 5d>"
```
Expected: `200`, new `accessToken` and `refreshToken` cookies set.

### 5f — Refresh token reuse detection
Use the **old** refresh token (from step 5d, already rotated by 5e):
```bash
curl -i -X POST https://api.kidrove.com/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -H "Cookie: refreshToken=<old token from step 5d>"
```
Expected: `401` — `"Session compromised. Please login again."` — all sessions for that user revoked.

### 5g — Account lockout
Make 10 consecutive bad-password login attempts for the same email, then try with the correct password:
```bash
# 10 bad attempts ...
curl -X POST https://api.kidrove.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrongpassword"}'

# 11th attempt (correct password) — should be locked
curl -X POST https://api.kidrove.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"correctpassword"}'
```
Expected: `429` — `"Account temporarily locked..."`.

### 5h — Google signup still works
Open the frontend, click "Sign up with Google", complete the flow. Expected: logged in, user created, correct role assigned.

### 5i — Verify DB has hashed refresh tokens (not raw JWTs)
In MongoDB shell or Compass:
```js
db.refreshtokens.findOne({ isRevoked: false })
```
The `token` field should be a 64-char hex string (SHA-256 hash), **not** a `eyJ...` JWT.

---

## Step 6 — MongoDB: verify the new index exists

```js
db.users.getIndexes()
```

Look for:
```json
{ "key": { "firebaseUid": 1 }, "unique": true, "sparse": true, "name": "firebaseUid_1" }
```

If missing, the migration in Step 3 did not complete. Re-run it.

---

## What changed (summary)

| Area | Change |
|------|--------|
| CORS | Removed `*.vercel.app` wildcard; removed `Origin: null` allowance; no-origin + unsafe methods blocked in prod |
| CORS | Preview deploys scoped to `kidrove-frontend-*.vercel.app` (non-production only) |
| Cookies | `sameSite` env-driven (`COOKIE_SAMESITE`); refresh cookie scoped to `/api/auth`; `priority: high` |
| Helmet | Explicit HSTS (1yr), noSniff, frameguard, referrerPolicy, hidePoweredBy |
| Refresh tokens | Stored as SHA-256 hash — raw token only ever in httpOnly cookie |
| Refresh tokens | Reuse detection: replayed revoked token → all sessions nuked |
| Sessions | `tokenVersion` on User; bumped on password reset; embedded in access token; checked on every request |
| Rate limiting | `/api/auth/refresh-token` now behind `authLimiter` (was unprotected) |
| Account lockout | 10 failed logins → 15 min lock; counter resets on success |
| Registration | Duplicate email returns neutral `200` (anti-enumeration) + "you already have an account" email |
| Firebase auth | `verifyIdToken` failure → clean `401` (was `500`) |
| Firebase auth | Suspended/inactive guard runs **before** any DB mutation (no uid linked on blocked accounts) |
| Firebase auth | Dropped redundant `getUser()` call — uses decoded token claims directly (saves 1 round-trip) |
| JWT secrets | Production startup enforces ≥ 32 chars and that access/refresh secrets differ |
| User model | `firebaseUid` unique sparse index; `tokenVersion`, `failedLoginAttempts`, `lockUntil` fields |

---

## Rollback notes

If you need to rollback the refresh-token hashing change:
1. Revert `generateAuthTokens` and `refreshToken` handler in `auth.controller.ts`.
2. All tokens issued after the migration are hashed — they will be invalid on the old code. Users will need to log in again either way.

There is no rollback for the `firebaseUid` unique index that would be safe — removing it just re-opens the race condition.
