/**
 * Public endpoints must not carry private vendor, teacher, author, commenter or
 * lead data. Seeds one record of every kind with each private field filled with a
 * recognisable canary value, then checks every public endpoint three ways:
 *  - no sensitive KEY with a value (findSensitiveKeys)
 *  - no embedded vendor with keys outside the public allowlist (vendorKeyViolations)
 *  - no canary VALUE anywhere in the raw response text (catches renamed fields)
 * Each endpoint must also contain a record we seeded, so an empty response cannot pass.
 */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import User from "../../../models/User";
import Vendor from "../../../models/Vendor";
import Teacher from "../../../models/Teacher";
import Collection from "../../../models/Collection";
import LeadPage from "../../../models/LeadPage";
import Comment from "../../../models/Comment";
import { Blog } from "../../../models/Blog";
import { BlogCategory } from "../../../models/BlogCategory";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, closeTestDB } from "../setup/testDB";
import { ensureCollections, signUpAs, teacherIdOf } from "../setup/factories";
import { cookie, signUp, signUpAdmin, vendorIdOf, insertEvent } from "../setup/session";
import { findSensitiveKeys, vendorKeyViolations } from "../setup/sensitiveKeys";
import { PUBLIC_ROUTES } from "./publicRoutes";

const oid = (id?: string) => new Types.ObjectId(id);

const BUSINESS = "Canary Kids Studio";
const ONLINE_TITLE = "Canary Online Robotics";
const CLASS_TITLE = "Canary Piano Class";

/** Private values seeded into the database. None of them may appear in a public response. */
const CANARY: Record<string, string> = {
  vendorEmail: "vendor-canary@private.test",
  vendorPhone: "+971501110001",
  contactEmail: "contact-canary@private.test",
  contactPhone: "+971501110002",
  taxId: "TAX-CANARY-4471",
  licenceUrl: "https://files.example.com/canary-licence.pdf",
  stripeAccount: "acct_canary_9921",
  bankAccount: "CANARY-IBAN-55501",
  street: "12 Canary Private Street",
  meetingOnline: "https://meet.example.com/canary-online-room",
  meetingClass: "https://meet.example.com/canary-class-room",
  meetingPassword: "pw-canary-7788",
  attachmentUrl: "https://files.example.com/canary-attachment.pdf",
  policyNumber: "POLICY-CANARY-3310",
  teacherPhone: "+971501110003",
  teacherUserPhone: "+971501110005",
  blogAuthorEmail: "author-canary@private.test",
  likerIp: "203.0.113.77",
  leadEmail: "lead-canary@private.test",
  leadPhone: "+971501110004",
  leadIp: "198.51.100.88",
};

type Seed = {
  vendorUserId: string;
  vendorId: string;
  onlineEventId: string;
  classEventId: string;
  teacherUserId: string;
  collectionId: string;
  blogId: string;
  commentId: string;
};

let app: Application;
let seed: Seed;
let adminSession: Awaited<ReturnType<typeof signUpAdmin>>;
let vendorSession: Awaited<ReturnType<typeof signUp>>;

/** Names of every canary that appears in a response's raw text. */
const leaked = (text: string | undefined) =>
  Object.entries(CANARY).filter(([, v]) => (text ?? "").includes(v)).map(([k]) => k);

const inspect = (res: request.Response) => ({
  sensitiveKeys: findSensitiveKeys(res.body),
  vendorKeys: vendorKeyViolations(res.body),
  canaries: leaked(res.text),
});
const clean = { sensitiveKeys: [], vendorKeys: [], canaries: [] };

/**
 * Endpoints that still leak and have not been fixed yet. Each must STILL leak: when a fix makes
 * one clean, its assertion breaks and the fix commit deletes the entry, so the regression case
 * goes red then green in the same commit as the fix. The end state is an empty set.
 */
const KNOWN_LEAKS = new Set<string>([
  "teacher profile by user id",
  "teachers list",
  "vendor profile by user id",
  "vendor profile by slug",
  "search: vendors by email",
  "search: vendors by name",
  "loop /api/teachers/public",
]);

const expectNoLeak = (label: string, res: request.Response, allowedKeys?: RegExp) => {
  const found = inspect(res);
  if (allowedKeys) found.sensitiveKeys = found.sensitiveKeys.filter((k) => !allowedKeys.test(k));
  if (KNOWN_LEAKS.has(label)) expect({ label, leaking: found }).not.toEqual({ label, leaking: clean });
  else expect(found).toEqual(clean);
};

/** Keys that are public on purpose, per route, with the reason. */
const ALLOWED: Record<string, RegExp> = {
  // schema.org Organization markup: the platform's own public contact point, not user data.
  "/api/api/seo/organization": /^contactPoint\.email$/,
};

