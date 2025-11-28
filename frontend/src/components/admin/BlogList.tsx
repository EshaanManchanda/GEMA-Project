import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Filter,
  MoreVertical,
  Calendar,
  User,
  Tag,
  TrendingUp,
  Heart,
  Share2,
  ExternalLink,
  CheckSquare,
  Archive,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import BlogForm from './BlogForm';
import BlogCommentManagement from './BlogCommentManagement';
import blogAPI from '../../services/api/blogAPI';

interface Blog {
  _id: string;
  title: string;
  excerpt: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  featuredImage?: string;  // OLD - deprecated
  featuredImageAsset?: {   // NEW - populated MediaAsset
    _id: string;
    url: string;
    thumbnailUrl?: string;
  };
  category: {
    _id: string;
    name: string;
    color: string;
  };
  author: {
    name: string;
    email: string;
    avatar?: string;
  };
  tags: string[];
  viewCount: number;
  likeCount: number;
  shareCount: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface BlogFilters {
  page: number;
  limit: number;
  search: string;
  status: '' | 'draft' | 'published' | 'archived';
  category: string;
  sortBy: '' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'viewCount' | 'likeCount';
  sortOrder: 'asc' | 'desc';
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const BlogList: React.FC = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [showCommentManagement, setShowCommentManagement] = useState(false);
  const [selectedBlogs, setSelectedBlogs] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [blogFormLoading, setBlogFormLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalBlogs: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 10
  });

  const [filters, setFilters] = useState<BlogFilters>({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    category: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const debouncedSearchTerm = useDebounce(filters.search, 500); // 500ms debounce

  useEffect(() => {
    fetchBlogs();
  }, [filters.page, filters.limit, filters.status, filters.category, filters.sortBy, filters.sortOrder, debouncedSearchTerm]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const response = await blogAPI.admin.getAllBlogs({
        page: filters.page,
        limit: filters.limit,
        search: filters.search || undefined,
        status: filters.status || undefined,
        category: filters.category || undefined,
        sortBy: filters.sortBy || undefined,
        sortOrder: filters.sortOrder
      });

      // Filter out any null or undefined blogs, and blogs without _id
      const validBlogs = (response?.data?.blogs || response?.blogs || []).filter((blog: Blog | null | undefined) => blog != null && blog._id);

      setBlogs(validBlogs);
      setPagination(response?.data?.pagination || response?.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalBlogs: 0,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 10
      });
    } catch (error) {
      toast.error('Failed to fetch blogs');
      console.error('Error fetching blogs:', error);
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await blogAPI.admin.getAllCategories();
      setCategories(response || []);
    } catch (error) {
      toast.error('Failed to fetch categories');
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const handleCreateBlog = () => {
    setSelectedBlog(null);
    setShowBlogForm(true);
  };

  const handleEditBlog = async (blog: Blog) => {
    try {
      setBlogFormLoading(true);
      console.log('Fetching full blog details for editing:', blog._id);

      // Fetch the complete blog with content field
      const response = await blogAPI.admin.getBlogById(blog._id);

      console.log('API response received:', response);

      // Handle multiple response formats:
      // { data: { blog: {...} } } or { blog: {...} } or { data: {...} } or {...}
      const fullBlog = response.data?.blog || response.blog || response.data || response;

      if (!fullBlog || !fullBlog._id) {
        console.error('Invalid blog data received:', response);
        console.error('Extracted fullBlog:', fullBlog);
        throw new Error('Blog data not found in response');
      }

      console.log('Full blog data fetched:', {
        id: fullBlog._id,
        title: fullBlog.title,
        hasContent: !!fullBlog.content,
        contentLength: fullBlog.content?.length || 0
      });

      setSelectedBlog(fullBlog);
      setShowBlogForm(true);
    } catch (error: any) {
      console.error('Error fetching blog details:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to load blog details');
    } finally {
      setBlogFormLoading(false);
    }
  };

  const handleDeleteBlog = async (blogId: string) => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) {
      return;
    }

    try {
      await blogAPI.admin.deleteBlog(blogId);
      toast.success('Blog deleted successfully');
      fetchBlogs();
    } catch (error) {
      toast.error('Failed to delete blog');
    }
  };

  const handleViewComments = (blogId: string) => {
    setSelectedBlog(blogs.find(blog => blog._id === blogId) || null);
    setShowCommentManagement(true);
  };

