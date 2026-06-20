# Google Sign-In Setup Guide — GEMA/Kidrove Platform

Complete step-by-step guide to configure "Sign in with Google" for the GEMA platform using Firebase Authentication.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Firebase Project Setup](#2-firebase-project-setup)
3. [Enable Firebase Authentication](#3-enable-firebase-authentication)
4. [Enable Google Sign-In Provider](#4-enable-google-sign-in-provider)
5. [Get Frontend Credentials (Web App Config)](#5-get-frontend-credentials-web-app-config)
6. [Get Backend Credentials (Service Account)](#6-get-backend-credentials-service-account)
7. [Configure Frontend .env](#7-configure-frontend-env)
8. [Configure Backend .env](#8-configure-backend-env)
9. [Configure Authorized Domains](#9-configure-authorized-domains)
10. [Configure OAuth Consent Screen](#10-configure-oauth-consent-screen)
11. [Verify the Setup](#11-verify-the-setup)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Architecture Overview

```
User clicks "Sign in with Google"
        │
        ▼
┌──────────────────────────┐
│  Frontend (React/Vite)   │
│  Firebase JS SDK         │
│  - Opens Google popup    │
│  - User signs in         │
│  - Gets Firebase idToken │
└──────────┬───────────────┘
           │ POST /api/auth/firebase { idToken }
           ▼
┌──────────────────────────┐
│  Backend (Express/Node)  │
│  Firebase Admin SDK      │
│  - Verifies idToken      │
│  - Creates/finds user    │
│  - Returns JWT + cookies │
└──────────────────────────┘
```

**Two sets of credentials needed:**

| Credential Type | Used By | Purpose |
|---|---|---|
| Web App Config (API Key, Project ID, etc.) | Frontend | Initialize Firebase JS SDK, trigger Google popup |
| Service Account (Private Key, Client Email) | Backend | Verify Firebase ID tokens server-side |

---

## 2. Firebase Project Setup

### If you don't have a Firebase project yet:

1. Go to **[Firebase Console](https://console.firebase.google.com/)**
2. Click **"Create a project"** (or "Add project")
3. Enter project name (e.g., `kidrove`)
4. Enable/disable Google Analytics (optional)
5. Click **"Create project"**
6. Wait for project creation → Click **"Continue"**

### If you already have a project:

- Our production project is: **`kidrove-e9978`**
- Our testing project is: **`gema-1cef0`**
- Select the correct project from the Firebase Console dashboard

---

## 3. Enable Firebase Authentication

1. Open your project in **[Firebase Console](https://console.firebase.google.com/)**
2. In the left sidebar, click **"Build"** → **"Authentication"**
3. If Authentication is not yet enabled, you'll see a **"Get Started"** button
4. Click **"Get Started"**
5. Authentication is now enabled for your project

**Screenshot location:** Firebase Console → Build → Authentication

---

## 4. Enable Google Sign-In Provider

1. In **Authentication**, click the **"Sign-in method"** tab
2. Click **"Add new provider"**
3. Select **"Google"** from the list
4. Toggle the **"Enable"** switch to ON
5. Fill in:
   - **Project public-facing name:** `Kidrove` (shown to users in the Google consent screen)
   - **Project support email:** Select your email from the dropdown
6. Click **"Save"**

**After saving, you'll see:**
- Google listed as an enabled provider with a green checkmark
- A **Web client ID** and **Web client secret** auto-generated (these are also usable as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`)

### Where to find the auto-generated OAuth credentials:

1. Click the **"Google"** provider row to expand it
2. Under **"Web SDK configuration"**, you'll see:
   - **Web client ID** → This is your `GOOGLE_CLIENT_ID`
   - **Web client secret** → This is your `GOOGLE_CLIENT_SECRET`

---

## 5. Get Frontend Credentials (Web App Config)

These credentials initialize the Firebase JS SDK in the browser.

### Step-by-step:

1. In Firebase Console, click the **gear icon** (⚙️) next to "Project Overview" in the top-left
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. If no web app exists:
   - Click the **web icon** (`</>`) to add a web app
   - Enter app nickname: `kidrove-web`
   - Check "Also set up Firebase Hosting" (optional)
   - Click **"Register app"**
5. If a web app already exists, click on it

### You'll see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC7IOvHwD9ivSLOED1AVEnZgGSvGmA2z8c",
  authDomain: "kidrove-e9978.firebaseapp.com",
  projectId: "kidrove-e9978",
  storageBucket: "kidrove-e9978.firebasestorage.app",
  messagingSenderId: "462028426732",
  appId: "1:462028426732:web:921a18599a8ab8595e84c9",
  measurementId: "G-ZEXC540RDW"
};
```

### Mapping to .env variables:

| Firebase Config Key | .env Variable | Example Value |
|---|---|---|
| `apiKey` | `VITE_FIREBASE_API_KEY` | `AIzaSyC7IOvHwD9ivSLOED1AVEnZgGSvGmA2z8c` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` | `kidrove-e9978.firebaseapp.com` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` | `kidrove-e9978` |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` | `kidrove-e9978.firebasestorage.app` |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `462028426732` |
| `appId` | `VITE_FIREBASE_APP_ID` | `1:462028426732:web:921a18599a8ab8595e84c9` |
| `measurementId` | `VITE_FIREBASE_MEASUREMENT_ID` | `G-ZEXC540RDW` |

**Path:** Firebase Console → ⚙️ Project Settings → Your apps → Web app → Config

---

## 6. Get Backend Credentials (Service Account)

The backend uses Firebase Admin SDK to **verify** ID tokens. It needs a service account private key.

### Step-by-step:

1. In Firebase Console, click **⚙️ Project Settings**
2. Click the **"Service accounts"** tab
3. You'll see:
   - **Firebase service account:** `firebase-adminsdk-xxxxx@PROJECT_ID.iam.gserviceaccount.com`
   - **Firebase Admin SDK** configuration snippet
4. Click **"Generate new private key"**
5. Click **"Generate key"** to confirm
6. A `.json` file downloads automatically

### The downloaded JSON looks like:

```json
{
  "type": "service_account",
  "project_id": "YOUR_PROJECT_ID",
  "private_key_id": "YOUR_PRIVATE_KEY_ID",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-XXXX@YOUR_PROJECT_ID.iam.gserviceaccount.com",
  "client_id": "YOUR_CLIENT_ID",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-XXXX%40YOUR_PROJECT_ID.iam.gserviceaccount.com"
}
```

### Mapping to .env variables:

| JSON Key | .env Variable |
|---|---|
| `project_id` | `FIREBASE_PROJECT_ID` |
| `private_key` | `FIREBASE_PRIVATE_KEY` (wrap in double quotes in .env) |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key_id` | `FIREBASE_PRIVATE_KEY_ID` |
| `client_id` | `FIREBASE_CLIENT_ID` |

**IMPORTANT:** The `client_email` MUST end with `@YOUR_PROJECT_ID.iam.gserviceaccount.com`. If it references a different project, token verification will fail.

**Path:** Firebase Console → ⚙️ Project Settings → Service accounts → Generate new private key

---

## 7. Configure Frontend .env

**File:** `frontend/.env`

```env
# ---- Firebase ----
VITE_FIREBASE_PROJECT_ID=kidrove-e9978
VITE_FIREBASE_API_KEY=AIzaSyC7IOvHwD9ivSLOED1AVEnZgGSvGmA2z8c
VITE_FIREBASE_AUTH_DOMAIN=kidrove-e9978.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=kidrove-e9978.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=462028426732
VITE_FIREBASE_APP_ID=1:462028426732:web:921a18599a8ab8595e84c9
VITE_FIREBASE_MEASUREMENT_ID=G-ZEXC540RDW
```

**Rules:**
- All frontend Firebase vars must be prefixed with `VITE_` (Vite requirement)
- No quotes needed around values
- No placeholder values (`your_project_id`, `your_firebase_api_key` will cause initialization to be skipped)
- Restart Vite dev server after changing `.env` (`npm run dev`)

### How the frontend uses these:

```
frontend/src/config/firebase.ts
  → Reads VITE_FIREBASE_* env vars
  → validateFirebaseEnv() checks none are missing/placeholder
  → Lazy-initializes Firebase app + GoogleAuthProvider
  → Used by frontend/src/services/firebaseAuth.ts → loginWithGoogle()
```

---

## 8. Configure Backend .env

**File:** `backend/.env`

```env
# Firebase Admin SDK (from Service Account JSON)
FIREBASE_PROJECT_ID=kidrove-e9978
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...(full key)...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@kidrove-e9978.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY_ID=aa193ac5989d1a9e0146cdfc16364341f1aead2c
FIREBASE_CLIENT_ID=100002810599933831729

# Firebase Web Config (duplicated from frontend, used by some backend services)
FIREBASE_API_KEY=AIzaSyC7IOvHwD9ivSLOED1AVEnZgGSvGmA2z8c
FIREBASE_AUTH_DOMAIN=kidrove-e9978.firebaseapp.com
FIREBASE_STORAGE_BUCKET=kidrove-e9978.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=462028426732
FIREBASE_APP_ID=1:462028426732:web:921a18599a8ab8595e84c9
FIREBASE_MEASUREMENT_ID=G-ZEXC540RDW

# Google OAuth (from Firebase Console → Authentication → Sign-in method → Google)
GOOGLE_CLIENT_ID=<Web client ID from Google provider settings>
GOOGLE_CLIENT_SECRET=<Web client secret from Google provider settings>
```

**Rules:**
- `FIREBASE_PRIVATE_KEY` MUST be wrapped in double quotes (`"..."`)
- Newlines in the private key are stored as `\n` (escaped)
- All three Admin SDK values (`PROJECT_ID`, `PRIVATE_KEY`, `CLIENT_EMAIL`) must be from the **same Firebase project**
- Restart backend after changing `.env`

### How the backend uses these:

```
backend/src/config/firebase.ts
  → initializeFirebase() reads FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
  → Initializes Firebase Admin SDK with admin.credential.cert()
  → getAuth() returns admin.auth.Auth for token verification

backend/src/controllers/auth.controller.ts → firebaseAuth()
  → Receives idToken from frontend
  → Calls getAuth().verifyIdToken(idToken) to validate
  → Calls getAuth().getUser(uid) to get user details
  → Creates or finds user in MongoDB
  → Returns JWT + session cookies
```

---

## 9. Configure Authorized Domains

Firebase restricts which domains can use authentication.

1. Firebase Console → **Authentication** → **Settings** tab
2. Scroll to **"Authorized domains"**
3. Ensure these domains are listed:
   - `localhost` (for local development)
   - `your-production-domain.com` (e.g., `kidrove.com`)
   - `your-app.vercel.app` (if deployed on Vercel)
4. Click **"Add domain"** to add any missing ones

**Default domains** (auto-added):
- `localhost`
- `PROJECT_ID.firebaseapp.com`

---

## 10. Configure OAuth Consent Screen

If Google sign-in fails with "OAuth consent screen not configured":

1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**
2. Select the same project (`kidrove-e9978`)
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. Select **"External"** user type → Click **"Create"**
5. Fill in required fields:
   - **App name:** `Kidrove`
   - **User support email:** Your email
   - **Developer contact email:** Your email
6. Click **"Save and Continue"**
7. **Scopes** page: Click **"Add or Remove Scopes"**
   - Add: `email`, `profile`, `openid`
   - Click **"Update"** → **"Save and Continue"**
8. **Test users** page (while in "Testing" status):
   - Add test email addresses that are allowed to sign in
   - Click **"Save and Continue"**
9. Click **"Back to Dashboard"**

### Publishing the OAuth app:

- While in **"Testing"** mode: Only test users you added can sign in
- Click **"Publish App"** to allow any Google account to sign in
- Google may require verification for apps requesting sensitive scopes

**Path:** Google Cloud Console → APIs & Services → OAuth consent screen

---

## 11. Verify the Setup

### Checklist before testing:

- [ ] Firebase Authentication enabled in Console
- [ ] Google sign-in provider enabled in Console
- [ ] `localhost` in authorized domains
- [ ] OAuth consent screen configured in Google Cloud Console
- [ ] Frontend `.env` has real `VITE_FIREBASE_*` values (not placeholders)
- [ ] Backend `.env` has real `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`
- [ ] All credentials are from the **same Firebase project**
- [ ] Backend and frontend dev servers restarted after `.env` changes

### Test steps:

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Open `http://localhost:5173/login`
4. Click **"Sign in with Google"**
5. Google popup should appear → Select account → Popup closes
6. Should redirect to dashboard

### Check browser console for:

```
[Firebase] ✅ Initialized successfully (lazy)
```

If you see `[Firebase] ⚠️ Skipping initialization - invalid/missing env vars`, credentials are still wrong.

---

## 12. Troubleshooting

### Error: `auth/configuration-not-found`

**Cause:** Firebase Authentication not enabled, or Google provider not enabled.

**Fix:**
1. Firebase Console → Authentication → Get Started
2. Sign-in method → Google → Enable

---

### Error: `Firebase authentication not available`

**Cause:** Frontend Firebase env vars are missing or still placeholders.

**Fix:** Check `frontend/.env` — values like `your_project_id` or `your_firebase_api_key` will be rejected. Replace with real values from Project Settings → Your apps.

---

### Error: `auth/unauthorized-domain`

**Cause:** Current domain not in Firebase authorized domains list.

**Fix:** Authentication → Settings → Authorized domains → Add `localhost`

---

### Error: `auth/popup-closed-by-user`

**Cause:** User closed the Google popup before completing sign-in.

**Fix:** Not a real error — handled silently in code.

---

### Error: `auth/account-exists-with-different-credential`

**Cause:** Email already registered with a different sign-in method (e.g., email/password).

**Fix:** User should sign in with their original method, or link accounts in the app.

---

### Error: Backend returns 401/500 after popup succeeds

**Cause:** Backend Firebase Admin SDK can't verify the token. Usually a credential mismatch.

**Fix:**
1. Check `FIREBASE_CLIENT_EMAIL` ends with `@YOUR_PROJECT_ID.iam.gserviceaccount.com`
2. Check `FIREBASE_PROJECT_ID` matches the frontend project
3. Regenerate service account key if unsure

---

### Error: `auth/invalid-api-key`

**Cause:** `VITE_FIREBASE_API_KEY` is wrong or from a different project.

**Fix:** Get correct API key from Firebase Console → Project Settings → Your apps → Web app config → `apiKey`

---

### Error: OAuth consent screen not configured

**Cause:** Google Cloud Console doesn't have an OAuth consent screen set up.

**Fix:** See [Section 10](#10-configure-oauth-consent-screen) above.

---

### Error: Access blocked — app not verified

**Cause:** OAuth app is still in "Testing" mode and the user's email is not in the test users list.

**Fix:** Either:
- Add the user's email to test users (Google Cloud Console → OAuth consent screen → Test users)
- Publish the app (click "Publish App" on the OAuth consent screen page)

---

## File Reference

| File | Purpose |
|---|---|
| `frontend/.env` | Frontend Firebase web config (`VITE_FIREBASE_*`) |
| `frontend/src/config/firebase.ts` | Lazy Firebase initialization, env validation |
| `frontend/src/services/firebaseAuth.ts` | `loginWithGoogle()` — popup flow + backend token exchange |
| `frontend/src/store/slices/authSlice.ts` | `loginWithGoogleThunk` — Redux thunk wrapping `loginWithGoogle()` |
| `frontend/src/pages/auth/LoginPage.tsx` | UI button triggering `handleGoogleSignIn()` |
| `backend/.env` | Backend Firebase Admin SDK credentials |
| `backend/src/config/firebase.ts` | `initializeFirebase()` + `getAuth()` — Admin SDK init |
| `backend/src/controllers/auth.controller.ts` | `firebaseAuth()` — verifies token, creates/finds user |
| `backend/src/routes/auth.routes.ts` | `POST /api/auth/firebase` route |
| `backend/src/validators/auth.validator.ts` | `validateFirebaseAuth` — request validation |

---

## Security Notes

- **Never commit `.env` files** to git — they contain secrets
- Frontend `VITE_FIREBASE_*` values are public (embedded in JS bundle) — this is by design
- Backend `FIREBASE_PRIVATE_KEY` is a secret — never expose it
- The downloaded service account JSON file should be stored securely and not committed to git
- Add the service account JSON filename to `.gitignore`