beforeAll(async () => {
  await connectTestDB();
  await ensureCollections();
  app = createTestApp();

  // --- vendor with every private field filled ---------------------------------
  vendorSession = await signUp(app, "vendor");
  const vendorId = await vendorIdOf(vendorSession);
  await Vendor.collection.updateOne(
    { _id: oid(vendorId) },
    {
      $set: {
        businessName: BUSINESS,
        slug: "canary-kids-studio",
        description: "We run camps",
        logo: "https://img.example.com/canary-logo.png",
        email: CANARY.vendorEmail,
        phone: CANARY.vendorPhone,
        contactPerson: { name: "Owner Canary", email: CANARY.contactEmail, phone: CANARY.contactPhone },
        taxInformation: { taxId: CANARY.taxId, businessType: "LLC" },
        verificationDocuments: {
          businessLicense: { url: CANARY.licenceUrl, uploadedAt: new Date(), status: "approved" },
          taxCertificate: { url: CANARY.licenceUrl, uploadedAt: new Date(), status: "approved" },
        },
        paymentSettings: {
          paymentMode: "platform",
          stripeSettings: { stripeAccountId: CANARY.stripeAccount },
          bankAccountDetails: { accountNumber: CANARY.bankAccount },
        },
        address: { street: CANARY.street, city: "Dubai", state: "Dubai", zipCode: "00000", country: "AE" },
        location: { city: "Dubai", address: CANARY.street, coordinates: { lat: 25.2048, lng: 55.2708 } },
        stats: { totalEvents: 2, totalBookings: 3, totalRevenue: 987654, averageRating: 4.5, totalReviews: 2 },
      },
    },
  );

  // --- teacher (profile + user both carry contact details) --------------------
  const teacherSession = await signUpAs(app, "teacher");
  const teacherId = await teacherIdOf(teacherSession);
  await Teacher.collection.updateOne(
    { _id: oid(teacherId) },
    {
      $set: {
        fullName: "Ms Canary Teacher",
        bio: "Teaches piano",
        specialization: "Piano",
        slug: "ms-canary-teacher",
        isDeleted: false,
        isActive: true,
        phone: CANARY.teacherPhone,
        stats: { totalClasses: 2, totalStudents: 9, totalEarnings: 765432, averageRating: 4.8, totalReviews: 3, viewsCount: 4 },
      },
    },
  );
  await User.updateOne({ _id: teacherSession.userId }, { phone: CANARY.teacherUserPhone });

  // --- events (raw inserts skip defaults, so isActive/isDeleted are explicit) --
  const shared = {
    description: "desc",
    shortDescription: "short",
    category: "Arts",
    venueType: "Online",
    ageRange: [3, 12],
    currency: "AED",
    isActive: true,
    isDeleted: false,
    tags: ["robots"],
    meetingPassword: CANARY.meetingPassword,
    bookingAttachments: [{ originalName: "ticket.pdf", filename: "t.pdf", url: CANARY.attachmentUrl }],
    insuranceInfo: { provider: "AXA", policyNumber: CANARY.policyNumber },
  };
  const onlineEventId = await insertEvent(vendorId, {
    ...shared,
    title: ONLINE_TITLE,
    slug: "canary-online-robotics",
    price: 50,
    viewsCount: 10,
    meetingLink: CANARY.meetingOnline,
  });
  const classEventId = await insertEvent(vendorId, {
    ...shared,
    title: CLASS_TITLE,
    slug: "canary-piano-class",
    type: "Class",
    teacherId: oid(teacherId),
    price: 55,
    viewsCount: 5,
    meetingLink: CANARY.meetingClass,
  });

  // --- collections: ObjectId refs, and the embedded eventsData snapshot --------
  const collectionId = String(oid());
  const now = new Date();
  await Collection.collection.insertOne({
    _id: oid(collectionId),
    title: "Canary Rainy Day",
    description: "d",
    slug: "canary-rainy-day",
    count: 2,
    isActive: true,
    sortOrder: 1,
    events: [oid(onlineEventId), oid(classEventId)],
    createdAt: now,
    updatedAt: now,
  });
  await Collection.collection.insertOne({
    _id: oid(),
    title: "Canary Snapshot",
    description: "d",
    slug: "canary-snapshot",
    count: 1,
    isActive: true,
    sortOrder: 2,
    events: [],
    eventsData: [
      { _id: oid(onlineEventId), title: ONLINE_TITLE, vendorId: oid(vendorId), price: 50, status: "published", isApproved: true, isActive: true, isDeleted: false },
    ],
    createdAt: now,
    updatedAt: now,
  });

  // --- blog, comment and reply by a user with an email -------------------------
  const commenter = await signUp(app, "customer");
  const categoryId = oid();
  await BlogCategory.collection.insertOne({ _id: categoryId, name: "Canary News", slug: "canary-news", isActive: true, postsCount: 0 });
  const blogBase = {
    excerpt: "Ex",
    content: "Some content",
    category: categoryId,
    tags: ["camps"],
    status: "published",
    readTime: 1,
    viewCount: 5,
    likeCount: 1,
    shareCount: 0,
    commentsCount: 2,
    publishedAt: now,
    createdAt: now,
    author: { name: "Ann Author", email: CANARY.blogAuthorEmail, avatar: "https://img.example.com/a.png", bio: "Writer" },
  };
  const blogId = String(oid());
  await Blog.collection.insertOne({
    _id: oid(blogId), ...blogBase, title: "Canary Post", slug: "canary-post", featured: true,
    likedBy: [oid(commenter.userId)], likedByIPs: [CANARY.likerIp],
  });
  await Blog.collection.insertOne({
    _id: oid(), ...blogBase, title: "Canary Sibling", slug: "canary-sibling", featured: false, likedBy: [], likedByIPs: [],
  });
  const commentId = String(oid());
  const replyId = oid();
  const commentBase = { author: oid(commenter.userId), blogPost: oid(blogId), status: "active", likes: [], dislikes: [], createdAt: now, updatedAt: now };
  await Comment.collection.insertMany([
    { _id: oid(commentId), ...commentBase, content: "Nice", sanitizedContent: "Nice", replies: [replyId], parentComment: null },
    { _id: replyId, ...commentBase, content: "Thanks", sanitizedContent: "Thanks", replies: [], parentComment: oid(commentId) },
  ]);

  // --- lead page with a submitted lead ----------------------------------------
  await LeadPage.collection.insertOne({
    _id: oid(),
    event: oid(onlineEventId),
    isGlobal: false,
    isActive: true,
    viewCount: 0,
    leads: [{ _id: oid(), name: "Parent Canary", email: CANARY.leadEmail, phone: CANARY.leadPhone, message: "Call me", ipAddress: CANARY.leadIp, submittedAt: now }],
    createdAt: now,
    updatedAt: now,
  });

  // Public vendor search filters on `isActive: true`, a field the User schema does not define, so
  // real users never carry it and that search returns nothing (a separate bug). Set it raw so the
  // leak in what the search selects and matches can be exercised at all.
  await User.collection.updateOne({ _id: oid(vendorSession.userId) }, { $set: { isActive: true } });

  // Account emails are generated at sign-up, so they are canaries too.
  const emailOf = async (userId: string) => String((await User.findById(userId).select("email").lean())!.email);
  CANARY.vendorUserEmail = await emailOf(vendorSession.userId);
  CANARY.teacherUserEmail = await emailOf(teacherSession.userId);
  CANARY.commenterEmail = await emailOf(commenter.userId);
  CANARY.teacherProfileEmail = String((await Teacher.findById(teacherId).select("email").lean())!.email);

  adminSession = await signUpAdmin(app);
  seed = { vendorUserId: vendorSession.userId, vendorId, onlineEventId, classEventId, teacherUserId: teacherSession.userId, collectionId, blogId, commentId };
});
afterAll(closeTestDB);

