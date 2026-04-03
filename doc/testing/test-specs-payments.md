# Test Specifications: Payments Domain
> Gema Event Management Platform
> Generated: 2026-02-25

Source files: `services/payment.service.ts`, `services/refund.service.ts`

---

## PaymentService — getPaymentRouting

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-PAY-001 | Happy path: platform Stripe routing for vendor without custom Stripe | Vendor exists in DB with `paymentMode != CUSTOM_STRIPE` | `vendorOrTeacherId` = valid vendor ID, `amount` = 100 | `usesVendorStripe: false`, `stripeInstance` = platform stripe, `serviceFee` = vendor's effective commission rate applied to 100 | High |
| TC-PAY-002 | Happy path: vendor Stripe routing (custom secret key) with active subscription | Vendor has `paymentMode = CUSTOM_STRIPE`, active subscription, `stripeSecretKey` set | `vendorOrTeacherId` = vendor ID, `amount` = 500 | `usesVendorStripe: true`, `platformCommission: 0`, `serviceFee: 0`, `vendorPayout: 500` | High |
| TC-PAY-003 | Happy path: vendor Stripe routing via Connect (no secret key) | Vendor has `paymentMode = CUSTOM_STRIPE`, active subscription, `stripeConnectOnboardingComplete: true`, `stripeConnectAccountId` set | `vendorOrTeacherId` = vendor ID, `amount` = 200 | `usesVendorStripe: true`, `vendorStripeAccountId` = connect account ID, `platformCommission: 0` | High |
| TC-PAY-004 | Teacher fallback: vendor lookup misses, teacher found | No vendor with given ID, teacher exists with same ID | `vendorOrTeacherId` = valid teacher ID, `amount` = 150 | Routing resolved using teacher's payment settings; no error thrown | Medium |
| TC-PAY-005 | Commission calculation precision — fils arithmetic | Vendor on platform Stripe with 5% commission | `amount` = 1.01 | `serviceFee` = 0.05 (rounded via fils), `vendorPayout` = 0.96 | High |
| TC-PAY-006 | Commission calculation — zero amount | Vendor on platform Stripe | `amount` = 0 | `serviceFee: 0`, `vendorPayout: 0` | Medium |
| TC-PAY-007 | Custom Stripe but subscription inactive | Vendor has `paymentMode = CUSTOM_STRIPE` but subscription is expired | `vendorOrTeacherId` = vendor ID, `amount` = 300 | Falls back to platform Stripe with commission applied | High |
| TC-PAY-008 | Custom Stripe but no keys configured | Vendor has `paymentMode = CUSTOM_STRIPE`, active subscription, but neither `stripeSecretKey` nor Stripe Connect fields set | `vendorOrTeacherId` = vendor ID, `amount` = 300 | Falls back to platform Stripe with commission applied | High |
| TC-PAY-009 | Vendor and teacher both not found | No vendor or teacher with given ID in DB | `vendorOrTeacherId` = non-existent ObjectId, `amount` = 100 | Error thrown: "Vendor or Teacher not found"; fallback applies: `serviceFee` = 5% of 100 = 5.00 | High |
| TC-PAY-010 | DB error during vendor lookup | MongoDB connection failure | `vendorOrTeacherId` = valid ID, `amount` = 100 | Catch block executes; fallback 5% commission applied; `usesVendorStripe: false` | High |

---

## PaymentService — createPaymentIntent

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-PAY-011 | Happy path: create intent without vendor | Stripe configured | `amount` = 100, `currency` = "AED", `orderId` = valid ObjectId string, no `vendorId` | Returns `{ clientSecret, paymentIntentId }`; currency forced to "aed" | High |
| TC-PAY-012 | Happy path: create intent with vendor (platform routing) | Vendor exists on platform Stripe | `amount` = 250, `currency` = "AED", `orderId`, `vendorId` | Intent created on platform stripe; serviceFee in metadata matches routing info | High |
| TC-PAY-013 | Happy path: create intent with vendor Stripe | Vendor uses custom Stripe key | `amount` = 500, `vendorId` | Intent created using vendor's Stripe instance | High |
| TC-PAY-014 | Currency normalization — input non-AED currency | N/A | `amount` = 100, `currency` = "USD", `orderId` | Intent created with `currency = "aed"` regardless of input | Medium |
| TC-PAY-015 | Display currency/amount passed through metadata | N/A | `displayCurrency` = "USD", `displayAmount` = 27.23 | Metadata logged with display values; Stripe intent still uses AED | Low |
| TC-PAY-016 | Customer ID attached when provided | Stripe customer exists | `customerId` = "cus_xxx" | `customer` field set on PaymentIntent params | Medium |
| TC-PAY-017 | Idempotency key uniqueness — same orderId called twice rapidly | N/A | Same `orderId`, two rapid calls | Each call generates unique idempotency key (includes `Date.now()`); Stripe deduplicates if same key reused | Medium |
| TC-PAY-018 | Stripe API failure during intent creation | Stripe returns 500 error | Any valid params | Error thrown: "Failed to create payment intent" | High |
| TC-PAY-019 | Invalid vendorId causes routing fallback | Non-existent vendorId | `vendorId` = "000000000000000000000000" | Routing falls back to 5% commission; intent still created on platform Stripe | High |
| TC-PAY-020 | Metadata merge with custom metadata | N/A | `metadata` = `{ "ref": "booking-123" }` | Final PaymentIntent metadata contains both default fields and `ref: "booking-123"` | Low |

