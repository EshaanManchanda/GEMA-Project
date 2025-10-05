import { ApiService } from '../api';

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

const blogAPI = {
  // Get all blogs with filters
  getAllBlogs: async (filters?: BlogFilters) => {
    try {
      const response = await ApiService.get('/blogs', { params: filters });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get blog by slug
  getBlogBySlug: async (slug: string) => {
    try {
      const response = await ApiService.get(`/blogs/${slug}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get featured blogs
  getFeaturedBlogs: async (limit: number = 6) => {
    try {
      const response = await ApiService.get('/blogs/featured', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get popular blogs
  getPopularBlogs: async (limit: number = 6) => {
    try {
      const response = await ApiService.get('/blogs/popular', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get recent blogs
  getRecentBlogs: async (limit: number = 6) => {
    try {
      const response = await ApiService.get('/blogs/recent', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get related blogs
  getRelatedBlogs: async (slug: string, limit: number = 4) => {
    try {
      const response = await ApiService.get(`/blogs/${slug}/related`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get blog categories
  getBlogCategories: async () => {
    try {
      const response = await ApiService.get('/blogs/categories');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Like a blog post
  likeBlog: async (slug: string) => {
    try {
      const response = await ApiService.post(`/blogs/${slug}/like`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Share a blog post (increment share count)
  shareBlog: async (slug: string) => {
    try {
      const response = await ApiService.post(`/blogs/${slug}/share`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Search blogs
  searchBlogs: async (query: string, filters?: Omit<BlogFilters, 'search'>) => {
    try {
      const response = await ApiService.get('/blogs', {
        params: {
          search: query,
          ...filters
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get blogs by category
  getBlogsByCategory: async (categorySlug: string, filters?: Omit<BlogFilters, 'category'>) => {
    try {
      const response = await ApiService.get('/blogs', {
        params: {
          category: categorySlug,
          ...filters
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get blogs by tags
  getBlogsByTags: async (tags: string[], filters?: Omit<BlogFilters, 'tags'>) => {
    try {
      const response = await ApiService.get('/blogs', {
        params: {
          tags: tags.join(','),
          ...filters
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin functions (require authentication)
  admin: {
    // Get all blogs for admin
    getAllBlogs: async (filters?: {
      page?: number;
      limit?: number;
      status?: 'draft' | 'published' | 'archived';
      category?: string;
      search?: string;
      sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'viewCount' | 'likeCount';
      sortOrder?: 'asc' | 'desc';
    }) => {
      try {
        const response = await ApiService.get('/admin/blogs/blogs', { params: filters });
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    // Get blog by ID for admin
    getBlogById: async (id: string) => {
      try {
        const response = await ApiService.get(`/admin/blogs/blogs/${id}`);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    // Create blog
    createBlog: async (blogData: {
      title: string;
      excerpt: string;
      content: string;
      featuredImage: string;
      category: string;
      author: {
        name: string;
        email: string;
        avatar?: string;
        bio?: string;
      };
      tags?: string[];
      status?: 'draft' | 'published' | 'archived';
      featured?: boolean;
      seo?: {
        metaTitle?: string;
        metaDescription?: string;
        metaKeywords?: string[];
        canonicalUrl?: string;
      };
    }) => {
      try {
        const response = await ApiService.post('/admin/blogs/blogs', blogData);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    // Update blog
    updateBlog: async (id: string, blogData: any) => {
      try {
        const response = await ApiService.put(`/admin/blogs/blogs/${id}`, blogData);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    // Delete blog
    deleteBlog: async (id: string) => {
      try {
        const response = await ApiService.delete(`/admin/blogs/blogs/${id}`);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    // Category management
    getAllCategories: async () => {
      try {
        const response = await ApiService.get('/admin/blogs/categories');
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    createCategory: async (categoryData: {
      name: string;
      description?: string;
      color?: string;
    }) => {
      try {
        const response = await ApiService.post('/admin/blogs/categories', categoryData);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    updateCategory: async (id: string, categoryData: any) => {
      try {
        const response = await ApiService.put(`/admin/blogs/categories/${id}`, categoryData);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    deleteCategory: async (id: string) => {
      try {
        const response = await ApiService.delete(`/admin/blogs/categories/${id}`);
        return response.data;
      } catch (error) {
        throw error;
      }
    }
  },

  // Comment functions
  comments: {
    // Get comments for a blog post
    getComments: async (postId: string, params?: {
      page?: number;
      limit?: number;
      sort?: 'newest' | 'oldest' | 'likes';
    }) => {
      try {
        const response = await ApiService.get(`/blog-comments/posts/${postId}/comments`, {
          params
        });
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    // Create a new comment or reply
    createComment: async (postId: string, content: string, parentCommentId?: string) => {
      try {
        const response = await ApiService.post(`/blog-comments/posts/${postId}/comments`, {
          content,
          parentComment: parentCommentId
        });
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    // Update a comment
    updateComment: async (commentId: string, content: string) => {
      try {
        const response = await ApiService.put(`/blog-comments/comments/${commentId}`, {
          content
        });
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    // Delete a comment
    deleteComment: async (commentId: string) => {
      try {
        const response = await ApiService.delete(`/blog-comments/comments/${commentId}`);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    // Like a comment
    likeComment: async (commentId: string) => {
      try {
        const response = await ApiService.post(`/blog-comments/comments/${commentId}/like`);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    // Dislike a comment
    dislikeComment: async (commentId: string) => {
      try {
        const response = await ApiService.post(`/blog-comments/comments/${commentId}/dislike`);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    // Report a comment
    reportComment: async (commentId: string, reason?: string) => {
      try {
        const response = await ApiService.post(`/blog-comments/comments/${commentId}/report`, {
          reason
        });
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    // Get replies for a comment
    getCommentReplies: async (commentId: string, params?: {
      page?: number;
      limit?: number;
    }) => {
      try {
        const response = await ApiService.get(`/blog-comments/comments/${commentId}/replies`, {
          params
        });
        return response.data;
      } catch (error) {
        throw error;
      }
    }
  }
};

export default blogAPI;