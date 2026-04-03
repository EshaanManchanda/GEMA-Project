# Test Specifications: Vendors Domain
> Gema Event Management Platform
> Generated: 2026-02-25

Source files: `routes/vendor.routes.ts`, `routes/event.routes.ts`
Controllers: `vendor.controller.ts`, `vendor.event.controller.ts`
Validators: `vendor.validator.ts`, `employee.validator.ts`

Access summary:
- Public: `GET /vendors`, `GET /vendors/public/:id`, `GET /vendors/:vendorId/payment-info`
- Authenticated vendor only: all other routes (via `router.use(authenticate)` + `authorize([UserRole.VENDOR])`)
- Event admin routes: `GET /events/admin/all`, `PUT /events/admin/:id/approval`, `PUT /events/admin/:id/featured`

---

## Public Vendor Endpoints

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-VND-001 | Happy path: list all public vendors | Multiple active/verified vendors in DB | `GET /vendors` (no auth) | HTTP 200; paginated list of active, verified vendors only | High |
| TC-VND-002 | Pagination params respected | Multiple vendors in DB | `GET /vendors?page=2&limit=5` | HTTP 200; page 2 of 5 results; `totalPages` in response | High |
| TC-VND-003 | Search filter by name | Vendors with varying names | `GET /vendors?search=Dubai` | HTTP 200; only vendors whose name matches "Dubai" | Medium |
| TC-VND-004 | Sort by field | N/A | `GET /vendors?sortBy=name&sortOrder=asc` | HTTP 200; results sorted alphabetically | Low |
| TC-VND-005 | Inactive or unverified vendors excluded | Inactive vendors in DB | `GET /vendors` | Inactive/unverified vendors not in response | High |
| TC-VND-006 | Happy path: get public vendor profile by ID | Vendor exists, active | `GET /vendors/public/:id` | HTTP 200; public-safe vendor fields (no bank details, no keys) | High |
| TC-VND-007 | Public profile — non-existent vendor ID | No vendor with given ID | `GET /vendors/public/000000000000000000000000` | HTTP 404 | High |
| TC-VND-008 | Public profile — invalid ObjectId format | N/A | `GET /vendors/public/notanid` | HTTP 422 or 400; invalid ID error | Medium |
| TC-VND-009 | Get vendor payment info — valid vendor | Vendor exists | `GET /vendors/:vendorId/payment-info` | HTTP 200; payment mode info (no secret keys exposed) | High |
| TC-VND-010 | Get vendor payment info — non-existent vendor | N/A | Non-existent `vendorId` | HTTP 404 | High |
| TC-VND-011 | Sensitive fields not exposed in public endpoints | Vendor has `stripeSecretKey` and `bankDetails` | `GET /vendors/public/:id` or `GET /vendors` | No `stripeSecretKey`, `bankDetails`, or private credentials in response | Critical |

---

## Vendor Dashboard & Stats

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-VND-012 | Happy path: get dashboard stats | Vendor authenticated, has orders and events | `GET /vendors/stats` | HTTP 200; `totalRevenue`, `totalOrders`, `totalEvents`, `upcomingEvents` etc. | High |
| TC-VND-013 | Dashboard stats — user role blocked | Authenticated as `user` | `GET /vendors/stats` | HTTP 403 | High |
| TC-VND-014 | Dashboard stats — unauthenticated | No token | `GET /vendors/stats` | HTTP 401 | High |
| TC-VND-015 | Dashboard stats — new vendor with no data | Vendor authenticated, no events or orders | `GET /vendors/stats` | HTTP 200; all counts at zero, no errors | Medium |

---

