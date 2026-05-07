import { Router, Request, Response } from "express";
import Event from "../models/Event";
import { Blog } from "../models/Blog";
import Vendor from "../models/Vendor";
import Teacher from "../models/Teacher";
import Category from "../models/Category";
import Collection from "../models/Collection";
import logger from "../config/logger";

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "https://kidrove.com";
const DEFAULT_IMAGE = `${FRONTEND_URL}/og-default.png`;
const SITE_NAME = "Kidrove";

function buildOgHtml(params: {
  title: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
  type: string;
}): string {
  const { title, description, imageUrl, canonicalUrl, type } = params;
  const safeTitle = title.replace(/"/g, "&quot;");
  const safeDesc = description.replace(/"/g, "&quot;");
  const safeImage = imageUrl.replace(/"/g, "&quot;");
  const safeCanonical = canonicalUrl.replace(/"/g, "&quot;");

  return `<!DOCTYPE html><html><head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <meta property="og:title"        content="${safeTitle}" />
  <meta property="og:description"  content="${safeDesc}" />
  <meta property="og:image"        content="${safeImage}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url"          content="${safeCanonical}" />
  <meta property="og:type"         content="${type}" />
  <meta property="og:site_name"    content="${SITE_NAME}" />
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image"       content="${safeImage}" />
  <link rel="canonical" href="${safeCanonical}" />
  <meta http-equiv="refresh" content="0; url=${safeCanonical}" />
  <script>window.location.replace("${safeCanonical}")</script>
</head><body></body></html>`;
}

function truncate(text: string, len = 160): string {
  if (!text) return "";
  return text.length > len ? text.substring(0, len - 3) + "..." : text;
}

/**
 * GET /og/event/:slug
 * Returns OG HTML for social bots crawling event pages
 */
router.get("/event/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const event = await Event.findOne({ slug })
      .populate("imageAssets")
      .select("title description slug seoMeta images imageAssets")
      .lean();

    if (!event) {
      return res.redirect(`${FRONTEND_URL}/events/${slug}`);
    }

    const title = (event.title as string) || SITE_NAME;
    const rawDesc =
      (event.seoMeta as any)?.description ||
      (event.description as string) ||
      "";
    const description = truncate(rawDesc);

    let imageUrl = DEFAULT_IMAGE;
    const assets = event.imageAssets as any[];
    if (assets?.length) {
      imageUrl = assets[0].url || DEFAULT_IMAGE;
    } else if ((event.images as string[])?.length) {
      imageUrl = (event.images as string[])[0];
    }

    const canonicalUrl = `${FRONTEND_URL}/events/${slug}`;

    res.set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    });
    res.status(200).send(
      buildOgHtml({ title, description, imageUrl, canonicalUrl, type: "website" })
    );
  } catch (error) {
    logger.error("[OG] event error:", error);
    res.redirect(`${FRONTEND_URL}/events/${req.params.slug}`);
  }
});

/**
 * GET /og/blog/:slug
 * Returns OG HTML for social bots crawling blog pages
 */
router.get("/blog/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOne({ slug, status: "published" })
      .populate("featuredImageAsset")
      .select("title slug excerpt seo featuredImage featuredImageAsset")
      .lean();

    if (!blog) {
      return res.redirect(`${FRONTEND_URL}/blog/${slug}`);
    }

    const title = blog.title || SITE_NAME;
    const rawDesc =
      blog.seo?.metaDescription || blog.excerpt || "";
    const description = truncate(rawDesc);

    let imageUrl = DEFAULT_IMAGE;
    if ((blog.featuredImageAsset as any)?.url) {
      imageUrl = (blog.featuredImageAsset as any).url;
    } else if (blog.featuredImage) {
      imageUrl = blog.featuredImage;
    }

    const canonicalUrl = `${FRONTEND_URL}/blog/${slug}`;

    res.set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    });
    res.status(200).send(
      buildOgHtml({ title, description, imageUrl, canonicalUrl, type: "article" })
    );
  } catch (error) {
    logger.error("[OG] blog error:", error);
    res.redirect(`${FRONTEND_URL}/blog/${req.params.slug}`);
  }
});

/**
 * GET /og/vendor/:id
 * Returns OG HTML for social bots crawling vendor pages
 */
