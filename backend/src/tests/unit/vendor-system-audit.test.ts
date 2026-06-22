/**
 * Vendor System Audit — Test Cases
 *
 * Covers: registration flow, event CRUD, payment/payout, dashboard,
 * auth/RBAC, edge cases, and security concerns discovered during audit.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * AUDIT FINDINGS SUMMARY (2026-06-21)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ CRITICAL ISSUES                                                     │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ C1. [SECURITY] Employee creation stores raw password in            │
 * │     passwordHash field — vendor.service.ts:1208                    │
 * │     `passwordHash: tempPassword` — should be hashed via bcrypt.    │
 * │     Any DB read leaks plaintext employee credentials.              │
 * │                                                                     │
 * │ C2. [SECURITY] vendor.payment.routes.ts lacks `authorize()`       │
 * │     middleware — only `authenticate` is applied. Any logged-in     │
 * │     user (customer, student) can access vendor payment settings,   │
 * │     Stripe Connect onboarding, subscription management, and       │
 * │     bank account updates.                                          │
 * │                                                                     │
 * │ C3. [SECURITY] vendor.payment.controller.ts uses raw              │
 * │     `require("stripe")` with vendor secret key at line 348.       │
 * │     If the key validation call throws non-Stripe errors, the      │
 * │     secret key may persist in error logs. Also, `require` inside  │
 * │     a function body = no tree-shaking + potential import failure.  │
 * │                                                                     │
 * │ C4. [SECURITY] updateVendorBooking accepts `req.body` without     │
 * │     validation middleware — vendor.routes.ts:178. Vendor can       │
 * │     inject arbitrary fields into Order document.                   │
 * │                                                                     │
 * │ C5. [SECURITY] importBookings creates User accounts without       │
 * │     email verification or password — vendor.service.ts:615-621.   │
 * │     Auto-created users have no auth credentials, making them      │
 * │     orphaned accounts. Also no rate limiting on import endpoint.   │
 * │                                                                     │
 * │ C6. [SECURITY] Hard delete of employee also sets User status to   │
 * │     'inactive' — vendor.service.ts:1357. If user has other roles  │
 * │     or is used elsewhere, this breaks their account.              │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ HIGH ISSUES                                                        │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ H1. [BUG] Stripe Connect onboarding returns placeholder URL       │
 * │     "https://connect.stripe.com/setup/placeholder" from           │
 * │     vendor.service.ts:1768. Real implementation is in              │
 * │     vendor.payment.controller.ts. Two competing endpoints exist:  │
 * │     POST /api/vendors/stripe-connect/onboard (placeholder)        │
 * │     POST /api/vendors/payment-settings/stripe/connect (real)      │
 * │                                                                     │
 * │ H2. [BUG] VendorRoute.tsx only checks `user.role !== 'vendor'`    │
 * │     — doesn't handle multi-role users or role-switching.          │
 * │     If user switches from vendor to customer, vendor dashboard    │
 * │     still accessible until page reload.                           │
 * │                                                                     │
 * │ H3. [BUG] Dashboard shows revenue with `$` prefix                 │
 * │     (VendorDashboardPage.tsx:212,216,244) but platform uses AED.  │
 * │     Currency symbol is hardcoded, not derived from data.          │
 * │                                                                     │
 * │ H4. [BUG] getAllPublicVendors hardcodes `rating: 4.5` for all     │
 * │     vendors — vendor.service.ts:889. Fake trust signal.           │
 * │                                                                     │
 * │ H5. [BUG] getOrCreateVendorProfile auto-creates vendor profile    │
 * │     with placeholder data ("Not provided" address, empty phone).  │
 * │     This means any authenticated vendor-role user automatically   │
 * │     gets a vendor profile even without completing registration.   │
 * │                                                                     │
 * │ H6. [BUG] Publish button on dashboard (line 328) has no onClick   │
 * │     handler — it does nothing.                                    │
 * │                                                                     │
 * │ H7. [BUG] Employee ID generation uses count-based approach        │
 * │     `EMP-${count+1}` — vendor.service.ts:1232. Race condition     │
 * │     if two employees created concurrently → duplicate IDs.        │
 * │                                                                     │
 * │ H8. [BUG] updateVendorEvent allows vendor to set `status` to     │
 * │     any value including 'published' — bypassing admin approval.   │
 * │     vendor.event.controller.ts:317.                               │
 * │                                                                     │
 * │ H9. [BUG] CSV export doesn't escape commas/quotes in field       │
 * │     values — vendor.service.ts:411-434. CSV injection possible.   │
 * │                                                                     │
 * │ H10. [BUG] Bank account details (accountNumber, IBAN) stored in  │
 * │      plain text — vendor.service.ts:1651. Should be encrypted    │
 * │      at rest. Returned in full to frontend via payout controller. │
 * │                                                                     │
 * │ H11. [BUG] vendorAPI.ts `saveStripeApiKeys` POSTs to             │
 * │      `/vendors/stripe-keys` but backend route is PUT at           │
 * │      `/vendors/payment-settings/stripe/keys` — endpoint mismatch │
 * │      means saving Stripe keys from frontend always 404s.         │
 * │                                                                     │
 * │ H12. [BUG] vendorAPI.ts `validateStripeApiKeys` calls            │
 * │      `/vendors/stripe-keys/validate` — no such backend route     │
 * │      exists. Dead code.                                           │
 * │                                                                     │
 * │ H13. [BUG] vendorAPI.ts `getClaimedEvents` and                   │
 * │      `getClaimedVenues` call `/vendor/claimed-events` and        │
 * │      `/vendor/claimed-venues` — no such routes exist. The        │
 * │      vendor routes are at `/api/vendors/...` not `/api/vendor/`.  │
 * │                                                                     │
 * │ H14. [BUG] Redundant `authenticate` on participants export       │
 * │      route — vendor.routes.ts:150 adds `authenticate` again      │
 * │      after line 93 already applies it via `router.use()`.        │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ MEDIUM ISSUES                                                      │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ M1. [VALIDATION] Bank details validator marks all fields optional │
 * │     — vendor.validator.ts:110-154. Service requires 4 mandatory   │
 * │     fields but validator won't catch missing ones.               │
 * │                                                                     │
 * │ M2. [VALIDATION] No validation middleware on event create/update  │
 * │     routes — vendor.routes.ts:115,129. All validation is inline   │
 * │     in controller, inconsistent with other routes.               │
 * │                                                                     │
 * │ M3. [VALIDATION] Social media validator validates top-level       │
 * │     `body("facebook")` but controller sends                      │
 * │     `req.body.socialMedia` object. Validator checks wrong path.  │
 * │                                                                     │
 * │ M4. [PERF] getBookings fetches ALL vendor events twice:          │
 * │     once for eventIds filter, once for response. Could use       │
 * │     Event.distinct('_id') like getBookingById does.              │
 * │                                                                     │
 * │ M5. [PERF] getDashboardStats runs 5 DB queries sequentially      │
 * │     (via 2 Promise.all blocks). vendorEvents fetch is redundant  │
 * │     since eventIds could come from the count query.              │
 * │                                                                     │
 * │ M6. [UX] Registration skip-verification flow navigates to        │
 * │     /vendor without checking if vendor profile was actually      │
 * │     created server-side. May hit getOrCreateVendorProfile with   │
 * │     incomplete data.                                              │
 * │                                                                     │
 * │ M7. [CONSISTENCY] vendor.payout.routes.ts uses string literal     │
 * │     `authorize(["vendor"])` while vendor.routes.ts uses enum      │
 * │     `authorize([UserRole.VENDOR])`. Should be consistent.        │
 * │                                                                     │
 * │ M8. [BUG] vendorAPI.getVendorEvents inconsistently unwraps       │
 * │     response — tries `data.data.events || data.events` but       │
 * │     backend sends `{ data: { events } }` inside `{ success,     │
 * │     data }`. Triple nesting issue.                               │
 * │                                                                     │
 * │ M9. [BUG] vendorAPI.checkServiceFee calls POST                   │
 * │     `/vendors/check-service-fee` — no such backend route.        │
 * │                                                                     │
 * │ M10. [BUG] vendorAPI.applyForVendor calls POST `/vendors/apply`  │
 * │      — no such backend route exists.                             │
 * │                                                                     │
 * │ M11. [BUG] vendorAPI.getFeaturedVendors calls GET                │
 * │      `/vendors/featured` — no such backend route exists.         │
 * └─────────────────────────────────────────────────────────────────────┘
 */

