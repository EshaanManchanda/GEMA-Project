# Kidrove Platform FAQ & Step-by-Step Setup Guide

Welcome to Kidrove, the premier marketplace connecting families with exceptional educational experiences, events, and classes. This comprehensive guide answers everything you need to know about registering, configuring your storefront, managing subscriptions, creating complex schedules, and handling payouts.

---

## 1. Getting Started & Registration

### How do I register as a Vendor on Kidrove?
Registering as a vendor is a secure, multi-step process designed to maintain trust and safety for all families on the platform.

**Step-by-Step Registration:**
1. **Initial Sign Up**: Navigate to the vendor registration portal (`/vendor-register`). Create an account using your email, a strong password, and your basic business details (Name, Phone Number).
2. **Email Verification**: Check your inbox for an OTP (One Time Password) to verify your email address. You cannot proceed without confirming your email.
3. **Storefront Creation**: Fill out your business profile. This includes a high-resolution logo, banner image, business description, and selecting the primary categories of events or classes you offer.
4. **Security & Document Uploads**: To ensure a safe environment, all vendors **must** upload verified trade licenses and government-issued ID documentation. 
5. **Admin Moderation**: Your profile will be placed in a "Pending Approval" state. The Kidrove Admin Team manually reviews your uploaded documents, cross-referencing public registries.
6. **Approval & Activation**: Once the Admin team approves your application, your dashboard will be fully unlocked, allowing you to create public-facing events and accept bookings.

---

## 2. Subscription plans & Visibility Options

### How much does it cost to list your business on Kidrove?
Kidrove offers highly scalable plans tailored to educators and event organizers of all sizes, featuring a generous free tier as well as premium visibility upgrades.

#### 🌟 Standard Listing (Free forever)
Perfect for getting started and building your audience organically.
- **Unlimited** event and class creation
- Standard category placement in search results
- Full, unrestricted access to the Vendor Dashboard and all booking management tools (QR scanners, rosters)

#### ⭐ Featured Listing – Grow Faster
Designed for established brands and premier educators who want higher visibility, premier positioning, and accelerated growth across the Kidrove ecosystem.

**🚀 Founding Partner Launch Offer**
**AED 99/month for the first 3 months** *(Regular price: AED 199/month)*

**Includes:**
- ✔ **Featured Badge**: A high-visibility badge explicitly marking your listings as "Featured" to parents.
- ✔ **Priority Placement**: Your events will algorithmically rank higher within your specific category searches.
- ✔ **Homepage Rotation**: Featured vendors are placed in limited-slot carousels directly on the Kidrove homepage.
- ✔ **Curated Collections**: Inclusion in targeted email collections and weekly newsletters sent to parents.
- ✔ **Early Access**: First access to promotional campaigns, holiday specials, and discount codes.
- ✔ **Founding Partner Recognition**: A permanent badge on your profile honoring your early adoption.

*⚠ Note: Kidrove strictly caps the number of Featured slots per category to guarantee that paying partners receive maximum, undiluted visibility.*

---

## 3. Payments, Commissions & The Payout System

### How does the Commission System work?
Kidrove operates on a fully automated, transparent commission model built entirely on top of Stripe.
- When a parent purchases a ticket or books a class, the payment is securely processed through our integrated Stripe payment gateway.
- A platform commission fee (percentage-based) is **automatically deducted** at the exact point of sale. 
- You do not need to manually pay invoices; the split happens instantaneously.
- Customers may also be charged a small transaction/convenience fee during checkout, depending on the event size and ticket tier.

### How do I get paid? (The Payout System Explained)
Vendors receive their earnings through **Stripe Connect**, the global industry standard for secure marketplace payouts. You never have to manually request withdrawals.

**The Step-by-Step Payout Flow:**
1. **Onboarding Integration**: From your Vendor Dashboard, click "Link Bank Account". You will be redirected to a secure Stripe portal to provide your banking and routing details.
2. **Payment Capture**: When a customer books your class, the money is instantly captured and split. Kidrove takes the commission, and the remainder is credited to your virtual Stripe balance.
3. **Holding Period**: To protect against fraud, funds are held in your Stripe account until the event or class has officially concluded. 
4. **Automated Transfers**: Once the event concludes successfully, Stripe automatically initiates a transfer to your local checking account based on your configured payout schedule (e.g., daily, weekly on Fridays, or monthly).

