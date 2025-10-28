import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import blogAPI from '../../services/api/blogAPI';

// Types
export interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  category: {
    _id: string;
    name: string;
    slug: string;
    color: string;
  };
  author: {
    name: string;
    email: string;
    avatar?: string;
    bio?: string;
  };
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    canonicalUrl?: string;
  };
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  postsCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export interface BlogState {
  // Public blogs
  blogs: Blog[];
  currentBlog: Blog | null;
  featuredBlogs: Blog[];
  popularBlogs: Blog[];
  recentBlogs: Blog[];
  relatedBlogs: Blog[];

  // Admin blogs
  adminBlogs: Blog[];

  // Categories
  categories: BlogCategory[];

  // Pagination
  pagination: {
    currentPage: number;
    totalPages: number;
    totalBlogs: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };

  // Loading states
  loading: {
    blogs: boolean;
    currentBlog: boolean;
    featuredBlogs: boolean;
    popularBlogs: boolean;
    recentBlogs: boolean;
    relatedBlogs: boolean;
    adminBlogs: boolean;
    categories: boolean;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
  };

  // Error states
  error: {
    blogs: string | null;
    currentBlog: string | null;
    featuredBlogs: string | null;
    popularBlogs: string | null;
    recentBlogs: string | null;
    relatedBlogs: string | null;
    adminBlogs: string | null;
    categories: string | null;
    creating: string | null;
    updating: string | null;
    deleting: string | null;
  };

  // Filters
  filters: BlogFilters;
}

const initialState: BlogState = {
  blogs: [],
  currentBlog: null,
  featuredBlogs: [],
  popularBlogs: [],
  recentBlogs: [],
  relatedBlogs: [],
  adminBlogs: [],
  categories: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalBlogs: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 12
  },
  loading: {
    blogs: false,
    currentBlog: false,
    featuredBlogs: false,
    popularBlogs: false,
    recentBlogs: false,
    relatedBlogs: false,
    adminBlogs: false,
    categories: false,
    creating: false,
    updating: false,
    deleting: false
  },
  error: {
    blogs: null,
    currentBlog: null,
    featuredBlogs: null,
    popularBlogs: null,
    recentBlogs: null,
    relatedBlogs: null,
    adminBlogs: null,
    categories: null,
    creating: null,
    updating: null,
    deleting: null
  },
  filters: {
    page: 1,
    limit: 12,
    sortBy: 'publishedAt',
    sortOrder: 'desc'
  }
};

// Async thunks
export const fetchBlogs = createAsyncThunk(
  'blog/fetchBlogs',
  async (filters?: BlogFilters) => {
    const response = await blogAPI.getAllBlogs(filters);
    return response.data;
  }
);

export const fetchBlogBySlug = createAsyncThunk(
  'blog/fetchBlogBySlug',
  async (slug: string) => {
    const response = await blogAPI.getBlogBySlug(slug);
    return response.data.blog;
  }
);

export const fetchFeaturedBlogs = createAsyncThunk(
  'blog/fetchFeaturedBlogs',
  async (limit: number = 6) => {
    const response = await blogAPI.getFeaturedBlogs(limit);
    return response.data.blogs;
  }
);

export const fetchPopularBlogs = createAsyncThunk(
  'blog/fetchPopularBlogs',
  async (limit: number = 6) => {
    const response = await blogAPI.getPopularBlogs(limit);
    return response.data.blogs;
  }
);

export const fetchRecentBlogs = createAsyncThunk(
  'blog/fetchRecentBlogs',
  async (limit: number = 6) => {
    const response = await blogAPI.getRecentBlogs(limit);
    return response.data.blogs;
  }
);

export const fetchRelatedBlogs = createAsyncThunk(
  'blog/fetchRelatedBlogs',
  async ({ slug, limit }: { slug: string; limit?: number }) => {
    const response = await blogAPI.getRelatedBlogs(slug, limit);
    return response.data.blogs;
  }
);

export const fetchBlogCategories = createAsyncThunk(
  'blog/fetchBlogCategories',
  async () => {
    const response = await blogAPI.getBlogCategories();
    return response.data.categories;
  }
);

// Admin thunks
export const fetchAdminBlogs = createAsyncThunk(
  'blog/fetchAdminBlogs',
  async (filters?: any) => {
    const response = await blogAPI.admin.getAllBlogs(filters);
    return response.data;
  }
);

export const fetchAdminBlogById = createAsyncThunk(
  'blog/fetchAdminBlogById',
  async (id: string) => {
    const response = await blogAPI.admin.getBlogById(id);
    return response.data.blog;
  }
);

export const createBlog = createAsyncThunk(
  'blog/createBlog',
  async (blogData: any) => {
    const response = await blogAPI.admin.createBlog(blogData);
    return response.data.blog;
  }
);

