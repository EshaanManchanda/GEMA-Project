# Test Specifications: Tickets Domain
> Gema Event Management Platform
> Generated: 2026-02-25

Source file: `routes/ticket.routes.ts`
Controllers: `ticket.controller.ts`
Middleware: `authenticate`, `authorize`

Role matrix summary:
- `generate`: vendor, admin
- `generate-missing`: user, customer, vendor, admin
- `verify-qr`: employee, vendor, admin
- `checkin`: employee, vendor, admin
- `event/:eventId` (list): employee, vendor, admin
- `user/my-tickets`: user, customer
- `order/:orderId`: user, customer
- `/:ticketId/download`: user, customer
- `/:ticketId` (details): user, customer, employee, vendor, admin
- `/:ticketId/transfer`: user, customer
- `/:ticketId/resend`: user, customer

All routes require `authenticate` (global `router.use`).

---

## Ticket Generation

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-TKT-001 | Happy path: vendor generates tickets for an order | Vendor authenticated, order exists and is paid | `POST /tickets/generate` with valid `{ orderId }` | HTTP 201; tickets created in DB; QR generation queued in BullMQ | High |
| TC-TKT-002 | Admin generates tickets | Admin authenticated, paid order | `POST /tickets/generate` with valid `{ orderId }` | HTTP 201; tickets created | High |
| TC-TKT-003 | User role blocked from generating tickets | Authenticated as `user` | `POST /tickets/generate` | HTTP 403; role not authorized | High |
| TC-TKT-004 | Customer role blocked from generating tickets | Authenticated as `customer` | `POST /tickets/generate` | HTTP 403 | High |
| TC-TKT-005 | Employee role blocked from generating tickets | Authenticated as `employee` | `POST /tickets/generate` | HTTP 403 | High |
| TC-TKT-006 | Unauthenticated request to generate | No token | `POST /tickets/generate` | HTTP 401 | High |
| TC-TKT-007 | Duplicate ticket generation for same order | Tickets already generated | `POST /tickets/generate` with same `orderId` | HTTP 409 or idempotent 200; no duplicate tickets created | High |
| TC-TKT-008 | Generate for non-existent order | No order with given ID | `POST /tickets/generate` with invalid `orderId` | HTTP 404 | Medium |
| TC-TKT-009 | Generate missing tickets — user generating for own order | User authenticated, paid order missing tickets | `POST /tickets/generate-missing` with valid `orderId` | HTTP 200 or 201; missing tickets created | High |
| TC-TKT-010 | Generate missing tickets — non-existent or other user's order | User authenticated | `orderId` belonging to different user | HTTP 403 or 404 | High |

---

## QR Verification & Check-in

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-TKT-011 | Happy path: employee verifies valid QR code | Employee authenticated, ticket exists and is valid | `POST /tickets/verify-qr/:eventId` with valid QR payload | HTTP 200; ticket details returned; ticket not yet checked in | High |
| TC-TKT-012 | Vendor verifies QR code for own event | Vendor authenticated | `POST /tickets/verify-qr/:eventId` | HTTP 200 | High |
| TC-TKT-013 | Admin verifies QR code | Admin authenticated | `POST /tickets/verify-qr` (no eventId) | HTTP 200 | High |
| TC-TKT-014 | User role blocked from QR verification | Authenticated as `user` | `POST /tickets/verify-qr/:eventId` | HTTP 403 | High |
| TC-TKT-015 | QR verification — invalid/tampered QR data | Employee authenticated | Malformed or tampered QR payload | HTTP 400; invalid ticket error | High |
| TC-TKT-016 | QR verification — ticket for wrong event | Employee authenticated for Event A | QR belongs to Event B | HTTP 400 or 403; event mismatch error | High |
| TC-TKT-017 | QR verification — already checked-in ticket | Employee authenticated, ticket already checked in | Valid QR of checked-in ticket | HTTP 200 or 409 with `alreadyCheckedIn: true` in response | High |
| TC-TKT-018 | QR verification — cancelled/refunded ticket | Employee authenticated | QR for refunded ticket | HTTP 400; ticket not valid for entry | High |
| TC-TKT-019 | Happy path: check in a valid ticket | Employee authenticated, ticket valid and not checked in | `POST /tickets/:ticketId/checkin` | HTTP 200; `checkedIn: true`, `checkInTime` set on ticket | High |
| TC-TKT-020 | Check in — already checked in | Employee authenticated | `ticketId` of already checked-in ticket | HTTP 409; duplicate check-in error | High |
| TC-TKT-021 | Check in — refunded ticket | Employee authenticated | `ticketId` of refunded ticket | HTTP 400; invalid status for check-in | High |
| TC-TKT-022 | Check in — non-existent ticket | Employee authenticated | Non-existent `ticketId` | HTTP 404 | Medium |
| TC-TKT-023 | Check in — user role blocked | Authenticated as `user` | `POST /tickets/:ticketId/checkin` | HTTP 403 | High |
| TC-TKT-024 | Check in — invalid ObjectId format | Employee authenticated | `ticketId = "notanid"` | HTTP 422 or 400; invalid ID format | Medium |

---

