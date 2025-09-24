# Payment Gateway Integration Files - GEMA Project

This document provides a comprehensive list of all files related to payment gateway integration in the GEMA event booking platform, organized by category and functionality.

## 📂 Backend Payment Integration

### Controllers
- **`backend/src/controllers/payment.controller.ts`**
  - Main payment controller handling Stripe payment intents
  - Functions: createPaymentIntent, confirmPayment, cancelPayment, processRefund
  - Webhook handling for Stripe events
  - Payment analytics and customer management

- **`backend/src/controllers/order.controller.ts`**
  - Order management and payment processing integration
  - Links orders with payment intents and transactions

### Services
- **`backend/src/services/payment.service.ts`**
  - Core payment service logic with Stripe integration
  - Payment routing (platform vs vendor Stripe accounts)
  - Payment intent creation, confirmation, and cancellation
  - Webhook event processing and customer management
  - Multi-currency support and amount conversion

- **`backend/src/services/payout.service.ts`**
  - Vendor payout management and commission handling

### Routes
- **`backend/src/routes/payment.routes.ts`**
  - API endpoints for payment operations
  - Routes: /create-intent, /confirm, /cancel, /refund, /webhook
  - Authentication and authorization middleware

- **`backend/src/routes/order.routes.ts`**
  - Order-related payment endpoints

### Models
- **`backend/src/models/Payment.ts`**
  - Payment data model with comprehensive payment tracking
  - Supports multiple gateways, payment methods, and statuses
  - Includes fraud detection, refunds, and webhook events

- **`backend/src/models/Order.ts`**
  - Order model with payment integration
  - Links to payment intents and transaction records

- **`backend/src/models/RevenueTransaction.ts`**
  - Revenue tracking and commission calculations

### Configuration
- **`backend/src/config/stripe.ts`**
  - Stripe SDK initialization and configuration
  - Environment-based key selection (test/live)
  - Currency mapping and amount conversion utilities
  - Key validation and security measures

- **`backend/src/config/env.ts`**
  - Environment configuration including Stripe keys

## 🎨 Frontend Payment Components

### Stripe Components
- **`frontend/src/components/payment/StripePaymentForm.tsx`**
  - Main Stripe payment form component
  - Uses Stripe Elements API for secure card input
  - Handles payment confirmation and error states

- **`frontend/src/components/payment/StripeElementsWrapper.tsx`**
  - Wrapper component for Stripe Elements provider
  - Manages Stripe instance initialization

- **`frontend/src/components/payment/StripePaymentElement.tsx`**
  - Individual Stripe payment element component
  - Customizable payment method selection

- **`frontend/src/components/payment/StripeConfigValidator.tsx`**
  - Validates Stripe configuration and keys
  - Development/testing utility component

### Payment Forms & UI
- **`frontend/src/components/booking/PaymentForm.tsx`**
  - Booking-specific payment form integration
  - Combines order details with payment processing

- **`frontend/src/components/forms/PaymentMethodForm.tsx`**
  - Form for managing saved payment methods
  - Add, edit, and delete payment methods

### Payment Pages
- **`frontend/src/pages/CheckoutPage.tsx`**
  - Complete checkout experience
  - Order summary, payment form, and confirmation

- **`frontend/src/pages/PaymentSuccessPage.tsx`**
  - Payment success confirmation page
  - Order details and next steps

- **`frontend/src/pages/PaymentCancelPage.tsx`**
  - Payment cancellation handling page

### Business Logic Components
- **`frontend/src/components/business/PaymentProcessor.tsx`**
  - Business logic for payment processing
  - Handles payment flows and state management

- **`frontend/src/components/display/PaymentHistory.tsx`**
  - User payment history display component
  - Transaction list and details

## 🔌 API Integration & Services

### API Layer
- **`frontend/src/services/api/paymentAPI.ts`**
  - Comprehensive payment API client
  - Functions for payment intents, methods, refunds, and analytics
  - TypeScript interfaces for all payment-related data
  - Utility functions for formatting and validation

