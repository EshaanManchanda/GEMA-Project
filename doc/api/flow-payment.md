# Payment Flow

> Gema Event Management Platform
> Generated: 2026-02-25

---

## 1. Payment Routing Decision

The platform supports two payment modes for vendors/teachers:

```mermaid
flowchart TD
    A[Payment Intent Request] --> B{Fetch Vendor/Teacher}
    B -->|Not found| C[Error: Vendor or Teacher not found]
    B -->|Found| D{paymentMode == CUSTOM_STRIPE?}
    D -->|No| E[Platform Stripe + Commission]
    D -->|Yes| F{isSubscriptionActive?}
    F -->|No| E
    F -->|Yes| G{Has Stripe Connect OR Secret Key?}
    G -->|No| E
    G -->|Yes| H{Has Stripe Connect Account?}
    H -->|Yes| I[Use Platform Stripe\n→ Stripe Connect Transfer\ncommission = 0]
    H -->|No| J[Use Vendor Secret Key\n→ Vendor's Stripe account\ncommission = 0]
    E --> K[getEffectiveCommissionRate()]
    K --> L[Calculate in fils - integer math\nserviceFee = amount × rate / 100\nvendorPayout = amount - serviceFee]
```

---

## 2. Create Payment Intent Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant RL as paymentLimiter (10/hour)
    participant AM as authenticate()
    participant PC as PaymentController
    participant PS as PaymentService
    participant Stripe as Stripe API
    participant DB as MongoDB
    participant Redis as Redis

    C->>RL: POST /api/payments/create-intent
    RL-->>C: 429 Too many payment attempts
    RL->>AM: authenticate()
    AM-->>C: 401 Not authorized
    AM->>PC: createPaymentIntent()
    PC->>PS: PaymentService.getPaymentRouting(vendorId, amount)
    PS->>DB: Vendor.findById(vendorId) +paymentSettings.stripeSettings.stripeSecretKey
    alt Not found as vendor
        PS->>DB: Teacher.findById(vendorId)
    end
    PS-->>PC: PaymentRoutingInfo {usesVendorStripe, stripeInstance, commission}
    PC->>PS: PaymentService.createPaymentIntent(params)
    PS->>Stripe: stripe.paymentIntents.create({amount, currency, metadata})
    Stripe-->>PS: {clientSecret, paymentIntentId}
    PS->>DB: Order.findByIdAndUpdate({paymentIntentId})
    PS-->>PC: PaymentIntentResult
    PC-->>C: 200 {clientSecret, paymentIntentId}
```

---

## 3. Commission Calculation

```mermaid
flowchart LR
    A["amount (e.g. AED 100.00)"] --> B["× 100 → amountInFils (10000)"]
    B --> C["× commissionRate%\n→ serviceFeeInFils (Math.round)"]
    C --> D["÷ 100 → serviceFee (AED)"]
    D --> E["vendorPayout = amount - serviceFee"]
    E --> F["platformCommission = serviceFee"]
```

**Integer math in fils** (smallest AED unit) prevents floating-point rounding errors.

| Scenario | Commission | Notes |
|----------|-----------|-------|
| Platform Stripe (default) | `getEffectiveCommissionRate()` | From `CommissionConfig` model |
| Custom Stripe (subscribed) | 0% | Vendor pays subscription instead |

---

## 4. Stripe Webhook Flow

```mermaid
sequenceDiagram
    participant Stripe as Stripe
    participant WH as Webhook Handler
    participant DB as MongoDB
    participant TQ as TicketQueue (BullMQ)
    participant EQ as EmailQueue (BullMQ)

    Stripe->>WH: POST /api/payments/webhook
    WH->>WH: stripe.webhooks.constructEvent()\nverify signature
    WH-->>Stripe: 400 Invalid signature
    WH->>WH: Switch on event.type
    alt payment_intent.succeeded
        WH->>DB: Order.findOne({paymentIntentId})\nupdate paymentStatus='paid'
        WH->>DB: CommissionTransaction.create()
        WH->>TQ: Queue: generateTickets(orderId)
        WH->>EQ: Queue: sendOrderConfirmation(orderId)
        WH-->>Stripe: 200 OK
    else payment_intent.payment_failed
        WH->>DB: Order.update({paymentStatus: 'failed'})
        WH->>EQ: Queue: sendPaymentFailedEmail()
        WH-->>Stripe: 200 OK
    else charge.refunded
        WH->>DB: Order.update({paymentStatus: 'refunded'})
        WH-->>Stripe: 200 OK
    end