// ═══════════════════════════════════════════════════════════════════════
// TEST CASES — organized by flow
// ═══════════════════════════════════════════════════════════════════════

describe("VENDOR SYSTEM AUDIT — Test Cases", () => {
  // ─── VENDOR REGISTRATION FLOW ──────────────────────────────────────

  describe("Registration Flow", () => {
    describe("VendorRegisterPage (frontend)", () => {
      it("TC-REG-01: should validate firstName is non-empty", () => {
        // Given: empty firstName
        // When: form submitted
        // Then: error "First name is required" shown
        // Verify: validateStep1Form() returns false
      });

      it("TC-REG-02: should validate lastName is non-empty", () => {
        // Given: empty lastName
        // When: form submitted
        // Then: error "Last name is required" shown
      });

      it("TC-REG-03: should validate email format", () => {
        // Given: email = "not-an-email"
        // When: form submitted
        // Then: error "Email is invalid" shown
      });

      it("TC-REG-04: should enforce password complexity (8+ chars, upper, lower, number, special)", () => {
        // Given: password = "weak"
        // When: form submitted
        // Then: appropriate password error shown
      });

      it("TC-REG-05: should reject mismatched passwords", () => {
        // Given: password = "Valid@123" confirmPassword = "Different@456"
        // When: form submitted
        // Then: error "Passwords do not match"
      });

      it("TC-REG-06: should validate phone number length (7-14 digits)", () => {
        // Given: phoneNumber = "123" (too short)
        // When: form submitted
        // Then: error about phone length
      });

      it("TC-REG-07: should require terms acceptance", () => {
        // Given: agreeToTerms = false
        // When: form submitted
        // Then: error about terms
      });

      it("TC-REG-08: should dispatch registerUser with role='vendor' hardcoded", () => {
        // Given: valid form data
        // When: submitted
        // Then: registerUser called with { role: 'vendor', ... }
        // SECURITY: verify role cannot be overridden from form
      });

      it("TC-REG-09: should advance to OTP step after successful registration", () => {
        // Given: registerUser resolves
        // When: step1 submitted successfully
        // Then: currentStep === 2, OTP form displayed
      });

      it("TC-REG-10: should validate OTP is exactly 4 digits", () => {
        // Given: otp = "12" (too short)
        // When: OTP form submitted
        // Then: error "Please enter a valid 4-digit OTP"
      });

      it("TC-REG-11: should allow skip verification and navigate to /vendor", () => {
        // Given: OTP step shown
        // When: "Skip Verification" clicked
        // Then: navigate('/vendor') called with info message
        // ISSUE M6: may cause problems with unverified vendor access
      });

      it("TC-REG-12: should handle resend OTP", () => {
        // Given: OTP step shown
        // When: "Resend Code" clicked
        // Then: resendVerificationEmail dispatched with email
      });
    });

    describe("getOrCreateVendorProfile (backend)", () => {
      it("TC-REG-13: should return existing vendor profile if found", () => {
        // Given: Vendor document exists for userId
        // When: getOrCreateVendorProfile(userId)
        // Then: returns existing vendor without creating new one
      });

      it("TC-REG-14: should auto-create vendor profile with defaults for vendor-role user", () => {
        // Given: User with role='vendor' exists, no Vendor document
        // When: getOrCreateVendorProfile(userId)
        // Then: creates Vendor with:
        //   businessName = "{firstName} {lastName}'s Business"
        //   address.street = "Not provided"
        //   paymentMode = PLATFORM_STRIPE
        //   verificationStatus = UNVERIFIED
      });

      it("TC-REG-15: should throw if user is not a vendor", () => {
        // Given: User with role='customer'
        // When: getOrCreateVendorProfile(userId)
        // Then: throws "User is not a vendor"
      });

      it("TC-REG-16: should throw if userId doesn't exist", () => {
        // Given: non-existent userId
        // When: getOrCreateVendorProfile(userId)
        // Then: throws "User not found"
      });
    });
  });

  // ─── VENDOR EVENT FLOW ─────────────────────────────────────────────

  describe("Event Flow", () => {
    describe("createVendorEvent", () => {
      it("TC-EVT-01: should require title, description, category", () => {
        // Given: req.body missing title
        // When: POST /api/vendors/events
        // Then: 400 "Title, description, and category are required"
      });

      it("TC-EVT-02: should require location with city and address", () => {
        // Given: location = { city: "" }
        // When: POST /api/vendors/events
        // Then: 400 "Location details (city, address) are required"
      });

      it("TC-EVT-03: should require at least one dateSchedule", () => {
        // Given: dateSchedule = []
        // When: POST /api/vendors/events
        // Then: 400 "At least one date schedule is required"
      });

      it("TC-EVT-04: should validate category exists in DB", () => {
        // Given: category = "nonexistent-category"
        // When: POST /api/vendors/events
        // Then: 400 "Invalid category"
      });

      it("TC-EVT-05: should require externalBookingLink for affiliate events", () => {
        // Given: isAffiliateEvent = true, externalBookingLink = undefined
        // When: POST /api/vendors/events
        // Then: 400 "External booking link is required for affiliate events"
      });

      it("TC-EVT-06: should set isApproved=false, status='draft' for new events", () => {
        // Given: valid event data
        // When: POST /api/vendors/events
        // Then: event.isApproved === false, event.status === 'draft'
        // CRITICAL: vendor events need admin approval
      });

      it("TC-EVT-07: should set price=0 when isFreeEvent=true", () => {
        // Given: isFreeEvent = true, price = 100
        // When: POST /api/vendors/events
        // Then: event.price === 0
      });

      it("TC-EVT-08: should handle unlimitedSeats by setting 999999", () => {
        // Given: dateSchedule[0].unlimitedSeats = true
        // When: POST /api/vendors/events
        // Then: schedule.availableSeats === 999999, schedule.totalSeats === 999999
      });

      it("TC-EVT-09: should set vendorId to Vendor._id, NOT User._id", () => {
        // Given: authenticated vendor
        // When: POST /api/vendors/events
        // Then: event.vendorId === vendorProfile._id (Vendor doc ID)
      });
    });

    describe("updateVendorEvent", () => {
      it("TC-EVT-10: should verify vendor ownership before update", () => {
        // Given: event belongs to different vendor
        // When: PUT /api/vendors/events/:id
        // Then: 404 "Event not found or you do not have permission"
      });

      it("TC-EVT-11: [ISSUE H8] should NOT allow vendor to set status='published' directly", () => {
        // Given: event in 'draft' status
        // When: PUT /api/vendors/events/:id { status: 'published' }
        // Then: CURRENTLY PASSES (BUG) — should be rejected
        // FIX: add status whitelist, prevent vendor from bypassing admin approval
      });

      it("TC-EVT-12: should allow updating title, description, location", () => {
        // Given: existing event owned by vendor
        // When: PUT with { title: "New Title" }
        // Then: event.title updated, other fields unchanged
      });

      it("TC-EVT-13: should validate category on update if provided", () => {
        // Given: category = "fake-category"
        // When: PUT /api/vendors/events/:id
        // Then: 400 "Invalid category"
      });
    });

    describe("deleteVendorEvent", () => {
      it("TC-EVT-14: should soft-delete by default (isDeleted=true, status='archived')", () => {
        // Given: active event owned by vendor
        // When: DELETE /api/vendors/events/:id
        // Then: event.isDeleted=true, event.status='archived', still in DB
      });

      it("TC-EVT-15: should permanently delete when ?permanent=true", () => {
        // Given: event owned by vendor
        // When: DELETE /api/vendors/events/:id?permanent=true
        // Then: event removed from DB entirely
      });

      it("TC-EVT-16: should verify ownership before delete", () => {
        // Given: event belongs to other vendor
        // When: DELETE /api/vendors/events/:id
        // Then: 404
      });
    });

    describe("restoreVendorEvent", () => {
      it("TC-EVT-17: should restore soft-deleted event to 'draft' status", () => {
        // Given: event with isDeleted=true
        // When: PUT /api/vendors/events/:id/restore
        // Then: isDeleted=false, status='draft'
      });

      it("TC-EVT-18: should 404 if event not deleted", () => {
        // Given: active event (isDeleted=false)
        // When: PUT /api/vendors/events/:id/restore
        // Then: 404 "Event not found or already restored"
      });
    });

    describe("getVendorEvents", () => {
      it("TC-EVT-19: should only return events for authenticated vendor's Vendor._id", () => {
        // Given: vendor with 3 events, other vendor with 2 events
        // When: GET /api/vendors/events
        // Then: returns only 3 events
      });

      it("TC-EVT-20: should include soft-deleted events in list (getEvents doesn't filter isDeleted)", () => {
        // NOTE: getEvents uses Event.find({ vendorId }) without isDeleted filter
        // This may be intentional (vendor can see archived events) but inconsistent
        // with getVendorEventById which filters isDeleted: false
      });
    });
  });

  // ─── VENDOR PAYMENT/PAYOUT SYSTEM ──────────────────────────────────

  describe("Payment System", () => {
    describe("Payment Routes Auth", () => {
      it("TC-PAY-01: [CRITICAL C2] payment-settings routes should require vendor role", () => {
        // Given: authenticated user with role='customer'
        // When: GET /api/vendors/payment-settings/overview
        // Then: CURRENTLY 200 (BUG) — should be 403
        // FIX: add authorize([UserRole.VENDOR]) to vendor.payment.routes.ts
      });

      it("TC-PAY-02: payout routes correctly require vendor role", () => {
        // Given: vendor.payout.routes.ts has authorize(["vendor"])
        // When: customer calls GET /api/vendors/payouts/dashboard
        // Then: 403 Forbidden (correct)
      });
    });

    describe("Stripe Connect", () => {
      it("TC-PAY-03: [ISSUE H1] should NOT return placeholder URL from /stripe-connect/onboard", () => {
        // Given: vendor calls initializeStripeConnect
        // When: POST /api/vendors/stripe-connect/onboard
        // Then: returns "https://connect.stripe.com/setup/placeholder" (BUG)
        // FIX: remove placeholder endpoint or redirect to real one
      });

      it("TC-PAY-04: real Stripe Connect via /payment-settings/stripe/connect should validate URLs", () => {
        // Given: returnUrl = "https://evil.com/steal"
        // When: POST /api/vendors/payment-settings/stripe/connect
        // Then: 400 "returnUrl must point to an allowed origin"
      });

      it("TC-PAY-05: should require both returnUrl and refreshUrl", () => {
        // Given: missing refreshUrl
        // When: POST /api/vendors/payment-settings/stripe/connect
        // Then: 400 "returnUrl and refreshUrl are required"
      });
    });

    describe("Stripe Keys", () => {
      it("TC-PAY-06: should validate publishable key prefix matches mode", () => {
        // Given: testMode=true, publishableKey="pk_live_xxx"
        // When: PUT /api/vendors/payment-settings/stripe/keys
        // Then: 400 "Expected to start with pk_test_"
      });

      it("TC-PAY-07: should validate secret key prefix matches mode", () => {
        // Given: testMode=false, secretKey="sk_test_xxx"
        // When: PUT /api/vendors/payment-settings/stripe/keys
        // Then: 400 "Expected to start with sk_live_"
      });

      it("TC-PAY-08: [ISSUE H11] frontend saveStripeApiKeys POSTs to wrong endpoint", () => {
        // vendorAPI.saveStripeApiKeys → POST /vendors/stripe-keys
        // Backend expects → PUT /vendors/payment-settings/stripe/keys
        // This call will always 404
      });

      it("TC-PAY-09: [ISSUE H12] frontend validateStripeApiKeys calls non-existent endpoint", () => {
        // vendorAPI.validateStripeApiKeys → POST /vendors/stripe-keys/validate
        // No such route exists in backend
      });
    });

    describe("Payment Mode Switch", () => {
      it("TC-PAY-10: should reject switch to custom_stripe if not verified", () => {
        // Given: vendor with verificationStatus='unverified'
        // When: POST /payment-settings/payment-mode { paymentMode: 'custom_stripe' }
        // Then: 400 "Cannot switch to custom Stripe"
      });

      it("TC-PAY-11: should reject switch if suspended", () => {
        // Given: vendor.isSuspended = true
        // When: switch to custom_stripe
        // Then: 400
      });

      it("TC-PAY-12: should create pending subscription on switch to custom_stripe", () => {
        // Given: verified, active vendor with Stripe Connect
        // When: switch to custom_stripe
        // Then: subscriptionService.createSubscription called
        //       subscriptionStatus = PENDING
      });
    });

    describe("Subscription", () => {
      it("TC-PAY-13: should create Checkout Session for subscription", () => {
        // Given: vendor in custom_stripe mode, no active subscription
        // When: POST /payment-settings/subscription/checkout
        // Then: returns { url } pointing to Stripe Checkout
      });

      it("TC-PAY-14: should reject checkout if already has active subscription", () => {
        // Given: stripeSubscriptionStatus = 'active'
        // When: POST /payment-settings/subscription/checkout
        // Then: 400 "already has an active subscription"
      });

      it("TC-PAY-15: should fail if STRIPE_VENDOR_SUBSCRIPTION_PRICE_ID not set", () => {
        // Given: config.stripe.vendorSubscriptionPriceId = undefined
        // When: createCheckoutSession
        // Then: 500 "Stripe vendor subscription price is not configured"
      });

      it("TC-PAY-16: should create Billing Portal session", () => {
        // Given: vendor with stripeCustomerId
        // When: POST /payment-settings/subscription/portal
        // Then: returns { url } pointing to Stripe Portal
      });

      it("TC-PAY-17: should reject portal if no Stripe customer", () => {
        // Given: no stripeCustomerId on vendor
        // When: POST /payment-settings/subscription/portal
        // Then: 400 "No Stripe customer found"
      });

      it("TC-PAY-18: cancel should set cancel_at_period_end if Stripe sub exists", () => {
        // Given: vendor with stripeSubscriptionId
        // When: POST /payment-settings/subscription/cancel
        // Then: stripe.subscriptions.update({ cancel_at_period_end: true })
        //       vendor still active until period end
      });

      it("TC-PAY-19: cancel should downgrade immediately if no Stripe sub", () => {
        // Given: vendor with no stripeSubscriptionId (manual/legacy)
        // When: cancel
        // Then: subscriptionStatus = INACTIVE, paymentMode = PLATFORM_STRIPE
      });
    });

    describe("Payouts", () => {
      it("TC-PAY-20: should return earnings with eligibleBalance from RevenueTransaction", () => {
        // Given: vendor with completed transactions past 24hr refund window
        // When: GET /api/vendors/payouts/dashboard
        // Then: data.earnings.eligibleBalance reflects sum of eligible payouts
      });

      it("TC-PAY-21: should only allow cancelling PENDING payout requests", () => {
        // Given: payout with status='approved'
        // When: DELETE /api/vendors/payouts/requests/:id
        // Then: 400 "Only pending payout requests can be cancelled"
      });

      it("TC-PAY-22: should verify payout belongs to requesting vendor", () => {
        // Given: payout belongs to different vendor
        // When: GET /api/vendors/payouts/requests/:id
        // Then: 404 "Payout request not found"
      });
    });

    describe("Bank Account", () => {
      it("TC-PAY-23: [ISSUE M1] bank details validator marks all fields optional", () => {
        // Given: POST with empty body {}
        // When: PUT /api/vendors/bank-details
        // Then: validator passes, service throws 400 for missing required fields
        // FIX: make accountHolderName, bankName, accountNumber, country required
      });

      it("TC-PAY-24: [ISSUE H10] bank account number stored in plain text", () => {
        // Given: accountNumber = "1234567890"
        // When: updateBankDetails called
        // Then: stored as-is in MongoDB (no encryption)
        // FIX: encrypt sensitive fields at rest
      });

      it("TC-PAY-25: should validate IBAN format", () => {
        // Given: iban = "INVALID"
        // When: PUT /api/vendors/bank-details
        // Then: rejected by validator regex
      });

      it("TC-PAY-26: should validate SWIFT code format", () => {
        // Given: swiftCode = "123"
        // When: PUT /api/vendors/bank-details
        // Then: rejected by validator regex
      });
    });

    describe("Commission Calculator", () => {
      it("TC-PAY-27: should calculate correct breakeven point", () => {
        // Given: commissionRate = 5%, subscriptionCost = 150
        // When: monthlyRevenue = 3000
        // Then: breakEvenPoint = (150/5)*100 = 3000
        //       commissionCost = 150, same as subscription
        //       savings = 0
      });

      it("TC-PAY-28: should recommend custom_stripe when commission > subscription", () => {
        // Given: monthlyRevenue = 5000, commissionRate = 5%
        // When: calculate
        // Then: commissionCost=250 > subscriptionCost=150
        //       recommendation = 'custom_stripe'
      });

      it("TC-PAY-29: should reject negative monthlyRevenue", () => {
        // Given: monthlyRevenue = -100
        // When: POST /payment-settings/commission/calculate
        // Then: 400 "Valid monthly revenue is required"
      });
    });
  });

  // ─── VENDOR DASHBOARD ──────────────────────────────────────────────

  describe("Dashboard", () => {
    describe("getDashboardStats", () => {
      it("TC-DASH-01: should return correct totalEvents and activeEvents counts", () => {
        // Given: vendor with 5 events, 3 active+approved
        // When: GET /api/vendors/stats
        // Then: totalEvents=5, activeEvents=3
      });

      it("TC-DASH-02: should calculate revenue from Order aggregate", () => {
        // Given: orders with items matching vendor's eventIds
        // When: GET /api/vendors/stats
        // Then: totalRevenue = sum of all order.total
      });

      it("TC-DASH-03: should handle vendor with zero events/bookings", () => {
        // Given: new vendor, no events
        // When: GET /api/vendors/stats
        // Then: all stats = 0, no errors
      });

      it("TC-DASH-04: [ISSUE H3] dashboard shows $ but should show AED", () => {
        // VendorDashboardPage.tsx lines 212, 216, 244
        // Hardcoded "${stats.totalRevenue}" instead of "AED {stats.totalRevenue}"
      });
    });

    describe("VendorDashboardPage (frontend)", () => {
      it("TC-DASH-05: should handle API errors gracefully", () => {
        // Given: API throws error
        // When: dashboard loads
        // Then: error message shown, events/bookings/stats set to empty/null
      });

      it("TC-DASH-06: [ISSUE H6] Publish button should have onClick handler", () => {
        // Given: event with status='draft'
        // When: "Publish" button rendered
        // Then: button has no onClick — does nothing (BUG)
      });

      it("TC-DASH-07: should handle division by zero in growth calculation", () => {
        // Given: revenueLastMonth = 0
        // When: growth percentage calculated
        // Then: shows "N/A" (correct handling exists)
      });

      it("TC-DASH-08: should display event thumbnail from imageAssets first, images fallback", () => {
        // Given: event with imageAssets = [{ url: "https://..." }]
        // When: getEventThumbnail called
        // Then: returns imageAssets[0].url
      });
    });
  });

  // ─── AUTH & RBAC ───────────────────────────────────────────────────

  describe("Auth & RBAC", () => {
    it("TC-AUTH-01: vendor.routes.ts should apply authenticate + authorize([VENDOR]) to protected routes", () => {
      // Given: vendor.routes.ts line 93-94
      // When: non-vendor user calls GET /api/vendors/stats
      // Then: 403 Forbidden
    });

    it("TC-AUTH-02: [CRITICAL C2] vendor.payment.routes.ts only has authenticate, no authorize", () => {
      // Given: customer user logged in
      // When: GET /api/vendors/payment-settings/overview
      // Then: CURRENTLY succeeds (BUG) — should 403
    });

    it("TC-AUTH-03: public vendor routes should work without auth", () => {
      // GET /api/vendors — public vendor list
      // GET /api/vendors/public/:id — public profile
      // GET /api/vendors/:vendorId/payment-info — payment info for checkout
      // These are before router.use(authenticate) — correct
    });

    it("TC-AUTH-04: VendorRoute component should check role='vendor'", () => {
      // Given: user.role = 'customer'
      // When: VendorRoute renders
      // Then: Navigate to /login
    });

    it("TC-AUTH-05: [ISSUE H2] VendorRoute doesn't handle role switching", () => {
      // Given: user was vendor, switched role to customer
      // When: VendorRoute checks state
      // Then: may still show vendor dashboard if state not refreshed
    });
  });

  // ─── EMPLOYEE MANAGEMENT ───────────────────────────────────────────

  describe("Employee Management", () => {
    it("TC-EMP-01: [CRITICAL C1] should hash password before storing", () => {
      // Given: new employee creation, user doesn't exist
      // When: createEmployee called
      // Then: CURRENTLY stores `passwordHash: tempPassword` (PLAINTEXT!)
      // FIX: hash with bcrypt before User.create
    });

    it("TC-EMP-02: should check for duplicate employee email", () => {
      // Given: employee with email "test@test.com" already exists
      // When: createEmployee with same email
      // Then: 400 "Employee with this email already exists"
    });

    it("TC-EMP-03: should upgrade customer to employee role if user exists as customer", () => {
      // Given: User exists with role='customer'
      // When: createEmployee with that email
      // Then: user.role changed to EMPLOYEE
    });

    it("TC-EMP-04: should reject if existing user has non-employee/customer role", () => {
      // Given: User exists with role='admin'
      // When: createEmployee with that email
      // Then: 400 "User with this email already has a different role"
    });

    it("TC-EMP-05: [ISSUE H7] employee ID race condition", () => {
      // Given: 2 concurrent createEmployee calls
      // When: both count = 5
      // Then: both get EMP-00006 (DUPLICATE)
      // FIX: use atomic counter or UUID
    });

    it("TC-EMP-06: [CRITICAL C6] hard delete should not deactivate user if they have other roles", () => {
      // Given: user is employee AND has bookings as customer
      // When: deleteEmployee(hard=true)
      // Then: CURRENTLY sets user.status='inactive' regardless (BUG)
      // FIX: check if user has other active associations
    });

    it("TC-EMP-07: should send welcome email with temp password on creation", () => {
      // Given: new user created for employee
      // When: createEmployee succeeds
      // Then: emailService.sendEmployeeWelcomeEmail called with tempPassword
    });

    it("TC-EMP-08: should not fail if welcome email fails", () => {
      // Given: email service throws
      // When: createEmployee
      // Then: employee still created, error only logged
    });

    it("TC-EMP-09: assign-event should use transaction for atomicity", () => {
      // Given: valid employee and events
      // When: assignEmployeeToEvent called
      // Then: uses mongoose session + transaction
    });

    it("TC-EMP-10: assign-event should validate all event IDs are valid ObjectIds", () => {
      // Given: eventIds = ["not-valid-id"]
      // When: assignEmployeeToEvent
      // Then: 400 "Invalid event IDs: not-valid-id"
    });

    it("TC-EMP-11: assign-event should verify events belong to vendor", () => {
      // Given: eventId belongs to different vendor
      // When: assignEmployeeToEvent
      // Then: 404 "Events not found or not yours"
    });

    it("TC-EMP-12: should not duplicate already-assigned events", () => {
      // Given: employee already assigned to event A
      // When: assignEmployeeToEvent([eventA])
      // Then: newCount=0, no duplicates
    });
  });

  // ─── BOOKINGS ──────────────────────────────────────────────────────

  describe("Bookings", () => {
    it("TC-BOOK-01: should filter bookings by vendor's events only", () => {
      // Given: orders across multiple vendors
      // When: GET /api/vendors/bookings
      // Then: only orders with items.eventId matching vendor's events
    });

    it("TC-BOOK-02: [CRITICAL C4] updateVendorBooking has no input validation middleware", () => {
      // Given: PUT /api/vendors/bookings/:id { maliciousField: "value" }
      // When: controller processes
      // Then: CURRENTLY only vendorNotes/vendorStatus/isFulfilled are used (safe by accident)
      // BUT: should have explicit validation middleware for defense-in-depth
    });

    it("TC-BOOK-03: should verify booking belongs to vendor's events before update", () => {
      // Given: booking for different vendor's event
      // When: PUT /api/vendors/bookings/:id
      // Then: 404 "Booking not found"
    });

    it("TC-BOOK-04: search should use escaped regex", () => {
      // Given: search = "test.+*"
      // When: GET /api/vendors/bookings?search=test.+*
      // Then: regex special chars escaped, no ReDoS
    });

    it("TC-BOOK-05: should support date range filtering", () => {
      // Given: startDate=2026-01-01, endDate=2026-06-30
      // When: GET /api/vendors/bookings
      // Then: only bookings within range returned
    });

    it("TC-BOOK-06: should support amount range filtering", () => {
      // Given: minAmount=100, maxAmount=500
      // When: GET /api/vendors/bookings
      // Then: only bookings with total in range
    });

    it("TC-BOOK-07: pagination should work correctly", () => {
      // Given: 25 bookings, page=2, limit=10
      // When: GET /api/vendors/bookings
      // Then: returns 10 bookings, pagination.totalPages=3, hasNextPage=true
    });
  });

  // ─── IMPORT/EXPORT ─────────────────────────────────────────────────

  describe("Import/Export", () => {
    it("TC-IO-01: [CRITICAL C5] import should NOT auto-create users without password", () => {
      // Given: import data with unknown email
      // When: importBookings processes
      // Then: CURRENTLY creates User with no password (BUG)
      // FIX: require existing user or create with invite flow
    });

    it("TC-IO-02: import should validate required fields per row", () => {
      // Given: row missing customerEmail
      // When: importBookings
      // Then: row added to failed[] with "Missing required fields"
    });

    it("TC-IO-03: import should match event by title (case-insensitive)", () => {
      // Given: row.eventTitle = "My Event", DB has "my event"
      // When: importBookings
      // Then: matches correctly via case-insensitive regex
    });

    it("TC-IO-04: import should only match events belonging to vendor", () => {
      // Given: event title matches but belongs to different vendor
      // When: importBookings
      // Then: row fails with "Event not found"
    });

    it("TC-IO-05: [ISSUE H9] CSV export should escape special characters", () => {
      // Given: customerName = 'O"Brien, Jr.'
      // When: exportBookings (csv)
      // Then: CURRENTLY wraps in quotes but doesn't escape inner quotes
      // FIX: use proper CSV library or escape double-quotes
    });

    it("TC-IO-06: export should verify vendor owns event for participant export", () => {
      // Given: eventId belongs to different vendor
      // When: GET /api/vendors/events/:eventId/participants/export
      // Then: 404 "Event not found or access denied"
    });

    it("TC-IO-07: export should filter out pending orders for participants", () => {
      // Given: orders with status 'pending'
      // When: exportEventParticipants
      // Then: pending orders excluded (status: { $nin: ['pending'] })
    });
  });

  // ─── PROFILE ───────────────────────────────────────────────────────

  describe("Profile", () => {
    it("TC-PROF-01: should update both User and Vendor documents", () => {
      // Given: { firstName: "New", businessName: "New Biz" }
      // When: PUT /api/vendors/profile
      // Then: User.firstName updated, Vendor.businessName updated
    });

    it("TC-PROF-02: should not expose sensitive User fields", () => {
      // When: GET /api/vendors/profile
      // Then: response excludes passwordHash, twoFactorAuth.secret, etc.
    });

    it("TC-PROF-03: [ISSUE M3] social media validator checks wrong body path", () => {
      // Validator: body("facebook").optional().isURL()
      // Controller sends: req.body.socialMedia
      // Validator is checking req.body.facebook (wrong)
    });

    it("TC-PROF-04: business hours should validate day names", () => {
      // Given: businessHours = { "funday": { isOpen: true } }
      // When: PUT /api/vendors/business-hours
      // Then: rejected — invalid day name
    });

    it("TC-PROF-05: business hours should require openTime/closeTime when isOpen=true", () => {
      // Given: monday = { isOpen: true } (no times)
      // When: PUT /api/vendors/business-hours
      // Then: rejected — missing times
    });

    it("TC-PROF-06: social media URLs should be validated", () => {
      // Given: facebook = "not-a-url"
      // When: PUT /api/vendors/social-media
      // Then: 400 "Invalid social media URLs"
    });

    it("TC-PROF-07: should generate unique slug from businessName", () => {
      // Given: businessName = "My Business"
      // When: vendor profile saved
      // Then: slug = "my-business" (or "my-business-1" if taken)
    });
  });

  // ─── PHONE VERIFICATION ────────────────────────────────────────────

  describe("Phone Verification", () => {
    it("TC-PHONE-01: should require phone number for OTP send", () => {
      // Given: no phone in body
      // When: POST /api/vendors/verify-phone/send
      // Then: 400 "Phone number is required"
    });

    it("TC-PHONE-02: OTP should expire after 10 minutes", () => {
      // Given: OTP sent 11 minutes ago
      // When: POST /api/vendors/verify-phone/confirm
      // Then: 400 "Invalid or expired verification code"
    });

    it("TC-PHONE-03: should reject wrong OTP", () => {
      // Given: stored OTP = "123456", submitted OTP = "000000"
      // When: confirm
      // Then: 400 "Invalid or expired verification code"
    });

    it("TC-PHONE-04: successful verification should set isPhoneVerified=true", () => {
      // Given: correct OTP within expiry
      // When: confirm
      // Then: user.isPhoneVerified = true, phoneVerification cleared
    });
  });

  // ─── DOCUMENT UPLOAD ───────────────────────────────────────────────

  describe("Document Upload", () => {
    it("TC-DOC-01: should validate document type", () => {
      // Given: type = "invalidType"
      // When: POST /api/vendors/documents/upload
      // Then: 400 "Valid document type is required"
    });

    it("TC-DOC-02: should require file in request", () => {
      // Given: no file uploaded
      // When: POST /api/vendors/documents/upload
      // Then: 400 "No document file provided"
    });

    it("TC-DOC-03: upload should set verificationStatus to PENDING", () => {
      // Given: vendor with UNVERIFIED status
      // When: upload document
      // Then: verificationStatus changes to PENDING
    });

    it("TC-DOC-04: delete should verify document exists before removing", () => {
      // Given: no businessLicense uploaded
      // When: DELETE /api/vendors/documents/businessLicense
      // Then: 404 "Document not found"
    });

    it("TC-DOC-05: getDocuments should return status for all 3 document types", () => {
      // When: GET /api/vendors/documents
      // Then: returns array with businessLicense, taxCertificate, identityDocument
      //       each with status (not_uploaded or actual status)
    });
  });

  // ─── PUBLIC VENDOR ENDPOINTS ───────────────────────────────────────

  describe("Public Endpoints", () => {
    it("TC-PUB-01: [ISSUE H4] getAllPublicVendors should use real ratings, not hardcoded 4.5", () => {
      // Given: vendor with stats.averageRating = 3.2
      // When: GET /api/vendors
      // Then: CURRENTLY returns rating: 4.5 (FAKE)
      // FIX: use vendor.stats.averageRating
    });

    it("TC-PUB-02: should only return verified, active, non-suspended vendors", () => {
      // Given: mix of verified/unverified vendors
      // When: GET /api/vendors
      // Then: only verificationStatus=VERIFIED, isActive=true, isSuspended=false
    });

    it("TC-PUB-03: public profile should resolve slug-based lookup", () => {
      // Given: vendor with slug = "fun-events"
      // When: GET /api/vendors/public/fun-events
      // Then: returns vendor profile
    });

    it("TC-PUB-04: public profile should resolve ObjectId-based lookup", () => {
      // Given: vendor userId
      // When: GET /api/vendors/public/{userId}
      // Then: returns vendor profile with events
    });

    it("TC-PUB-05: public profile should only show published+approved events", () => {
      // Given: vendor has draft and published events
      // When: GET /api/vendors/public/:id
      // Then: only events with status='published', isApproved=true, isActive=true
    });

    it("TC-PUB-06: getVendorPaymentInfo should fallback to platform settings for non-vendors", () => {
      // Given: userId is not a vendor
      // When: GET /api/vendors/:vendorId/payment-info
      // Then: returns { hasCustomStripe: false, usePlatformStripe: true }
    });
  });

  // ─── FRONTEND API MISMATCHES ───────────────────────────────────────

  describe("Frontend/Backend API Mismatches", () => {
    it("TC-API-01: [ISSUE H11] saveStripeApiKeys endpoint mismatch", () => {
      // Frontend: POST /vendors/stripe-keys
      // Backend:  PUT  /vendors/payment-settings/stripe/keys
      // Result: 404 on every call
    });

    it("TC-API-02: [ISSUE H12] validateStripeApiKeys route doesn't exist", () => {
      // Frontend: POST /vendors/stripe-keys/validate
      // Backend:  (no route)
      // Result: 404
    });

    it("TC-API-03: [ISSUE H13] getClaimedEvents uses wrong path prefix", () => {
      // Frontend: GET /vendor/claimed-events  (singular)
      // Backend:  All routes are /vendors/...  (plural)
      // Result: 404
    });

    it("TC-API-04: [ISSUE H13] getClaimedVenues uses wrong path prefix", () => {
      // Frontend: GET /vendor/claimed-venues  (singular)
      // Backend:  All routes are /vendors/...  (plural)
      // Result: 404
    });

    it("TC-API-05: [ISSUE M9] checkServiceFee route doesn't exist", () => {
      // Frontend: POST /vendors/check-service-fee
      // Backend:  (no route)
      // Result: 404
    });

    it("TC-API-06: [ISSUE M10] applyForVendor route doesn't exist", () => {
      // Frontend: POST /vendors/apply
      // Backend:  (no route)
      // Result: 404
    });

    it("TC-API-07: [ISSUE M11] getFeaturedVendors route doesn't exist", () => {
      // Frontend: GET /vendors/featured
      // Backend:  (no route)
      // Result: 404
    });
  });
});
