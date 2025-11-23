// Blog Category Interface
export interface BlogCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  isActive: boolean;
  postsCount: number;
  createdAt: string;
  updatedAt: string;
}

// Blog Author Interface
export interface BlogAuthor {
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
}

// Blog SEO Interface
export interface BlogSEO {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
}

// Main Blog Interface
export interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  category: string | BlogCategory;
  author: BlogAuthor;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  readTime: number;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  seo: BlogSEO;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Virtual fields
  categoryDetails?: BlogCategory;
}

// Blog List Response
export interface BlogsResponse {
  success: boolean;
  message: string;
  data: {
    blogs: Blog[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalBlogs: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      limit: number;
    };
  };
}

// Single Blog Response
export interface SingleBlogResponse {
  success: boolean;
  message: string;
  data: {
    blog: Blog;
    hasLiked?: boolean;
  };
}

// Blog Categories Response
export interface BlogCategoriesResponse {
  success: boolean;
  message: string;
  data: {
    categories: BlogCategory[];
  };
}

// Blog Filters for API calls
export interface BlogFilters {
  page?: number;
  limit?: number;
  category?: string;
  featured?: boolean;
  search?: string;
  tags?: string;
  sortBy?: 'publishedAt' | 'createdAt' | 'viewCount' | 'likeCount';
  sortOrder?: 'asc' | 'desc';
}

// Admin Blog Filters
export interface AdminBlogFilters {
  page?: number;
  limit?: number;
  status?: 'draft' | 'published' | 'archived';
  category?: string;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'viewCount' | 'likeCount';
  sortOrder?: 'asc' | 'desc';
}

// Create Blog Data
export interface CreateBlogData {
  title: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  category: string;
  author: BlogAuthor;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
  featured?: boolean;
  seo?: BlogSEO;
}

// Update Blog Data
export interface UpdateBlogData {
  title?: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string;
  category?: string;
  author?: BlogAuthor;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
  featured?: boolean;
  seo?: BlogSEO;
}

// Create Category Data
export interface CreateCategoryData {
  name: string;
  description?: string;
  color?: string;
}

// Update Category Data
export interface UpdateCategoryData {
  name?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

// Blog Stats Interface (for analytics)
export interface BlogStats {
  totalBlogs: number;
  publishedBlogs: number;
  draftBlogs: number;
  archivedBlogs: number;
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  featuredBlogs: number;
  categoriesCount: number;
  popularBlogs: Blog[];
  recentBlogs: Blog[];
}

// Blog Interaction Response
export interface BlogInteractionResponse {
  success: boolean;
  message: string;
  data: {
    likeCount?: number;
    shareCount?: number;
    hasLiked?: boolean;
  };
}

// Simplified Blog Interface for cards/previews
export interface BlogCard {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage: string;
  category: BlogCategory;
  author: {
    name: string;
    avatar?: string;
  };
  readTime: number;
  publishedAt: string;
  featured: boolean;
  tags: string[];
}

// Blog Search Result
export interface BlogSearchResult {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage: string;
  category: BlogCategory;
  publishedAt: string;
  readTime: number;
  // Highlighted search terms
  highlightedTitle?: string;
  highlightedExcerpt?: string;
}

// Blog Reading Progress
export interface BlogReadingProgress {
  blogId: string;
  slug: string;
  progress: number; // 0-100
  timeSpent: number; // in seconds
  lastReadAt: string;
  completed: boolean;
}

// Comment Author Interface
export interface CommentAuthor {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

// Comment Interface
export interface BlogComment {
  _id: string;
  content: string;
  author: CommentAuthor;
  blogPost: string;
  parentComment?: string;
  replies?: BlogComment[];
  likes: string[];
  dislikes: string[];
  likeCount: number;
  dislikeCount: number;
  replyCount: number;
  isEdited: boolean;
  isReported: boolean;
  reportCount: number;
  status: 'pending' | 'active' | 'flagged' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

// Comment Stats Interface
export interface CommentStats {
  totalComments: number;
  totalLikes: number;
  totalReplies: number;
  topLevelComments: number;
}

// Comments Response Interface
export interface CommentsResponse {
  success: boolean;
  message: string;
  data: {
    comments: BlogComment[];
    stats: CommentStats;
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

// Single Comment Response Interface
export interface SingleCommentResponse {
  success: boolean;
  message: string;
  data: {
    comment: BlogComment;
  };
}

// Comment Action Response Interface
export interface CommentActionResponse {
  success: boolean;
  message: string;
  data: {
    likes: number;
    dislikes: number;
    hasLiked: boolean;
    hasDisliked: boolean;
  };
}

// Comment Replies Response Interface
export interface CommentRepliesResponse {
  success: boolean;
  message: string;
  data: {
    replies: BlogComment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}