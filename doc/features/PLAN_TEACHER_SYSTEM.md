eacher System Gap Analysis & Implementation Plan

 Executive Summary

 The teacher system has substantial backend infrastructure (~75% complete) but zero
 teacher-facing frontend (0% complete). Admin can manage teachers/teaching events, but      
 teachers cannot self-serve.

 ---
 Current State Assessment

 Backend Completeness
 Component: Teacher Model
 Status: 95%
 Notes: Rich schema, payment settings, subscription integration
 ────────────────────────────────────────
 Component: TeachingEvent Model
 Status: 95%
 Notes: Complex scheduling, registration config, affiliate fields disabled
 ────────────────────────────────────────
 Component: TeacherSubscription Model
 Status: 100%
 Notes: Full subscription lifecycle
 ────────────────────────────────────────
 Component: teacher.controller.ts
 Status: 70%
 Notes: Many stubs (media upload, availability, social links)
 ────────────────────────────────────────
 Component: teacher.service.ts
 Status: 20%
 Notes: Only 1 function! Logic in controllers
 ────────────────────────────────────────
 Component: Payment controllers
 Status: 75%
 Notes: Stripe Connect started, subscription unclear
 ────────────────────────────────────────
 Component: Payout controllers
 Status: 80%
 Notes: Dashboard, history, requests implemented
 ────────────────────────────────────────
 Component: Admin controllers
 Status: 60%
 Notes: CRUD defined, implementation unclear
 Frontend Completeness
 ┌───────────────────────────┬────────┬─────────────────────────────────────────────┐       
 │         Component         │ Status │                    Notes                    │       
 ├───────────────────────────┼────────┼─────────────────────────────────────────────┤       
 │ Admin Teaching Events     │ 80%    │ Full CRUD, bulk actions, 5-tab editor       │       
 ├───────────────────────────┼────────┼─────────────────────────────────────────────┤       
 │ Admin Teacher Management  │ 40%    │ List/approve exists, no detailed management │       
 ├───────────────────────────┼────────┼─────────────────────────────────────────────┤       
 │ Teacher Dashboard         │ 0%     │ Does not exist                              │       
 ├───────────────────────────┼────────┼─────────────────────────────────────────────┤       
 │ Teacher Profile Page      │ 0%     │ Does not exist                              │       
 ├───────────────────────────┼────────┼─────────────────────────────────────────────┤       
 │ Teacher Event Management  │ 0%     │ Does not exist                              │       
 ├───────────────────────────┼────────┼─────────────────────────────────────────────┤       
 │ Teacher Bookings/Students │ 0%     │ Does not exist                              │       
 ├───────────────────────────┼────────┼─────────────────────────────────────────────┤       
 │ Teacher Payments/Payouts  │ 0%     │ Does not exist                              │       
 ├───────────────────────────┼────────┼─────────────────────────────────────────────┤       
 │ Teacher Analytics         │ 0%     │ Does not exist                              │       
 └───────────────────────────┴────────┴─────────────────────────────────────────────┘       
 ---
 Critical Bugs to Fix First

 P0 - Blocking Issues

 1. Refund Transaction Bug - teaching_event.cancellation.controller.ts:98
   - Refunds happen outside main transaction
   - If refund fails, event marked cancelled but money not returned
   - Fix: Wrap batch refund in same transaction
 2. Affiliate System Disabled - TeachingEvent.ts:133-669
   - Fields commented out: isAffiliateEvent, claimStatus, claimedBy
   - Controllers use (event as any) casting
   - Decision needed: Enable or remove
 3. Email Templates Not Wired - teaching_event.registration.controller.ts
   - queueEmail() called but templates don't exist
   - Registrations, cancellations, approvals don't notify users
 4. Function Import Mismatches - teacher.routes.ts
   - Routes import uploadTeacherMedia but controller has uploadTeacherImage
   - Routes import updateTeacherAvailabilityHours but controller has
 updateTeacherAvailability

 ---
 Missing Backend Features

 Teacher Profile (teacher.controller.ts)

 Stubbed/Incomplete:
 - updateTeacherProfile (lines 650-729) - Many fields commented out:
   - subjects, expertise, qualifications, certifications
   - website, teachingDescription, teachingAvailability
 - uploadTeacherImage (line 745) - No implementation
 - updateTeacherAvailability (line 785) - Save logic commented
 - updateTeacherSocialMedia (line 833) - Save logic commented

 Missing:
 - Demo video upload
 - Portfolio/gallery management
 - Certificate upload for qualifications
 - Bio rich text support

 Teacher Service Layer (teacher.service.ts)

 Current State: Only has attachOfflineDemoVideo() function

 Missing Services:
 - updateTeacherProfile() - Profile update business logic
 - verifyTeacherQualifications() - Document verification workflow
 - calculateTeacherStats() - Aggregate stats calculation
 - getTeacherEarnings() - Revenue aggregation
 - archiveTeacher() - Soft delete with cascading

 Payment/Payout Services

 Partially Implemented:
 - teacher.payment.service.ts - Status unclear
 - teacher.payout.service.ts - Partial (80 lines visible)
 - teacher.stripe-connect.service.ts - Status unclear
 - teacher.subscription.service.ts - Status unclear

 Missing:
 - Subscription plan upgrade/downgrade
 - Proration calculation
 - Grace period handling
 - Failed payment retry logic

 Teaching Event System

 Disabled Features:
 - Affiliate system (all fields commented)

 Missing Features:
 - Seat reservation/hold during checkout (overbooking risk)
 - Auto-archive expired events (lifecycle jobs)
 - Cascading delete for registrations
 - File upload virus scanning
 - Waitlist management
 - Early bird/group pricing
 - Recurring events
 - Co-teachers support

 ---
 Missing Frontend - Teacher Dashboard

 Required Pages

 frontend/src/pages/teacher/
 ├── TeacherDashboardPage.tsx      # Overview stats, recent activity
 ├── TeacherProfilePage.tsx        # Profile management
 ├── TeacherEventsPage.tsx         # Teaching events list
 ├── TeacherCreateEventPage.tsx    # Event creation wizard
 ├── TeacherEditEventPage.tsx      # Event editing
 ├── TeacherStudentsPage.tsx       # Enrolled students management
 ├── TeacherBookingsPage.tsx       # Booking management
 ├── TeacherRegistrationsPage.tsx  # Registration review
 ├── TeacherAnalyticsPage.tsx      # Performance analytics
 ├── TeacherPaymentsPage.tsx       # Payment settings, Stripe Connect
 ├── TeacherPayoutsPage.tsx        # Payout history, requests
 ├── TeacherSubscriptionPage.tsx   # Subscription management
 └── TeacherSettingsPage.tsx       # Account settings

 Required Components

 frontend/src/components/teacher/
 ├── TeacherSidebar.tsx            # Navigation sidebar
 ├── TeacherStatsCard.tsx          # Dashboard stat cards
 ├── TeacherEventCard.tsx          # Event list item
 ├── TeacherStudentList.tsx        # Student roster
 ├── TeacherBookingTable.tsx       # Bookings table
 ├── TeacherRegistrationCard.tsx   # Registration review card
 ├── TeacherPayoutHistory.tsx      # Payout history table
 ├── TeacherStripeConnect.tsx      # Stripe onboarding flow
 ├── TeacherSubscriptionCard.tsx   # Subscription status
 └── TeacherCalendar.tsx           # Event calendar view

 Required API Integration

 frontend/src/services/api/teacherAPI.ts
 - getDashboardStats()
 - getProfile() / updateProfile()
 - getEvents() / createEvent() / updateEvent() / deleteEvent()
 - getBookings() / updateBooking()
 - getRegistrations() / reviewRegistration()
 - getPayoutDashboard() / requestPayout()
 - initiateStripeConnect() / getStripeStatus()
 - getSubscription() / paySubscription()

 ---
 Implementation Phases

 Phase 1: Fix Critical Bugs (Week 1)

 1. Fix refund transaction isolation bug
 2. Enable affiliate system - Uncomment fields in TeachingEvent.ts
 3. Wire email templates for notifications
 4. Fix route/controller function mismatches
 5. Uncomment profile update fields

 Phase 2: Complete Backend (Weeks 2-3)

 1. Implement teacher.service.ts layer
 2. Complete payment/payout services
 3. Add approval notification system
 4. Implement seat reservation during checkout
 5. Add lifecycle jobs for event archival
 6. Test affiliate system end-to-end

 Phase 3: Teacher Dashboard MVP - Events & Bookings (Weeks 4-6) [PRIORITY]

 1. TeacherDashboardPage with overview stats
 2. TeacherEventsPage - List, create, edit, delete events
 3. TeacherCreateEventPage - Event creation wizard
 4. TeacherBookingsPage - View/manage student bookings
 5. TeacherStudentsPage - Student roster per event
 6. Basic navigation sidebar and layout

 Phase 4: Profile & Registration Management (Weeks 7-8)

 1. TeacherProfilePage with full edit capability
 2. TeacherRegistrationsPage with review flow
 3. Registration approval/rejection workflow
 4. Student communication features

 Phase 5: Payments & Payouts (Weeks 9-10)

 1. TeacherPaymentsPage with Stripe Connect onboarding
 2. TeacherPayoutsPage with history/requests
 3. TeacherSubscriptionPage with plan management
 4. Bank account verification UI

 Phase 6: Advanced Features (Weeks 11-14)

 1. TeacherAnalyticsPage with charts
 2. TeacherCalendar component
 3. Affiliate dashboard for teachers
 4. Student messaging system
 5. Attendance tracking
 6. Certificate generation

 ---
 File Modifications Required

 Backend Files to Modify

 1. backend/src/controllers/teacher.controller.ts
   - Uncomment profile fields (lines 650-729)
   - Implement uploadTeacherImage (line 745)
   - Implement updateTeacherAvailability (line 785)
   - Implement updateTeacherSocialMedia (line 833)
 2. backend/src/services/teacher.service.ts
   - Add full service layer methods
 3. backend/src/routes/teacher.routes.ts
   - Fix import names to match controller exports
 4. backend/src/controllers/teaching_event.cancellation.controller.ts
   - Fix transaction isolation (line 98)
 5. backend/src/models/TeachingEvent.ts
   - Enable or remove affiliate fields (lines 133-669)
 6. backend/src/services/email.service.ts
   - Add templates for: registration confirmation, approval, rejection, cancellation        

 Frontend Files to Create

 1. All pages in frontend/src/pages/teacher/
 2. All components in frontend/src/components/teacher/
 3. frontend/src/services/api/teacherAPI.ts
 4. frontend/src/types/teacher.ts
 5. frontend/src/hooks/queries/useTeacherQuery.ts
 6. frontend/src/hooks/mutations/useTeacherMutations.ts

 ---
 Verification Plan

 Backend Testing

 # Test teacher endpoints
 npm test -- --grep "teacher"

 # Test teaching event cancellation
 npm test -- --grep "cancellation"

 # Run full backend tests
 cd backend && npm test

 Frontend Testing

 # Run frontend tests
 cd frontend && npm test

 # Check TypeScript
 cd frontend && npm run type-check

 Manual Testing

 1. Create teacher profile via API
 2. Create teaching event
 3. Register student for event
 4. Cancel event and verify refund
 5. Check email notifications sent
 6. Verify payout request flow

 ---
 Decisions Made

 - Affiliate System: Enable it (uncomment fields in TeachingEvent.ts)
 - Dashboard Priority: Events + Bookings first, then Profile, then Payments

 Open Questions

 1. Teacher Verification: Manual admin approval or automated document verification?
 2. Subscription Required: Can teachers create events without subscription?
 3. Payout Frequency: Daily/weekly/monthly - configurable per teacher?
 4. Multi-currency: Support multiple currencies for teachers in different regions?
 5. Co-teachers: Allow multiple teachers per teaching event?