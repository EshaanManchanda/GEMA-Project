export interface FAQCategoryItem {
  category: string;
  questions: Array<{
    id: number;
    question: string;
    answer: string;
  }>;
}

export const FALLBACK_FAQ_DATA: FAQCategoryItem[] = [
  {
    category: "General",
    questions: [
      {
        id: 1,
        question: "What is Kidrove?",
        answer: "Kidrove is UAE's premier platform connecting families with over 2,500 curated kids activities and educational experiences. We help families discover safe, inspiring, and enriching workshops, camps, classes, and adventures for children of all ages across the UAE."
      },
      {
        id: 2,
        question: "How do you ensure activity quality and safety?",
        answer: "Every activity on Kidrove undergoes a rigorous 5-step verification process: vendor background check, facility inspection, safety protocol review, insurance verification, and ongoing customer review monitoring. We only partner with licensed, trusted organizers."
      },
      {
        id: 3,
        question: "Is Kidrove available across all emirates?",
        answer: "Yes! Kidrove offers activities, camps, and workshops across Dubai, Abu Dhabi, Sharjah, and other emirates, as well as live interactive online cohorts accessible anywhere."
      },
      {
        id: 4,
        question: "How do I contact customer support?",
        answer: "You can reach our dedicated support team via email at hello@kidrove.com, through our live chat widget, or by submitting an inquiry on our Contact page. Our team typically responds within a few business hours."
      }
    ]
  },
  {
    category: "Bookings & Orders",
    questions: [
      {
        id: 5,
        question: "How do I book an activity or workshop?",
        answer: "Browse our events or camps, select your preferred date, cohort, or time slot, and proceed through our secure checkout. You will immediately receive a digital confirmation and ticket with all arrival or meeting details."
      },
      {
        id: 6,
        question: "Can I cancel or reschedule my booking?",
        answer: "Yes, cancellation and reschedule policies vary by event provider. Most workshops allow free cancellation or reschedule up to 24–48 hours prior to start time. You can view policy details on the event page and manage bookings directly from your account."
      },
      {
        id: 7,
        question: "How do I receive my tickets?",
        answer: "Tickets and confirmation vouchers are instantly emailed upon booking and are permanently accessible from your Kidrove account under 'My Bookings'."
      }
    ]
  },
  {
    category: "Payments & Security",
    questions: [
      {
        id: 8,
        question: "What payment methods are accepted?",
        answer: "We accept all major debit and credit cards (Visa, MasterCard, American Express), Apple Pay, and Google Pay. All payments are processed through PCI-DSS certified secure gateways."
      },
      {
        id: 9,
        question: "Are there any hidden fees?",
        answer: "No. Pricing is completely transparent. The price shown includes applicable VAT and there are zero surprise processing fees at checkout."
      },
      {
        id: 10,
        question: "When will I receive my refund if an event is canceled?",
        answer: "If an organizer cancels an event, an automatic full refund is initiated immediately to your original payment method, typically reflecting on your statement within 5 to 7 business days."
      }
    ]
  },
  {
    category: "For Parents & Students",
    questions: [
      {
        id: 11,
        question: "What age groups are supported?",
        answer: "We offer programs for toddlers, early childhood (ages 3–6), primary grades (ages 7–11), and teenagers (grades 7–12 / ages 12–18). Filter by grade or age to find the ideal match for your child."
      },
      {
        id: 12,
        question: "Do students receive certificates?",
        answer: "Yes! Most cohorts, workshops, camps, and competitions include an official Kidrove Certificate of Participation or Achievement featuring digital verification."
      }
    ]
  },
  {
    category: "For Vendors & Educators",
    questions: [
      {
        id: 13,
        question: "How can schools or educators list activities?",
        answer: "Organizations, academies, and educators can click 'Partner with Us' or 'Become a Vendor' to submit their details. Our team conducts a verification check and sets up your organizer dashboard within 2–3 business days."
      }
    ]
  }
];

