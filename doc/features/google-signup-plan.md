# Sign Up / Sign In with Google — Implementation Plan

**Date:** 2026-06-12  
**Status:** Implemented  
**Branch:** aditya

---

## Overview

Adds "Sign up with Google" and "Sign in with Google" to the GEMA platform. The existing email/password auth is untouched. ~85% of the required infrastructure was pre-built — the work was wiring, one backend tweak (role picker support), and security hardening.

---

## What Already Existed (Reused)

| Piece | Location |
|---|---|
| Firebase token-verification endpoint | `backend/src/controllers/auth.controller.ts` → `firebaseAuth`, `POST /auth/firebase` |
| Firebase Admin SDK init | `backend/src/config/firebase.ts` (`initializeFirebase` + `getAuth`) |
| Firebase Web SDK (lazy-loaded) | `frontend/src/config/firebase.ts` |
| Google sign-in service | `frontend/src/services/firebaseAuth.ts` → `loginWithGoogle()` |
| `firebaseAuth` axios call | `frontend/src/services/api/authAPI.ts` |
| Redux thunk + reducers | `frontend/src/store/slices/authSlice.ts` → `loginWithGoogleThunk` |
| Styled Google buttons (commented out) | `RegisterPage.tsx` L554-584, `LoginPage.tsx` L485-515 |
| `SocialProvider` enum, `firebaseUid` field | `backend/src/models/User.ts` |
| `passwordHash` conditionally required | `User.ts` — skipped when `firebaseUid` present |
| "Use social login" login guard | `auth.controller.ts` L521 |
| `getOrCreateVendorProfile` | `backend/src/utils/vendorHelpers.ts` |
| `getOrCreateTeacherProfile` | `backend/src/utils/teacherHelpers.ts` |

---

## Files Changed

### Backend

| File | Change |
|---|---|
| `backend/src/constants/roles.ts` | **New** — `GOOGLE_ALLOWED_ROLES = ["customer","vendor","teacher"]` |
| `backend/src/types/auth.ts` | Added `role?: string` to `FirebaseAuthRequest` |
| `backend/src/validators/auth.validator.ts` | Added optional `role` field to `validateFirebaseAuth` |
| `backend/src/models/User.ts` | Added `provider?: SocialProvider\|"email"` and `signupSource?: string` fields |
| `backend/src/controllers/auth.controller.ts` | Hardened `firebaseAuth`; added guard to `forgotPassword` |

### Frontend

| File | Change |
|---|---|
| `frontend/src/services/api/authAPI.ts` | `firebaseAuth(idToken, role?)` — threads role |
| `frontend/src/services/firebaseAuth.ts` | `loginWithGoogle(role?)` — popup error handling |
| `frontend/src/store/slices/authSlice.ts` | `loginWithGoogleThunk({ navigate, role? })` |
| `frontend/src/pages/auth/RegisterPage.tsx` | `handleGoogleSignIn`, uncommented button |
| `frontend/src/pages/auth/LoginPage.tsx` | `handleGoogleSignIn`, uncommented button |
| `frontend/src/services/api.ts` | Added `/auth/firebase` to refresh-skip list |

---

## Auth Flow

```
User clicks "Sign up/in with Google"
  → signInWithPopup(auth, googleProvider)   [Firebase Web SDK, lazy-loaded]
  → result.user.getIdToken()                [Firebase ID token]
  → POST /auth/firebase { idToken, role? }  [backend]
      → getAuth().verifyIdToken(idToken)    [Firebase Admin]
      → check decodedToken.email_verified
      → getAuth().getUser(uid)
      → lookup by firebaseUid → (returning user)
      → lookup by email       → (link firebaseUid to existing email account)
      → create new user       → role from request (allowlisted), provider="google"
      → auto-create vendor / teacher profile if applicable
      → generateAuthTokens + setAuthCookies (httpOnly)
  → Redux: loginWithGoogleThunk.fulfilled → state.auth.user
  → redirectToRoleDashboard(user.role, navigate)
```

---

## Backend Changes — Details

### `firebaseAuth` (auth.controller.ts)

```
1. Pull role from body alongside idToken
2. Reject if !decodedToken.email_verified → 400
3. Resolve newUserRole from GOOGLE_ALLOWED_ROLES (default "customer")
4. Lookup by firebaseUid → returning
5. Lookup by email → link firebaseUid, set provider if not already set
6. Create new user → role=newUserRole, provider="google", signupSource="google"
7. Audit log on every branch (new / linked / returning)
8. Auto-create vendor profile (role=vendor)
9. Auto-create teacher profile (role=teacher)
10. Issue JWT httpOnly cookies
```

**Role security:** `role` is only used in the new-user creation branch. Existing / linked accounts never have their role mutated — no privilege escalation possible.

**Provider safety:** `provider` set at creation or set only once on first link (`if (!user.provider)`). Re-logins never overwrite it.

### `forgotPassword` guard