  const handleSubmitBlog = async (data: any) => {
    try {
      if (selectedBlog) {
        console.log('Updating blog:', selectedBlog._id, 'with data:', data);
        await blogAPI.admin.updateBlog(selectedBlog._id, data);
        console.log('Blog updated successfully');
      } else {
        console.log('Creating blog with data:', data);
        await blogAPI.admin.createBlog(data);
        console.log('Blog created successfully');
      }
      fetchBlogs();
    } catch (error: any) {
      console.error('Error submitting blog:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      // Extract specific validation errors
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const errorMessages = Object.entries(validationErrors)
          .map(([field, message]) => `${field}: ${message}`)
          .join('\n');

        toast.error(`Validation failed:\n${errorMessages}`, { duration: 5000 });
        throw new Error(error.response?.data?.message || 'Validation failed');
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to save blog';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    }
  };

  const handleFilterChange = (key: keyof BlogFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value // Reset to page 1 when changing filters
    }));
  };

  const handleSearch = (value: string) => {
    handleFilterChange('search', value);
  };

  const handleSelectBlog = (blogId: string) => {
    setSelectedBlogs(prev =>
      prev.includes(blogId)
        ? prev.filter(id => id !== blogId)
        : [...prev, blogId]
    );
  };

  const handleSelectAll = () => {
    setSelectedBlogs(prev =>
      prev.length === blogs.length
        ? []
        : blogs.map(blog => blog._id)
    );
  };

  const handleBulkPublish = async () => {
    if (selectedBlogs.length === 0) return;

    setBulkLoading(true);
    try {
      await Promise.all(
        selectedBlogs.map(blogId =>
          blogAPI.admin.updateBlog(blogId, { status: 'published' })
        )
      );
      toast.success(`${selectedBlogs.length} blogs published successfully`);
      setSelectedBlogs([]);
      fetchBlogs();
    } catch (error) {
      toast.error('Failed to publish blogs');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedBlogs.length === 0) return;

    setBulkLoading(true);
    try {
      await Promise.all(
        selectedBlogs.map(blogId =>
          blogAPI.admin.updateBlog(blogId, { status: 'archived' })
        )
      );
      toast.success(`${selectedBlogs.length} blogs archived successfully`);
      setSelectedBlogs([]);
      fetchBlogs();
    } catch (error) {
      toast.error('Failed to archive blogs');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBlogs.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedBlogs.length} blog posts?`)) {
      return;
    }

    setBulkLoading(true);
    try {
      await Promise.all(
        selectedBlogs.map(blogId => blogAPI.admin.deleteBlog(blogId))
      );
      toast.success(`${selectedBlogs.length} blogs deleted successfully`);
      setSelectedBlogs([]);
      fetchBlogs();
    } catch (error) {
      toast.error('Failed to delete blogs');
    } finally {
      setBulkLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'secondary' | 'success' | 'warning' | 'default'> = {
      draft: 'secondary',
      published: 'success',
      archived: 'warning'
    };
    const variant = variants[status] || 'default';
    return <Badge variant={variant}>{status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const columns = [
    {
      key: 'select',
      label: (
        <input
          type="checkbox"
          checked={selectedBlogs.length === blogs.length && blogs.length > 0}
          onChange={handleSelectAll}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      ),
      render: (_: any, blog: Blog) => {
        if (!blog?._id) return null;
        return (
          <input
            type="checkbox"
            checked={selectedBlogs.includes(blog._id)}
            onChange={() => handleSelectBlog(blog._id)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        );
      }
    },
    {
      key: 'title',
      label: 'Blog Post',
      render: (_: any, blog: Blog) => {
        if (!blog) return null;
        // Prefer new field, fallback to old
        const imageUrl = blog.featuredImageAsset?.url
          || blog.featuredImage
          || '/assets/images/blog/placeholder.svg';

        return (
          <div className="flex items-start space-x-3 max-w-md">
            <img
              src={imageUrl}
              alt={blog.title}
              className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
              onError={(e) => {
                e.currentTarget.src = '/assets/images/blog/placeholder.svg';
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
                  {blog.title}
                </h3>
                {blog.featured && (
                  <Badge variant="primary" size="sm">Featured</Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 line-clamp-2 mb-1">
                {blog.excerpt}
              </p>
              <span className="text-xs text-gray-400">
                by {blog.author?.name || 'Unknown Author'}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'category',
      label: 'Category',
      render: (_: any, blog: Blog) => (
        blog.category && blog.category.color ? (
          <Badge
            variant="secondary"
            style={{ backgroundColor: blog.category.color + '20', color: blog.category.color }}
          >
            {blog.category.name}
          </Badge>
        ) : (
          <Badge variant="secondary">Uncategorized</Badge>
        )
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: any, blog: Blog) => getStatusBadge(blog.status)
    },
    {
      key: 'stats',
      label: 'Stats',
      render: (_: any, blog: Blog) => (
        <div className="flex items-center space-x-3 text-sm text-gray-500">
          <div className="flex items-center">
            <Eye className="w-4 h-4 mr-1" />
            {blog.viewCount}
          </div>
          <div className="flex items-center">
            <Heart className="w-4 h-4 mr-1" />
            {blog.likeCount}
          </div>
          <div className="flex items-center">
            <Share2 className="w-4 h-4 mr-1" />
            {blog.shareCount}
          </div>
        </div>
      )
    },
    {
      key: 'publishedAt',
      label: 'Published',
      render: (_: any, blog: Blog) => (
        <div className="text-sm text-gray-500">
          {blog.publishedAt ? formatDate(blog.publishedAt) : 'Not published'}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, blog: Blog) => {
        if (!blog?._id) return null;
        return (
          <div className="flex items-center gap-2">
            <button
              className="p-2 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-200 hover:scale-105"
              onClick={() => handleViewComments(blog._id)}
              title="View Comments"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-gray-600 hover:text-white hover:bg-gray-600 rounded-lg transition-all duration-200 hover:scale-105"
              onClick={() => window.open(`/blog/${blog.slug}`, '_blank')}
              title="Open Blog"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-green-600 hover:text-white hover:bg-green-600 rounded-lg transition-all duration-200 hover:scale-105"
              onClick={() => handleEditBlog(blog)}
              title="Edit Blog"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200 hover:scale-105"
              onClick={() => handleDeleteBlog(blog._id)}
              title="Delete Blog"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blog Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Create, edit, and manage your blog posts
          </p>
        </div>
        <Button onClick={handleCreateBlog} size="md">
          <Plus className="w-5 h-5 mr-2" />
          Create Blog Post
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Total Posts</p>
                <p className="text-2xl font-bold text-blue-600">{pagination.totalBlogs}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Published</p>
                <p className="text-2xl font-bold text-green-600">
                  {blogs.filter(b => b.status === 'published').length}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Drafts</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {blogs.filter(b => b.status === 'draft').length}
                </p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-full">
                <Edit className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-purple-600">{categories.length}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <Tag className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md h-[42px]">
                <div className="absolute left-3 top-0 h-full flex items-center pointer-events-none">
                  <Search className="text-gray-400 w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="blog-search"
                  name="blogSearch"
                  placeholder="Search blogs..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="h-full pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              <select
                id="blog-filter-status"
                name="blogFilterStatus"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="h-[42px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>

              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="h-[42px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-');
                  handleFilterChange('sortBy', sortBy);
                  handleFilterChange('sortOrder', sortOrder);
                }}
                className="h-[42px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="publishedAt-desc">Recently Published</option>
                <option value="viewCount-desc">Most Viewed</option>
                <option value="likeCount-desc">Most Liked</option>
                <option value="title-asc">Title A-Z</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedBlogs.length > 0 && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedBlogs.length} blog{selectedBlogs.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleBulkPublish}
                  loading={bulkLoading}
                  disabled={bulkLoading}
                >
                  <BookOpen className="w-4 h-4 mr-1" />
                  Publish
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBulkArchive}
                  loading={bulkLoading}
                  disabled={bulkLoading}
                >
                  <Archive className="w-4 h-4 mr-1" />
                  Archive
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleBulkDelete}
                  loading={bulkLoading}
                  disabled={bulkLoading}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blog Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={blogs}
            loading={loading}
            rowKey="_id"
            pagination={{
              page: pagination.currentPage,
              pageSize: pagination.limit,
              total: pagination.totalBlogs
            }}
            onPageChange={(page: number) => handleFilterChange('page', page)}
          />
        </CardContent>
      </Card>

      {/* Blog Form Modal */}
      <BlogForm
        blog={selectedBlog}
        isOpen={showBlogForm}
        onClose={() => {
          setShowBlogForm(false);
          setSelectedBlog(null); // Clear selected blog when closing
        }}
        onSubmit={handleSubmitBlog}
        categories={categories}
        loading={blogFormLoading}
      />

      {/* Blog Comment Management Modal */}
      {selectedBlog && (
        <BlogCommentManagement
          blogId={selectedBlog._id}
          isOpen={showCommentManagement}
          onClose={() => setShowCommentManagement(false)}
        />
      )}

    </div>
  );
};

export default BlogList;