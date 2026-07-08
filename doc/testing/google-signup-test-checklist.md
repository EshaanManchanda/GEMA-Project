# Google Signup — Manual Test Checklist

Frontend-only scenarios that can't be automated via backend integration tests.

## TC4: User cancels Google popup
1. Open `/login` (or `/register`)
2. Click "Sign in with Google" / "Sign up with Google"
3. Close the Google consent popup **without selecting an account**
4. **Expected:** No toast appears, no loading state sticks, page returns to idle

## TC5: Email exists with a different Firebase provider
1. Register an account using a different Firebase provider (e.g., Apple, email/password) with email X
2. Attempt Google sign-in using a Google account that has the same email X
3. **Expected:** Toast error: "An account already exists with this email. Sign in with your original method."

## TC9: Firebase unavailable (missing env vars)
1. In `frontend/.env`, temporarily blank out `VITE_FIREBASE_API_KEY`
2. Restart Vite dev server
3. Click "Sign in with Google"
4. **Expected:** Error: "Firebase authentication not available"
5. **Cleanup:** Restore `frontend/.env`

## TC10: Backend unreachable after Google popup
1. Start frontend (`npm run dev`)
2. **Stop backend** (`Ctrl+C` on backend dev server)
3. Click "Sign in with Google", complete the OAuth popup
4. **Expected:** Toast error (network error), user stays logged out
5. **Cleanup:** Restart backend
