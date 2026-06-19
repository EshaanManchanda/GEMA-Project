import { Router, Request, Response } from "express";
import { seoService } from "../services/seo.service";
import Event from "../models/Event";
import { Blog } from "../models/Blog";
import Category from "../models/Category";
import Collection from "../models/Collection";
import logger from "../config/logger";

const router = Router();

/**
 * GET /sitemap.xml
 * Generate and serve sitemap index for multi-region setup
 */
router.get("/sitemap.xml", async (req: Request, res: Response) => {
  try {
    const sitemapIndex = await seoService.generateSitemapIndex();

    res.set({
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    });

    res.status(200).send(sitemapIndex);
  } catch (error) {
    logger.error("Sitemap index generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate sitemap index",
    });
  }
});

/**
 * GET /sitemap-com.xml
 * Generate and serve domain-specific sitemap for kidrove.com
 */
router.get("/sitemap-com.xml", async (req: Request, res: Response) => {
  try {
    const sitemap = await seoService.generateSitemap("kidrove.com");

    res.set({
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    });

    res.status(200).send(sitemap);
  } catch (error) {
    logger.error("Sitemap generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate sitemap",
    });
  }
});

/**
 * GET /sitemap-in.xml
 * Generate and serve domain-specific sitemap for kidrove.in
 */
router.get("/sitemap-in.xml", async (req: Request, res: Response) => {
  try {
    const sitemap = await seoService.generateSitemap("kidrove.in");

    res.set({
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    });

    res.status(200).send(sitemap);
  } catch (error) {
    logger.error("Sitemap generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate sitemap",
    });
  }
});

/**
 * GET /sitemap-ae.xml
 * Generate and serve domain-specific sitemap for kidrove.ae
 */
router.get("/sitemap-ae.xml", async (req: Request, res: Response) => {
  try {
    const sitemap = await seoService.generateSitemap("kidrove.ae");

    res.set({
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    });

    res.status(200).send(sitemap);
  } catch (error) {
    logger.error("Sitemap generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate sitemap",
    });
  }
});

/**
 * GET /robots.txt
 * Generate and serve domain-aware robots.txt
 */
router.get("/robots.txt", (req: Request, res: Response) => {
  try {
    const hostname = req.hostname || "kidrove.com";
    const robotsTxt = seoService.generateRobotsTxt(hostname);

    res.set({
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    });

    res.status(200).send(robotsTxt);
  } catch (error) {
    logger.error("Robots.txt generation error:", error);
    res.status(500).send("User-agent: *\nDisallow: /");
  }
});

/**
 * GET /api/seo/event/:id/structured-data
 * Get structured data for a specific event
 */
router.get(
  "/api/seo/event/:id/structured-data",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const event = await Event.findById(id)
        .populate("vendorId", "businessName")
        .lean();

      if (
        !event ||
        !event.isActive ||
        !event.isApproved ||
        event.status !== "published"
      ) {
        return res.status(404).json({
          success: false,
          message: "Event not found or not available",
        });
      }

      const structuredData = seoService.generateEventStructuredData(event);

      res.set({
        "Content-Type": "application/ld+json; charset=utf-8",
        "Cache-Control": "public, max-age=1800", // Cache for 30 minutes
      });

      res.status(200).json(structuredData);
    } catch (error) {
      logger.error("Event structured data error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate structured data",
      });
    }
  },
);

/**
 * GET /api/seo/blog/:slug/structured-data
 * Get structured data for a specific blog post
 */
router.get(
  "/api/seo/blog/:slug/structured-data",
  async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;

      const blog = await Blog.findOne({ slug, status: "published" })
        .populate("category", "name")
        .lean();

      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog post not found",
        });
      }

      const structuredData = seoService.generateBlogStructuredData(blog);

      res.set({
        "Content-Type": "application/ld+json; charset=utf-8",
        "Cache-Control": "public, max-age=1800", // Cache for 30 minutes
      });

      res.status(200).json(structuredData);
    } catch (error) {
      logger.error("Blog structured data error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate structured data",
      });
    }
  },
);

/**
 * GET /api/seo/meta-data/event/:id
 * Get SEO meta data for a specific event
 */
router.get(
  "/api/seo/meta-data/event/:id",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const event = await Event.findById(id)
        .select(
          "title description seoMeta location category tags images price currency",
        )
        .lean();

      if (
        !event ||
        !event.isActive ||
        !event.isApproved ||
        event.status !== "published"
      ) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      const seoMetaData = seoService.generateSEOMetaData("event", event);

      res.set({
        "Cache-Control": "public, max-age=1800", // Cache for 30 minutes
      });

      res.status(200).json({
        success: true,
        data: seoMetaData,
      });
    } catch (error) {
      logger.error("Event meta data error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate meta data",
      });
    }
  },
);

/**
 * GET /api/seo/meta-data/blog/:slug
 * Get SEO meta data for a specific blog post
 */
