# Test Specifications: Events Domain
> Gema Event Management Platform
> Generated: 2026-02-25

**Domain:** Events
**Source files:**
- `backend/src/routes/event.routes.ts`
- `backend/src/models/Event.ts`
- `backend/src/services/event.service.ts`

---

## Scope

Covers the full lifecycle of the `Event` resource: public discovery, vendor-owned CRUD,
admin moderation, capacity/availability logic, status transitions, ownership enforcement,
search/filtering, and unauthenticated access to protected routes.

---

## Test Cases

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-EVT-001 | List published events (public) | At least one published, approved, active event in DB | `GET /api/events` | 200 OK; array of published events; pagination metadata present | High |
| TC-EVT-002 | Get event by valid slug (public) | Event with slug `summer-olympiad-2026` exists and is published | `GET /api/events/summer-olympiad-2026` | 200 OK; full event document returned | High |
| TC-EVT-003 | Get event by non-existent slug | No event with given slug | `GET /api/events/does-not-exist` | 404 Not Found | High |
| TC-EVT-004 | Get event categories (public) | Categories exist in DB | `GET /api/events/categories` | 200 OK; array of category strings | Medium |
| TC-EVT-005 | Get unique cities (public) | Events with varied cities exist | `GET /api/events/cities` | 200 OK; deduplicated array of city strings | Medium |
| TC-EVT-006 | Create event as authenticated vendor | Vendor JWT in cookie; valid body | `POST /api/events` with all required fields (title, description, category, type, venueType, ageRange, location, price, currency, dateSchedule) | 201 Created; event document with `status: "draft"`, `vendorId` set to requesting vendor | High |
| TC-EVT-007 | Create event — missing required field (title) | Vendor JWT in cookie | `POST /api/events` body omitting `title` | 400 Bad Request; validation error referencing `title` | High |
| TC-EVT-008 | Create event — invalid type enum value | Vendor JWT in cookie | `POST /api/events` with `type: "Hackathon"` | 400 Bad Request; validation error listing accepted type values | Medium |
| TC-EVT-009 | Create event — schedule date in the past | Vendor JWT in cookie; otherwise valid body | `dateSchedule[0].startDate` set to yesterday | 400 Bad Request; error "Schedule date cannot be in the past" | High |
| TC-EVT-010 | Create event — endDate before startDate | Vendor JWT in cookie | `dateSchedule[0].startDate` = today+2, `endDate` = today+1 | 400 Bad Request; error "End date must be after start date" | Medium |
| TC-EVT-011 | Create event — ageRange invalid (min > max) | Vendor JWT in cookie | `ageRange: [18, 10]` | 400 Bad Request; error "Invalid age range values" | Medium |
| TC-EVT-012 | Create event — tags exceeds 20-item limit | Vendor JWT in cookie | `tags` array with 21 items | 400 Bad Request; error "Cannot have more than 20 tags" | Low |
| TC-EVT-013 | Create event — images exceeds 10-item limit | Vendor JWT in cookie | `images` array with 11 items | 400 Bad Request; error "Cannot have more than 10 images" | Low |
| TC-EVT-014 | Create event — unauthenticated request | No auth cookie / header | `POST /api/events` with valid body | 401 Unauthorized | High |
| TC-EVT-015 | Create event — authenticated as non-vendor role (e.g., customer) | Customer JWT in cookie | `POST /api/events` with valid body | 403 Forbidden | High |
| TC-EVT-016 | Update own event as vendor | Vendor JWT; event owned by that vendor | `PUT /api/events/:id` with `{ "title": "Updated Title" }` | 200 OK; updated event document; `title` reflects new value | High |
| TC-EVT-017 | Update another vendor's event | Vendor JWT; event owned by a different vendor | `PUT /api/events/:id` targeting another vendor's event | 403 Forbidden | High |
| TC-EVT-018 | Update event — admin can update any event | Admin JWT | `PUT /api/events/:id` targeting any vendor's event | 200 OK; event updated regardless of `vendorId` | High |
| TC-EVT-019 | Update event — invalid Mongo ID format | Vendor JWT | `PUT /api/events/not-a-mongo-id` | 400 Bad Request; validation error "Invalid event ID" | Medium |
| TC-EVT-020 | Update event — set price to negative value | Vendor JWT; event owned by vendor | `PUT /api/events/:id` with `{ "price": -5 }` | 400 Bad Request; error "Price must be a positive number" | Medium |
| TC-EVT-021 | Delete own event as vendor | Vendor JWT; event owned by that vendor | `DELETE /api/events/:id` | 200 OK; event soft-deleted (`isDeleted: true`, `deletedAt` set); no longer returned in public listing | High |
| TC-EVT-022 | Delete another vendor's event | Vendor JWT; event owned by different vendor | `DELETE /api/events/:id` | 403 Forbidden | High |
| TC-EVT-023 | Capacity check — event sold out | All `dateSchedule` entries have `availableSeats: 0` and `unlimitedSeats: false` | `GET /api/events/:slug` | 200 OK; response indicates sold-out status; booking attempt returns 400/409 | High |
| TC-EVT-024 | Capacity check — unlimited seats flag | Schedule entry has `unlimitedSeats: true` | `POST /api/events` with `unlimitedSeats: true`, no `availableSeats` field | 201 Created; no seat-limit validation error triggered | Medium |
| TC-EVT-025 | Status transition — publish a draft event | Admin JWT; event in `status: "draft"` | `PUT /admin/:id/approval` with `{ "isApproved": true }` | 200 OK; event `isApproved: true`; status transitions to `published` | High |
| TC-EVT-026 | Status transition — reject an event with reason | Admin JWT; event pending approval | `PUT /admin/:id/approval` with `{ "isApproved": false, "reason": "Content policy violation" }` | 200 OK; event `isApproved: false`, status set to `rejected`, reason stored | High |
| TC-EVT-027 | Admin approval — reason exceeds 500 chars | Admin JWT | `PUT /admin/:id/approval` with `reason` of 501 characters | 400 Bad Request; validation error on `reason` field | Low |
| TC-EVT-028 | Admin: get all events (including drafts/rejected) | Admin JWT | `GET /api/events/admin/all` | 200 OK; returns events of all statuses including `draft`, `pending`, `rejected`, `archived` | High |
| TC-EVT-029 | Admin: get all events — non-admin role | Vendor JWT | `GET /api/events/admin/all` | 403 Forbidden | High |
| TC-EVT-030 | Toggle event featured status | Admin JWT; event exists | `PUT /api/events/admin/:id/featured` | 200 OK; `isFeatured` toggled (true -> false or false -> true) | Medium |
| TC-EVT-031 | Vendor: list own events | Vendor JWT | `GET /api/events/vendor/my-events` | 200 OK; only events where `vendorId` matches the requesting vendor | High |
| TC-EVT-032 | Vendor analytics — unauthenticated | No auth | `GET /api/events/vendor/analytics` | 401 Unauthorized | High |
| TC-EVT-033 | Claim event as vendor | Vendor JWT; unclaimed event exists | `POST /api/events/:id/claim` | 200 OK; event `vendorId` set to requesting vendor | Medium |
| TC-EVT-034 | Claim event — non-vendor role | Customer JWT | `POST /api/events/:id/claim` | 403 Forbidden | Medium |
| TC-EVT-035 | Search/filter events by city | Published events in multiple cities | `GET /api/events?city=Dubai` | 200 OK; results contain only events where `location.city = "Dubai"` | High |
| TC-EVT-036 | Search/filter events by category | Published events in multiple categories | `GET /api/events?category=Sports` | 200 OK; all returned events have `category = "Sports"` | High |
| TC-EVT-037 | Search/filter events — expired events excluded | Events with all `dateSchedule` dates in the past | `GET /api/events` (public listing) | 200 OK; expired events not included in default listing | High |
| TC-EVT-038 | Create event with invalid currency | Vendor JWT | `POST /api/events` with `currency: "GBP"` | 400 Bad Request; error listing accepted currencies (AED, EGP, CAD, USD) | Medium |
| TC-EVT-039 | Create event with invalid coordinates | Vendor JWT | `POST /api/events` with `location.coordinates.lat: 200` (out of range) | 400 Bad Request; error "Invalid latitude" | Low |
| TC-EVT-040 | MediaAsset validation — non-existent asset ID | Vendor JWT | `POST /api/events` with `imageAssets: ["<nonExistentObjectId>"]` | 400/404; error "MediaAsset not found"; transaction rolled back | Medium |

