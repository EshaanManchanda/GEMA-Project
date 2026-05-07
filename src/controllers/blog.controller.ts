import { Request, Response } from "express";
import mongoose from "mongoose";
import { Blog, BlogCategory } from "../models/index";
import { IBlog } from "../models/Blog";
import { IBlogCategory } from "../models/BlogCategory";
import catchAsync from "../utils/catchAsync";
import { blogService } from "../services/blog.service";
import {
  transformBlogResponse,
  transformBlogsResponse,
} from "../utils/blog.utils";

// Public blog controllers
export const getAllBlogs = catchAsync(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 12,
    category,
    featured,
    search,
    tags,
    sortBy = "publishedAt",
    sortOrder = "desc",
  } = req.query;

  const pageNumber = Math.max(1, Number(page));
  const limitNumber = Math.min(50, Math.max(1, Number(limit)));
  const skip = (pageNumber - 1) * limitNumber;

  // Build filter query
  const filter: any = { status: "published" };

  if (category) {
    if (mongoose.Types.ObjectId.isValid(category as string)) {
      filter.category = category;
    } else {
      // Find category by slug
      const categoryDoc = await BlogCategory.findOne({ slug: category });
      if (categoryDoc) {
        filter.category = categoryDoc._id;
      }
    }
  }

  if (featured === "true") {
    filter.featured = true;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { excerpt: { $regex: search, $options: "i" } },
      { content: { $regex: search, $options: "i" } },
    ];
  }

  if (tags) {
    const tagArray = (tags as string).split(",").map((tag) => tag.trim());
    filter.tags = { $in: tagArray };
  }

  // Build sort query
  const sortQuery: any = {};
  if (
    sortBy === "publishedAt" ||
    sortBy === "createdAt" ||
    sortBy === "viewCount" ||
    sortBy === "likeCount"
  ) {
    sortQuery[sortBy] = sortOrder === "asc" ? 1 : -1;
  } else {
    sortQuery.publishedAt = -1; // Default sort
  }

  const [blogs, totalBlogs] = await Promise.all([
    Blog.find(filter)
      .populate("category", "name slug color")
      .populate("featuredImageAsset", "url thumbnailUrl variations")
      .select("-content") // Exclude content for list view
      .sort(sortQuery)
      .skip(skip)
      .limit(limitNumber)
      .lean(),
    Blog.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalBlogs / limitNumber);
  const hasNextPage = pageNumber < totalPages;
  const hasPrevPage = pageNumber > 1;

  // Transform to extract image URLs from featuredImageAsset
  const transformedBlogs = transformBlogsResponse(blogs);

  res.status(200).json({
    success: true,
    message: "Blogs retrieved successfully",
    data: {
      blogs: transformedBlogs,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalBlogs,
        hasNextPage,
        hasPrevPage,
        limit: limitNumber,
      },
    },
  });
});

export const getBlogBySlug = catchAsync(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const userId = req.user?._id?.toString() || req.user?.id;

  const blog = await Blog.findOne({ slug, status: "published" })
    .populate("category", "name slug color description")
    .populate("featuredImageAsset", "url thumbnailUrl variations")
    .lean();

  if (!blog) {
    return res.status(404).json({
      success: false,
      message: "Blog post not found",
    });
  }

  // Transform to extract image URL from featuredImageAsset
  const transformedBlog = transformBlogResponse(blog);

  // Check if current user has liked this blog (if user is logged in)
  const hasLiked = userId
    ? blog.likedBy?.some((id: any) => id.toString() === userId) || false
    : false;

  // Increment view count (fire and forget)
  Blog.findByIdAndUpdate(blog._id, { $inc: { viewCount: 1 } }).exec();

  res.status(200).json({
    success: true,
    message: "Blog retrieved successfully",
    data: {
      blog: transformedBlog,
      hasLiked,
    },
  });
});