- **`frontend/src/services/api/bookingAPI.ts`**
  - Booking API with payment integration

### State Management
- **`frontend/src/store/slices/paymentsSlice.ts`**
  - Redux slice for payment state management
  - Actions for payment operations and status tracking

- **`frontend/src/store/slices/bookingsSlice.ts`**
  - Booking state management with payment integration

### Utility Files
- **`frontend/src/utils/paymentConfig.ts`**
  - Payment configuration and settings
  - Gateway and method configurations

- **`frontend/src/utils/stripeConfig.ts`**
  - Frontend Stripe configuration utilities

- **`frontend/src/utils/currencyUtils.ts`**
  - Currency formatting and conversion utilities

- **`frontend/src/utils/environmentUtils.ts`**
  - Environment-specific payment configurations

## 🧪 Testing & Development

### Testing Components
- **`frontend/src/components/dev/PaymentTestRunner.tsx`**
  - Development component for testing payment flows
  - Simulates different payment scenarios

- **`frontend/src/utils/paymentTesting.ts`**
  - Payment testing utilities and mock data
  - Test scenarios for different payment states

### Development Tools
- **`frontend/src/utils/dateUtils.ts`**
  - Date utilities for payment-related operations

## 📚 Documentation & Configuration

### API Documentation
- **`backend/docs/api-reference/orders-payments.md`**
  - Comprehensive API documentation for payment endpoints
  - Request/response examples and error codes

### Configuration Files
- **`backend/.env.example`**
  - Environment variables template including Stripe keys
  - Payment gateway configuration examples

- **`frontend/.env.example`**
  - Frontend environment configuration for payments

## 🏗️ Payment Flow Architecture

### Payment Process Flow
1. **Order Creation** → `order.controller.ts`, `bookingAPI.ts`
2. **Payment Intent Creation** → `payment.service.ts`, `paymentAPI.ts`
3. **Frontend Payment Processing** → `StripePaymentForm.tsx`, `PaymentProcessor.tsx`
4. **Payment Confirmation** → `payment.controller.ts`, `payment.service.ts`
5. **Webhook Processing** → `payment.service.ts` (handleWebhook)
6. **Order Completion** → `order.controller.ts` (order confirmation and ticket generation)

### Key Integration Points

#### Stripe Integration
- **Backend**: Stripe SDK initialized in `stripe.ts`
- **Frontend**: Stripe Elements in payment components
- **Webhooks**: Real-time payment status updates
- **Security**: Environment-based key management

#### Multi-Gateway Support
- **Current**: Stripe (primary)
- **Architecture**: Extensible for additional gateways
- **Configuration**: Gateway-specific settings in config files

#### Payment Routing
- **Platform Payments**: Default Stripe account with service fees
- **Vendor Payments**: Optional vendor-specific Stripe accounts
- **Commission Handling**: Automatic calculation and distribution

## 🔐 Security Features

- **Key Validation**: Automatic Stripe key format validation
- **Environment Separation**: Test/live key management
- **Webhook Verification**: Stripe signature validation
- **PCI Compliance**: Stripe Elements for secure card handling
- **Fraud Prevention**: Built-in Stripe fraud detection

## 📈 Analytics & Reporting

### Payment Analytics Files
- **Backend**: `payment.controller.ts` (getPaymentAnalytics)
- **Frontend**: `PaymentHistory.tsx`, `AdminAnalytics.tsx`
- **Admin Dashboard**: Payment reporting and insights

## 🔄 State Management Flow

```
User Action → API Call (paymentAPI.ts) → Backend Controller → Service Layer → Stripe API
                 ↓
State Update (paymentsSlice.ts) ← Response Processing ← Backend Response ← Stripe Response
```

---

*This documentation covers all payment gateway integration files as of the current codebase state. For specific implementation details, refer to individual file comments and API documentation.*