---
module: Payout System
date: 2026-03-01
problem_type: workflow_issue
component: background_job
symptoms:
  - "Stripe vendors never received automatic payouts — every payout required manual admin approval"
  - "No 24hr refund window enforced — funds could theoretically be paid out before refund window closed"
  - "No PAYOUT BullMQ queue or worker — PayoutService.processStripeTransfer() was never called automatically"
  - "Bank vendors with weekly/monthly schedule had no mechanism to auto-create payout requests on due date"
root_cause: missing_workflow_step
resolution_type: code_fix
severity: high
tags: [payout, bullmq, cron, stripe-connect, refund-window, automation, vendor-payout]
---

# Troubleshooting: Payout Automation Missing — No Cron, No Queue, No Worker

## Problem

`PayoutService` had all the right methods (`processStripeTransfer`, `createPayoutRequest`,
`scheduleAutomaticPayouts`) but nothing ever called them automatically. Vendors could not
receive payouts without manual admin intervention, and there was no 24hr refund window
enforced before funds became payout-eligible.

## Environment

- Module: Payout System
- Stack: Node.js 20 / Express 4.18 / BullMQ 5.60 / node-cron
- Affected Component: `services/payout.service.ts`, `config/queue.ts`, `utils/cron.ts`, `workers/`
- Date: 2026-03-01

## Symptoms

- Admin had to manually trigger every Stripe payout — no automation
- `RevenueTransaction.payoutStatus` stayed `pending` indefinitely for Stripe vendors
- Bank vendors with a `payoutSchedule` set on their profile never had scheduled payout requests created
- No `payoutEligibleAt` field — no way to enforce the 24hr refund protection window
- `PAYOUT` was absent from `QUEUE_NAMES` and no worker existed for payout jobs
- Vendor dashboard showed `pendingBalance` but no indication of which funds were actually ready

## What Didn't Work

**Direct solution:** The problem was identified and implemented in one pass from a detailed plan.
No failed attempts — root cause was missing infrastructure (queue + worker + cron), not a bug.

## Solution

Nine changes across backend and frontend:

### 1. `RevenueTransaction.ts` — Add `payoutEligibleAt` field

```typescript
// In IRevenueTransaction interface:
payoutEligibleAt?: Date;

// In schema:
payoutEligibleAt: { type: Date, index: true }

// Compound index for cron query:
RevenueTransactionSchema.index({ payoutEligibleAt: 1, payoutStatus: 1 });
```

### 2. `Order.ts` — Set `payoutEligibleAt` when order pays

Inside `createRevenueTransaction()` (~line 852):

```typescript
payoutEligibleAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
```

### 3. `config/queue.ts` — Add PAYOUT queue

```typescript
export const QUEUE_NAMES = {
  // ...existing...
  PAYOUT: 'payout',
} as const;

export const payoutQueue = areQueuesDisabled ? null : new Queue(QUEUE_NAMES.PAYOUT, queueConfig);
```

Also added to `gracefulShutdown` and `getQueueByName`.

### 4. `workers/payout.worker.ts` — New BullMQ worker (created from scratch)

Handles two job types:

```typescript
case 'process-stripe-payout':
  // Calls PayoutService.processVendorPayout(vendorId, txIds, 'stripe')
  // Throws on failure → BullMQ retries

case 'create-bank-payout-request':
  // Calls PayoutService.createPayoutRequest(vendorId, amount)
  // Creates Payout doc for admin approval
```

### 5. `workers/index.ts` — Register payout worker

```typescript
import payoutWorker from './payout.worker';
// + startup log, shutdown handler
```

### 6. `services/payout.service.ts` — Two new methods

**`processPendingEligiblePayouts()`** (called hourly):

```typescript
// Find completed transactions past 24hr window still pending
const eligible = await RevenueTransaction.find({
  payoutEligibleAt: { $lte: now },
  payoutStatus: PayoutStatus.PENDING,
  status: TransactionStatus.COMPLETED
}).populate<{ vendorId: IVendor }>('vendorId');

// Per vendor:
// - Stripe vendor with stripeConnectAccountId → queue 'process-stripe-payout', mark PROCESSING
// - Bank vendor with payoutSchedule → set scheduledPayoutDate, mark SCHEDULED
// - Bank vendor no schedule → leave PENDING (eligibleBalance appears in dashboard)
```