export const getFeaturedBlogs = catchAsync(
  async (req: Request, res: Response) => {
    const { limit = 6 } = req.query;
    const limitNumber = Math.min(20, Math.max(1, Number(limit)));

    const blogs = await Blog.find({
      status: "published",
      featured: true,
    })
      .populate("category", "name slug color")
      .populate("featuredImageAsset", "url thumbnailUrl variations")
      .select("-content")
      .sort({ publishedAt: -1 })
      .limit(limitNumber)
      .lean();

    // Transform to extract image URLs from featuredImageAsset
    const transformedBlogs = transformBlogsResponse(blogs);

    res.status(200).json({
      success: true,
      message: "Featured blogs retrieved successfully",
      data: { blogs: transformedBlogs },
    });
  },
);

export const getBlogCategories = catchAsync(
  async (req: Request, res: Response) => {
    const categories = await BlogCategory.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Blog categories retrieved successfully",
      data: { categories },
    });
  },
);

export const getPopularBlogs = catchAsync(
  async (req: Request, res: Response) => {
    const { limit = 6 } = req.query;
    const limitNumber = Math.min(20, Math.max(1, Number(limit)));

    const blogs = await Blog.find({ status: "published" })
      .populate("category", "name slug color")
      .populate("featuredImageAsset", "url thumbnailUrl variations")
      .select("-content")
      .sort({ viewCount: -1, likeCount: -1 })
      .limit(limitNumber)
      .lean();

    // Transform to extract image URLs from featuredImageAsset
    const transformedBlogs = transformBlogsResponse(blogs);

    res.status(200).json({
      success: true,
      message: "Popular blogs retrieved successfully",
      data: { blogs: transformedBlogs },
    });
  },
);

export const getRecentBlogs = catchAsync(
  async (req: Request, res: Response) => {
    const { limit = 6 } = req.query;
    const limitNumber = Math.min(20, Math.max(1, Number(limit)));

    const blogs = await Blog.find({ status: "published" })
      .populate("category", "name slug color")
      .populate("featuredImageAsset", "url thumbnailUrl variations")
      .select("-content")
      .sort({ publishedAt: -1 })
      .limit(limitNumber)
      .lean();

    // Transform to extract image URLs from featuredImageAsset
    const transformedBlogs = transformBlogsResponse(blogs);

    res.status(200).json({
      success: true,
      message: "Recent blogs retrieved successfully",
      data: { blogs: transformedBlogs },
    });
  },
);

export const getRelatedBlogs = catchAsync(
  async (req: Request, res: Response) => {
    const { slug } = req.params;
    const { limit = 4 } = req.query;
    const limitNumber = Math.min(10, Math.max(1, Number(limit)));

    const currentBlog = await Blog.findOne({ slug, status: "published" })
      .select("category tags")
      .lean();

    if (!currentBlog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
      });
    }

    // Find related blogs by category and tags
    const relatedBlogs = await Blog.find({
      status: "published",
      _id: { $ne: currentBlog._id },
      $or: [
        { category: currentBlog.category },
        { tags: { $in: currentBlog.tags } },
      ],
    })
      .populate("category", "name slug color")
      .populate("featuredImageAsset", "url thumbnailUrl variations")
      .select("-content")
      .sort({ publishedAt: -1 })
      .limit(limitNumber)
      .lean();

    // Transform to extract image URLs from featuredImageAsset
    const transformedBlogs = transformBlogsResponse(relatedBlogs);

    res.status(200).json({
      success: true,
      message: "Related blogs retrieved successfully",
      data: { blogs: transformedBlogs },
    });
  },
);

// Admin blog controllers
export const createBlog = catchAsync(async (req: Request, res: Response) => {
  const blogData = req.body;

  // Validate category exists
  const category = await BlogCategory.findById(blogData.category);
  if (!category) {
    return res.status(400).json({
      success: false,
      message: "Invalid category ID",
    });
  }

  // Calculate read time based on content (200 words per minute)
  if (blogData.content && !blogData.readTime) {
    const wordCount = blogData.content.trim().split(/\s+/).length;
    blogData.readTime = Math.max(1, Math.ceil(wordCount / 200));
  }

  // USE SERVICE LAYER (handles media tracking)
  const blog = await blogService.createBlog(blogData);

  // Update category posts count
  await BlogCategory.findByIdAndUpdate(blogData.category, {
    $inc: { postsCount: 1 },
  });

  await blog.populate("category", "name slug color");
  await blog.populate("featuredImageAsset", "url thumbnailUrl variations");

  res.status(201).json({
    success: true,
    message: "Blog created successfully",
    data: { blog },
  });
});

