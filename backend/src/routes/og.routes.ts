import { Router, Request, Response } from "express";
import { escapeHtml } from "../utils/htmlHelpers";
import Event from "../models/Event";
import { Blog } from "../models/Blog";
import Vendor from "../models/Vendor";
import Teacher from "../models/Teacher";
import Category from "../models/Category";
import Collection from "../models/Collection";
import Review from "../models/Review";
import { seoService, StructuredData } from "../services/seo.service";
import { SEO_CONFIG } from "../config/env";
import logger from "../config/logger";

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "https://kidrove.com";
const DEFAULT_IMAGE = `${FRONTEND_URL}/og-default.png`;
const SITE_NAME = SEO_CONFIG.siteName;

function truncate(text: string, len = 160): string {
  if (!text) return "";
  return text.length > len ? text.substring(0, len - 3) + "..." : text;
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function jsonLdScript(data: StructuredData | StructuredData[]): string {
  // Escape </script> breakout + Unicode line separators to prevent XSS in embedded JSON-LD
  const safe = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `<script type="application/ld+json">${safe}</script>`;
}

function buildOgMeta(p: {
  title: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
  type: string;
}): string {
  const t = escapeHtml(p.title);
  const d = escapeHtml(p.description);
  const img = escapeHtml(p.imageUrl);
  const url = escapeHtml(p.canonicalUrl);
  return `  <title>${t}</title>
  <meta name="description" content="${d}" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="${escapeHtml(p.type)}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${img}" />
  <link rel="canonical" href="${url}" />`;
}

function buildCrawlerPage(opts: {
  title: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
  type: string;
  bodyHtml: string;
  jsonLd: StructuredData[];
  breadcrumbs?: Array<{ name: string; url: string }>;
}): string {
  const ogMeta = buildOgMeta(opts);
  const orgLd = seoService.generateOrganizationStructuredData();
  const webSiteLd = seoService.generateWebSiteStructuredData();
  const allLd = [orgLd, webSiteLd, ...opts.jsonLd];

  if (opts.breadcrumbs?.length) {
    allLd.push(seoService.generateBreadcrumbStructuredData(opts.breadcrumbs));
  }

  const ldScripts = allLd.map((ld) => jsonLdScript(ld)).join("\n  ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
${ogMeta}
  ${ldScripts}
</head>
<body>
${opts.bodyHtml}
  <footer>
    <p>&copy; ${new Date().getFullYear()} <a href="${FRONTEND_URL}">${SITE_NAME}</a> &mdash; Discover Amazing Kids Activities &amp; Events</p>
  </footer>
</body>
</html>`;
}

function buildOgHtml(params: {
  title: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
  type: string;
}): string {
  const ogMeta = buildOgMeta(params);
  return `<!DOCTYPE html><html><head>
  <meta charset="utf-8">
${ogMeta}
  <meta http-equiv="refresh" content="0; url=${escapeHtml(params.canonicalUrl)}" />
  <script>window.location.replace("${escapeHtml(params.canonicalUrl)}")</script>
</head><body></body></html>`;
}

// ─── Crawler HTML render functions (called by prerenderMiddleware) ───

async function renderEventHtml(slug: string): Promise<string | null> {
  const event = await Event.findOne({
    slug,
    status: "published",
    isActive: true,
    isApproved: true,
  })
    .populate("imageAssets")
    .populate("vendorId", "businessName")
    .select(
      "title description shortDescription slug seoMeta images imageAssets price currency " +
      "dateSchedule ageRange location category reviewCount averageRating vendorId createdAt updatedAt",
    )
    .lean();

  if (!event) return null;

  const title = `${event.title} | Kids Events in ${(event.location as any)?.city || "UAE"} | ${SITE_NAME}`;
  const rawDesc = stripHtml(
    (event.seoMeta as any)?.description || (event.shortDescription as string) || (event.description as string) || "",
  );
  const description = truncate(rawDesc);

  let imageUrl = DEFAULT_IMAGE;
  const assets = (event.imageAssets as any[]) || [];
  if (assets.length) imageUrl = assets[0].url || DEFAULT_IMAGE;
  else if ((event.images as string[])?.length) imageUrl = (event.images as string[])[0];

  const canonicalUrl = `${FRONTEND_URL}/events/${slug}`;
  const eventLd = seoService.generateEventStructuredData(event);
  const faqLd = seoService.generateEventFAQStructuredData(event);

  const jsonLd: StructuredData[] = [eventLd];
  if (faqLd) jsonLd.push(faqLd);

  // Fetch reviews for Review schema
  const reviews = await Review.find({ event: event._id, status: "approved" })
    .select("rating comment userName createdAt")
    .limit(5)
    .lean();
  if (reviews.length) {
    jsonLd.push(...seoService.generateReviewStructuredData(reviews));
  }

  // Fetch related events
  const related = await Event.find({
    category: event.category,
    status: "published",
    isActive: true,
    isApproved: true,
    _id: { $ne: event._id },
  })
    .select("title slug")
    .limit(5)
    .lean();

  const price = event.price || (event.dateSchedule as any)?.[0]?.price || 0;
  const currency = event.currency || "AED";
  const schedule = (event.dateSchedule as any[])?.[0];
  const ageRange = event.ageRange as [number, number] | undefined;
  const city = (event.location as any)?.city || "UAE";

  let bodyHtml = `  <main>
    <h1>${escapeHtml(event.title as string)}</h1>
    <p>${escapeHtml(description)}</p>
    <dl>
      <dt>Price</dt><dd>${price === 0 ? "Free" : `${currency} ${price}`}</dd>
      <dt>Location</dt><dd>${escapeHtml(city)}${(event.location as any)?.address ? ", " + escapeHtml((event.location as any).address) : ""}</dd>`;

  if (schedule?.startDate) {
    bodyHtml += `\n      <dt>Date</dt><dd>${new Date(schedule.startDate).toLocaleDateString("en-GB", { dateStyle: "long" })}${schedule.endDate ? " – " + new Date(schedule.endDate).toLocaleDateString("en-GB", { dateStyle: "long" }) : ""}</dd>`;
  }
  if (ageRange) {
    bodyHtml += `\n      <dt>Age Range</dt><dd>${ageRange[0]} – ${ageRange[1]} years</dd>`;
  }
  if (event.reviewCount && (event as any).averageRating) {
    bodyHtml += `\n      <dt>Rating</dt><dd>${((event as any).averageRating as number).toFixed(1)}/5 (${event.reviewCount} reviews)</dd>`;
  }

  bodyHtml += `\n    </dl>
    <p><a href="${canonicalUrl}">Book Now on ${SITE_NAME}</a></p>`;

  if (reviews.length) {
    bodyHtml += `\n    <h2>Reviews</h2>\n    <ul>`;
    reviews.forEach((r: any) => {
      bodyHtml += `\n      <li><strong>${escapeHtml(r.userName || "User")}</strong> (${r.rating}/5): ${escapeHtml(truncate(r.comment || "", 200))}</li>`;
    });
    bodyHtml += `\n    </ul>`;
  }

  if (related.length) {
    bodyHtml += `\n    <h2>Related Events</h2>\n    <ul>`;
    related.forEach((r) => {
      bodyHtml += `\n      <li><a href="${FRONTEND_URL}/events/${r.slug || r._id}">${escapeHtml(r.title as string)}</a></li>`;
    });
    bodyHtml += `\n    </ul>`;
  }

  bodyHtml += `\n  </main>`;

  return buildCrawlerPage({
    title,
    description,
    imageUrl,
    canonicalUrl,
    type: "website",
    bodyHtml,
    jsonLd,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Events", url: "/events" },
      { name: event.title as string, url: `/events/${slug}` },
    ],
  });
}

async function renderCollectionHtml(id: string): Promise<string | null> {
  const collection = await Collection.findById(id)
    .select("title description slug seo eventsData events")
    .lean();

  if (!collection) return null;

  const title = `${(collection.title as string) || "Collection"} | ${SITE_NAME}`;
  const description = truncate(
    (collection as any).seo?.metaDescription || stripHtml(collection.description as string) || "",
  );
  const canonicalUrl = `${FRONTEND_URL}/collections/${id}`;

  // Use embedded eventsData if available, otherwise query by ObjectId refs
  let events: any[] = ((collection as any).eventsData || []).filter(
    (e: any) => e.status === "published" && e.isActive !== false && e.isApproved !== false,
  );
  if (!events.length && (collection.events as any[])?.length) {
    events = await Event.find({
      _id: { $in: collection.events },
      status: "published",
      isActive: true,
      isApproved: true,
    })
      .select("title slug images price currency")
      .lean();
  }

  const itemListLd = seoService.generateCollectionItemListStructuredData(collection, events);

  let bodyHtml = `  <main>
    <h1>${escapeHtml(collection.title as string)}</h1>
    <p>${escapeHtml(description)}</p>`;

  if (events.length) {
    bodyHtml += `\n    <h2>Events in this Collection</h2>\n    <ul>`;
    events.forEach((ev: any) => {
      const evPrice = ev.price || 0;
      const evCurrency = ev.currency || "AED";
      bodyHtml += `\n      <li><a href="${FRONTEND_URL}/events/${ev.slug || ev._id}">${escapeHtml(ev.title)}</a> — ${evPrice === 0 ? "Free" : `${evCurrency} ${evPrice}`}</li>`;
    });
    bodyHtml += `\n    </ul>`;
  }
  bodyHtml += `\n  </main>`;

  return buildCrawlerPage({
    title,
    description,
    imageUrl: DEFAULT_IMAGE,
    canonicalUrl,
    type: "website",
    bodyHtml,
    jsonLd: [itemListLd],
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Collections", url: "/collections" },
      { name: (collection.title as string) || "Collection", url: `/collections/${id}` },
    ],
  });
}

async function renderBlogHtml(slug: string): Promise<string | null> {
  const blog = await Blog.findOne({ slug, status: "published" })
    .populate("featuredImageAsset")
    .select("title slug excerpt content seo featuredImage featuredImageAsset tags readTime publishedAt createdAt updatedAt")
    .lean();

  if (!blog) return null;

  const title = blog.seo?.metaTitle || `${blog.title} | ${SITE_NAME}`;
  const description = truncate(blog.seo?.metaDescription || blog.excerpt || "");
  let imageUrl = DEFAULT_IMAGE;
  if ((blog.featuredImageAsset as any)?.url) imageUrl = (blog.featuredImageAsset as any).url;
  else if (blog.featuredImage) imageUrl = blog.featuredImage;

  const canonicalUrl = `${FRONTEND_URL}/blog/${slug}`;
  const blogLd = seoService.generateBlogStructuredData(blog);
  const speakableLd = seoService.generateSpeakableStructuredData(canonicalUrl);

  // Article schema (Google/Gemini prefer Article alongside BlogPosting)
  const articleLd: StructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: blog.title,
    description: blog.seo?.metaDescription || blog.excerpt || "",
    image: imageUrl,
    datePublished: blog.publishedAt || blog.createdAt,
    dateModified: blog.updatedAt,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${FRONTEND_URL}/assets/images/logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
  };

  const contentText = stripHtml(blog.content || "");

  let bodyHtml = `  <article class="article-body">
    <h1>${escapeHtml(blog.title)}</h1>
    <p class="blog-excerpt">${escapeHtml(blog.excerpt || "")}</p>
    <p>${escapeHtml(truncate(contentText, 1000))}</p>
    <p><a href="${canonicalUrl}">Read full article on ${SITE_NAME}</a></p>
  </article>`;

  return buildCrawlerPage({
    title,
    description,
    imageUrl,
    canonicalUrl,
    type: "article",
    bodyHtml,
    jsonLd: [blogLd, articleLd, speakableLd],
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Blog", url: "/blog" },
      { name: blog.title, url: `/blog/${slug}` },
    ],
  });
}

async function renderVendorHtml(id: string): Promise<string | null> {
  const vendor = await Vendor.findById(id)
    .select("businessName description logo coverImage")
    .lean();

  if (!vendor) return null;

  const title = `${vendor.businessName || "Vendor"} | ${SITE_NAME}`;
  const description = truncate((vendor.description as string) || "");
  const imageUrl = (vendor.logo as string) || (vendor.coverImage as string) || DEFAULT_IMAGE;
  const canonicalUrl = `${FRONTEND_URL}/vendors/${id}`;

  const bodyHtml = `  <main>
    <h1>${escapeHtml(vendor.businessName as string)}</h1>
    <p>${escapeHtml(description)}</p>
    <p><a href="${canonicalUrl}">View vendor on ${SITE_NAME}</a></p>
  </main>`;

  return buildCrawlerPage({
    title,
    description,
    imageUrl,
    canonicalUrl,
    type: "website",
    bodyHtml,
    jsonLd: [],
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Vendors", url: "/vendors" },
      { name: (vendor.businessName as string) || "Vendor", url: `/vendors/${id}` },
    ],
  });
}

async function renderTeacherHtml(id: string): Promise<string | null> {
  const teacher = await Teacher.findById(id)
    .populate("profileImageAssetId")
    .select("fullName bio profileImageAssetId specialization subjects slug")
    .lean();

  if (!teacher) return null;

  const title = teacher.fullName ? `${teacher.fullName} | ${SITE_NAME}` : SITE_NAME;
  const rawDesc = (teacher.bio as string) || (teacher.specialization as string) || "";
  const description = truncate(rawDesc);
  let imageUrl = DEFAULT_IMAGE;
  if ((teacher.profileImageAssetId as any)?.url) imageUrl = (teacher.profileImageAssetId as any).url;
  const canonicalUrl = `${FRONTEND_URL}/teachers/${id}`;

  const bodyHtml = `  <main>
    <h1>${escapeHtml(teacher.fullName || "Instructor")}</h1>
    ${teacher.specialization ? `<p><strong>Specialization:</strong> ${escapeHtml(teacher.specialization as string)}</p>` : ""}
    <p>${escapeHtml(description)}</p>
    <p><a href="${canonicalUrl}">View profile on ${SITE_NAME}</a></p>
  </main>`;

  return buildCrawlerPage({
    title,
    description,
    imageUrl,
    canonicalUrl,
    type: "profile",
    bodyHtml,
    jsonLd: [],
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Teachers", url: "/teachers" },
      { name: teacher.fullName || "Instructor", url: `/teachers/${id}` },
    ],
  });
}

async function renderCategoryHtml(slug: string): Promise<string | null> {
  const category = await Category.findOne({ slug })
    .populate("iconAsset")
    .select("name slug description icon iconAsset seo")
    .lean();

  if (!category) return null;

  const title = `${category.name} Events for Kids | ${SITE_NAME}`;
  const description = truncate(
    (category as any).seo?.description || (category.description as string) || "",
  );
  let imageUrl = DEFAULT_IMAGE;
  if ((category as any).iconAsset?.url) imageUrl = (category as any).iconAsset.url;
  else if (category.icon) imageUrl = category.icon;
  const canonicalUrl = `${FRONTEND_URL}/categories/${slug}`;

  const events = await Event.find({
    category: category.name,
    status: "published",
    isActive: true,
    isApproved: true,
  })
    .select("title slug")
    .limit(20)
    .lean();

  const itemListLd = seoService.generateCategoryItemListStructuredData(category, events);

  let bodyHtml = `  <main>
    <h1>${escapeHtml(category.name as string)} Events for Kids</h1>
    <p>${escapeHtml(description)}</p>`;

  if (events.length) {
    bodyHtml += `\n    <h2>${escapeHtml(category.name as string)} Activities</h2>\n    <ul>`;
    events.forEach((ev) => {
      bodyHtml += `\n      <li><a href="${FRONTEND_URL}/events/${ev.slug || ev._id}">${escapeHtml(ev.title as string)}</a></li>`;
    });
    bodyHtml += `\n    </ul>`;
  }
  bodyHtml += `\n  </main>`;

  return buildCrawlerPage({
    title,
    description,
    imageUrl,
    canonicalUrl,
    type: "website",
    bodyHtml,
    jsonLd: [itemListLd],
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Categories", url: "/categories" },
      { name: category.name as string, url: `/categories/${slug}` },
    ],
  });
}

async function renderHomepageHtml(): Promise<string | null> {
  const [eventCount, categoryCount] = await Promise.all([
    Event.countDocuments({ status: "published", isActive: true, isApproved: true }),
    Category.countDocuments({ isActive: true }),
  ]);

  const featuredEvents = await Event.find({
    status: "published",
    isActive: true,
    isApproved: true,
  })
    .select("title slug price currency location.city")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const categories = await Category.find({ isActive: true })
    .select("name slug")
    .limit(15)
    .lean();

  const title = `${SITE_NAME} — Discover Amazing Kids Activities & Events in UAE`;
  const description =
    "Find and book the best kids activities, educational programs, and family events in the UAE. Safe, fun, and memorable experiences for children of all ages.";

  const faqItems = [
    { question: "What is Kidrove?", answer: "Kidrove is the UAE's leading platform for discovering and booking kids activities, events, workshops, summer camps, and educational programs." },
    { question: "How do I book an event?", answer: "Browse events on kidrove.com, select the one you like, choose a date, and complete the booking online. You'll receive a confirmation with your tickets." },
    { question: "What age groups do you cater to?", answer: "Kidrove offers activities for children aged 0 to 18 years, including toddler play, school-age workshops, and teen programs." },
    { question: "Which cities do you cover?", answer: "We cover events across the UAE including Dubai, Abu Dhabi, Sharjah, Ajman, and other emirates." },
    { question: "Can I get a refund?", answer: "Refund policies vary by event organizer. Check the specific event page for cancellation and refund terms before booking." },
  ];

  const faqLd = seoService.generateHomepageFAQStructuredData(faqItems);
  const enhancedOrgLd = seoService.generateEnhancedOrganizationStructuredData({
    totalEvents: eventCount,
  });
  const featureListLd = seoService.generateFeatureListStructuredData([
    { title: "Verified Event Organizers", description: "All vendors are vetted for safety and quality" },
    { title: "Easy Online Booking", description: "Book and pay securely in minutes" },
    { title: "Age-Appropriate Recommendations", description: "Find activities matched to your child's age" },
    { title: "Ratings & Reviews", description: "Read real parent reviews before booking" },
  ]);

  let bodyHtml = `  <main>
    <h1>Kidrove — Discover Amazing Kids Activities &amp; Events in UAE</h1>
    <p>${escapeHtml(description)}</p>
    <p>${eventCount}+ events across ${categoryCount} categories</p>`;

  if (featuredEvents.length) {
    bodyHtml += `\n    <h2>Latest Events</h2>\n    <ul>`;
    featuredEvents.forEach((ev: any) => {
      const p = ev.price || 0;
      const c = ev.currency || "AED";
      bodyHtml += `\n      <li><a href="${FRONTEND_URL}/events/${ev.slug || ev._id}">${escapeHtml(ev.title)}</a> — ${p === 0 ? "Free" : `${c} ${p}`} in ${escapeHtml(ev.location?.city || "UAE")}</li>`;
    });
    bodyHtml += `\n    </ul>`;
  }

  if (categories.length) {
    bodyHtml += `\n    <h2>Browse by Category</h2>\n    <ul>`;
    categories.forEach((cat: any) => {
      bodyHtml += `\n      <li><a href="${FRONTEND_URL}/categories/${cat.slug || cat._id}">${escapeHtml(cat.name)}</a></li>`;
    });
    bodyHtml += `\n    </ul>`;
  }

  bodyHtml += `\n    <h2>Frequently Asked Questions</h2>\n    <dl>`;
  faqItems.forEach((faq) => {
    bodyHtml += `\n      <dt>${escapeHtml(faq.question)}</dt>\n      <dd>${escapeHtml(faq.answer)}</dd>`;
  });
  bodyHtml += `\n    </dl>`;
  bodyHtml += `\n  </main>`;

  return buildCrawlerPage({
    title,
    description,
    imageUrl: DEFAULT_IMAGE,
    canonicalUrl: FRONTEND_URL,
    type: "website",
    bodyHtml,
    jsonLd: [enhancedOrgLd, faqLd, featureListLd],
  });
}

// ─── Public API for prerenderMiddleware ───

export async function renderCrawlerHtml(
  type: string,
  param: string,
): Promise<string | null> {
  switch (type) {
    case "event":
      return renderEventHtml(param);
    case "collection":
      return renderCollectionHtml(param);
    case "blog":
      return renderBlogHtml(param);
    case "vendor":
      return renderVendorHtml(param);
    case "teacher":
      return renderTeacherHtml(param);
    case "category":
      return renderCategoryHtml(param);
    case "homepage":
      return renderHomepageHtml();
    default:
      return null;
  }
}

// ─── Social OG routes (kept for /og/* namespace — redirect browsers) ───

router.get("/event/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const event = await Event.findOne({ slug })
      .populate("imageAssets")
      .select("title description slug seoMeta images imageAssets")
      .lean();

    if (!event) return res.redirect(`${FRONTEND_URL}/events/${slug}`);

    const title = (event.title as string) || SITE_NAME;
    const rawDesc = (event.seoMeta as any)?.description || (event.description as string) || "";
    const description = truncate(rawDesc);
    let imageUrl = DEFAULT_IMAGE;
    const assets = event.imageAssets as any[];
    if (assets?.length) imageUrl = assets[0].url || DEFAULT_IMAGE;
    else if ((event.images as string[])?.length) imageUrl = (event.images as string[])[0];

    res.set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" });
    res.status(200).send(buildOgHtml({ title, description, imageUrl, canonicalUrl: `${FRONTEND_URL}/events/${slug}`, type: "website" }));
  } catch (error) {
    logger.error("[OG] event error:", error);
    res.redirect(`${FRONTEND_URL}/events/${req.params.slug}`);
  }
});

router.get("/blog/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const blog = await Blog.findOne({ slug, status: "published" })
      .populate("featuredImageAsset")
      .select("title slug excerpt seo featuredImage featuredImageAsset")
      .lean();

    if (!blog) return res.redirect(`${FRONTEND_URL}/blog/${slug}`);

    const title = blog.title || SITE_NAME;
    const rawDesc = blog.seo?.metaDescription || blog.excerpt || "";
    const description = truncate(rawDesc);
    let imageUrl = DEFAULT_IMAGE;
    if ((blog.featuredImageAsset as any)?.url) imageUrl = (blog.featuredImageAsset as any).url;
    else if (blog.featuredImage) imageUrl = blog.featuredImage;

    res.set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" });
    res.status(200).send(buildOgHtml({ title, description, imageUrl, canonicalUrl: `${FRONTEND_URL}/blog/${slug}`, type: "article" }));
  } catch (error) {
    logger.error("[OG] blog error:", error);
    res.redirect(`${FRONTEND_URL}/blog/${req.params.slug}`);
  }
});

router.get("/vendor/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findById(id).select("businessName description logo coverImage").lean();
    if (!vendor) return res.redirect(`${FRONTEND_URL}/vendors/${id}`);

    const title = (vendor.businessName as string) || SITE_NAME;
    const description = truncate((vendor.description as string) || "");
    const imageUrl = (vendor.logo as string) || (vendor.coverImage as string) || DEFAULT_IMAGE;

    res.set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" });
    res.status(200).send(buildOgHtml({ title, description, imageUrl, canonicalUrl: `${FRONTEND_URL}/vendors/${id}`, type: "website" }));
  } catch (error) {
    logger.error("[OG] vendor error:", error);
    res.redirect(`${FRONTEND_URL}/vendors/${req.params.id}`);
  }
});

router.get("/teacher/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findById(id)
      .populate("profileImageAssetId")
      .select("fullName bio profileImageAssetId specialization subjects")
      .lean();
    if (!teacher) return res.redirect(`${FRONTEND_URL}/teachers/${id}`);

    const title = teacher.fullName ? `${teacher.fullName} — ${SITE_NAME}` : SITE_NAME;
    const rawDesc = (teacher.bio as string) || (teacher.specialization as string) || ((teacher.subjects as string[])?.join(", ") ?? "");
    const description = truncate(rawDesc);
    let imageUrl = DEFAULT_IMAGE;
    if ((teacher.profileImageAssetId as any)?.url) imageUrl = (teacher.profileImageAssetId as any).url;

    res.set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" });
    res.status(200).send(buildOgHtml({ title, description, imageUrl, canonicalUrl: `${FRONTEND_URL}/teachers/${id}`, type: "profile" }));
  } catch (error) {
    logger.error("[OG] teacher error:", error);
    res.redirect(`${FRONTEND_URL}/teachers/${req.params.id}`);
  }
});

router.get("/category/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug })
      .populate("iconAsset")
      .select("name slug description icon iconAsset seo")
      .lean();
    if (!category) return res.redirect(`${FRONTEND_URL}/categories/${slug}`);

    const title = category.name ? `${category.name} — ${SITE_NAME}` : SITE_NAME;
    const rawDesc = (category as any).seo?.description || (category.description as string) || "";
    const description = truncate(rawDesc);
    let imageUrl = DEFAULT_IMAGE;
    if ((category as any).iconAsset?.url) imageUrl = (category as any).iconAsset.url;
    else if (category.icon) imageUrl = category.icon;

    res.set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=7200" });
    res.status(200).send(buildOgHtml({ title, description, imageUrl, canonicalUrl: `${FRONTEND_URL}/categories/${slug}`, type: "website" }));
  } catch (error) {
    logger.error("[OG] category error:", error);
    res.redirect(`${FRONTEND_URL}/categories/${req.params.slug}`);
  }
});

router.get("/collection/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collection = await Collection.findById(id)
      .select("title description slug seoMeta")
      .lean();
    if (!collection) return res.redirect(`${FRONTEND_URL}/collections/${id}`);

    const title = (collection.title as string) ? `${collection.title} — ${SITE_NAME}` : SITE_NAME;
    const rawDesc = (collection as any).seoMeta?.description || (collection.description as string) || "";
    const description = truncate(rawDesc);

    res.set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" });
    res.status(200).send(buildOgHtml({ title, description, imageUrl: DEFAULT_IMAGE, canonicalUrl: `${FRONTEND_URL}/collections/${id}`, type: "website" }));
  } catch (error) {
    logger.error("[OG] collection error:", error);
    res.redirect(`${FRONTEND_URL}/collections/${req.params.id}`);
  }
});

export default router;