### How does the Refund System work?
Kidrove processes refunds systematically via Stripe directly from the dashboard:
- **Vendor-Initiated Cancellations**: If you, the vendor, cancel an event due to weather or illness, automated full refunds are instantly routed back to the original payment methods of all registered attendees.
- **Customer Refund Requests**: If a customer requests a refund within your permitted cancellation window (e.g., 48 hours prior), you will receive a notification. You can approve it directly from your dashboard with one click. The payment gateway will automatically reverse the charge, and Stripe updates your payout balance accordingly.
- **Disputes**: If a parent disputes a charge with their credit card company, Stripe actively manages the chargeback evidence process, which you can monitor via the Finance tab.

---

## 4. Master Event Creation & Scheduling

### How do I create an event for every event type?
Kidrove's unified Event Editor dynamically adjusts based on what you are trying to sell.

**1. Standard Events (Festivals, One-Off Shows, Exhibitions)** 
Simply define the core details: Event Title, Description, Venue Location (integrated with Google Maps), Date/Time, and Ticket Pricing tiers (e.g., VIP, General Admission, Child).

**2. Educational Programs (Classes, Bootcamps, Masterclasses, Courses, Workshops)**
When you select an "Educational" event type from the dropdown, the form dynamically expands to include specialized fields essential for parents:
- **Subject & Topic**: Clearly define the academic or skill-based focus.
- **Introductory Video**: Provide a YouTube or Vimeo embedded link so parents can see your teaching style.
- **Syllabus**: A structured text area to outline exactly what students will learn week-by-week.
- **Instructors**: Link specific verified teachers (managed in your 'Staff' tab) directly to the class so parents know exactly who is in the room with their child.

### How does the specific scheduling work for Events?
The scheduling engine allows for complete, granular control over when your events happen, especially for recurring educational terms.

**Step-by-Step Scheduling:**
1. **Select Schedule Type**: Choose either a "Single Session" or a "Recurring Schedule".
2. **Define the Date Range**: For a Summer Camp, you might select June 1st to August 30th.
3. **Select the Days**: Check the recurring days (e.g., "Every Tuesday and Thursday").
4. **Set the Time**: Input the start and end time (e.g., 4:00 PM - 5:30 PM).
5. **Add Exceptions**: If there is a public holiday in the middle of your sequence, use the "Exceptions" calendar to seamlessly remove that specific date from the schedule block.
6. **Generate**: The system generates a cohesive schedule block. Parents will book this entire block in a single transaction, perfectly handling complex terms without requiring dozens of individual checkouts.

---

## 5. Dashboard Capabilities

### What functionality does the Vendor Dashboard provide?
The Vendor Dashboard (`vendorAPI` integration) is your comprehensive command center for managing all operations, finances, and staff on Kidrove. It is divided into the following powerful modules:

**1. Event & Booking Management**
- **Unified Event Pipeline**: Draft, publish, edit, archive, duplicate, or permanently delete both standard and educational events.
- **Booking Engine**: View real-time ticket sales and order details. 
- **Check-in Tools**: Easily update booking statuses (e.g., mark as "Fulfilled" or add internal vendor notes).
- **Import/Export**: Bulk export your attendee booking rosters to CSV or JSON formats for seamless offline management, or import booking CSVs directly into the platform.

**2. Financial Analytics & Stripe Integration**
- **Dashboard Stats**: Instantly check top-level revenue, bookings volume, and performance metrics dynamically loading from platform databases.
- **Stripe Connect Portal**: Directly initialize your Stripe Connect onboarding. You can track your Connect status, view pending automated payouts, or securely store and validate your own custom Stripe API Keys (Publishable/Secret) if you have opted to manage direct processing.
- **Fee Transparency**: Instantly click "Check Service Fee" to see what commission split Kidrove will deduct before placing an order.

**3. Storefront & Profile Customization**
- **Brand Identity**: Upload your official vector logo and expansive cover images.
- **Operational Status**: Dynamically update your business hours of operation and all external social media links (Instagram, Facebook, Twitter, Website).
- **Venue Management**: Easily declare and manage all of your "Claimed Venues" where you actively host your public events.

**4. Staff & Employee Roster**
- **Employee Creation**: Securely invite, create, and update localized instructor/staff profiles linked to your main vendor account.
- **Class Assignment**: Seamlessly assign (or remove) a specific verified employee to a drafted or published event, showing parents exactly who will be leading the class.
- **Employee Auditing**: Export your entire internal employee roster to CSV/JSON files.