---

## RefundService — calculateRefundableAmount

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-PAY-021 | Happy path: paid order with service fee and tax | N/A | `order.paymentStatus = "paid"`, `subtotal = 100`, `serviceFee = 5`, `tax = 5`, `couponDiscount = 0` | `refundAmount: 100`, `nonRefundableAmount: 10`, `serviceFee: 5`, `tax: 5` | High |
| TC-PAY-022 | Coupon discount reduces refundable amount | N/A | `subtotal = 100`, `couponDiscount = 20`, `serviceFee = 4`, `tax = 4` | `refundAmount: 80`, `nonRefundableAmount: 8` | High |
| TC-PAY-023 | Order not paid — returns all zeros | N/A | `order.paymentStatus = "pending"` | `refundAmount: 0`, `nonRefundableAmount: 0`, `serviceFee: 0`, `tax: 0` | High |
| TC-PAY-024 | Coupon discount larger than subtotal — no negative refund | N/A | `subtotal = 10`, `couponDiscount = 15`, `serviceFee = 1`, `tax = 1` | `refundAmount: 0` (Math.max(0, -5) = 0) | High |
| TC-PAY-025 | Zero service fee and tax | N/A | `subtotal = 50`, `serviceFee = 0`, `tax = 0`, `paymentStatus = "paid"` | `refundAmount: 50`, `nonRefundableAmount: 0` | Medium |
| TC-PAY-026 | Missing serviceFee/tax fields default to 0 | Order created without fee fields | `subtotal = 60`, `serviceFee` undefined, `tax` undefined | Treated as 0; `refundAmount: 60` | Medium |

---

## RefundService — processRefund

| Test ID | Description | Preconditions | Input | Expected Output | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-PAY-027 | Happy path: user-requested refund within 24-hour window | Order paid, not refunded, within cancellation window, has `paymentIntentId` | `orderId`, `reason`, `initiatedBy`, `cancellationType = "user_requested"` | Stripe refund created; order status = "refunded"; seats returned to event; CancellationLog created | High |
| TC-PAY-028 | Happy path: admin-cancelled refund ignores 24-hour rule | Order paid, past 24-hour window | `cancellationType = "admin_cancelled"` | Refund processed regardless of cancellation window | High |
| TC-PAY-029 | Happy path: event-cancelled batch refund | Order paid | `cancellationType = "event_cancelled"` | Refund processed; order marked refunded; seats returned | High |
| TC-PAY-030 | Order already refunded | `order.status = "refunded"` | Valid `orderId` | Error thrown: "Order has already been refunded"; transaction rolled back | High |
| TC-PAY-031 | Order not paid | `order.paymentStatus = "pending"` | Valid `orderId` | Error thrown: "Order has not been paid"; transaction rolled back | High |
| TC-PAY-032 | User requests cancellation outside allowed window | `canBeCancelledByCustomer()` returns `{ canCancel: false }` | `cancellationType = "user_requested"` | Error thrown with reason from `canBeCancelledByCustomer()`; transaction rolled back | High |
| TC-PAY-033 | Order not found | No order with given ID | `orderId` = non-existent ID | Error thrown: "Order not found"; transaction rolled back | High |
| TC-PAY-034 | Stripe refund API failure | Stripe returns error during refund | Valid paid order | `refundStatus` set to "failed" on order; transaction rolled back; error propagated | High |
| TC-PAY-035 | Free order / no paymentIntentId | Order paid but `paymentIntentId` is null | Valid paid order without intent | Order status set to "refunded" without Stripe call; seats returned | Medium |
| TC-PAY-036 | Unlimited seats event — skip seat restoration | `schedule.unlimitedSeats = true` | Valid refund | Refund completes; `availableSeats` not modified on event schedule | Medium |
| TC-PAY-037 | Event or schedule not found during seat restoration | Event deleted after order placed | Valid refund | Refund still completes; seat restoration skipped gracefully | Medium |
| TC-PAY-038 | Zero refundable amount | `subtotal = 0` or fully discounted by coupon | Valid paid order | Error thrown: "No refundable amount" | High |
| TC-PAY-039 | Transaction atomicity — DB failure mid-refund | Simulated DB failure after Stripe refund succeeds | Valid paid order | Transaction rolled back; order not marked refunded; requires reconciliation | High |
| TC-PAY-040 | CancellationLog created with correct metadata | Happy path refund | Valid paid order with customer and event | `CancellationLog` contains `orderNumber`, `customerEmail`, `eventTitle`, correct amounts | Medium |
