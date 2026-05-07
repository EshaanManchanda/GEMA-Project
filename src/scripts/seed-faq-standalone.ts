import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load environment variables based on environment
const envPath =
  process.env.NODE_ENV === "production"
    ? path.resolve(process.cwd(), ".env.production")
    : path.resolve(process.cwd(), ".env");

dotenv.config({ path: envPath });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is not defined.");
  process.exit(1);
}

// Ensure the connection uses the correct database
const dbName = MONGODB_URI.split("/").pop()?.split("?")[0] || "test";

const defaultFaqData = [
  {
    category: "General",
    questions: [
      {
        question: `What is Kidrove?`,
        answer: `Kidrove is a comprehensive platform that connects event organizers with attendees. We provide a marketplace for discovering, booking, and managing various types of events, from concerts and workshops to conferences and private parties.`,
      },
      {
        question: "How do I contact customer support?",
        answer: `You can reach our customer support team through multiple channels: email us at hello@kidrove.com, call us at +971 4 123 4567 during business hours (9 AM - 6 PM EST, Monday to Friday), or use the contact form on our website for assistance.`,
      },
      {
        question: `Is Kidrove available in my country?`,
        answer: `Kidrove is currently available in the United Arab Emirates.`,
      },
      {
        question: "How do I report an issue with the platform?",
        answer: `To report any issues with our platform, please use the "Report an Issue" form in the Help Center section of your account, or email us directly at hello@kidrove.com with details of the problem you're experiencing. Include screenshots if possible to help us resolve your issue more quickly.`,
      },
    ],
  },
  {
    category: "Account",
    questions: [
      {
        question: "How do I create an account?",
        answer:
          'Creating an account is simple! Click on the "Sign Up" button in the top right corner of our homepage. You can register using your email address, or sign up with your Google or Facebook account for a quicker process. Follow the prompts to complete your profile information.',
      },
      {
        question: "How do I reset my password?",
        answer:
          'To reset your password, click on the "Login" button, then select "Forgot Password". Enter the email address associated with your account, and we\'ll send you a password reset link. Follow the instructions in the email to create a new password.',
      },
      {
        question: "Can I have both an attendee and vendor account?",
        answer:
          'Yes, you can maintain both types of accounts. Start by creating a regular attendee account, then navigate to "Account Settings" and select "Become a Vendor" to set up your vendor profile. You\'ll be able to switch between the two account types using the toggle in your dashboard.',
      },
      {
        question: "How do I delete my account?",
        answer:
          'To delete your account, go to "Account Settings" and scroll to the bottom where you\'ll find the "Delete Account" option. Please note that account deletion is permanent and will remove all your data, including booking history and saved events. If you have active bookings, we recommend resolving those before deleting your account.',
      },
    ],
  },
  {
    category: "Bookings",
    questions: [
      {
        question: "How do I book an event?",
        answer:
          'To book an event, browse our event listings or search for specific events. Once you find an event you\'re interested in, click on it to view details. Select the number of tickets and any additional options, then click "Book Now". Follow the checkout process to complete your booking with payment.',
      },
      {
        question: "Can I cancel my booking?",
        answer:
          'Yes, you can cancel bookings, but cancellation policies vary by event. To cancel, go to "My Bookings" in your account dashboard, find the booking you wish to cancel, and click "Cancel Booking". The system will display the applicable refund amount based on the event\'s cancellation policy before you confirm.',
      },
      {
        question: "How do I get my tickets after booking?",
        answer:
          'After completing your booking, tickets are automatically sent to the email address associated with your account. You can also access your tickets at any time by logging into your account and going to "My Bookings". From there, you can download or print your tickets as needed.',
      },
      {
        question: "Can I transfer my tickets to someone else?",
        answer:
          'Yes, many events allow ticket transfers. To transfer tickets, go to "My Bookings" in your account, select the booking, and click "Transfer Tickets". Enter the recipient\'s email address and follow the prompts. Please note that some events may have restrictions on ticket transfers or may charge a transfer fee.',
      },
    ],
  },
  {
    category: "Payments",
    questions: [
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept various payment methods including major credit cards (Visa, MasterCard, American Express, Discover), PayPal, Apple Pay, and Google Pay. In select regions, we also support bank transfers and local payment options. All payments are processed securely through our payment gateway.",
      },
      {
        question: "Is my payment information secure?",
        answer:
          "Absolutely. We take security seriously and use industry-standard encryption to protect your payment information. We are PCI DSS compliant and never store your full credit card details on our servers. All transactions are processed through secure, trusted payment gateways.",
      },
      {
        question: "When will I receive my refund?",
        answer:
          "Refund processing times depend on your payment method. Credit card refunds typically take 5-10 business days to appear on your statement. PayPal refunds are usually processed within 24-48 hours. Bank transfers may take 7-14 business days. Once we process a refund, you'll receive an email confirmation.",
      },
      {
        question: "Do you charge any booking fees?",
        answer:
          "Yes, a small service fee is added to bookings to maintain our platform. The exact fee amount is always displayed transparently during the checkout process before you confirm your payment. Some premium events may have additional fees set by the event organizers.",
      },
    ],
  },
  {
    category: "Events",
    questions: [
      {
        question: "How can I find events near me?",
        answer:
          "To find events near you, use the search bar at the top of our homepage and enter your location, or allow the site to access your location when prompted. You can also browse events by category, date, or price range using our filter options. The map view also shows events in your vicinity.",
      },
      {
        question: "Can I get notifications about new events?",
        answer:
          'Currently, we send email notifications for booking confirmations, event updates, and cancellations. You can manage your email notification preferences in "Account Settings" under "Preferences". We are working on expanding notification options in the future.',
      },
      {
        question: "How do I leave a review for an event?",
        answer:
          'You can leave a review for events you\'ve attended. After the event date has passed, go to "My Bookings" in your account, find the event, and click "Leave a Review". Rate your experience and write your feedback. Reviews help other users and provide valuable feedback to event organizers.',
      },
      {
        question: "What happens if an event is canceled?",
        answer:
          "If an event is canceled by the organizer, you'll be notified via email and receive an in-app notification. An automatic refund will be processed to your original payment method, and your booking status will be updated accordingly. In some cases, the organizer may offer to reschedule the event or provide alternative options.",
      },
    ],
  },
  {
    category: "Vendors",
    questions: [
      {
        question: `How do I become a vendor on Kidrove?`,
        answer:
          'To become a vendor, create a regular account first, then click on "Become a Vendor" in your account settings. Complete the vendor application form with details about your business, upload required documents for verification, and select your vendor subscription plan. Our team will review your application within 2-3 business days.',
      },
      {
        question: "What are the fees for vendors?",
        answer:
          "Vendor fees consist of a monthly subscription fee (with tiered plans starting at $29.99/month) and a per-transaction fee of 2.5-5% depending on your subscription tier. Premium plans offer lower transaction fees and additional features. You can view detailed pricing on our Vendor Pricing page.",
      },
      {
        question: "How do I list an event as a vendor?",
        answer:
          'To list an event, log in to your vendor dashboard and click "Create New Event". Fill out the event details form with information like title, description, date, time, location, ticket types, and pricing. Upload high-quality images and set your cancellation policy. Once submitted, events typically go live after a brief review process.',
      },
      {
        question: "When do vendors receive payment for bookings?",
        answer:
          "Vendors receive payments for successful events 24 hours after the event concludes, minus our service fee. For events with advance bookings, you can opt for our Early Payout program to receive partial payments before the event date. Payments are transferred directly to your connected bank account or vendor wallet.",
      },
    ],
  },
];

