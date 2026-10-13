# Kidrove E2E tests (Playwright)

End-to-end tests that drive the real frontend against the real backend and a
**local, seeded** MongoDB. Never point this suite at production: it registers
throw-away vendors and logs in with the seed accounts.

## One-time setup

```bash
# backend/.env must point at a LOCAL database (mongodb://localhost:27017/kidrove)
cd backend  && npm ci && npm run db:seed && npm run db:seed-blogs
cd frontend && npm ci && npx playwright install chromium
```

Redis must be running locally (`localhost:6379`).

## Run

```bash
cd frontend
npm run e2e              # everything, headless
npm run e2e -- --project=public      # one area
npm run e2e:headed       # watch the browser
npm run e2e:ui           # Playwright UI mode
npx playwright show-report           # HTML report of the last run
```

Playwright starts the backend (`:5001`) and a production build served by
`vite preview` (`:5173`) itself, or reuses them if already running. **If you
reuse a running preview, rebuild it (`npm run build`) after changing app code**,
or the tests run against the old bundle. The backend is started with
`E2E_RELAX_RATE_LIMITS=true` so a test run is not throttled — that flag is
ignored when `NODE_ENV=production`. If you start the backend yourself, set it
too, or the run will hit 429s.

Locally the suite drives your installed Google Chrome (`channel: 'chrome'`):
Playwright's downloaded headless Chromium stalls 10–30 s per page on Windows.
Override with `E2E_CHANNEL=chromium` (CI uses the bundled browser).

`setup` runs first and alone; every other project depends on it, because the
dev backend answers logins slowly (up to ~20 s) when pages load in parallel.

## Layout

| Folder / project | Who | What it covers |
|---|---|---|
| `auth.setup.ts` → `setup` | — | Logs in once per role through the real form, saves the session to `e2e/.auth/` (git-ignored) |
| `public/` → `public` + `mobile` | anonymous | Every public page renders (h1, title, no crash), events list → detail, search, 404, SEO tags; tests tagged `@mobile` also run on a Pixel 7 and check for sideways scrolling |
| `auth/` → `public` | anonymous | Login per role, wrong password, empty form, protected-route redirects, customer/vendor kept out of `/admin`, register form |
| `customer/` → `customer` | customer | Dashboard, profile, bookings, tickets, favourites, reviews, registrations, booking page, favourite add/remove |
| `vendor/` → `vendor` | vendor | Dashboard, events, create form validation, bookings, analytics, team, payouts, profile |
| `admin/` → `admin` | admin | All main admin pages, Platform Highlights PDF download, event editor |
| `api/` → `api` | HTTP only | 401s for anonymous, role checks, cross-tenant (IDOR) checks with a freshly registered vendor, CSRF |

`support/fixtures.ts` is imported instead of `@playwright/test`. It stubs the
marketing popup/announcement bar (they cover buttons) and **fails any test that
throws an uncaught JS error in the page**.

## Accounts

Defaults come from `npm run db:seed`. Override with
`E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD`, `E2E_VENDOR_*`, `E2E_CUSTOMER_*`,
plus `E2E_BASE_URL` and `E2E_API_URL`.

## Known gaps (tests marked `test.fail`)

- The home page has no `<h1>`. Remove `.fail` from that test once one is added.

## App bugs this suite caught (fixed)

- `/registrations` crashed: `registrationAPI` unwrapped the response twice.
- Event description editor: HTML → Visual threw `NotFoundError` (tiptap
  BubbleMenu node moved by tippy), the error boundary reset the form and the
  description was lost.
- Wrong password showed no error and cleared the email: the app swapped every
  page for a spinner while any auth request was in flight, unmounting the form.

## Not covered yet

- Paying with Stripe end to end (needs Stripe test keys + webhook forwarding:
  `stripe listen --forward-to localhost:5001/api/payments/webhook`).
- Email delivery (local runs use `COMMUNICATION_TEST_MODE=true`).