Pure Google accounts (`firebaseUid` set, `passwordHash` null) return the generic "if your email is registered…" response — same as unknown-email path — without sending any OTP. Preserves email non-enumeration while blocking mixed-auth creation.

### Role constant

```ts
// backend/src/constants/roles.ts
export const GOOGLE_ALLOWED_ROLES = ["customer", "vendor", "teacher"] as const;
```

Used by both `validateFirebaseAuth` and `firebaseAuth` — no drift.

### User model new fields

```ts
provider?: "google" | "facebook" | "apple" | "email"   // primary signup provider
signupSource?: string                                    // "google" | "email" (analytics)
```

Additive, optional — no migration needed, existing users get undefined (falsy).

---

## Frontend Changes — Details

### `loginWithGoogle(role?)` (firebaseAuth.ts)

- Forwards `role` to `authAPI.firebaseAuth(idToken, role)`.
- Catches popup cancellation (`auth/popup-closed-by-user`, `auth/cancelled-popup-request`) → throws `{ silent: true }` — no toast shown.
- Catches `auth/account-exists-with-different-credential` → friendly message.

### `loginWithGoogleThunk({ navigate, role? })` (authSlice.ts)

- Passes `role` to `loginWithGoogle`.
- Checks `error?.silent` before toasting.

### RegisterPage

- Dispatches `loginWithGoogleThunk({ navigate, role: formData.role })` — sends the currently-selected role (customer/vendor/teacher).
- Button `disabled` while `isLoading` (prevents double-submit).

### LoginPage

- Dispatches `loginWithGoogleThunk({ navigate })` — no role (sign-in, not sign-up; role irrelevant for existing accounts).
- Button `disabled` while `isLoading`.

### api.ts interceptor

`/auth/firebase` added to refresh-skip list — a failed Google auth will not trigger a token refresh loop.

---

## Security Decisions

| Decision | Rationale |
|---|---|
| `email_verified` required | Prevents unverified Google accounts from creating GEMA accounts |
| Role only set on new-user create | Prevents privilege escalation on re-login with a different role selection |
| `provider` set once, never overwritten | Prevents unexpected provider switching for existing accounts |
| Auto-link by email (convenience) | An existing email user who signs in with Google gets linked automatically. Documented tradeoff: convenient vs. strict (require password verify first). Acceptable for this platform's risk profile. |
| Password reset silently blocked for Google-only accounts | Keeps email non-enumeration behavior intact |
| Popup cancellation → silent | UX: dismissing the popup is not an error |
| `/auth/firebase` in refresh-skip list | Avoids retry loops on auth errors |
| Double-submit guard via `disabled` | Single in-flight Google request |

---

## Config Required (not committed)

### Backend `.env`
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
```

### Frontend `.env`
```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXX
```

### Firebase Console
1. Authentication → Sign-in method → enable **Google**
2. Authentication → Settings → Authorized domains → add `localhost` + production domain

---

## Verification Checklist

| Test | Expected |
|---|---|
| Firebase init logs (backend startup) | No warning, init success |
| New Google customer (Register, role=customer) | User in Mongo: `firebaseUid`, `role:customer`, `status:active`, no `passwordHash`, `provider:"google"`, `signupSource:"google"` |
| New Google vendor (Register, role=vendor) | Lands `/vendor`; vendor profile auto-created (log: `[FIREBASE_AUTH] Vendor profile auto-created`) |
| New Google teacher (Register, role=teacher) | Lands `/teacher`; teacher profile auto-created |
| Existing email user → Google same email | `firebaseUid` linked, role unchanged, no duplicate user |
| Re-login role safety | Existing customer + Google + register as vendor → stays customer |
| Unverified Google email | 400 "Google account email is not verified" |
| Forgot password (Google-only account) | Generic response, no OTP email sent |
| Password login (Google-only account) | "use social login" error |
| Popup dismissed | No toast, no error state |
| Double-click Google button | Only one request; button disabled during pending |
| Email/password register + login | Unchanged, still works |
| `npm run build` (backend + frontend) | 0 TypeScript errors |
| Cross-browser | Chrome, incognito, mobile Chrome, Safari |

---

## Rollback

Re-comment the button blocks in `RegisterPage.tsx` (lines ~554) and `LoginPage.tsx` (lines ~485) → feature invisible, zero user impact. All other changes are additive and dormant.

Removing `FIREBASE_PROJECT_ID` / `VITE_FIREBASE_*` creds also disables the feature entirely — `validateFirebaseEnv()` silently skips Firebase init with no error.

---

## Deferred (Not Built)

- "Connect Google Account" from Settings → Linked Accounts (post-signup linking UI)
- `providerDisplay` field in API responses
- Analytics dashboard breakdowns by `signupSource`
- Multiple provider support (`socialLogins[]` array)
- "Verify password before linking" stricter account-linking flow
- Passport.js or direct Google OAuth (not needed — Firebase mediates everything)