```

---

## 5. Vendor Payout Flow

```mermaid
sequenceDiagram
    participant Admin as Admin
    participant AC as AdminPayoutController
    participant PS as PayoutService
    participant SC as StripeConnectService
    participant Stripe as Stripe
    participant DB as MongoDB

    Admin->>AC: POST /api/admin/payouts/process
    AC->>PS: PayoutService.processPayout(vendorId, amount)
    PS->>DB: Vendor.findById(vendorId) — get stripeConnectAccountId
    PS->>DB: Check pending CommissionTransactions
    PS->>Stripe: stripe.transfers.create({amount, destination: connectAccountId})
    Stripe-->>PS: transfer object
    PS->>DB: Payout.create({vendorId, amount, stripeTransferId, status:'completed'})
    PS->>DB: RevenueTransaction.create() — audit log
    PS->>DB: CommissionTransactions.updateMany({status:'paid'})
    PS-->>AC: payout result
    AC-->>Admin: 200 Payout processed
```

---

## 6. Refund Flow

```mermaid
sequenceDiagram
    participant C as Client/Admin
    participant RC as RefundController
    participant RS as RefundService
    participant PS as PaymentService
    participant Stripe as Stripe
    participant DB as MongoDB (transaction)

    C->>RC: POST /api/orders/:id/refund
    RC->>RS: RefundService.processRefund({orderId, reason, initiatedBy, cancellationType})
    RS->>RS: startSession() + startTransaction()
    RS->>DB: Order.findById(orderId)
    RS->>RS: calculateRefundableAmount(order, cancellationType)
    Note over RS: Only subtotal is refundable\nserviceFee + tax = non-refundable
    RS->>PS: PaymentService.getStripeInstance(order)
    PS-->>RS: stripe instance (platform or vendor)
    RS->>Stripe: stripe.refunds.create({paymentIntent, amount: refundableInFils})
    Stripe-->>RS: refund object
    RS->>DB: Order.update({paymentStatus:'refunded', refundId})
    RS->>DB: CancellationLog.create({orderId, reason, refundAmount, initiatedBy})
    RS->>DB: commitTransaction()
    RS-->>RC: RefundResult {success, refundId, refundAmount, nonRefundableAmount}
    RC-->>C: 200 Refund processed
```

**Refund policy:**
- Refundable: `order.subtotal - couponDiscount`
- Non-refundable: `serviceFee + tax`
- `order.paymentStatus !== 'paid'` → `refundAmount: 0`

---

## 7. Multi-Currency Support

```mermaid
flowchart LR
    A[displayAmount in displayCurrency] --> B[CurrencyService.convert()]
    B --> C[amount in base currency AED]
    C --> D[convertToStripeAmount() → fils/cents integer]
    D --> E[stripe.paymentIntents.create amount]
```

`CreatePaymentIntentParams` includes `displayCurrency` and `displayAmount` for UI display while Stripe receives the converted base currency amount.

---

## 8. Key Models

| Model | Purpose |
|-------|---------|
| `Order` | Core order record — paymentStatus, paymentIntentId, subtotal, serviceFee, tax |
| `Payment` | Stripe payment record — paymentIntentId, chargeId, status |
| `CommissionTransaction` | Platform commission per order — linked to Order, Vendor, CommissionConfig |
| `RevenueTransaction` | Full audit log of all money movement |
| `Payout` | Vendor payout records — stripeTransferId, amount, status |
| `CommissionConfig` | Per-vendor commission rates (overrides global default) |