router.get("/vendor/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findById(id)
      .select("businessName description logo coverImage")
      .lean();

    if (!vendor) {
      return res.redirect(`${FRONTEND_URL}/vendors/${id}`);
    }

    const title = (vendor.businessName as string) || SITE_NAME;
    const description = truncate((vendor.description as string) || "");

    const imageUrl =
      (vendor.logo as string) ||
      (vendor.coverImage as string) ||
      DEFAULT_IMAGE;

    const canonicalUrl = `${FRONTEND_URL}/vendors/${id}`;

    res.set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    });
    res.status(200).send(
      buildOgHtml({ title, description, imageUrl, canonicalUrl, type: "website" })
    );
  } catch (error) {
    logger.error("[OG] vendor error:", error);
    res.redirect(`${FRONTEND_URL}/vendors/${req.params.id}`);
  }
});

/**
 * GET /og/teacher/:id
 * Returns OG HTML for social bots crawling teacher/instructor profile pages
 */
router.get("/teacher/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findById(id)
      .populate("profileImageAssetId")
      .select("fullName bio profileImageAssetId specialization subjects")
      .lean();

    if (!teacher) {
      return res.redirect(`${FRONTEND_URL}/teachers/${id}`);
    }

    const title = teacher.fullName
      ? `${teacher.fullName} — ${SITE_NAME}`
      : SITE_NAME;
    const rawDesc =
      (teacher.bio as string) ||
      (teacher.specialization as string) ||
      ((teacher.subjects as string[])?.join(", ") ?? "");
    const description = truncate(rawDesc);

    let imageUrl = DEFAULT_IMAGE;
    if ((teacher.profileImageAssetId as any)?.url) {
      imageUrl = (teacher.profileImageAssetId as any).url;
    }

    const canonicalUrl = `${FRONTEND_URL}/teachers/${id}`;

    res.set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    });
    res.status(200).send(
      buildOgHtml({ title, description, imageUrl, canonicalUrl, type: "profile" })
    );
  } catch (error) {
    logger.error("[OG] teacher error:", error);
    res.redirect(`${FRONTEND_URL}/teachers/${req.params.id}`);
  }
});

/**
 * GET /og/category/:slug
 * Returns OG HTML for social bots crawling category pages
 */
router.get("/category/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({ slug })
      .populate("iconAsset")
      .select("name slug description icon iconAsset seo")
      .lean();

    if (!category) {
      return res.redirect(`${FRONTEND_URL}/categories/${slug}`);
    }

    const title = category.name
      ? `${category.name} — ${SITE_NAME}`
      : SITE_NAME;
    const rawDesc =
      (category as any).seo?.description ||
      (category.description as string) ||
      "";
    const description = truncate(rawDesc);

    let imageUrl = DEFAULT_IMAGE;
    if ((category as any).iconAsset?.url) {
      imageUrl = (category as any).iconAsset.url;
    } else if (category.icon) {
      imageUrl = category.icon;
    }

    const canonicalUrl = `${FRONTEND_URL}/categories/${slug}`;

    res.set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=7200",
    });
    res.status(200).send(
      buildOgHtml({ title, description, imageUrl, canonicalUrl, type: "website" })
    );
  } catch (error) {
    logger.error("[OG] category error:", error);
    res.redirect(`${FRONTEND_URL}/categories/${req.params.slug}`);
  }
});

/**
 * GET /og/collection/:id
 * Returns OG HTML for social bots crawling collection pages
 */
router.get("/collection/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const collection = await Collection.findById(id)
      .populate("items.imageAssets")
      .select("title description slug seoMeta items")
      .lean();

    if (!collection) {
      return res.redirect(`${FRONTEND_URL}/collections/${id}`);
    }

    const title = (collection.title as string)
      ? `${collection.title} — ${SITE_NAME}`
      : SITE_NAME;
    const rawDesc =
      (collection as any).seoMeta?.description ||
      (collection.description as string) ||
      "";
    const description = truncate(rawDesc);

    // Use first item's first image as preview
    let imageUrl = DEFAULT_IMAGE;
    const firstItem = (collection as any).items?.[0];
    if (firstItem?.imageAssets?.length) {
      imageUrl = firstItem.imageAssets[0].url || DEFAULT_IMAGE;
    } else if (firstItem?.images?.length) {
      imageUrl = firstItem.images[0];
    }

    const slug = (collection as any).slug || id;
    const canonicalUrl = `${FRONTEND_URL}/collections/${id}`;

    res.set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    });
    res.status(200).send(
      buildOgHtml({ title, description, imageUrl, canonicalUrl, type: "website" })
    );
  } catch (error) {
    logger.error("[OG] collection error:", error);
    res.redirect(`${FRONTEND_URL}/collections/${req.params.id}`);
  }
});

export default router;
