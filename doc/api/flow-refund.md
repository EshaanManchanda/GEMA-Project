# Refund Flow

> Gema Event Management Platform
> Generated: 2026-02-25

---

## 1. Refund Policy

| Component | Refundable? | Notes |
|-----------|-------------|-------|
| Ticket price (subtotal − coupon) | Yes | Full amount refunded |
| Service fee | No | Platform revenue, non-refundable |
| Tax | No | Non-refundable |
| Coupon discount | N/A | Already deducted from subtotal |

**Condition:** `order.paymentStatus === 'paid'` required. Any other status returns `refundAmount: 0`.

---

## 2. Refund Amount Calculation

```mermaid
flowchart TD
    A[Order] --> B{paymentStatus == 'paid'?}
    B -->|No| C[Return: refundAmount=0, everything=0]
    B -->|Yes| D[serviceFee = order.serviceFee or 0]
    D --> E[tax = order.tax or 0]
    E --> F[ticketPrice = order.subtotal - couponDiscount]
    F --> G[nonRefundableAmount = serviceFee + tax]
    G --> H[refundAmount = Math.max 0, ticketPrice]
    H --> I[Return RefundCalculation]
```

---

## 3. Single Order Refund

```mermaid
sequenceDiagram
    participant Initiator as User/Admin
    participant RS as RefundService.processRefund()
    participant Mongo as MongoDB (session)
    participant PS as PaymentService
    participant Stripe as Stripe API

    Initiator->>RS: processRefund({orderId, reason, initiatedBy, cancellationType})
    RS->>Mongo: startSession() → startTransaction()
    RS->>Mongo: Order.findById(orderId).session(session)
    Mongo-->>RS: 404 Order not found → abort
    RS->>RS: calculateRefundableAmount(order, cancellationType)
    alt refundAmount == 0
        RS-->>Initiator: {success:false, refundAmount:0}
    end
    RS->>PS: resolve correct Stripe instance
    Note over PS: Vendor Stripe OR Platform Stripe\nbased on payment routing used at time of purchase
    RS->>Stripe: refunds.create({payment_intent, amount: refundAmountInFils})
    Stripe-->>RS: Stripe refund error → abort transaction
    RS->>Mongo: Order.findByIdAndUpdate({paymentStatus:'refunded', refundId, refundedAt})
    RS->>Mongo: CancellationLog.create({orderId, eventId, userId, reason, refundAmount, initiatedBy, cancellationType})
    RS->>Mongo: commitTransaction()
    RS-->>Initiator: RefundResult {success:true, refundId, refundAmount, nonRefundableAmount, serviceFee, tax}
```

---

## 4. Batch Refund (Event Cancellation)

```mermaid
sequenceDiagram
    participant Admin as Admin
    participant RS as RefundService.processEventRefunds()
    participant DB as MongoDB
    participant Stripe as Stripe

    Admin->>RS: processEventRefunds(eventId, reason)
    RS->>DB: Order.find({eventId, paymentStatus:'paid'})
    DB-->>RS: array of paid orders
    RS->>RS: Initialize BatchRefundResult counters
    loop For each order
        RS->>RS: processRefund({orderId, cancellationType:'event_cancelled'})
        alt success
            RS->>RS: successfulRefunds++, totalRefundAmount += amount
        else failure
            RS->>RS: failedRefunds++, log error
        end
    end
    RS-->>Admin: BatchRefundResult {totalOrders, successfulRefunds, failedRefunds, totalRefundAmount, results[]}
```

---

## 5. Cancellation Types

| Type | Triggered By | Notes |
|------|-------------|-------|
| `user_requested` | Customer via UI | Standard refund request |
| `event_cancelled` | Admin cancels event | Batch refund all paid orders |
| `admin_cancelled` | Admin cancels specific order | Manual override |

---

## 6. Error States

| Error Condition | Behavior |
|----------------|---------|
| Order not found | Transaction aborted, 404 returned |
| Order not paid | Returns `{success:true, refundAmount:0}` (no Stripe call) |
| Stripe refund fails | Transaction aborted, error propagated |
| Session commit fails | Full rollback — order + CancellationLog both reverted |

---

## 7. Data Written on Refund

**Order update:**
```
paymentStatus: 'refunded'
refundId: stripe_refund_id
refundedAt: Date
```

**CancellationLog created:**
```
orderId, eventId, userId
reason (string)
cancellationType: 'user_requested' | 'event_cancelled' | 'admin_cancelled'
initiatedBy (User ObjectId)
refundAmount (number)
```

---

## 8. Stripe Refund Details

- Amount sent to Stripe in **fils** (integer): `Math.round(refundAmount * 100)`
- Stripe `refunds.create` called on the original `paymentIntentId`
- Uses the **same Stripe instance** (platform or vendor) that processed the original payment
- Refund ID stored in Order for reconciliation