## Vendor Event Management

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-VND-016 | Happy path: create event as vendor | Vendor authenticated | `POST /vendors/events` with all required fields | HTTP 201; event created with `vendorId` set; status = pending approval | High |
| TC-VND-017 | Create event — missing required field (title) | Vendor authenticated | Payload without `title` | HTTP 422; validation error | High |
| TC-VND-018 | Create event — schedule date in the past | Vendor authenticated | `dateSchedule[0].startDate` = yesterday | HTTP 422; "Schedule date cannot be in the past" | High |
| TC-VND-019 | Create event — endDate before startDate | Vendor authenticated | `startDate` > `endDate` in schedule | HTTP 422; "End date must be after start date" | High |
| TC-VND-020 | Create event — invalid event type | Vendor authenticated | `type = "Concert"` (not in allowed enum) | HTTP 422; type must be one of allowed values | Medium |
| TC-VND-021 | Create event — invalid venue type | Vendor authenticated | `venueType = "Hybrid"` | HTTP 422 | Medium |
| TC-VND-022 | Create event — invalid age range (min > max) | Vendor authenticated | `ageRange = [18, 5]` | HTTP 422; invalid age range values | Medium |
| TC-VND-023 | Create event — too many tags | Vendor authenticated | `tags` array with 21 items | HTTP 422; cannot exceed 20 tags | Low |
| TC-VND-024 | Create event — too many images | Vendor authenticated | `images` array with 11 items | HTTP 422; cannot exceed 10 images | Low |
| TC-VND-025 | Create event — invalid coordinates | Vendor authenticated | `location.coordinates.lat = 95` (>90) | HTTP 422; invalid latitude | Medium |
| TC-VND-026 | Create event — unsupported currency | Vendor authenticated | `currency = "GBP"` | HTTP 422; must be AED, EGP, CAD, or USD | Medium |
| TC-VND-027 | Happy path: get vendor's own events | Vendor authenticated, has events | `GET /vendors/events` | HTTP 200; only events belonging to this vendor | High |
| TC-VND-028 | Get vendor events — user role blocked | Authenticated as `user` | `GET /vendors/events` | HTTP 403 | High |
| TC-VND-029 | Happy path: get single vendor event by ID | Vendor authenticated, owns event | `GET /vendors/events/:id` | HTTP 200; event details | High |
| TC-VND-030 | Get vendor event — another vendor's event | Vendor A authenticated | `id` of Vendor B's event | HTTP 403 or 404 | High |
| TC-VND-031 | Happy path: update vendor event | Vendor authenticated, owns event | `PUT /vendors/events/:id` with changed `title` | HTTP 200; event updated | High |
| TC-VND-032 | Update event — invalid event ID | Vendor authenticated | Non-existent `:id` | HTTP 404 | Medium |
| TC-VND-033 | Update event — title exceeds 200 chars | Vendor authenticated | `title` = 201-char string | HTTP 422; validation error | Medium |
| TC-VND-034 | Update event — another vendor's event | Vendor A authenticated | `PUT /vendors/events/:id` for Vendor B's event | HTTP 403 | High |
| TC-VND-035 | Happy path: soft delete vendor event | Vendor authenticated, owns event | `DELETE /vendors/events/:id` | HTTP 200; event soft-deleted (not purged from DB) | High |
| TC-VND-036 | Delete event — another vendor's event | Vendor A authenticated | `DELETE /vendors/events/:id` for Vendor B | HTTP 403 | High |
| TC-VND-037 | Happy path: restore deleted event | Vendor authenticated, event soft-deleted | `PUT /vendors/events/:id/restore` | HTTP 200; event status restored | High |
| TC-VND-038 | Restore event — event not deleted | Vendor authenticated, event active | `PUT /vendors/events/:id/restore` | HTTP 400; event is not deleted | Medium |
| TC-VND-039 | Admin approves event | Admin authenticated | `PUT /events/admin/:id/approval` `{ isApproved: true }` | HTTP 200; event `isApproved: true` | High |
| TC-VND-040 | Admin rejects event with reason | Admin authenticated | `{ isApproved: false, reason: "Insufficient info" }` | HTTP 200; event rejected; vendor notified | High |
| TC-VND-041 | Admin approval — reason > 500 chars | Admin authenticated | `reason` = 501-char string | HTTP 422; validation error | Low |
| TC-VND-042 | Admin approval — user role blocked | Authenticated as `user` | `PUT /events/admin/:id/approval` | HTTP 403 | High |
| TC-VND-043 | Admin toggle featured event | Admin authenticated, event approved | `PUT /events/admin/:id/featured` | HTTP 200; `isFeatured` toggled | Medium |
| TC-VND-044 | Vendor claims unclaimed event | Vendor authenticated, event has no owner | `POST /events/:id/claim` | HTTP 200; `vendorId` set on event | Medium |
| TC-VND-045 | Vendor claims already-claimed event | Vendor authenticated, event has owner | `POST /events/:id/claim` | HTTP 409; event already claimed | Medium |

---

