# Vendor Events System — Audit Report

**Scope:** `POST /api/vendors/events`, `PUT /api/vendors/events/:id`,
`DELETE /api/vendors/events/:id`, `PUT /api/vendors/events/:id/restore` — the API behind the
frontend's `/vendor/events/create` page.

**Files:**
- Controller: `backend/src/controllers/vendor.event.controller.ts`
- Routes: `backend/src/routes/vendor.routes.ts`
- New validator: `backend/src/validators/vendor.event.validator.ts`
- Model: `backend/src/models/Event.ts`; ownership helper: `backend/src/utils/vendorHelpers.ts`
- Tests: `backend/src/tests/integration/events/vendor.event.crud.test.ts` (33 tests, all passing)

## Endpoint map

| Method | Path | Auth | Validator (new) |
|---|---|---|---|
| POST | `/api/vendors/events` | authenticate + VENDOR role | `validateVendorEventCreate` |
| GET | `/api/vendors/events/:id` | authenticate + VENDOR role | `validateEventId` |
| PUT | `/api/vendors/events/:id` | authenticate + VENDOR role | `validateEventId` + `validateVendorEventUpdate` |
| DELETE | `/api/vendors/events/:id` | authenticate + VENDOR role | `validateEventId` |
| PUT | `/api/vendors/events/:id/restore` | authenticate + VENDOR role | `validateEventId` |

## Findings

| ID | Severity | Issue | Status |
|---|---|---|---|
| VE-1 | High (bug, 500) | `updateVendorEvent`'s status whitelist allowed `"pending_review"`/`"cancelled"`, values absent from `Event.status`'s Mongoose enum (`draft/published/archived/pending/rejected`). Passing the whitelist then crashed on `event.save()` with an uncaught ValidationError → 500. | **Fixed** |
| VE-2 | Medium (validation gap) | No semantic validation on create/update: `endDate` could precede `startDate`; `startDate` could be in the past; `price` (top-level and per-schedule) could be negative; `availableSeats` could be 0 on a non-unlimited schedule; `ageRange` had no `min < max` check; online events could omit a `meetingLink`. Previously these either passed silently or surfaced as an opaque 500 from Mongoose. | **Fixed** |
| VE-3 | Medium (validation gap) | No express-validator chain on the route at all; no `:id` format check, so an invalid ObjectId (e.g. `not-a-valid-id`) hit a Mongoose CastError → 500. No payload size limits (unbounded `dateSchedule`/`tags`/`images`/`faqs`). | **Fixed** |
| VE-4 | Medium (auth gap) | No vendor-verification gate before create. `getOrCreateVendorProfile` auto-creates an `UNVERIFIED` Vendor profile on first use — mitigated because every vendor-created event starts `isApproved:false` and needs admin approval regardless. | **Fixed (fail-closed on REJECTED only)** — blocking all unverified vendors would break every brand-new vendor's first event, so the gate only blocks `verificationStatus === REJECTED`. |
| VE-5 | Low (mass assignment, verified safe) | Reviewed for the classic "vendor spoofs `isApproved`/`vendorId`/`status` in the body" attack. The create controller already destructures an explicit allowlist from `req.body` (never spreads it) and derives `vendorId` server-side from the JWT via `getOrCreateVendorProfile` — not spoofable. | **No change needed** — locked in with regression tests. |
| **VE-6** | **High (bug, found during test-writing)** | `getOrCreateVendorProfile` (`vendorHelpers.ts`) auto-provisions a Vendor profile with `phone: user.phone \|\| ""` and `contactPerson.phone: user.phone \|\| ""`. `Vendor.phone`/`contactPerson.phone` are `required: true` with no format constraint. Since phone isn't collected at registration, **any vendor's very first event-create call threw a ValidationError** before the controller logic ever ran — this blocked event creation entirely for phone-less vendors (the normal case for a brand-new signup). | **Fixed** — placeholder `"Not provided"`, matching the existing pattern already used for `address.street`/`zipCode` in the same function. |

## What's sound (no change made)

- **Ownership scoping**: `vendorId` is derived server-side from the authenticated JWT via
  `getOrCreateVendorProfile(userId)`, never read from `req.body`. Reads/updates/deletes/restores
  all scope by `{_id, vendorId}` — cross-vendor access returns 404, verified by tests.
- **Approval workflow**: create always forces `isApproved:false`, `status:"draft"` regardless of
  what the client sends.
- **Category resolution**: validated against the live `Category` collection (by slug or name) on
  both create and update.

## Fixes implemented

