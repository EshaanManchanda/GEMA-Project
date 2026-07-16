# GEMA Platform — Payment, Commission, Payout & Subscription System

## Overview

This document describes the hardened money pipeline: how a customer's payment
turns into vendor revenue, how commission is calculated, how long that revenue
is held before it's safe to pay out, and how it gets settled to vendors.

It replaces an earlier design where two independent code paths wrote
commission and revenue records with disagreeing numbers and disagreeing hold
windows. See [Before / What Was Broken](#before--what-was-broken) for the
history, and [`SUBSCRIPTION_MODEL.md`](./SUBSCRIPTION_MODEL.md) for the
vendor subscription (flat-fee) side of the business, which this document does
not change.

---

## The Two-Layer Settlement Model

```
                     ┌─────────────────────┐         ┌──────────────────────┐
  Payment confirmed  │   ELIGIBILITY        │         │   SETTLEMENT          │
  ─────────────────► │   (per-transaction)  │ ──────► │   (per-vendor batch)  │
                      │                       │         │                        │
                      │ payoutHoldHours       │         │ VendorPayoutBatch      │
                      │ (admin-configurable,  │         │ (monthly, or on-      │
                      │  default 24h)         │         │  demand admin trigger) │
                      └─────────────────────┘         └──────────────────────┘
```

- **Layer 1 — Eligibility.** Every `RevenueTransaction` carries a
  `payoutEligibleAt` timestamp: `paymentConfirmationTime + payoutHoldHours`.
  This is the refund/clawback safety window — a vendor's money doesn't count
  as "theirs" until the window passes, in case the customer disputes or
  refunds the order. `payoutHoldHours` lives in `AdminRevenueSettings`,
  default **24 hours**, admin-configurable via `PUT /api/admin/settings`.

- **Layer 2 — Settlement.** Being *eligible* doesn't mean *paid*. Eligible,
  unbatched `RevenueTransaction`s are grouped once a month (or on-demand) into
  a `VendorPayoutBatch` per vendor — admin reviews, approves, and marks paid
  with a payment reference. This is the auditable, batched settlement layer.

These are deliberately separate concepts. Do not conflate `payoutHoldHours`
with the batch cadence, and do not conflate either with
`refundPolicy.defaultRefundableHours` (a third, unrelated setting governing
*customer* refund eligibility before an event — not covered here).

---

## End-to-End Flow

```
Customer pays (Stripe Checkout / PaymentIntent)
        │
        ▼
Stripe webhook: payment_intent.succeeded
        │  payment.service.ts → handlePaymentSucceeded()
        ▼
order.markAsPaid()  +  order.confirm()
        │  (sets paymentStatus, generates tickets — no revenue writes here)
        ▼
commissionService.calculateCommissionForOrder(orderId)
        │  commission.service.ts — THE SINGLE WRITER
        │
        ├─ resolves vendor via Vendor.findById(event.vendorId)   [correct — event.vendorId is a Vendor._id]
        ├─ subscription-active vendor (custom_stripe + isSubscriptionActive())?
        │      → commission = 0, vendorPayout = total  (subscription flat-fee already covers platform revenue)
        ├─ else → applies AdminRevenueSettings / CommissionConfig rules
        │
        ├─ creates CommissionTransaction   (unique index on orderId)
        └─ creates RevenueTransaction      (unique index on orderId)
                 payoutEligibleAt = now + payoutHoldHours
                 payoutHoldHoursSnapshot = payoutHoldHours   (audit — see below)
        │
        ▼
[ hourly ] payout eligibility cron — payoutEligibleAt <= now?
        │  PayoutService.processPendingEligiblePayouts()
        │  SKIPPED ENTIRELY if AdminRevenueSettings.payoutFrequency === "monthly"
        │  (see Settlement-Path Exclusivity below)
        ▼
[ monthly, gated by monthlyPayoutDay ] PayoutService.generateMonthlyPayoutBatches()
        │  groups eligible+unbatched+non-refunded RevenueTransactions by vendor
        │  skips vendors below minimumPayoutAmount (carry-forward to next run)
        │  creates DRAFT VendorPayoutBatch, stamps payoutBatchId on each txn
        ▼
Admin reviews → approveBatch() → markBatchPaid(reference)
        │  RevenueTransaction.payoutStatus → COMPLETED
        ▼
Vendor paid
```

### Two additional trigger points (idempotent, safe to overlap)

1. **Sync controller confirm** — `payment.controller.ts` (non-webhook confirm
   flow) also calls `calculateCommissionForOrder` directly.
2. **Hourly backfill cron** — `commission.service.processUncommissionedOrders()`,
   started by `startCommissionBackfillCron()` (`utils/cron.ts`, `:30` every
   hour). Cutoff = `now - payoutHoldHours`. This is the safety net if the
   webhook call fails (network blip, transient DB error) — should normally
   find nothing to process.

All three call the same `calculateCommissionForOrder`, which is idempotent:
guarded by `CommissionTransaction.findOne({orderId})` /
`RevenueTransaction.findOne({orderId})` before insert, **and** backed by a
unique DB index on `orderId` on both models as a second line of defense
against races (duplicate-key errors are caught and treated as "already
exists", not a failure).

---

## Single-Writer Rule

**`commission.service.calculateCommissionForOrder()` is the only live path
that creates `CommissionTransaction` or `RevenueTransaction` records for an
order.**

`Order.ts` used to have its own competing implementation
(`calculateAdminCommission()` + `createRevenueTransaction()`, called from
`markAsPaid()` and a pre-save hook). Those methods still exist — marked
`@deprecated` — for manual admin-entry controllers that construct
`RevenueTransaction` records directly outside the order-payment flow
(`admin.revenue.controller.ts`, `admin.teacher.revenue.controller.ts`). They
must never be wired back into the order-payment path; see
[Before / What Was Broken](#before--what-was-broken) for why.

---

## Admin-Configurable Settings

All in `AdminRevenueSettings` (singleton, `GET/PUT /api/admin/settings`):

| Field | Default | Meaning |
|---|---|---|
| `payoutHoldHours` | `24` | Hours after payment confirmation before a `RevenueTransaction` is payout-eligible (Layer 1). |
| `payoutFrequency` | `weekly` (existing default; set to `monthly` to enable the batch settlement layer) | `daily \| weekly \| biweekly \| monthly`. When `monthly`, the hourly per-request auto-payout (`processPendingEligiblePayouts`) is skipped — see [Settlement-Path Exclusivity](#settlement-path-exclusivity). |
| `monthlyPayoutDay` | `5` | Day of month (1–28) the monthly batch cron generates draft batches. |
| `minimumPayoutAmount` | `50` AED (existing field, reused) | Vendors below this net payout are excluded from a batch and carried forward to the next run. |
| `autoPayoutEnabled` | `false` | Reserved for a future fully-automated flow. Currently unused by the batch cron — batches always land in `DRAFT` for manual admin review regardless of this flag. |

`payoutHoldHoursSnapshot` is stored on every `RevenueTransaction` (and
`VendorPayoutBatch`) at creation time, so changing `payoutHoldHours` later
never retroactively moves an already-calculated `payoutEligibleAt`.

---

## Settlement-Path Exclusivity

There are two payout mechanisms in this codebase that must never both claim
the same `RevenueTransaction`:

1. **Per-request flow** (pre-existing) — `PayoutService.processPendingEligiblePayouts()`
   (hourly), which auto-queues Stripe Connect transfers or schedules bank
   payouts as soon as a transaction becomes eligible, plus the
   `admin.payout.controller.ts` `/payout-requests` endpoints for manual
   vendor-initiated payout requests (`Payout` model).
2. **Monthly batch flow** (new) — `VendorPayoutBatch`, described above.

**Guard:** `processPendingEligiblePayouts()` checks
`AdminRevenueSettings.payoutFrequency` first. If it's `"monthly"`, the
function returns immediately without touching any transaction — eligible
transactions stay `payoutStatus: PENDING` until
`generateMonthlyPayoutBatches()` claims them (stamping `payoutBatchId` +
flipping to `PROCESSING`). If `payoutFrequency` is `daily`/`weekly`/`biweekly`,
the original per-request behavior is unchanged (backward compatible).

A `RevenueTransaction` already claimed by a batch
(`payoutBatchId` set) is excluded from future batch-generation runs by
construction (`payoutBatchId: { $exists: false }` filter).

---

## `VendorPayoutBatch` Lifecycle

```
   generateMonthlyPayoutBatches()
              │
              ▼
          ┌───────┐   approveBatch()   ┌──────────┐   markBatchPaid()   ┌──────┐
          │ DRAFT │ ─────────────────► │ APPROVED │ ──────────────────► │ PAID │  (locked)
          └───────┘                    └──────────┘                     └──────┘
              │                             │
              │ cancelBatch()               │ cancelBatch()
              ▼                             ▼
         ┌───────────┐   (unstamps included transactions — payoutBatchId cleared,
         │ CANCELLED │    payoutStatus reset to PENDING — eligible for a future batch)
         └───────────┘
```

- One non-cancelled batch per `(vendorId, periodStart, periodEnd)` — enforced
  by a unique partial index on `VendorPayoutBatch`.
- `PAID` batches cannot be cancelled or edited (admin correction flow is a
  documented follow-up, not yet built).
- Batch generation is **not** restricted to transactions dated within the
  period — any previously-eligible-but-unswept transaction (e.g. a vendor who
  was below `minimumPayoutAmount` last month) is picked up too. This is the
  carry-forward behavior.

### Admin API (`/api/admin/payouts`, admin/superadmin only)

| Method | Path | Purpose |
|---|---|---|
| GET | `/batches` | List batches by month / vendor / status |
| POST | `/batches/generate` | Generate draft batches for a period (defaults to previous calendar month) |
| GET | `/batches/:id` | Batch detail + included transactions |
| POST | `/batches/:id/approve` | Draft → Approved |
| POST | `/batches/:id/mark-paid` | Approved → Paid (requires `paymentMethod`, optional `transactionReference`) |
| POST | `/batches/:id/cancel` | Cancel a draft/approved batch |
| GET | `/batches/:id/export` | CSV or JSON export with per-transaction detail |

---

## Cron Schedule

| Job | Schedule | Function |
|---|---|---|
| Payout eligibility (per-request) | Hourly, `:00` | `PayoutService.processPendingEligiblePayouts` — no-ops if `payoutFrequency=monthly` |
| Scheduled bank payouts | Daily, 6 AM UTC | `PayoutService.processScheduledBankPayouts` |
| Commission backfill | Hourly, `:30` | `CommissionService.processUncommissionedOrders` |
| Subscription expiry safety-net | Hourly, `:00` | `subscriptionService.processExpiredSubscriptions` |
| **Monthly payout batch** | Daily, 7 AM UTC (self-gates on `payoutFrequency=monthly` + `monthlyPayoutDay`) | `PayoutService.generateMonthlyPayoutBatches` |
| Promotion expiry | Daily, midnight UTC | Event promotion cleanup (unrelated to payments) |

---

## Before / What Was Broken

This system replaced a design with two independent writers:

1. `Order.markAsPaid()` called `Order.createRevenueTransaction()` immediately
   on payment, computing commission via `Order.calculateAdminCommission()`.
   That method resolved the vendor with `User.findById(event.vendorId)` —
   but `event.vendorId` is a **`Vendor._id`**, not a `User._id`, so the lookup
   silently missed and fell back to a flat 5% commission on every order. It
   also hardcoded `payoutEligibleAt = now + 24h`.
2. `commission.service.calculateCommissionForOrder()` (the correct
   implementation — proper `Vendor.findById` lookup, subscription-aware
   zero-commission branch) only ran later, via the hourly backfill cron or a
   sync controller path — **never from the webhook**. Its
   `createRevenueTransaction` used `order.createdAt + 7 days`, disagreeing
   with path 1's `now + 24h`.
3. Their idempotency guards didn't share state: path 1 guarded on an in-doc
   `Order.adminCommission.revenueTransactionId` field; path 2 guarded on a DB
   `findOne({orderId})`. Depending on write order, this could produce a
   genuine duplicate `RevenueTransaction` for one order.
4. Since `payout.service.ts` sums `RevenueTransaction.vendorPayout` for every
   real payout, and path 1 ran first on every order, **vendor payouts were
   silently computed from the wrong (flat-5%, 24h-window) numbers** — the
   correct commission engine's output never reached the payout ledger.

Fixed by: making `commission.service` the sole writer, wiring it into the
webhook, adding DB-level unique indexes on `orderId` as a second guard, and
replacing both hardcoded windows with one admin-configurable
`payoutHoldHours` setting.

---

## Follow-Ups (Not Yet Done)

- `PaymentSettings.ts` (a separate, mostly-unused global singleton) stores
  **plaintext** `stripeSecretKey` / `paypalSecret`. It is read only by
  `admin.app-settings.controller.ts` and is not part of the live payment flow
  (which uses `Vendor.paymentSettings` / environment config). Encrypt at rest
  or remove.
- `payout.service.ts` resolves vendor data inconsistently across methods —
  some read `User.vendorPaymentSettings`, others read
  `Vendor.paymentSettings.stripeSettings`. Should be unified onto the
  `Vendor` model.
- `requireSubscription(feature)` enforcement middleware still does not exist
  (see `SUBSCRIPTION_MODEL.md`).
- Paid `VendorPayoutBatch` correction/reversal flow is not built — currently
  paid batches are permanently locked.