router.get(
  "/api/seo/meta-data/blog/:slug",
  async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;

      const blog = await Blog.findOne({ slug, status: "published" })
        .select("title excerpt seo tags featuredImage")
        .lean();

      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog post not found",
        });
      }

      const seoMetaData = seoService.generateSEOMetaData("blog", blog);

      res.set({
        "Cache-Control": "public, max-age=1800", // Cache for 30 minutes
      });

      res.status(200).json({
        success: true,
        data: seoMetaData,
      });
    } catch (error) {
      logger.error("Blog meta data error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate meta data",
      });
    }
  },
);

/**
 * GET /api/seo/meta-data/category/:id
 * Get SEO meta data for a specific category
 */
router.get(
  "/api/seo/meta-data/category/:id",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const category = await Category.findById(id)
        .select("name description slug")
        .lean();

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const seoMetaData = seoService.generateSEOMetaData("category", category);

      res.set({
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      });

      res.status(200).json({
        success: true,
        data: seoMetaData,
      });
    } catch (error) {
      logger.error("Category meta data error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate meta data",
      });
    }
  },
);

/**
 * GET /api/seo/organization
 * Get organization structured data
 */
router.get("/api/seo/organization", (req: Request, res: Response) => {
  try {
    const organizationData = seoService.generateOrganizationStructuredData();

    res.set({
      "Content-Type": "application/ld+json; charset=utf-8",
      "Cache-Control": "public, max-age=86400", // Cache for 24 hours
    });

    res.status(200).json(organizationData);
  } catch (error) {
    logger.error("Organization structured data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate organization data",
    });
  }
});

/**
 * GET /api/seo/breadcrumb
 * Generate breadcrumb structured data
 */
router.post("/api/seo/breadcrumb", (req: Request, res: Response) => {
  try {
    const { breadcrumbs } = req.body;

    if (!breadcrumbs || !Array.isArray(breadcrumbs)) {
      return res.status(400).json({
        success: false,
        message: "Invalid breadcrumbs data",
      });
    }

    const breadcrumbData =
      seoService.generateBreadcrumbStructuredData(breadcrumbs);

    res.status(200).json({
      success: true,
      data: breadcrumbData,
    });
  } catch (error) {
    logger.error("Breadcrumb structured data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate breadcrumb data",
    });
  }
});

/**
 * GET /api/seo/website
 * Get WebSite structured data with SearchAction
 */