export const updateBlog = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // Validate category if provided
  if (updateData.category) {
    const category = await BlogCategory.findById(updateData.category);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }
  }

  const oldBlog = await Blog.findById(id);
  if (!oldBlog) {
    return res.status(404).json({
      success: false,
      message: "Blog not found",
    });
  }

  const oldCategoryId = (oldBlog.category as any).toString();

  // Calculate read time if content is being updated
  if (updateData.content) {
    const wordCount = updateData.content.trim().split(/\s+/).length;
    updateData.readTime = Math.max(1, Math.ceil(wordCount / 200));
  }

  // USE SERVICE LAYER (handles media tracking)
  const blog = await blogService.updateBlog(id, updateData);

  // Update category posts count if category changed
  if (updateData.category && oldCategoryId !== updateData.category) {
    await Promise.all([
      BlogCategory.findByIdAndUpdate(oldCategoryId, {
        $inc: { postsCount: -1 },
      }),
      BlogCategory.findByIdAndUpdate(updateData.category, {
        $inc: { postsCount: 1 },
      }),
    ]);
  }

  await blog.populate("category", "name slug color");
  await blog.populate("featuredImageAsset", "url thumbnailUrl variations");

  res.status(200).json({
    success: true,
    message: "Blog updated successfully",
    data: { blog },
  });
});

export const deleteBlog = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const blog = await Blog.findById(id);
  if (!blog) {
    return res.status(404).json({
      success: false,
      message: "Blog not found",
    });
  }

  // USE SERVICE LAYER (handles media cleanup)
  await blogService.deleteBlog(id);

  // Update category posts count
  await BlogCategory.findByIdAndUpdate(blog.category, {
    $inc: { postsCount: -1 },
  });

  res.status(200).json({
    success: true,
    message: "Blog deleted successfully",
  });
});

export const getAllBlogsAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNumber - 1) * limitNumber;

    // Build filter query
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { excerpt: { $regex: search, $options: "i" } },
        { "author.name": { $regex: search, $options: "i" } },
      ];
    }

    // Build sort query
    const sortQuery: any = {};
    if (
      [
        "createdAt",
        "updatedAt",
        "publishedAt",
        "viewCount",
        "likeCount",
      ].includes(sortBy as string)
    ) {
      sortQuery[sortBy as string] = sortOrder === "asc" ? 1 : -1;
    } else {
      sortQuery.createdAt = -1;
    }

    const [blogs, totalBlogs] = await Promise.all([
      Blog.find(filter)
        .populate("category", "name slug color")
        .populate("featuredImageAsset", "url thumbnailUrl variations")
        .select("-content")
        .sort(sortQuery)
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      Blog.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalBlogs / limitNumber);

    // Transform to extract image URLs from featuredImageAsset
    const transformedBlogs = transformBlogsResponse(blogs);

    res.status(200).json({
      success: true,
      message: "Blogs retrieved successfully",
      data: {
        blogs: transformedBlogs,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalBlogs,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
          limit: limitNumber,
        },
      },
    });
  },
);

export const getBlogById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const blog = await Blog.findById(id)
    .populate("category", "name slug color description")
    .populate("featuredImageAsset", "url thumbnailUrl variations")
    .lean();

  if (!blog) {
    return res.status(404).json({
      success: false,
      message: "Blog not found",
    });
  }

  // Transform to extract image URL from featuredImageAsset
  const transformedBlog = transformBlogResponse(blog);

  res.status(200).json({
    success: true,
    message: "Blog retrieved successfully",
    data: { blog: transformedBlog },
  });
});