---

## Coverage Summary

| Area | Test IDs | Count |
|------|----------|-------|
| Public read (list, get, categories, cities) | TC-EVT-001 to TC-EVT-005 | 5 |
| Create — happy path | TC-EVT-006 | 1 |
| Create — validation errors | TC-EVT-007 to TC-EVT-013 | 7 |
| Create — security (unauth / wrong role) | TC-EVT-014 to TC-EVT-015 | 2 |
| Update — happy path + ownership | TC-EVT-016 to TC-EVT-019 | 4 |
| Update — validation errors | TC-EVT-020 | 1 |
| Delete — ownership + security | TC-EVT-021 to TC-EVT-022 | 2 |
| Capacity / availability | TC-EVT-023 to TC-EVT-024 | 2 |
| Status transitions (approval flow) | TC-EVT-025 to TC-EVT-027 | 3 |
| Admin moderation + feature toggle | TC-EVT-028 to TC-EVT-030 | 3 |
| Vendor-specific endpoints | TC-EVT-031 to TC-EVT-034 | 4 |
| Search and filtering | TC-EVT-035 to TC-EVT-037 | 3 |
| Miscellaneous edge cases | TC-EVT-038 to TC-EVT-040 | 3 |
| **Total** | | **40** |

---

## Notes

- "Soft delete" behaviour (`isDeleted`, `deletedAt`) is inferred from the Event model. Tests
  assume the public listing query filters `isDeleted: false`.
- `status` field has five values: `draft`, `published`, `archived`, `pending`, `rejected`.
  TC-EVT-025/026 cover the admin approval path; transitions to `archived` are not currently
  exposed via a documented route and should be added when that endpoint ships.
- The `claimEvent` endpoint (TC-EVT-033) semantics (ownership transfer vs. initial claim)
  should be confirmed against controller logic before finalising acceptance criteria.
- TC-EVT-023 assumes a downstream booking service enforces the sold-out check; if that guard
  lives in the event service itself, update the expected HTTP status accordingly.
- All authenticated test cases should be run twice: once with a valid JWT cookie and once
  with a valid `Authorization: Bearer` header, to verify the dual-auth fallback.