export const updateBlog = createAsyncThunk(
  'blog/updateBlog',
  async ({ id, blogData }: { id: string; blogData: any }) => {
    const response = await blogAPI.admin.updateBlog(id, blogData);
    return response.data.blog;
  }
);

export const deleteBlog = createAsyncThunk(
  'blog/deleteBlog',
  async (id: string) => {
    await blogAPI.admin.deleteBlog(id);
    return id;
  }
);

export const fetchAdminCategories = createAsyncThunk(
  'blog/fetchAdminCategories',
  async () => {
    const response = await blogAPI.admin.getAllCategories();
    return response;
  }
);

export const createCategory = createAsyncThunk(
  'blog/createCategory',
  async (categoryData: any) => {
    const response = await blogAPI.admin.createCategory(categoryData);
    return response.data.category;
  }
);

export const updateCategory = createAsyncThunk(
  'blog/updateCategory',
  async ({ id, categoryData }: { id: string; categoryData: any }) => {
    const response = await blogAPI.admin.updateCategory(id, categoryData);
    return response.data.category;
  }
);

export const deleteCategory = createAsyncThunk(
  'blog/deleteCategory',
  async (id: string) => {
    await blogAPI.admin.deleteCategory(id);
    return id;
  }
);

export const likeBlog = createAsyncThunk(
  'blog/likeBlog',
  async (slug: string) => {
    const response = await blogAPI.likeBlog(slug);
    return { slug, likeCount: response.data.likeCount };
  }
);

export const shareBlog = createAsyncThunk(
  'blog/shareBlog',
  async (slug: string) => {
    const response = await blogAPI.shareBlog(slug);
    return { slug, shareCount: response.data.shareCount };
  }
);

