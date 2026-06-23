# Pages to Test Before Production

Mark each item `[x]` as you go.

---

## TIER 1 — Money / Bookings (critical path)

| # | Page | URL | What to verify | Done |
|---|---|---|---|---|
| 1 | Home | `/` | Loads, events show, reels play, collections render | [ ] |
| 2 | Events list | `/events` | Filters, search, cards show price / "Free" correctly | [ ] |
| 3 | Event detail | `/events/:slug` | Date picker, schedule select, age range, Book Now button | [ ] |
| 4 | Booking flow | `/booking/:eventId` | Schedule selection, quantity, coupon, total price calc | [ ] |
| 5 | Payment success | `/payment/success` | Confirmation shown, ticket details correct | [ ] |
| 6 | Payment cancel | `/payment/cancel` | Graceful cancel message, back to event link works | [ ] |
| 7 | Verify ticket | `/verify-ticket/:ticketNumber` | QR scan result — valid/invalid shown correctly | [ ] |

> Stripe test card: `4242 4242 4242 4242` · any future date · any CVC

---

## TIER 2 — Auth Flows

| # | Page | URL | What to verify | Done |
|---|---|---|---|---|
| 8 | Login | `/login` | Email + password, Google Firebase login | [ ] |
| 9 | Register | `/register` | All fields validate, redirect after signup | [ ] |
| 10 | Forgot password | `/forgot-password` | Email sent, no timing leak on unknown email | [ ] |
| 11 | Reset password | `/reset-password` | Valid token works, expired token shows error | [ ] |
| 12 | Verify email | `/verify-email` | OTP / link flow completes | [ ] |

---

## TIER 3 — Vendor Portal

| # | Page | URL | What to verify | Done |
|---|---|---|---|---|
| 13 | Vendor dashboard | `/vendor` | Stats load, no blank screen | [ ] |
| 14 | Create event | `/vendor/events/create` | All 3 tabs (Basic / Schedule / Advanced), submit works | [ ] |
| 15 | Edit event | `/vendor/events/:id/edit` | Loads existing data, save works | [ ] |
| 16 | Vendor payouts | `/vendor/payouts` | Payment history table renders (implicit-any fix) | [ ] |
| 17 | Stripe Connect | `/vendor/payment-settings` | "Connect with Stripe" redirects to real Stripe (not placeholder) | [ ] |
| 18 | Vendor analytics | `/vendor/analytics` | Charts and stats load | [ ] |
| 19 | Vendor bookings | `/vendor/bookings` | Booking list renders | [ ] |
| 20 | Vendor employees | `/vendor/employees` | Employee list renders | [ ] |

---

## TIER 4 — Admin Panel

| # | Page | URL | What to verify | Done |
|---|---|---|---|---|
| 21 | Admin events | `/admin/events` | List loads, pagination works | [ ] |
| 22 | Create event | `/admin/events/create` | `PastEventMemoriesEditor` renders, all tabs work | [ ] |
| 23 | Edit event | `/admin/events/:id/edit` | Loads data, PastEventMemoriesEditor shows, save works | [ ] |
| 24 | Teaching event edit | `/admin/teaching-events/:id/edit` | Redirects to `/admin/events` (duplicate export fix) | [ ] |
| 25 | Admin reels | `/admin/reels` | Create / edit reel works | [ ] |
| 26 | Admin blogs | `/admin/blogs` | Create / edit — tutorial posts get HowTo schema | [ ] |
| 27 | Admin analytics | `/admin/analytics` | Dashboard stats load | [ ] |
| 28 | Admin payouts | `/admin/payouts` | Payout table renders | [ ] |
| 29 | Admin users | `/admin/users` | User list loads, edit works | [ ] |
| 30 | Admin vendors | `/admin/vendors` | Vendor list loads | [ ] |
| 31 | Admin categories | `/admin/categories` | Category CRUD works | [ ] |
| 32 | Admin collections | `/admin/collections` | Collection CRUD works | [ ] |
| 33 | Admin orders | `/admin/orders` | Order list renders | [ ] |
| 34 | Admin banners | `/admin/banners` | Banner management works | [ ] |
| 35 | Admin media | `/admin/media` | File upload / browse works | [ ] |
| 36 | Admin settings | `/admin/settings` | Settings save correctly | [ ] |