**`processScheduledBankPayouts()`** (called daily 6AM):

```typescript
// Find SCHEDULED transactions whose scheduledPayoutDate has arrived
// → queue 'create-bank-payout-request' per vendor
```

Both methods use lazy import to avoid circular dependency:

```typescript
const { payoutQueue } = await import('../config/queue');
```

### 7. `utils/cron.ts` — Two new cron jobs

```typescript
export function startPayoutEligibilityCron() {
  // '0 * * * *' — hourly, UTC
  cron.schedule('0 * * * *', async () => {
    await PayoutService.processPendingEligiblePayouts();
  }, { timezone: 'UTC' });
}

export function startScheduledPayoutCron() {
  // '0 6 * * *' — daily 6AM UTC
  cron.schedule('0 6 * * *', async () => {
    await PayoutService.processScheduledBankPayouts();
  }, { timezone: 'UTC' });
}
```

### 8. `server.ts` — Start both cron jobs at startup

```typescript
import { startCollectionReconciliationCron, startPayoutEligibilityCron, startScheduledPayoutCron } from './utils/cron';

// In startup sequence:
startPayoutEligibilityCron();
startScheduledPayoutCron();
```

### 9. `controllers/vendor.payout.controller.ts` — Add `eligibleBalance` to dashboard

```typescript
const eligibleResult = await RevenueTransaction.aggregate([
  {
    $match: {
      vendorId: vendorDoc._id,
      payoutStatus: PayoutStatus.PENDING,
      status: TransactionStatus.COMPLETED,
      payoutEligibleAt: { $lte: now }
    }
  },
  { $group: { _id: null, total: { $sum: '$vendorPayout' } } }
]);
const eligibleBalance = eligibleResult[0]?.total || 0;

// Merged into response:
earnings: { ...earnings, eligibleBalance }
```

Frontend (`VendorPayoutsDashboard.tsx`) shows green badge when `eligibleBalance > 0`.

## Why This Works

1. **Root cause:** The service layer was complete but the automation layer (queue + worker + cron)
   was never wired up. `PayoutService` methods were callable but had no caller.

2. **`payoutEligibleAt`** gives the cron a precise, indexed field to query — no ambiguity about
   when the 24hr window closes. Set once at transaction creation, never mutated.

3. **Lazy `import('../config/queue')`** in `payout.service.ts` avoids circular imports
   (`queue.ts` → `payout.service.ts` → `queue.ts`) that would cause Node module resolution errors
   at startup.

4. **The flow:**
   ```
   Order paid
     └─ RevenueTransaction created (payoutEligibleAt = now+24h)

   [Hourly cron]
     └─ payoutEligibleAt <= now AND payoutStatus=pending
         ├─ Stripe vendor → queue Stripe transfer → PROCESSING
         └─ Bank vendor
             ├─ Has schedule → SCHEDULED with scheduledPayoutDate
             └─ No schedule → leave PENDING, eligibleBalance in dashboard

   [Daily 6AM cron]
     └─ scheduledPayoutDate <= now AND payoutStatus=SCHEDULED
         └─ queue bank payout request → admin approves
   ```

## Prevention

- When adding a BullMQ queue, always create the matching worker AND register it in `workers/index.ts`
  immediately — don't leave queues with no consumer.
- Cron jobs must be started explicitly in `server.ts`. Check `startCollectionReconciliationCron`
  as the canonical pattern.
- Any new `Queue` export in `config/queue.ts` must also be added to: `gracefulShutdown`,
  `getQueueByName`, and the `workers/index.ts` shutdown handler.
- Use `payoutEligibleAt` (not `createdAt + 24h` at query time) for the refund window — computed
  at-write is simpler and index-friendly.
- Lazy import (`await import(...)`) for queue inside service methods to avoid circular dep issues.

## Related Issues

No related issues documented yet.