describe("scanner sanity (a negative result is only trustworthy if a known positive is found)", () => {
  it("flags non-empty sensitive keys at any depth", () => {
    const body = { data: { events: [{ vendorId: { email: "a@b.c", businessName: "X" } }] } };
    expect(findSensitiveKeys(body)).toEqual(["data.events[0].vendorId.email"]);
  });

  it("ignores empty values and public keys", () => {
    expect(findSensitiveKeys({ email: "", leads: [], phone: null, paymentSettings: {}, title: "x" })).toEqual([]);
  });

  it("flags secret-looking prefixes and suffixes", () => {
    expect(findSensitiveKeys({ stripeAccountId: "acct_1", resetToken: "t", passwordHash: "h", apiSecret: "s" }).sort()).toEqual(
      ["apiSecret", "passwordHash", "resetToken", "stripeAccountId"],
    );
  });

  it("flags embedded vendor keys outside the allowlist", () => {
    const body = { events: [{ vendorId: { _id: "1", businessName: "B", logo: "l", userId: "u", taxId: "t" } }] };
    expect(vendorKeyViolations(body).sort()).toEqual(["events[0].vendorId.taxId", "events[0].vendorId.userId"]);
  });

  it("finds a canary in raw text", () => {
    expect(leaked(`{"x":"${CANARY.vendorEmail}"}`)).toEqual(["vendorEmail"]);
  });
});

type Endpoint = [name: string, url: (s: Seed) => string, present: string];

