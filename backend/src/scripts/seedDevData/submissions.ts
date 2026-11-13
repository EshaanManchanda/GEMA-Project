import crypto from "crypto";
import Contact from "../../models/Contact";
import NewsletterSubscriber from "../../models/NewsletterSubscriber";
import Partnership from "../../models/Partnership";
import CompetitionSubmission from "../../models/CompetitionSubmission";
import NationalDaySubmission from "../../models/NationalDaySubmission";
import { Section, make, pick, int, chance, daysAgo, fullName, emailOf, phone, EMIRATES, SCHOOLS } from "./helpers";

const SUBJECTS = ["General Inquiry", "Booking Support", "Vendor Partnership", "Technical Support", "Feedback", "Other"];
const MESSAGES = [
  "Hi, I would like to know whether the weekend workshop still has spots for a 7 year old.",
  "My booking confirmation email never arrived. Can you resend it?",
  "We run a kids' art studio in Sharjah and would love to list our classes.",
  "The payment page showed an error but I was charged. Please check.",
  "Great experience last week, the kids loved it! Any plans for more events?",
];
const GRADES = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);

export const submissions: Section = async () => {
  const contacts = make("contact", 45, (i) => {
    const name = fullName();
    const status = pick(["new", "new", "read", "responded"] as const);
    const createdAt = daysAgo(int(0, 80));
    return {
      name, email: emailOf(name, i), subject: pick(SUBJECTS), message: pick(MESSAGES), status,
      readAt: status !== "new" ? createdAt : undefined,
      respondedAt: status === "responded" ? createdAt : undefined,
      notes: status === "responded" ? "Replied by email." : undefined,
      createdAt, updatedAt: createdAt,
    };
  });

  const newsletter = make("newsletter", 70, (i) => {
    const name = fullName();
    const createdAt = daysAgo(int(0, 120));
    const active = chance(0.85);
    return {
      email: emailOf(name, i), name: chance(0.7) ? name : undefined, city: pick(["Dubai", "Abu Dhabi", "Sharjah", "Ajman"]),
      ageOfChildren: pick(["3-5", "6-8", "9-12", "13+"]), isActive: active, source: pick(["blog", "footer", "popup", "checkout", "profile", "api"]),
      preferences: { frequency: pick(["daily", "weekly", "monthly"]), categories: [], receivePromotions: chance(0.7) },
      subscriptionDate: createdAt, unsubscribeToken: crypto.randomBytes(32).toString("hex"),
      unsubscribeDate: active ? undefined : createdAt, createdAt, updatedAt: createdAt,
    };
  });

  const partnerships = make("partnership", 32, (i) => {
    const name = fullName();
    const status = pick(["pending", "pending", "contacted", "approved", "rejected"] as const);
    const createdAt = daysAgo(int(0, 90));
    return {
      name, email: emailOf(name, i), phone: phone(), organization: `${pick(["Little", "Bright", "Happy", "Star"])} ${pick(["Minds", "Steps", "Sparks", "Camp"])} ${i}`,
      partnershipType: pick(["vendor", "influencer", "school", "affiliate", "summer_camp", "play_zone", "workshop", "activity_centre", "other"]),
      campaignType: chance(0.4) ? "summer_2026" : "general", emirate: pick(EMIRATES), numberOfKids: String(int(10, 200)),
      message: "We would love to partner with Kidrove to reach more families.", agreeToTerms: true, status,
      contactedAt: status !== "pending" ? createdAt : undefined, approvedAt: status === "approved" ? createdAt : undefined,
      rejectedAt: status === "rejected" ? createdAt : undefined, paymentStatus: pick(["pending", "paid"]),
      createdAt, updatedAt: createdAt,
    };
  });

  const common = (name: string, grade: string, createdAt: Date) => ({
    participant: {
      parentName: fullName(), parentEmail: emailOf(`${name}.parent`, int(1, 999)), parentPhone: phone(),
      studentFullName: name, studentAge: int(6, 17), grade, gender: pick(["Male", "Female"]),
      schoolName: pick(SCHOOLS), schoolEmirate: pick(EMIRATES),
    },
    artworkUpload: {
      artworkUrl: `https://picsum.photos/seed/${encodeURIComponent(name)}/800/600`, artworkPublicId: `mock/${name}`,
      artworkOriginalName: "artwork.jpg", artworkSize: int(200000, 3000000), artworkMimetype: "image/jpeg",
    },
    status: pick(["pending", "under_review", "approved", "winner", "disqualified", "rejected"] as const),
    paymentStatus: pick(["paid", "paid", "pending", "failed"] as const),
    createdAt, updatedAt: createdAt,
  });

  const aiArt = make("competition", 30, (i) => {
    const name = fullName();
    const base = common(name, pick(GRADES), daysAgo(int(0, 60)));
    const medal = base.status === "winner" ? pick(["Gold", "Silver", "Bronze"]) : undefined;
    return {
      ...base, medal,
      artwork: { title: `Dream Robot ${i}`, description: "A friendly robot exploring the desert at sunset." },
      aiCreation: { tools: [pick(["Midjourney", "DALL-E", "Firefly"])], creationType: pick(["AI Assisted", "AI Created", "AI Created + Human Edited"]), mainPrompt: "a friendly robot in the desert at sunset, watercolor", changesAfterGeneration: pick(["No changes", "I made small changes"]) },
      declarations: { agreeTerms: true, responsibleAiDeclaration: true, originalityDeclaration: true },
      consent: { parentGuardianConsent: true, artworkDisplayPermission: pick(["yes", "no"]), nameDisplayPermission: chance(0.6), competitionUpdatesConsent: true },
    };
  });

  const nationalDay = make("nationalday", 30, (i) => {
    const name = fullName();
    const base = common(name, pick(GRADES), daysAgo(int(0, 60)));
    const bulk = chance(0.3);
    return {
      ...base, registrationType: bulk ? "school_bulk" : "individual", schoolBulkRef: bulk ? `BULK-${int(100, 130)}` : undefined,
      medal: base.status === "winner" ? pick(["Gold", "Silver", "Bronze"]) : undefined,
      participant: { ...base.participant, category: pick(["Junior", "Intermediate", "Senior"]) },
      artwork: { title: `Union Spirit ${i}`, description: "Celebrating Eid Al Etihad.", medium: pick(["Watercolor", "Acrylic", "Pencil"]), themePillar: pick(["Unity", "Heritage", "Future"]) },
      declarations: { agreeTerms: true, traditionalOnlyDeclaration: true, originalityDeclaration: true },
      consent: { parentGuardianConsent: true, artworkDisplayPermission: "yes", competitionUpdatesConsent: true },
    };
  });

  return [
    { label: "contacts", model: Contact, docs: contacts },
    { label: "newsletter subscribers", model: NewsletterSubscriber, docs: newsletter },
    { label: "partnerships", model: Partnership, docs: partnerships },
    { label: "ai-art submissions", model: CompetitionSubmission, docs: aiArt },
    { label: "national-day submissions", model: NationalDaySubmission, docs: nationalDay },
  ];
};