1. **`backend/src/validators/vendor.event.validator.ts`** (new) — `validateVendorEventCreate`,
   `validateVendorEventUpdate`, `validateEventId`. Reuses the existing enum constants
   (`EVENT_TYPES`, `VENUE_TYPES`, `CURRENCIES`) and helpers (`validateStringLength`,
   `validateEnum`, `validateHtmlLength`, `sanitizeHtml`) from `validators/event.validator.ts` and
   `validators/common.validator.ts` rather than duplicating them.
   - Create enforces: title/description/shortDescription/category required; date ordering;
     no-past-startDate; seat sanity; non-negative price (top-level + per-schedule); online
     events require a valid `meetingLink`; non-online events require `location.city`+`address`;
     array size caps (dateSchedule ≤50, tags ≤30, images/imageAssets ≤20, faqs ≤50).
   - Update relaxes the create-only rules (past-startDate, and the venueType-conditional
     location/meetingLink requirement) so editing unrelated fields on an existing event is never
     blocked by a partial payload — but still enforces date ordering, seat sanity, price sign,
     and restricts `status` to `VENDOR_SETTABLE_STATUSES`.
2. **`backend/src/routes/vendor.routes.ts`** — wired the new validators (+ `validate` middleware)
   into all four routes, after the existing `authenticate`/`authorize` guards.
3. **`backend/src/controllers/vendor.event.controller.ts`**:
   - VE-1: replaced the broken `VENDOR_ALLOWED_STATUSES` literal with
     `VENDOR_SETTABLE_STATUSES = ["draft", "pending"]` imported from the validator, so the
     whitelist can never drift from the model's enum again.
   - VE-4: added a `verificationStatus === REJECTED` check before create, returning 403.
   - Added a seat-vs-booked guard on update: rejects setting `availableSeats`/`totalSeats` below
     a schedule's existing `soldSeats`.
4. **`backend/src/utils/vendorHelpers.ts`** (VE-6) — phone placeholder default.

## Test coverage (TC-EVT-01..17 + new cases)

All 33 tests in `vendor.event.crud.test.ts` pass (previously: 0 executable — the audit spec in
`tests/unit/vendor-system-audit.test.ts` had empty `it()` stubs for all of these).

- **Create validation**: missing required fields, unknown category, affiliate-without-link,
  endDate<startDate, past startDate, negative price (top-level + per-schedule),
  availableSeats≤0, online-without-meetingLink — all → 400.
- **Create success semantics**: `isApproved:false`/`status:"draft"` on create; `isFreeEvent`
  forces price 0; `unlimitedSeats` → 999999; `vendorId` is the Vendor doc id, not the User id.
- **Access control**: `isApproved:true`, a foreign `vendorId`, and `status:"published"` in the
  create payload cannot escalate (VE-5 regression); REJECTED vendor blocked (403); UNVERIFIED/
  PENDING vendors still create drafts (VE-4).
- **Update**: non-owner → 404; `status:"published"` blocked; `status:"pending_review"` rejected
  cleanly (not 500 — VE-1 regression); `status:"pending"` accepted, `isApproved` stays false;
  title/shortDescription persist; bad category → 400; malformed `:id` → 400 (VE-3).
- **Delete**: soft-delete default; `?permanent=true` hard-deletes; non-owner → 404.
- **Restore**: soft-deleted own event restores to draft; non-owner/not-deleted → 404.

## How to run

```bash
cd backend
npx tsc --noEmit -p .                                                  # typecheck
npx jest src/tests/integration/events/vendor.event.crud.test.ts        # new suite
npx jest src/tests/integration/events/                                # + no regression to event.crud.test.ts
```

## Manual smoke examples

Valid create:
```bash
curl -X POST http://localhost:PORT/api/vendors/events \
  -H "Content-Type: application/json" -H "Cookie: accessToken=<vendor JWT>" \
  -d '{"title":"Robotics Workshop","description":"...","shortDescription":"Hands-on robotics.",
      "category":"workshops","venueType":"Indoor","location":{"city":"Dubai","address":"123 Main St"},
      "price":100,"dateSchedule":[{"startDate":"2026-08-01","endDate":"2026-08-01","availableSeats":20,"price":100}]}'
# → 201, isApproved:false, status:"draft"
```

Now-rejected (was previously accepted, or 500'd):
```bash
curl -X POST http://localhost:PORT/api/vendors/events \
  -H "Content-Type: application/json" -H "Cookie: accessToken=<vendor JWT>" \
  -d '{"...same as above but...","dateSchedule":[{"startDate":"2026-08-05","endDate":"2026-08-01","availableSeats":20,"price":100}]}'
# → 400 "End date must be on or after start date" (was accepted before this fix)
```

## Before / After

| Risk | Before | After |
|---|---|---|
| Vendor sets `status:"pending_review"` on update | 500 (unhandled Mongoose ValidationError) | Clean 400 (validator) |
| Vendor's first event, no phone on file | 500/400 crash in auto-provisioning, blocking ALL event creation | Fixed — placeholder phone, create succeeds |
| endDate < startDate, negative price, 0 seats, past dates | Accepted silently or 500 | Clean 400 |
| Invalid `:id` on update/delete/restore | 500 (CastError) | Clean 400 |
| Rejected vendor creating events | Allowed (event still needed approval) | 403 |
| Mass-assignment of `isApproved`/`vendorId`/`status` on create | Already safe (allowlist) | Verified safe + regression-tested |
| Executable test coverage for vendor event CRUD | 0 (stub spec only) | 33 passing tests |
