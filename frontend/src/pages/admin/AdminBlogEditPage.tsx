import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import BlogForm from '../../components/admin/BlogForm';
import blogAPI from '../../services/api/blogAPI';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import logger from '@/utils/logger';
import VendorAttributionPanel from '../../components/admin/VendorAttributionPanel';

const AdminBlogEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCreateMode = !id;

  useEffect(() => {
    fetchCategories();
    if (id) {
      fetchBlog();
    } else {
      setIsLoading(false);
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await blogAPI.admin.getAllCategories();
      setCategories(response || []);
    } catch (error) {
      logger.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchBlog = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await blogAPI.admin.getBlogById(id!);
      const blogData = response?.data?.blog || response?.blog;

      if (blogData) {
        setBlog(blogData);
      } else {
        throw new Error('Blog not found');
      }
    } catch (error: any) {
      logger.error('Error fetching blog:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load blog';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (id) {
        await blogAPI.admin.updateBlog(id, data);
      } else {
        await blogAPI.admin.createBlog(data);
      }
      navigate('/admin/blogs');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to save blog';
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleCancel = () => {
    navigate('/admin/blogs');
  };

  if (isLoading) {
    return (
      <>
        <PrivatePageSEO
          title={`Admin - ${isCreateMode ? 'Create' : 'Edit'} Blog | Kidrove`}
          description={isCreateMode ? 'Create new blog post' : 'Edit blog post'}
        />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </>
    );
  }

  if (error || (!isCreateMode && !blog)) {
    return (
      <>
        <PrivatePageSEO title="Admin - Blog Not Found | Kidrove" description="Blog not found" />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 mb-4">{error || 'Blog not found'}</p>
            <button
              onClick={() => navigate('/admin/blogs')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm
                text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blogs
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PrivatePageSEO
        title={`Admin - ${isCreateMode ? 'Create' : 'Edit'} Blog | Kidrove`}
        description={isCreateMode ? 'Create new blog post' : 'Edit blog post'}
      />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/blogs')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Blogs
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isCreateMode ? 'Create New Blog Post' : 'Edit Blog Post'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {isCreateMode
              ? 'Create a new blog post. All required fields are marked with an asterisk (*).'
              : 'Update blog post information. All required fields are marked with an asterisk (*).'}
          </p>
        </div>

        {/* Vendor attribution — who this blog was posted for (offline service package tracking) */}
        {!isCreateMode && id && (
          <VendorAttributionPanel
            blogId={id}
            currentVendorId={blog?.vendorId?._id || blog?.vendorId}
            onAttributed={fetchBlog}
          />
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md">
          <BlogForm
            blog={blog}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            categories={categories}
          />
        </div>
      </div>
    </>
  );
};

export default AdminBlogEditPage;