## Vendor Booking Management

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-VND-046 | Happy path: get vendor bookings | Vendor authenticated, has bookings | `GET /vendors/bookings` | HTTP 200; paginated bookings for vendor's events only | High |
| TC-VND-047 | Get bookings — user role blocked | Authenticated as `user` | `GET /vendors/bookings` | HTTP 403 | High |
| TC-VND-048 | Get single booking by ID | Vendor authenticated, booking belongs to vendor's event | `GET /vendors/bookings/:id` | HTTP 200; booking details | High |
| TC-VND-049 | Get booking — another vendor's booking | Vendor A authenticated | `id` belonging to Vendor B's event | HTTP 403 or 404 | High |
| TC-VND-050 | Update booking status | Vendor authenticated, owns booking's event | `PUT /vendors/bookings/:id` `{ status: "confirmed" }` | HTTP 200; status updated | High |
| TC-VND-051 | Update booking — attempt to change financial fields | Vendor authenticated | `PUT /vendors/bookings/:id` `{ total: 9999 }` | Financial fields ignored or HTTP 400; only status/notes editable | High |
| TC-VND-052 | Export bookings to CSV | Vendor authenticated | `GET /vendors/bookings/export?format=csv` | HTTP 200; CSV file download | Medium |
| TC-VND-053 | Export bookings to JSON | Vendor authenticated | `GET /vendors/bookings/export?format=json` | HTTP 200; JSON response | Medium |
| TC-VND-054 | Import bookings from CSV | Vendor authenticated | `POST /vendors/bookings/import` with valid CSV file | HTTP 200; bookings imported or mapped | Low |

---

## Vendor Profile Management

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-VND-055 | Happy path: get vendor profile | Vendor authenticated | `GET /vendors/profile` | HTTP 200; full vendor profile (masked sensitive fields) | High |
| TC-VND-056 | Update vendor profile | Vendor authenticated | `PUT /vendors/profile` with valid fields | HTTP 200; profile updated | High |
| TC-VND-057 | Update profile — invalid field value | Vendor authenticated | Validation rule violation per `validateUpdateProfile` | HTTP 422; validation error | Medium |
| TC-VND-058 | Upload vendor image (logo) | Vendor authenticated | `POST /vendors/upload-image` with valid image | HTTP 200; Cloudinary URL stored | High |
| TC-VND-059 | Upload image — invalid file type | Vendor authenticated | Non-image file | HTTP 422; invalid file type | High |
| TC-VND-060 | Update business hours | Vendor authenticated | `PUT /vendors/business-hours` with valid schedule object | HTTP 200; business hours updated | High |
| TC-VND-061 | Update social media links | Vendor authenticated | `PUT /vendors/social-media` with valid URLs | HTTP 200; social media links updated | Medium |
| TC-VND-062 | Update bank details | Vendor authenticated | `PUT /vendors/bank-details` with valid bank fields | HTTP 200; bank details stored securely | High |
| TC-VND-063 | Bank details — invalid IBAN format | Vendor authenticated | Invalid IBAN string | HTTP 422; validation error | Medium |

---

## Vendor Phone Verification

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-VND-064 | Happy path: send phone OTP | Vendor authenticated | `POST /vendors/verify-phone/send` with valid `{ phone }` | HTTP 200; OTP sent | High |
| TC-VND-065 | Send phone OTP — invalid number | Vendor authenticated | Invalid phone format | HTTP 422; validation error | High |
| TC-VND-066 | Happy path: confirm phone OTP | Vendor authenticated, OTP sent | `POST /vendors/verify-phone/confirm` with correct OTP | HTTP 200; vendor phone verified | High |
| TC-VND-067 | Confirm phone OTP — wrong OTP | Vendor authenticated | Incorrect OTP | HTTP 400; invalid OTP | High |

---

## Vendor Document Management

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-VND-068 | Happy path: get vendor documents | Vendor authenticated | `GET /vendors/documents` | HTTP 200; document status list | High |
| TC-VND-069 | Upload verification document | Vendor authenticated | `POST /vendors/documents/upload` with valid document file | HTTP 200; document stored in Cloudinary | High |
| TC-VND-070 | Upload document — invalid type | Vendor authenticated | `POST /vendors/documents/upload` with executable or disallowed file | HTTP 422 | High |
| TC-VND-071 | Delete document by type | Vendor authenticated, document exists | `DELETE /vendors/documents/:type` with valid `type` | HTTP 200; document removed | Medium |
| TC-VND-072 | Delete document — invalid type value | Vendor authenticated | `:type` not in allowed document types | HTTP 422; validateDocumentType fails | Medium |

---