const ENDPOINTS: Endpoint[] = [
  ["homepage", () => "/api/homepage", BUSINESS],
  ["events list", () => "/api/events", ONLINE_TITLE],
  ["event detail by id", (s) => `/api/events/${s.onlineEventId}`, BUSINESS],
  ["event detail by slug (teaching)", () => "/api/events/canary-piano-class", "Ms Canary Teacher"],
  ["similar events", (s) => `/api/events/${s.onlineEventId}/similar`, CLASS_TITLE],
  ["organizer events", (s) => `/api/events/${s.onlineEventId}/organizer-events`, CLASS_TITLE],
  ["people also booked", (s) => `/api/events/${s.onlineEventId}/also-booked`, CLASS_TITLE],
  ["trending near you", () => "/api/events/trending-near-you", ONLINE_TITLE],
  ["collections list", () => "/api/collections", "Canary Rainy Day"],
  ["collection detail", (s) => `/api/collections/${s.collectionId}`, ONLINE_TITLE],
  ["blogs list", () => "/api/blogs", "Canary Post"],
  ["blogs featured", () => "/api/blogs/featured", "Canary Post"],
  ["blogs popular", () => "/api/blogs/popular", "Canary Post"],
  ["blogs recent", () => "/api/blogs/recent", "Canary Post"],
  ["blog detail", () => "/api/blogs/canary-post", "Canary Post"],
  ["related blogs", () => "/api/blogs/canary-post/related", "Canary Sibling"],
  ["blog comments", (s) => `/api/blog/posts/${s.blogId}/comments`, "Nice"],
  ["comment replies", (s) => `/api/blog/comments/${s.commentId}/replies`, "Thanks"],
  ["lead pages list", () => "/api/lead-pages", ONLINE_TITLE],
  ["lead page by event", (s) => `/api/lead-pages/${s.onlineEventId}`, ONLINE_TITLE],
  ["teacher profile by user id", (s) => `/api/teachers/public/${s.teacherUserId}`, "Teaches piano"],
  ["teachers list", () => "/api/teachers/public", "Ms Canary Teacher"],
  ["vendor profile by user id", (s) => `/api/vendors/public/${s.vendorUserId}`, BUSINESS],
  ["vendor profile by slug", () => "/api/vendors/public/canary-kids-studio", BUSINESS],
  ["vendors list", () => "/api/vendors", BUSINESS],
  ["global search", () => "/api/search?q=Canary&type=all", ONLINE_TITLE],
];

describe("public endpoints serve seeded records without private data", () => {
  it.each(ENDPOINTS)("%s", async (name, url, present) => {
    const res = await request(app).get(url(seed));
    expect(res.status).toBe(200);
    expect(res.text).toContain(present); // the seeded record is really in the response
    expectNoLeak(name, res);
  });
});

describe("public search", () => {
  it("does not match vendors by email address", async () => {
    // The response echoes `query`, so search the local part: the full address stays a clean canary.
    const localPart = CANARY.vendorUserEmail.split("@")[0];
    const res = await request(app).get(`/api/search?type=vendors&q=${encodeURIComponent(localPart)}`);
    expect(res.status).toBe(200);
    const matched = res.body.data.vendors.length > 0;
    expect(matched).toBe(KNOWN_LEAKS.has("search: vendors by email")); // true only while the leak exists
  });

  it("still finds a vendor by name, without their email", async () => {
    const res = await request(app).get("/api/search?type=vendors&q=T");
    expect(res.status).toBe(200);
    expect(res.body.data.vendors.length).toBeGreaterThan(0); // the vendor really is returned
    expectNoLeak("search: vendors by name", res);
  });
});

describe("every parameterless public GET in the reviewed allowlist", () => {
  const paths = Object.keys(PUBLIC_ROUTES)
    .filter((k) => k.startsWith("GET ") && !k.includes(":"))
    .map((k) => k.slice(4));

  it.each(paths)("%s", async (path) => {
    const res = await request(app).get(path);
    expectNoLeak(`loop ${path}`, res, ALLOWED[path]);
  });
});

describe("authorised viewers keep the data they need", () => {
  it("the owning vendor still sees their event's meeting link", async () => {
    const res = await request(app).get(`/api/vendors/events/${seed.onlineEventId}`).set("Cookie", cookie(vendorSession));
    expect(res.status).toBe(200);
    expect(res.text).toContain(CANARY.meetingOnline);
  });

  it("an admin still sees lead details", async () => {
    const res = await request(app).get("/api/admin/lead-pages").set("Cookie", cookie(adminSession));
    expect(res.status).toBe(200);
    expect(res.text).toContain(CANARY.leadEmail);
  });

  it("an admin still sees the vendor email in the admin event list", async () => {
    const res = await request(app).get("/api/events/admin/all").set("Cookie", cookie(adminSession));
    expect(res.status).toBe(200);
    expect(res.text).toContain(CANARY.vendorEmail);
  });
});
