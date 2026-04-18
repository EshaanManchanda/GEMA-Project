import { Router } from "express";
import {
  getAllBlogs,
  getBlogBySlug,
  getFeaturedBlogs,
  getBlogCategories,
  getPopularBlogs,
  getRecentBlogs,
  getRelatedBlogs,
  likeBlog,
  shareBlog,
} from "./blog.controller";

const router = Router();

// Public blog routes
router.get("/", getAllBlogs);
router.get("/featured", getFeaturedBlogs);
router.get("/popular", getPopularBlogs);
router.get("/recent", getRecentBlogs);
router.get("/categories", getBlogCategories);
router.get("/:slug", getBlogBySlug);
router.get("/:slug/related", getRelatedBlogs);

// Blog interaction routes
router.post("/:slug/like", likeBlog);
router.post("/:slug/share", shareBlog);

export default router;