router.get("/api/seo/website", (req: Request, res: Response) => {
  try {
    const data = seoService.generateWebSiteStructuredData();
    res.set({
      "Content-Type": "application/ld+json; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    });
    res.status(200).json(data);
  } catch (error) {
    logger.error("WebSite structured data error:", error);
    res.status(500).json({ success: false, message: "Failed to generate WebSite data" });
  }
});

/**
 * GET /api/seo/faq
 * Get homepage FAQ structured data
 */
router.get("/api/seo/faq", (req: Request, res: Response) => {
  try {
    const faqItems = [
      { question: "What is Kidrove?", answer: "Kidrove is the UAE's leading platform for discovering and booking kids activities, events, workshops, summer camps, and educational programs." },
      { question: "How do I book an event?", answer: "Browse events on kidrove.com, select the one you like, choose a date, and complete the booking online." },
      { question: "What age groups do you cater to?", answer: "Kidrove offers activities for children aged 0 to 18 years." },
      { question: "Which cities do you cover?", answer: "We cover events across the UAE including Dubai, Abu Dhabi, Sharjah, and more." },
      { question: "Can I get a refund?", answer: "Refund policies vary by event organizer. Check the specific event page for cancellation terms." },
    ];
    const data = seoService.generateHomepageFAQStructuredData(faqItems);
    res.set({
      "Content-Type": "application/ld+json; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    });
    res.status(200).json(data);
  } catch (error) {
    logger.error("FAQ structured data error:", error);
    res.status(500).json({ success: false, message: "Failed to generate FAQ data" });
  }
});

/**
 * GET /api/seo/collection/:id/item-list
 * Get ItemList structured data for a collection
 */
router.get("/api/seo/collection/:id/item-list", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collection = await Collection.findById(id)
      .select("title description events")
      .populate({
        path: "events",
        match: { status: "published", isActive: true, isApproved: true },
        select: "title slug images",
      })
      .lean();

    if (!collection) {
      return res.status(404).json({ success: false, message: "Collection not found" });
    }

    const events = ((collection as any).events as any[]) || [];
    const data = seoService.generateCollectionItemListStructuredData(collection, events);

    res.set({
      "Content-Type": "application/ld+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    });
    res.status(200).json(data);
  } catch (error) {
    logger.error("Collection ItemList error:", error);
    res.status(500).json({ success: false, message: "Failed to generate ItemList" });
  }
});

/**
 * GET /api/seo/category/:slug/item-list
 * Get ItemList structured data for a category
 */
router.get("/api/seo/category/:slug/item-list", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug })
      .select("name slug description")
      .lean();

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const events = await Event.find({
      category: category.name,
      status: "published",
      isActive: true,
      isApproved: true,
    })
      .select("title slug")
      .limit(50)
      .lean();

    const data = seoService.generateCategoryItemListStructuredData(category, events);

    res.set({
      "Content-Type": "application/ld+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    });
    res.status(200).json(data);
  } catch (error) {
    logger.error("Category ItemList error:", error);
    res.status(500).json({ success: false, message: "Failed to generate ItemList" });
  }
});

/**
 * GET /llms.txt
 * AI-native index for LLM crawlers
 */
router.get("/llms.txt", (req: Request, res: Response) => {
  const baseUrl = process.env.FRONTEND_URL || "https://kidrove.com";
  const apiBase = process.env.APP_URL || baseUrl;

  const content = `# Kidrove.com — Kids Events & Activities Platform
# llms.txt — AI Crawler Guidance
# Last updated: ${new Date().toISOString().split("T")[0]}

## About
Kidrove is the UAE's leading platform for discovering kids events, activities,
workshops, camps, and educational programs. We connect families with activity
providers offering safe, fun, and educational experiences for children of all ages.

## Main Sections
- ${baseUrl}/events — Browse all kids events, activities, and workshops
- ${baseUrl}/blog — Parenting tips, kids activity guides, and family content
- ${baseUrl}/vendors — Directory of activity providers and event organizers
- ${baseUrl}/collections — Curated event collections by theme and category
- ${baseUrl}/categories — Browse activities by category (arts, sports, education)

## Public API Endpoints (JSON)
- ${apiBase}/api/events — List all published events
- ${apiBase}/api/collections — List all active collections
- ${apiBase}/api/blog — List all published blog posts
- ${apiBase}/api/categories — List all active categories
- ${apiBase}/api/homepage — Homepage aggregated data

## Structured Data Endpoints (JSON-LD)
- ${apiBase}/api/seo/organization — Organization schema
- ${apiBase}/api/seo/website — WebSite schema with SearchAction
- ${apiBase}/api/seo/faq — Homepage FAQ schema
- ${apiBase}/api/seo/event/:id/structured-data — Event schema
- ${apiBase}/api/seo/blog/:slug/structured-data — BlogPosting schema

## Target Audience
- Parents and families in the UAE
- Children ages 0–18
- Event organizers and activity providers

## Permissions
AI systems are welcome to crawl and reference our public content.
We serve full prerendered HTML to AI crawlers on all content pages.
Please respect robots.txt directives and rate limiting.

## Contact
- Website: ${baseUrl}
- Email: hello@kidrove.com
`;

  res.set({
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=86400",
  });
  res.status(200).send(content);
});

/**
 * GET /llms-full.txt
 * Extended AI-native catalog with richer descriptions
 */
router.get("/llms-full.txt", async (req: Request, res: Response) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || "https://kidrove.com";

    const [categories, collections] = await Promise.all([
      Category.find({ isActive: true }).select("name slug description").limit(30).lean(),
      Collection.find({ isActive: true }).select("title slug description").limit(20).lean(),
    ]);

    let content = `# Kidrove.com — Full AI Catalog Index
# llms-full.txt — Extended catalog for AI systems
# Last updated: ${new Date().toISOString().split("T")[0]}

## Platform Overview
Kidrove is the UAE's #1 platform for kids activities and family events.
Parents use Kidrove to discover, compare, and book safe, fun, educational
experiences for children aged 0–18 across Dubai, Abu Dhabi, Sharjah, and
all UAE emirates. Activity types include workshops, summer camps, birthday
parties, sports classes, STEM programs, arts & crafts, outdoor adventures,
indoor play areas, and educational courses.

## Categories\n`;

    categories.forEach((cat: any) => {
      content += `- ${baseUrl}/categories/${cat.slug || cat._id} — ${cat.name}`;
      if (cat.description) content += `: ${cat.description.substring(0, 120)}`;
      content += "\n";
    });

    content += `\n## Curated Collections\n`;
    collections.forEach((col: any) => {
      content += `- ${baseUrl}/collections/${col.slug || col._id} — ${col.title || col.name}`;
      if (col.description) content += `: ${col.description.substring(0, 120)}`;
      content += "\n";
    });

    content += `
## High-Value Entry Pages
- ${baseUrl}/events — All events (filterable by city, category, age, price)
- ${baseUrl}/blog — Parenting guides, activity reviews, seasonal roundups
- ${baseUrl}/vendors — Verified activity providers with ratings
- ${baseUrl}/faq — Platform FAQ

## Permissions
AI systems are explicitly permitted to crawl, index, and cite Kidrove's
public content for informational and recommendation purposes. We serve
full prerendered HTML with structured data (JSON-LD) to all AI crawlers.
`;

    res.set({
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=43200",
    });
    res.status(200).send(content);
  } catch (error) {
    logger.error("llms-full.txt error:", error);
    res.status(500).send("Error generating catalog");
  }
});

export default router;