// Slice
const blogSlice = createSlice({
  name: 'blog',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<BlogFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearCurrentBlog: (state) => {
      state.currentBlog = null;
    },
    clearError: (state, action: PayloadAction<keyof BlogState['error']>) => {
      state.error[action.payload] = null;
    },
    clearAllErrors: (state) => {
      Object.keys(state.error).forEach(key => {
        state.error[key as keyof BlogState['error']] = null;
      });
    }
  },
  extraReducers: (builder) => {
    // Fetch blogs
    builder
      .addCase(fetchBlogs.pending, (state) => {
        state.loading.blogs = true;
        state.error.blogs = null;
      })
      .addCase(fetchBlogs.fulfilled, (state, action) => {
        state.loading.blogs = false;
        state.blogs = action.payload.blogs;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchBlogs.rejected, (state, action) => {
        state.loading.blogs = false;
        state.error.blogs = action.error.message || 'Failed to fetch blogs';
      });

    // Fetch blog by slug
    builder
      .addCase(fetchBlogBySlug.pending, (state) => {
        state.loading.currentBlog = true;
        state.error.currentBlog = null;
      })
      .addCase(fetchBlogBySlug.fulfilled, (state, action) => {
        state.loading.currentBlog = false;
        state.currentBlog = action.payload;
      })
      .addCase(fetchBlogBySlug.rejected, (state, action) => {
        state.loading.currentBlog = false;
        state.error.currentBlog = action.error.message || 'Failed to fetch blog';
      });

    // Fetch featured blogs
    builder
      .addCase(fetchFeaturedBlogs.pending, (state) => {
        state.loading.featuredBlogs = true;
        state.error.featuredBlogs = null;
      })
      .addCase(fetchFeaturedBlogs.fulfilled, (state, action) => {
        state.loading.featuredBlogs = false;
        state.featuredBlogs = action.payload;
      })
      .addCase(fetchFeaturedBlogs.rejected, (state, action) => {
        state.loading.featuredBlogs = false;
        state.error.featuredBlogs = action.error.message || 'Failed to fetch featured blogs';
      });

    // Fetch popular blogs
    builder
      .addCase(fetchPopularBlogs.pending, (state) => {
        state.loading.popularBlogs = true;
        state.error.popularBlogs = null;
      })
      .addCase(fetchPopularBlogs.fulfilled, (state, action) => {
        state.loading.popularBlogs = false;
        state.popularBlogs = action.payload;
      })
      .addCase(fetchPopularBlogs.rejected, (state, action) => {
        state.loading.popularBlogs = false;
        state.error.popularBlogs = action.error.message || 'Failed to fetch popular blogs';
      });

    // Fetch recent blogs
    builder
      .addCase(fetchRecentBlogs.pending, (state) => {
        state.loading.recentBlogs = true;
        state.error.recentBlogs = null;
      })
      .addCase(fetchRecentBlogs.fulfilled, (state, action) => {
        state.loading.recentBlogs = false;
        state.recentBlogs = action.payload;
      })
      .addCase(fetchRecentBlogs.rejected, (state, action) => {
        state.loading.recentBlogs = false;
        state.error.recentBlogs = action.error.message || 'Failed to fetch recent blogs';
      });

    // Fetch related blogs
    builder
      .addCase(fetchRelatedBlogs.pending, (state) => {
        state.loading.relatedBlogs = true;
        state.error.relatedBlogs = null;
      })
      .addCase(fetchRelatedBlogs.fulfilled, (state, action) => {
        state.loading.relatedBlogs = false;
        state.relatedBlogs = action.payload;
      })
      .addCase(fetchRelatedBlogs.rejected, (state, action) => {
        state.loading.relatedBlogs = false;
        state.error.relatedBlogs = action.error.message || 'Failed to fetch related blogs';
      });

    // Fetch categories
    builder
      .addCase(fetchBlogCategories.pending, (state) => {
        state.loading.categories = true;
        state.error.categories = null;
      })
      .addCase(fetchBlogCategories.fulfilled, (state, action) => {
        state.loading.categories = false;
        state.categories = action.payload;
      })
      .addCase(fetchBlogCategories.rejected, (state, action) => {
        state.loading.categories = false;
        state.error.categories = action.error.message || 'Failed to fetch categories';
      });

    // Admin: Fetch blogs
    builder
      .addCase(fetchAdminBlogs.pending, (state) => {
        state.loading.adminBlogs = true;
        state.error.adminBlogs = null;
      })
      .addCase(fetchAdminBlogs.fulfilled, (state, action) => {
        state.loading.adminBlogs = false;
        state.adminBlogs = action.payload.blogs;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchAdminBlogs.rejected, (state, action) => {
        state.loading.adminBlogs = false;
        state.error.adminBlogs = action.error.message || 'Failed to fetch admin blogs';
      });

    // Admin: Create blog
    builder
      .addCase(createBlog.pending, (state) => {
        state.loading.creating = true;
        state.error.creating = null;
      })
      .addCase(createBlog.fulfilled, (state, action) => {
        state.loading.creating = false;
        state.adminBlogs.unshift(action.payload);
      })
      .addCase(createBlog.rejected, (state, action) => {
        state.loading.creating = false;
        state.error.creating = action.error.message || 'Failed to create blog';
      });

    // Admin: Update blog
    builder
      .addCase(updateBlog.pending, (state) => {
        state.loading.updating = true;
        state.error.updating = null;
      })
      .addCase(updateBlog.fulfilled, (state, action) => {
        state.loading.updating = false;
        const index = state.adminBlogs.findIndex(blog => blog._id === action.payload._id);
        if (index !== -1) {
          state.adminBlogs[index] = action.payload;
        }
        if (state.currentBlog && state.currentBlog._id === action.payload._id) {
          state.currentBlog = action.payload;
        }
      })
      .addCase(updateBlog.rejected, (state, action) => {
        state.loading.updating = false;
        state.error.updating = action.error.message || 'Failed to update blog';
      });

    // Admin: Delete blog
    builder
      .addCase(deleteBlog.pending, (state) => {
        state.loading.deleting = true;
        state.error.deleting = null;
      })
      .addCase(deleteBlog.fulfilled, (state, action) => {
        state.loading.deleting = false;
        state.adminBlogs = state.adminBlogs.filter(blog => blog._id !== action.payload);
      })
      .addCase(deleteBlog.rejected, (state, action) => {
        state.loading.deleting = false;
        state.error.deleting = action.error.message || 'Failed to delete blog';
      });

    // Admin: Categories
    builder
      .addCase(fetchAdminCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.categories.push(action.payload);
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        const index = state.categories.findIndex(cat => cat._id === action.payload._id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.categories = state.categories.filter(cat => cat._id !== action.payload);
      });

    // Like blog
    builder
      .addCase(likeBlog.fulfilled, (state, action) => {
        const { slug, likeCount } = action.payload;

        // Update current blog
        if (state.currentBlog && state.currentBlog.slug === slug) {
          state.currentBlog.likeCount = likeCount;
        }

        // Update in blogs array
        const blogIndex = state.blogs.findIndex(blog => blog.slug === slug);
        if (blogIndex !== -1) {
          state.blogs[blogIndex].likeCount = likeCount;
        }

        // Update in featured blogs
        const featuredIndex = state.featuredBlogs.findIndex(blog => blog.slug === slug);
        if (featuredIndex !== -1) {
          state.featuredBlogs[featuredIndex].likeCount = likeCount;
        }
      });

    // Share blog
    builder
      .addCase(shareBlog.fulfilled, (state, action) => {
        const { slug, shareCount } = action.payload;

        // Update current blog
        if (state.currentBlog && state.currentBlog.slug === slug) {
          state.currentBlog.shareCount = shareCount;
        }

        // Update in blogs array
        const blogIndex = state.blogs.findIndex(blog => blog.slug === slug);
        if (blogIndex !== -1) {
          state.blogs[blogIndex].shareCount = shareCount;
        }
      });
  }
});

export const { setFilters, clearCurrentBlog, clearError, clearAllErrors } = blogSlice.actions;
export default blogSlice.reducer;