**5. Verification & Security**
- **OTP System**: Send and verify secure One-Time Passwords directly to your registered business phone number to authorize sensitive changes.
- **Document Vault**: Upload new trade licenses via the dashboard, check current document verification status, or request to manage/change existing bank details on file.

### What functionality does the Admin Dashboard provide?
The Admin Dashboard (`AdminLayout.tsx` & `adminAPI` integration) provides Kidrove operational staff with total unified control over the entire platform ecosystem. It is divided into several highly specialized modules:

**1. Analytics & Reporting Hub**
- **Centralized Dashboard**: Real-time overview of top-performing vendors, active users, and system health.
- **Deep Analytics**: Dedicated portals for analyzing User growth, Event success rates, Ticket sales velocity, and overall Venue utilization.
- **Revenue Tracking**: Monitor platform-wide aggregated commission revenue and export comprehensive CSV/JSON financial reports for accounting.

**2. User & Employee Management**
- **User Control**: View all registered parents and users. Securely update statuses (ban/suspend), change roles, and even forcibly initiate secure OTP (One-Time Password) reset flows for compromised accounts.
- **Employee Roster**: Create, modify, and delete internal Kidrove employee accounts, assigning granular permissions for different dashboard sections.

**3. Vendor & Venue Moderation**
- **Vendor Onboarding**: Review uploaded business trade documents and individually approve or reject incoming "Partnership" applications (with rejection notes).
- **Storefront Control**: Manage vendor statuses, update global vendor lists, and monitor the health of their connected Stripe accounts.
- **Venue Approval**: Vendors suggest new physical locations (venues). Admins must verify the address on Google Maps and manually approve them before they can host events.

**4. Catalog & Event Moderation Engine**
- **Listing Approval Flow**: Review drafted events (both Standard and Educational/Teaching events) to ensure they adhere to quality guidelines. Admins can approve, reject (with automated reason emails), or permanently delete listings.
- **Featured Management**: Manually toggle the "Featured" status for vendors who purchased the Subscription, giving them priority algorithm sorting.
- **Roster Intervention**: Admins uniquely possess the power to manually change the assigned Teacher/Instructor for an ongoing educational class via the backend if a vendor is unresponsive.

**5. Financial Operations (Orders & Payouts)**
- **Order Command Center**: View a massive real-time ledger of all ticket orders across all vendors.
- **Intervention Support**: Manually mark offline payments as "Confirmed," cancel fraudulent orders, or instantly trigger partial/full Stripe refunds (with stated reasons) directly from the Kidrove interface without needing the Stripe dashboard.
- **Payout & Commission Logic**: Configure percentage splits globally and monitor automated vendor payouts.

**6. Marketing, CMS & Engagement Tools**
- **Blogging & SEO**: A full CMS environment (TipTap rich-text) to create SEO-optimized articles and group them into Blog Categories. Admins can also manage global metadata keywords.
- **Platform Real Estate**: Create, schedule, and delete rotating Homepage Banners, Curated Collections, site-wide Announcements, and promotional Popups.
- **Customer Engagement**: Generate global Coupons/Discount codes and monitor and respond to general "Form Submissions" from the public contact page.
- **Review Moderation**: Oversee the verified purchase review system, removing abusive comments if they violate platform policy.

**7. Core System Configuration**
- **Application Settings**: Granular control over the fundamental platform operations without touching code.
- **Email Delivery Setup**: Configure SMTP credentials and run live "Test Connection" pings to ensure booking confirmation emails never bounce.
- **Payment & Social**: Update global gateway API keys and edit the dynamic footer social media links.

---

## 6. Feedback, Trust, and Reviews

### How does the Review System work?
Kidrove prevents review manipulation to ensure parents can trust the ratings they see.
- **Verified Purchases Only**: A customer can **only** leave a star rating (1 to 5) and a written review *after* they have successfully purchased a ticket through the platform AND the scheduled event date has officially concluded. This strictly prevents spam, competitor sabotage, or fake reviews.
- **Public Visibility**: The mathematical average of all verified reviews is prominently displayed on the Vendor’s public profile and on individual event cards to help other families make informed booking decisions.
- **Vendor Responses**: Vendors are strongly encouraged to actively and publicly reply to reviews via their dashboard. Thanking parents for positive feedback or professionally addressing a poor experience demonstrates excellent customer service to future buyers.