---

## TIER 5 — Teacher Portal

| # | Page | URL | What to verify | Done |
|---|---|---|---|---|
| 37 | Teacher public profile | `/teachers/:id` | Location renders (cast fix), FAQ accordion animates | [ ] |
| 38 | Teacher dashboard | `/teacher` | Stats load | [ ] |
| 39 | Teacher events | `/teacher/events` | Event list shows | [ ] |
| 40 | Teacher payouts | `/teacher/payouts` | Payout history shows | [ ] |
| 41 | Teacher payment settings | `/teacher/payment-settings` | Stripe Connect status shown | [ ] |
| 42 | Teacher analytics | `/teacher/analytics` | Charts load | [ ] |

---

## TIER 6 — Public / SEO Pages

| # | Page | URL | What to verify | Done |
|---|---|---|---|---|
| 43 | Learn Scratch | `/learn/scratch` | Loads; view source → `"@type":"Course"` in JSON-LD | [ ] |
| 44 | Learn Robotics | `/learn/robotics` | Loads; Course JSON-LD present | [ ] |
| 45 | Learn Python | `/learn/python` | Loads; Course JSON-LD present | [ ] |
| 46 | Learn AI for Kids | `/learn/ai-for-kids` | Loads; Course JSON-LD present | [ ] |
| 47 | Blog list | `/blog` | Posts load, pagination works | [ ] |
| 48 | Blog detail | `/blog/:slug` | Post renders, tutorial posts have HowTo JSON-LD in source | [ ] |
| 49 | About | `/about` | Renders correctly | [ ] |
| 50 | Contact | `/contact` | Form submits without error | [ ] |
| 51 | Privacy Policy | `/privacy` | Renders, no blank screen | [ ] |
| 52 | Terms | `/terms` | Renders, no blank screen | [ ] |
| 53 | FAQ | `/faq` | FAQPage JSON-LD in source, accordion works | [ ] |
| 54 | Certificate verify | `/certificates/verify/:serial` | Valid serial → pass, invalid → error | [ ] |
| 55 | Certificate lookup | `/certificates/lookup` | Search by name / ID works | [ ] |

---

## TIER 7 — Customer Dashboard

| # | Page | URL | What to verify | Done |
|---|---|---|---|---|
| 56 | Customer dashboard | `/dashboard` | Upcoming bookings shown | [ ] |
| 57 | My bookings | `/bookings` | Booking list renders, cancel option works | [ ] |
| 58 | My tickets | `/tickets` | Ticket list renders, download works | [ ] |
| 59 | My profile | `/profile` | Edit name / phone, save works | [ ] |
| 60 | Favorites | `/favorites` | Saved events show | [ ] |
| 61 | Change password | `/dashboard/change-password` | Password update works | [ ] |

---

## TIER 8 — Employee Portal

| # | Page | URL | What to verify | Done |
|---|---|---|---|---|
| 62 | Employee tasks | `/employee/tasks` | Task list loads | [ ] |
| 63 | QR scanner | `/employee/scanner` | Camera opens, QR scan validates ticket | [ ] |
| 64 | Reports | `/employee/reports` | Reports render | [ ] |

---

## Smoke Test — Minimum Before Go-Live

Run these in order, confirm no crash at each step:

```
1. / → /events → /events/:slug → /booking/:eventId → Stripe test card → /payment/success
2. /login → /vendor → /vendor/events/create (all 3 tabs) → /vendor/payment-settings (Stripe Connect)
3. /admin/events/create → PastEventMemoriesEditor visible → save
4. /learn/scratch → View Source → confirm "Course" in JSON-LD
5. /teachers/:id → location shows, FAQ opens
6. /certificates/verify/:serial → valid serial shows pass
```

---

## JSON-LD Validation

After testing pages, validate structured data at:
- **Google Rich Results Test:** https://search.google.com/test/rich-results
- **Schema.org Validator:** https://validator.schema.org/

Pages to validate: `/events/:slug`, `/blog/:slug`, `/learn/scratch`, `/teachers/:id`, `/faq`