## Employee Management

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-VND-073 | Happy path: get vendor employees list | Vendor authenticated, has employees | `GET /vendors/employees` | HTTP 200; paginated list of this vendor's employees | High |
| TC-VND-074 | Create employee | Vendor authenticated | `POST /vendors/employees` with valid employee fields | HTTP 201; employee created linked to vendor | High |
| TC-VND-075 | Create employee — duplicate email | Vendor authenticated, email in use | Same employee email | HTTP 409; duplicate error | High |
| TC-VND-076 | Create employee — missing required fields | Vendor authenticated | Incomplete employee payload | HTTP 422; validation errors | High |
| TC-VND-077 | Get single employee | Vendor authenticated, owns employee | `GET /vendors/employees/:id` | HTTP 200; employee details | High |
| TC-VND-078 | Get employee — another vendor's employee | Vendor A authenticated | `id` of Vendor B's employee | HTTP 403 or 404 | High |
| TC-VND-079 | Update employee | Vendor authenticated, owns employee | `PUT /vendors/employees/:id` with changed fields | HTTP 200; employee updated | High |
| TC-VND-080 | Delete employee (soft) | Vendor authenticated, owns employee | `DELETE /vendors/employees/:id` | HTTP 200; employee deactivated | High |
| TC-VND-081 | Assign employee to event | Vendor authenticated, owns both employee and event | `POST /vendors/employees/:id/assign-event` with `{ eventIds }` | HTTP 200; employee assigned | High |
| TC-VND-082 | Assign employee — event not owned by vendor | Vendor A authenticated | `eventIds` contains Vendor B's event ID | HTTP 403 | High |
| TC-VND-083 | Remove employee from event | Vendor authenticated | `POST /vendors/employees/:id/remove-event` with `{ eventId }` | HTTP 200; employee removed from event | High |
| TC-VND-084 | Export employees to CSV | Vendor authenticated | `POST /vendors/employees/export` with format | HTTP 200; CSV or JSON returned | Medium |

---

## Stripe Connect

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-VND-085 | Happy path: initialize Stripe Connect onboarding | Vendor authenticated, no existing Connect account | `POST /vendors/stripe-connect/onboard` | HTTP 200; Stripe onboarding URL returned | High |
| TC-VND-086 | Re-initialize onboarding — account already exists | Vendor with existing Connect account | `POST /vendors/stripe-connect/onboard` | HTTP 200; new onboarding link or status message | Medium |
| TC-VND-087 | Get Stripe Connect status — onboarding complete | Vendor with complete Connect account | `GET /vendors/stripe-connect/status` | HTTP 200; `onboardingComplete: true`, capabilities status | High |
| TC-VND-088 | Get Stripe Connect status — onboarding incomplete | Vendor mid-onboarding | `GET /vendors/stripe-connect/status` | HTTP 200; `onboardingComplete: false`, pending requirements | High |
| TC-VND-089 | Stripe Connect endpoints — user role blocked | Authenticated as `user` | `POST /vendors/stripe-connect/onboard` | HTTP 403 | High |
| TC-VND-090 | Stripe Connect — Stripe API failure | Stripe unavailable | `POST /vendors/stripe-connect/onboard` | HTTP 500; error logged; no partial state saved | High |

---

## Security Tests

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-VND-091 | IDOR: vendor reads another vendor's profile | Vendor A authenticated | `GET /vendors/profile` — should return own data only | HTTP 200; returns Vendor A's profile, not B's | Critical |
| TC-VND-092 | IDOR: vendor updates another vendor's event | Vendor A authenticated | `PUT /vendors/events/:id` with Vendor B's event ID | HTTP 403 | Critical |
| TC-VND-093 | IDOR: vendor reads another vendor's bookings | Vendor A authenticated | `GET /vendors/bookings/:id` with Vendor B's booking | HTTP 403 or 404 | Critical |
| TC-VND-094 | Stripe secret key not returned in any API response | Vendor authenticated | `GET /vendors/profile` or `GET /vendors/stats` | `stripeSecretKey` field absent from all responses | Critical |
| TC-VND-095 | Bank details not returned in public endpoints | N/A | `GET /vendors` or `GET /vendors/public/:id` | No bank account fields in response | Critical |
| TC-VND-096 | Mass assignment: attempt to set vendor role via profile update | Vendor authenticated | `PUT /vendors/profile` `{ role: "admin" }` | Role field ignored; vendor remains `vendor` | High |
| TC-VND-097 | Rate limiting on heavy dashboard endpoint | N/A | 21+ requests to `GET /vendors/stats` within window | HTTP 429 after threshold (20 req/min heavy limit) | High |
| TC-VND-098 | Non-vendor authenticated user hits vendor-protected route | Authenticated as `user` | `GET /vendors/events` | HTTP 403; `authorize([UserRole.VENDOR])` rejects | High |
| TC-VND-099 | Path traversal in document type param | Vendor authenticated | `DELETE /vendors/documents/../../../etc/passwd` | HTTP 422 or 400; param validation rejects non-enum value | High |
| TC-VND-100 | Vendor accesses admin-only event approval endpoint | Vendor authenticated | `PUT /events/admin/:id/approval` | HTTP 403; admin only | Critical |