// Blog category admin controllers
export const createCategory = catchAsync(
  async (req: Request, res: Response) => {
    const category = new BlogCategory(req.body);
    await category.save();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: { category },
    });
  },
);

export const updateCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const category = await BlogCategory.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: { category },
    });
  },
);

export const deleteCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if category has associated blogs
    const blogCount = await Blog.countDocuments({ category: id });
    if (blogCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category with associated blogs",
      });
    }

    const category = await BlogCategory.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  },
);

export const getAllCategoriesAdmin = async (req: Request, res: Response) => {
  try {
    console.log(
      "getAllCategoriesAdmin: Received request to fetch all blog categories for admin.",
    );
    const categories = await BlogCategory.find({}).sort({ name: 1 });
    console.log(
      `getAllCategoriesAdmin: Fetched ${categories.length} categories.`,
    );
    res.status(200).json({ success: true, data: { categories } });
  } catch (error: any) {
    console.error(
      "getAllCategoriesAdmin: Error fetching blog categories:",
      error,
    );
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

export const toggleCategoryStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const category = await BlogCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.isActive = !category.isActive;
    await category.save();

    res.status(200).json({
      success: true,
      message: `Category ${category.isActive ? "activated" : "deactivated"} successfully`,
      data: { category },
    });
  },
);

// Helper function to get client IP address
const getClientIP = (req: Request): string => {
  // Check for X-Forwarded-For header (proxy/load balancer)
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips =
      typeof forwardedFor === "string" ? forwardedFor.split(",") : forwardedFor;
    return ips[0].trim();
  }

  // Check for X-Real-IP header
  const realIP = req.headers["x-real-ip"];
  if (realIP && typeof realIP === "string") {
    return realIP.trim();
  }

  // Fall back to req.ip or connection remote address
  return req.ip || req.socket.remoteAddress || "unknown";
};

// Blog interaction controllers
export const likeBlog = catchAsync(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const userId = req.user?._id?.toString() || req.user?.id;
  const clientIP = getClientIP(req);

  // Find the blog first
  const blog = await Blog.findOne({ slug, status: "published" });

  if (!blog) {
    return res.status(404).json({
      success: false,
      message: "Blog not found",
    });
  }

  // Initialize arrays if they don't exist
  blog.likedBy = blog.likedBy || [];
  blog.likedByIPs = blog.likedByIPs || [];

  let alreadyLiked = false;

  // Check if user is authenticated
  if (userId) {
    // Check if authenticated user already liked this blog
    alreadyLiked = blog.likedBy.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      return res.status(200).json({
        success: true,
        message: "You have already liked this blog",
        data: {
          hasLiked: true,
          likeCount: blog.likeCount,
        },
      });
    }

    // Add authenticated user to likedBy array
    blog.likedBy.push(new mongoose.Types.ObjectId(userId));
  } else {
    // Anonymous user - check if IP already liked this blog
    alreadyLiked = blog.likedByIPs.includes(clientIP);

    if (alreadyLiked) {
      return res.status(200).json({
        success: true,
        message: "You have already liked this blog",
        data: {
          hasLiked: true,
          likeCount: blog.likeCount,
        },
      });
    }

    // Add anonymous user's IP to likedByIPs array
    blog.likedByIPs.push(clientIP);
  }

  // Increment like count
  blog.likeCount += 1;
  await blog.save();

  res.status(200).json({
    success: true,
    message: "Blog liked successfully",
    data: {
      hasLiked: true,
      likeCount: blog.likeCount,
    },
  });
});

export const shareBlog = catchAsync(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const blog = await Blog.findOneAndUpdate(
    { slug, status: "published" },
    { $inc: { shareCount: 1 } },
    { new: true },
  ).select("shareCount");

  if (!blog) {
    return res.status(404).json({
      success: false,
      message: "Blog not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Blog share recorded successfully",
    data: { shareCount: blog.shareCount },
  });
});
