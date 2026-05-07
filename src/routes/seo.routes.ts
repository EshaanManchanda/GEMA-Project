import { Router, Request, Response } from "express";
import { seoService } from "../services/seo.service";
import Event from "../models/Event";
import { Blog } from "../models/Blog";
import Category from "../models/Category";
import Collection from "../models/Collection";

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
    console.error("Sitemap index generation error:", error);
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
    console.error("Sitemap generation error:", error);
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
    console.error("Sitemap generation error:", error);
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
    console.error("Sitemap generation error:", error);
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
    // Extract domain from hostname
    const hostname = req.hostname || "kidrove.com";

    // Support force production mode via query param (for testing)
    const forceProduction = req.query.force === "true";
    const robotsTxt = seoService.generateRobotsTxt(hostname, forceProduction);

    res.set({
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=60", // Cache for 1 minute (temporary for debugging)
    });

    res.status(200).send(robotsTxt);
  } catch (error) {
    console.error("Robots.txt generation error:", error);
    res.status(500).send("User-agent: *\nDisallow: /");
  }
});

/**
 * GET /api/seo/debug-env
 * Debug endpoint to check environment configuration
 * TEMPORARY: Remove after robots.txt issue is resolved
 */
router.get("/api/seo/debug-env", (req: Request, res: Response) => {
  try {
    res.status(200).json({
      nodeEnv: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === "production",
      hostname: req.hostname,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({
      error: "Failed to retrieve environment info",
    });
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
      console.error("Event structured data error:", error);
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
      console.error("Blog structured data error:", error);
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
      console.error("Event meta data error:", error);
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
      console.error("Blog meta data error:", error);
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
      console.error("Category meta data error:", error);
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
    console.error("Organization structured data error:", error);
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
    console.error("Breadcrumb structured data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate breadcrumb data",
    });
  }
});

export default router;
