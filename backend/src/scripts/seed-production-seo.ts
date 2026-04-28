import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load environment variables based on environment
const envPath =
  process.env.NODE_ENV === "production"
    ? path.resolve(process.cwd(), ".env.production")
    : path.resolve(process.cwd(), ".env");

dotenv.config({ path: envPath });

// Unified Production SEO and FAQ Data
const productionSeoData: any[] = [
  {
    page: "homepage",
    metaTitle: "Kids Events & Activities in UAE - Kidrove",
    metaDescription:
      "Find the best kids events, activities, and entertainment in Dubai & UAE. Book tickets for educational workshops, sports, arts, and family fun experiences.",
    keywords: [
      "kids events UAE",
      "Dubai children activities",
      "family events",
      "kids workshops",
      "entertainment Dubai",
      "educational activities",
      "kids parties UAE",
    ],
    faqItems: [
      {
        question: "What types of events can I find on Kidrove?",
        answer:
          "Kidrove offers a wide variety of events including educational workshops, sports activities, arts & crafts, entertainment shows, music classes, technology camps, and adventure experiences for children of all ages across the UAE.",
        category: "Events",
      },
      {
        question: "How do I book tickets for events?",
        answer:
          "Simply browse our events, select the one you like, choose your preferred date and number of tickets, and complete the secure checkout process. You'll receive your tickets via email instantly.",
        category: "Booking",
      },
      {
        question: "Are the events suitable for all age groups?",
        answer:
          "Each event listing clearly specifies the recommended age range. We offer activities for toddlers, preschoolers, school-age children, and teenagers, so you can easily find age-appropriate events for your kids.",
        category: "Events",
      },
    ],
    features: [
      {
        title: "Discover Events",
        description:
          "Browse hundreds of curated kids events and activities across Dubai, Abu Dhabi, and the UAE. From educational workshops to entertainment shows.",
        icon: "🔍",
      },
      {
        title: "Easy Booking",
        description:
          "Secure online booking with instant confirmation. Get your e-tickets delivered directly to your email.",
        icon: "🎫",
      },
      {
        title: "Trusted Vendors",
        description:
          "All event organizers are verified and trusted. Read reviews from other parents before booking.",
        icon: "✅",
      },
      {
        title: "Family-Friendly",
        description:
          "Every event is carefully selected to ensure safe, fun, and enriching experiences for children and families.",
        icon: "👨‍👩‍👧‍👦",
      },
    ],
    trustSignals: {
      yearsInBusiness: 5,
      certifications: ["ISO 9001:2015", "Child Safety Certified"],
      awards: [
        "Best Kids Events Platform UAE 2024",
        "Parents Choice Award 2023",
      ],
    },
    isActive: true,
    createdAt: "2025-12-22T14:22:17.687Z",
    updatedAt: "2025-12-22T14:22:17.687Z",
  },
  {
    page: "about",
    metaTitle: "About Kidrove - Trusted Kids Events Platform UAE",
    metaDescription:
      "Learn about Kidrove's mission to connect families with the best kids events and activities in the UAE. Trusted by thousands of parents across Dubai.",
    keywords: [
      "about Kidrove",
      "kids events platform",
      "family activities UAE",
      "event booking platform",
      "Dubai kids activities",
    ],
    faqItems: [
      {
        question: "What is Kidrove's mission?",
        answer:
          "Our mission is to make it easy for parents to discover and book enriching events and activities for their children. We connect families with trusted event organizers to create memorable experiences.",
        category: "Company",
      },
      {
        question: "How does Kidrove ensure quality?",
        answer:
          "We carefully vet all event organizers, monitor reviews and ratings, and maintain strict quality standards. Our team personally reviews each event listing to ensure it meets our criteria for safety and educational value.",
        category: "Quality",
      },
      {
        question: "Can event organizers list their events on Kidrove?",
        answer:
          "Yes! We welcome event organizers to join our platform. Simply create a vendor account, complete the verification process, and start listing your events to reach thousands of families.",
        category: "Vendors",
      },
    ],
    features: [
      {
        title: "Curated Selection",
        description:
          "Every event on our platform is carefully reviewed and selected to ensure quality, safety, and educational value for children.",
        icon: "⭐",
      },
      {
        title: "Parent Community",
        description:
          "Join thousands of parents who trust Kidrove to find the best activities for their children across the UAE.",
        icon: "👥",
      },
      {
        title: "Expert Support",
        description:
          "Our dedicated customer support team is here to help with bookings, questions, and ensuring smooth event experiences.",
        icon: "💬",
      },
    ],
    trustSignals: {
      yearsInBusiness: 5,
      certifications: [
        "ISO 9001:2015",
        "Data Privacy Certified",
        "Child Safety Standards",
      ],
      awards: [
        "Excellence in Family Entertainment 2024",
        "Innovation in EdTech Award",
      ],
    },
    isActive: true,
    createdAt: "2025-12-22T14:22:17.688Z",
    updatedAt: "2025-12-22T14:22:17.688Z",
  },
  {
    page: "contact",
    metaTitle: "Contact Kidrove - Kids Events Support",
    metaDescription:
      "Need help? Contact Kidrove support team for assistance with bookings, event questions, or vendor inquiries. Available 7 days a week.",
    keywords: [
      "contact Kidrove",
      "customer support",
      "help desk",
      "event booking help",
      "vendor inquiries UAE",
    ],
    faqItems: [
      {
        question: "How can I contact customer support?",
        answer:
          "You can reach us via email at support@kidrove.com, call us during business hours, or use the contact form on this page. We typically respond within 2-4 hours during business days.",
        category: "Support",
      },
      {
        question: "What are your support hours?",
        answer:
          "Our customer support team is available Sunday to Thursday from 9 AM to 6 PM GST, and Saturday from 10 AM to 4 PM. We're closed on Fridays but respond to urgent emails.",
        category: "Support",
      },
      {
        question: "How do I report an issue with my booking?",
        answer:
          "For booking issues, please email us at support@kidrove.com with your order number and details. For urgent matters on the day of an event, call our hotline.",
        category: "Booking",
      },
      {
        question: "Can vendors contact you for partnership opportunities?",
        answer:
          "Absolutely! Event organizers and venue partners can reach us at vendors@kidrove.com or use the vendor inquiry form. We're always looking to partner with quality providers.",
        category: "Vendors",
      },
    ],
    features: [
      {
        title: "Fast Response",
        description:
          "Our support team responds to all inquiries within 2-4 hours during business days. Urgent issues are prioritized.",
        icon: "⚡",
      },
      {
        title: "Multiple Channels",
        description:
          "Reach us via email, phone, WhatsApp, or our contact form. Choose the method that works best for you.",
        icon: "📞",
      },
      {
        title: "Dedicated Support",
        description:
          "Separate support channels for parents and vendors to ensure specialized assistance for your specific needs.",
        icon: "🎯",
      },
    ],
    trustSignals: {
      yearsInBusiness: 5,
      certifications: ["Customer Service Excellence", "ISO 9001:2015"],
      awards: ["Best Customer Support Platform 2024"],
    },
    isActive: true,
    createdAt: "2025-12-22T14:22:17.688Z",
    updatedAt: "2025-12-22T14:22:17.688Z",
  },
  {
    page: "faq",
    createdAt: "2026-02-21T09:26:26.432Z",
    faqItems: [
      {
        question: "What is Gema?",
        answer:
          "Gema is a comprehensive platform that connects event organizers with attendees. We provide a marketplace for discovering, booking, and managing various types of events, from concerts and workshops to conferences and private parties.",
        category: "General",
      },
      {
        question: "How do I contact customer support?",
        answer:
          "You can reach our customer support team through multiple channels: email us at support@gema.events, call us at +971 4 123 4567 during business hours (9 AM - 6 PM EST, Monday to Friday), or use the contact form on our website for assistance.",
        category: "General",
      },
      {
        question: "Is Gema available in my country?",
        answer: "Gema is currently available in the United Arab Emirates.",
        category: "General",
      },
      {
        question: "How do I report an issue with the platform?",
        answer:
          'To report any issues with our platform, please use the "Report an Issue" form in the Help Center section of your account, or email us directly at support@gema.events with details of the problem you\'re experiencing. Include screenshots if possible to help us resolve your issue more quickly.',
        category: "General",
      },
      {
        question: "How do I create an account?",
        answer:
          'Creating an account is simple! Click on the "Sign Up" button in the top right corner of our homepage. You can register using your email address, or sign up with your Google or Facebook account for a quicker process. Follow the prompts to complete your profile information.',
        category: "Account",
      },
      {
        question: "How do I reset my password?",
        answer:
          'To reset your password, click on the "Login" button, then select "Forgot Password". Enter the email address associated with your account, and we\'ll send you a password reset link. Follow the instructions in the email to create a new password.',
        category: "Account",
      },
      {
        question: "Can I have both an attendee and vendor account?",
        answer:
          'Yes, you can maintain both types of accounts. Start by creating a regular attendee account, then navigate to "Account Settings" and select "Become a Vendor" to set up your vendor profile. You\'ll be able to switch between the two account types using the toggle in your dashboard.',
        category: "Account",
      },
      {
        question: "How do I delete my account?",
        answer:
          'To delete your account, go to "Account Settings" and scroll to the bottom where you\'ll find the "Delete Account" option. Please note that account deletion is permanent and will remove all your data, including booking history and saved events. If you have active bookings, we recommend resolving those before deleting your account.',
        category: "Account",
      },
      {
        question: "How do I book an event?",
        answer:
          'To book an event, browse our event listings or search for specific events. Once you find an event you\'re interested in, click on it to view details. Select the number of tickets and any additional options, then click "Book Now". Follow the checkout process to complete your booking with payment.',
        category: "Bookings",
      },
      {
        question: "Can I cancel my booking?",
        answer:
          'Yes, you can cancel bookings, but cancellation policies vary by event. To cancel, go to "My Bookings" in your account dashboard, find the booking you wish to cancel, and click "Cancel Booking". The system will display the applicable refund amount based on the event\'s cancellation policy before you confirm.',
        category: "Bookings",
      },
      {
        question: "How do I get my tickets after booking?",
        answer:
          'After completing your booking, tickets are automatically sent to the email address associated with your account. You can also access your tickets at any time by logging into your account and going to "My Bookings". From there, you can download or print your tickets as needed.',
        category: "Bookings",
      },
      {
        question: "Can I transfer my tickets to someone else?",
        answer:
          'Yes, many events allow ticket transfers. To transfer tickets, go to "My Bookings" in your account, select the booking, and click "Transfer Tickets". Enter the recipient\'s email address and follow the prompts. Please note that some events may have restrictions on ticket transfers or may charge a transfer fee.',
        category: "Bookings",
      },
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept various payment methods including major credit cards (Visa, MasterCard, American Express, Discover), PayPal, Apple Pay, and Google Pay. In select regions, we also support bank transfers and local payment options. All payments are processed securely through our payment gateway.",
        category: "Payments",
      },
      {
        question: "Is my payment information secure?",
        answer:
          "Absolutely. We take security seriously and use industry-standard encryption to protect your payment information. We are PCI DSS compliant and never store your full credit card details on our servers. All transactions are processed through secure, trusted payment gateways.",
        category: "Payments",
      },
      {
        question: "When will I receive my refund?",
        answer:
          "Refund processing times depend on your payment method. Credit card refunds typically take 5-10 business days to appear on your statement. PayPal refunds are usually processed within 24-48 hours. Bank transfers may take 7-14 business days. Once we process a refund, you'll receive an email confirmation.",
        category: "Payments",
      },
      {
        question: "Do you charge any booking fees?",
        answer:
          "Yes, a small service fee is added to bookings to maintain our platform. The exact fee amount is always displayed transparently during the checkout process before you confirm your payment. Some premium events may have additional fees set by the event organizers.",
        category: "Payments",
      },
      {
        question: "How can I find events near me?",
        answer:
          "To find events near you, use the search bar at the top of our homepage and enter your location, or allow the site to access your location when prompted. You can also browse events by category, date, or price range using our filter options. The map view also shows events in your vicinity.",
        category: "Events",
      },
      {
        question: "Can I get notifications about new events?",
        answer:
          'Currently, we send email notifications for booking confirmations, event updates, and cancellations. You can manage your email notification preferences in "Account Settings" under "Preferences". We are working on expanding notification options in the future.',
        category: "Events",
      },
      {
        question: "How do I leave a review for an event?",
        answer:
          'You can leave a review for events you\'ve attended. After the event date has passed, go to "My Bookings" in your account, find the event, and click "Leave a Review". Rate your experience and write your feedback. Reviews help other users and provide valuable feedback to event organizers.',
        category: "Events",
      },
      {
        question: "What happens if an event is canceled?",
        answer:
          "If an event is canceled by the organizer, you'll be notified via email and receive an in-app notification. An automatic refund will be processed to your original payment method, and your booking status will be updated accordingly. In some cases, the organizer may offer to reschedule the event or provide alternative options.",
        category: "Events",
      },
      {
        question: "How do I become a vendor on Gema?",
        answer:
          'To become a vendor, create a regular account first, then click on "Become a Vendor" in your account settings. Complete the vendor application form with details about your business, upload required documents for verification, and select your vendor subscription plan. Our team will review your application within 2-3 business days.',
        category: "Vendors",
      },
      {
        question: "What are the fees for vendors?",
        answer:
          "Vendor fees consist of a monthly subscription fee (with tiered plans starting at $29.99/month) and a per-transaction fee of 2.5-5% depending on your subscription tier. Premium plans offer lower transaction fees and additional features. You can view detailed pricing on our Vendor Pricing page.",
        category: "Vendors",
      },
      {
        question: "How do I list an event as a vendor?",
        answer:
          'To list an event, log in to your vendor dashboard and click "Create New Event". Fill out the event details form with information like title, description, date, time, location, ticket types, and pricing. Upload high-quality images and set your cancellation policy. Once submitted, events typically go live after a brief review process.',
        category: "Vendors",
      },
      {
        question: "When do vendors receive payment for bookings?",
        answer:
          "Vendors receive payments for successful events 24 hours after the event concludes, minus our service fee. For events with advance bookings, you can opt for our Early Payout program to receive partial payments before the event date. Payments are transferred directly to your connected bank account or vendor wallet.",
        category: "Vendors",
      },
    ],
    features: [],
    isActive: true,
    keywords: ["events", "dubai", "activities", "faq"],
    metaDescription:
      "Find answers to common questions about Gema, kids activities booking, payments, cancellations, and more. Get quick help and support for your queries.",
    metaTitle: "FAQ - Frequently Asked Questions | Gema",
    trustSignals: {
      yearsInBusiness: 0,
      certifications: [],
      awards: [],
    },
    updatedAt: "2026-02-21T09:26:26.432Z",
  },
];

const seedProductionSEO = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error("MONGODB_URI environment variable is not defined.");
      process.exit(1);
    }

    // Ensure the connection uses the correct database
    const dbName = MONGODB_URI.split("/").pop()?.split("?")[0] || "test";

    console.log(`Connecting to MongoDB...`);
    const conn = await mongoose.connect(MONGODB_URI as string);
    console.log(
      `MongoDB Connected: ${conn.connection.host}, Database: ${dbName}`,
    );

    const db = conn.connection.db;
    if (!db) {
      throw new Error("Database connection implicitly undefined.");
    }

    console.log("Upserting SEO and FAQ data for all pages...");

    for (const item of productionSeoData) {
      // Convert date strings back to objects
      if (item.createdAt) item.createdAt = new Date(item.createdAt);
      if (item.updatedAt) item.updatedAt = new Date(item.updatedAt);

      await db
        .collection("seocontents")
        .updateOne({ page: item.page }, { $set: item }, { upsert: true });

      console.log(`✓ Upserted data for page: ${item.page}`);
    }

    console.log("✅ Successfully seeded all production SEO and FAQ data!");
  } catch (err) {
    console.error("❌ Error seeding SEO data:", err);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
    }
  }
};

// Run the script
seedProductionSEO();