## Ticket Retrieval

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-TKT-025 | Happy path: get all tickets for an event | Vendor/employee authenticated, event has tickets | `GET /tickets/event/:eventId` | HTTP 200; paginated list of tickets for that event | High |
| TC-TKT-026 | Get event tickets — user role blocked | Authenticated as `user` | `GET /tickets/event/:eventId` | HTTP 403 | High |
| TC-TKT-027 | Get event tickets — non-existent event | Vendor authenticated | Non-existent `eventId` | HTTP 200 with empty array or HTTP 404 | Medium |
| TC-TKT-028 | Get event tickets — vendor accessing another vendor's event | Vendor A authenticated | `eventId` of Vendor B's event | HTTP 403; ownership check fails | High |
| TC-TKT-029 | Happy path: user retrieves own tickets | User/customer authenticated | `GET /tickets/user/my-tickets` | HTTP 200; list of user's tickets only | High |
| TC-TKT-030 | My-tickets — vendor role blocked | Authenticated as `vendor` | `GET /tickets/user/my-tickets` | HTTP 403 | High |
| TC-TKT-031 | My-tickets — unauthenticated | No token | `GET /tickets/user/my-tickets` | HTTP 401 | High |
| TC-TKT-032 | Happy path: get tickets by order ID | Customer authenticated, owns order | `GET /tickets/order/:orderId` | HTTP 200; tickets belonging to that order | High |
| TC-TKT-033 | Get tickets by order — other user's order | Customer A authenticated | `orderId` of Customer B | HTTP 403 or 404 | High |
| TC-TKT-034 | Happy path: get single ticket details | Any authenticated role | `GET /tickets/:ticketId` | HTTP 200; full ticket object | High |
| TC-TKT-035 | Get ticket details — non-existent ticket | Any authenticated role | Non-existent `ticketId` | HTTP 404 | Medium |
| TC-TKT-036 | Get ticket details — unauthenticated | No token | `GET /tickets/:ticketId` | HTTP 401 | High |

---

## Ticket Download

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-TKT-037 | Happy path: download ticket PDF | Customer authenticated, owns ticket | `GET /tickets/:ticketId/download` | HTTP 200; PDF binary or signed Cloudinary URL returned | High |
| TC-TKT-038 | Download PDF — vendor role blocked | Authenticated as `vendor` | `GET /tickets/:ticketId/download` | HTTP 403 | High |
| TC-TKT-039 | Download PDF — other user's ticket | Customer A authenticated | `ticketId` belonging to Customer B | HTTP 403 | High |
| TC-TKT-040 | Download PDF — non-existent ticket | Customer authenticated | Invalid `ticketId` | HTTP 404 | Medium |
| TC-TKT-041 | Download PDF — unauthenticated | No token | `GET /tickets/:ticketId/download` | HTTP 401 | High |

---

## Ticket Transfer

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-TKT-042 | Happy path: transfer ticket to another user | Customer authenticated, owns valid ticket | `POST /tickets/:ticketId/transfer` with `{ recipientEmail }` | HTTP 200; ticket ownership transferred; both users notified by email | High |
| TC-TKT-043 | Transfer — recipient email does not exist | Valid ticket owner | `recipientEmail` not in DB | HTTP 404; recipient not found | High |
| TC-TKT-044 | Transfer — already checked-in ticket | Customer owns ticket | `ticketId` of checked-in ticket | HTTP 400; checked-in tickets cannot be transferred | High |
| TC-TKT-045 | Transfer — refunded ticket | Customer | Refunded `ticketId` | HTTP 400; invalid status | High |
| TC-TKT-046 | Transfer — other user's ticket | Customer A | `ticketId` owned by Customer B | HTTP 403 | High |
| TC-TKT-047 | Transfer — vendor role blocked | Authenticated as `vendor` | `POST /tickets/:ticketId/transfer` | HTTP 403 | High |
| TC-TKT-048 | Transfer — recipient is same as sender | Customer authenticated | `recipientEmail` = own email | HTTP 400; cannot transfer to self | Medium |
| TC-TKT-049 | Transfer — unauthenticated | No token | `POST /tickets/:ticketId/transfer` | HTTP 401 | High |

---

## Ticket Resend

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-TKT-050 | Happy path: resend ticket email | Customer authenticated, owns ticket | `POST /tickets/:ticketId/resend` | HTTP 200; ticket email queued for resend via BullMQ | High |
| TC-TKT-051 | Resend — other user's ticket | Customer A authenticated | `ticketId` owned by Customer B | HTTP 403 | High |
| TC-TKT-052 | Resend — vendor role blocked | Authenticated as `vendor` | `POST /tickets/:ticketId/resend` | HTTP 403 | High |
| TC-TKT-053 | Resend — non-existent ticket | Customer authenticated | Non-existent `ticketId` | HTTP 404 | Medium |
| TC-TKT-054 | Resend — unauthenticated | No token | `POST /tickets/:ticketId/resend` | HTTP 401 | High |
| TC-TKT-055 | Resend — email queue failure | BullMQ worker down | Valid resend request | HTTP 500 or 202 with warning; error logged; ticket email not sent | Medium |

---

## Security Tests

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-TKT-056 | IDOR: customer accesses another customer's ticket | Customer A authenticated | `GET /tickets/:ticketId` where ticket belongs to Customer B | HTTP 403 or 404 | Critical |
| TC-TKT-057 | Role escalation: user attempts QR verification | Authenticated as `user` | `POST /tickets/verify-qr/:eventId` | HTTP 403 | Critical |
| TC-TKT-058 | Forged QR code check-in attempt | Employee authenticated | QR payload with modified ticketId | HTTP 400; invalid ticket signature | Critical |
| TC-TKT-059 | Employee accesses event they are not assigned to | Employee authenticated | `GET /tickets/event/:eventId` for unassigned event | HTTP 403 | High |
| TC-TKT-060 | Mass assignment: attempt to set `checkedIn: true` via transfer body | Customer authenticated | `POST /tickets/:ticketId/transfer` with `{ checkedIn: true }` in body | Ignored; only `recipientEmail` processed | High |