// Flatten the FAQs for the DB structure
const flattenedFaqs = defaultFaqData.flatMap((categoryObj) =>
  categoryObj.questions.map((q) => ({
    question: q.question,
    answer: q.answer,
    category: categoryObj.category,
  })),
);

async function seedStandaloneFaqs() {
  try {
    console.log(`Connecting to MongoDB...`);
    const conn = await mongoose.connect(MONGODB_URI as string);
    console.log(
      `MongoDB Connected: ${conn.connection.host}, Database: ${dbName}`,
    );

    const db = conn.connection.db;
    if (!db) {
      throw new Error("Database connection implicitly undefined.");
    }

    console.log(
      "Upserting standalone FAQ page data into the seocontents collection...",
    );

    const result = await db.collection("seocontents").updateOne(
      { page: "faq" },
      {
        $set: {
          page: "faq",
          metaTitle: "Frequently Asked Questions | Kidrove",
          metaDescription:
            "Find answers to all your questions about booking, hosting, and attending events on Kidrove.",
          keywords: ["kidrove", "faq", "help", "support", "booking"],
          faqItems: flattenedFaqs,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          features: [],
          trustSignals: {
            yearsInBusiness: 0,
            certifications: [],
            awards: [],
          },
        },
      },
      { upsert: true },
    );

    if (result.matchedCount > 0) {
      console.log("Successfully updated existing FAQ document.");
    } else {
      console.log("Successfully inserted new FAQ document.");
    }

    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
    }
  }
}

// Run the script
seedStandaloneFaqs();
