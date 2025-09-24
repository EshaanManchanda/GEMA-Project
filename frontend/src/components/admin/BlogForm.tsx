import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import {
  Save,
  X,
  Upload,
  Image,
  Plus,
  Trash2,
  Eye,
  Hash,
  Calendar,
  User,
  FileText
} from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import ImageUpload from '../ui/ImageUpload';
import blogAPI from '../../services/api/blogAPI';
import SEOEditor from '../seo/SEOEditor';

// Validation schema
const blogSchema = yup.object().shape({
  title: yup.string().required('Title is required').max(200, 'Title cannot exceed 200 characters'),
  excerpt: yup.string().required('Excerpt is required').max(500, 'Excerpt cannot exceed 500 characters'),
  content: yup.string().required('Content is required'),
  featuredImage: yup.string().required('Featured image is required'),
  category: yup.string().required('Category is required'),
  'author.name': yup.string().required('Author name is required').max(100, 'Author name cannot exceed 100 characters'),
  'author.email': yup.string().email('Must be a valid email').required('Author email is required'),
  'author.avatar': yup.string().url('Must be a valid URL').optional(),
  'author.bio': yup.string().max(500, 'Author bio cannot exceed 500 characters').optional(),
  tags: yup.array().of(yup.string().max(50, 'Tag cannot exceed 50 characters')),
  status: yup.string().oneOf(['draft', 'published', 'archived']).optional(),
  featured: yup.boolean().optional(),
  'seo.metaTitle': yup.string().max(60, 'Meta title cannot exceed 60 characters').optional(),
  'seo.metaDescription': yup.string().max(160, 'Meta description cannot exceed 160 characters').optional(),
  'seo.metaKeywords': yup.array().of(yup.string()).optional(),
  'seo.canonicalUrl': yup.string().url('Must be a valid URL').optional(),
});

interface BlogFormProps {
  blog?: any;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  categories: any[];
  loading?: boolean;
}

const BlogForm: React.FC<BlogFormProps> = ({
  blog,
  isOpen,
  onClose,
  onSubmit,
  categories,
  loading = false
}) => {
  const [newTag, setNewTag] = useState('');
  const [seoData, setSeoData] = useState({
    title: blog?.seo?.metaTitle || '',
    description: blog?.seo?.metaDescription || '',
    keywords: blog?.seo?.metaKeywords || []
  });
  const [previewMode, setPreviewMode] = useState(false);

  // Update SEO data when blog changes
  useEffect(() => {
    if (blog) {
      setSeoData({
        title: blog.seo?.metaTitle || '',
        description: blog.seo?.metaDescription || '',
        keywords: blog.seo?.metaKeywords || []
      });
    }
  }, [blog]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(blogSchema),
    defaultValues: {
      title: '',
      excerpt: '',
      content: '',
      featuredImage: '',
      category: '',
      author: {
        name: '',
        email: '',
        avatar: '',
        bio: ''
      },
      tags: [],
      status: 'draft',
      featured: false,
      seo: {
        metaTitle: '',
        metaDescription: '',
        metaKeywords: [],
        canonicalUrl: ''
      }
    }
  });

  const watchedTags = watch('tags') || [];
  const watchedContent = watch('content');
  const watchedTitle = watch('title');

  useEffect(() => {
    if (blog) {
      reset({
        title: blog.title || '',
        excerpt: blog.excerpt || '',
        content: blog.content || '',
        featuredImage: blog.featuredImage || '',
        category: blog.category?._id || '',
        author: {
          name: blog.author?.name || '',
          email: blog.author?.email || '',
          avatar: blog.author?.avatar || '',
          bio: blog.author?.bio || ''
        },
        tags: blog.tags || [],
        status: blog.status || 'draft',
        featured: blog.featured || false,
        seo: {
          metaTitle: blog.seo?.metaTitle || '',
          metaDescription: blog.seo?.metaDescription || '',
          metaKeywords: blog.seo?.metaKeywords || [],
          canonicalUrl: blog.seo?.canonicalUrl || ''
        }
      });
    } else {
      reset({
        title: '',
        excerpt: '',
        content: '',
        featuredImage: '',
        category: '',
        author: {
          name: '',
          email: '',
          avatar: '',
          bio: ''
        },
        tags: [],
        status: 'draft',
        featured: false,
        seo: {
          metaTitle: '',
          metaDescription: '',
          metaKeywords: [],
          canonicalUrl: ''
        }
      });
    }
  }, [blog, reset]);

  const handleAddTag = () => {
    if (newTag.trim() && !watchedTags.includes(newTag.trim())) {
      setValue('tags', [...watchedTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (index: number) => {
    const updatedTags = watchedTags.filter((_, i) => i !== index);
    setValue('tags', updatedTags);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      await onSubmit(data);
      onClose();
      toast.success(blog ? 'Blog updated successfully!' : 'Blog created successfully!');
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    }
  };

  const renderPreview = () => (
    <div className="prose max-w-none">
      <h1 className="text-3xl font-bold mb-4">{watchedTitle || 'Blog Title'}</h1>
      <div
        className="blog-content"
        dangerouslySetInnerHTML={{ __html: watchedContent || 'Blog content will appear here...' }}
      />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={blog ? 'Edit Blog Post' : 'Create New Blog Post'}
      size="xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Header with preview toggle */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <Button
              type="button"
              variant={!previewMode ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPreviewMode(false)}
            >
              <FileText className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              type="button"
              variant={previewMode ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPreviewMode(true)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </div>
        </div>

        {previewMode ? (
          renderPreview()
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Controller
                    name="title"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        label="Title"
                        placeholder="Enter blog title"
                        error={errors.title?.message}
                        required
                      />
                    )}
                  />

                  <Controller
                    name="excerpt"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Excerpt *
                        </label>
                        <textarea
                          {...field}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="Brief description of the blog post"
                        />
                        {errors.excerpt && (
                          <p className="mt-1 text-sm text-red-600">{errors.excerpt.message}</p>
                        )}
                      </div>
                    )}
                  />

                  <Controller
                    name="content"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Content *
                        </label>
                        <textarea
                          {...field}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={15}
                          placeholder="Write your blog content here (supports HTML)"
                        />
                        {errors.content && (
                          <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                        )}
                      </div>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Author Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Author Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      name="author.name"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          label="Author Name"
                          placeholder="Enter author name"
                          error={errors.author?.name?.message}
                          required
                        />
                      )}
                    />

                    <Controller
                      name="author.email"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="email"
                          label="Author Email"
                          placeholder="Enter author email"
                          error={errors.author?.email?.message}
                          required
                        />
                      )}
                    />
                  </div>

                  <Controller
                    name="author.avatar"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="url"
                        label="Author Avatar URL"
                        placeholder="https://example.com/avatar.jpg"
                        error={errors.author?.avatar?.message}
                      />
                    )}
                  />

                  <Controller
                    name="author.bio"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Author Bio
                        </label>
                        <textarea
                          {...field}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="Author biography"
                        />
                        {errors.author?.bio && (
                          <p className="mt-1 text-sm text-red-600">{errors.author.bio.message}</p>
                        )}
                      </div>
                    )}
                  />
                </CardContent>
              </Card>

              {/* SEO Settings */}
              <div className="space-y-6">
                <SEOEditor
                  initialData={{
                    title: seoData.title,
                    description: seoData.description,
                    keywords: seoData.keywords,
                    canonicalUrl: watch('seo.canonicalUrl') || ''
                  }}
                  contentData={{
                    title: watch('title') || '',
                    description: watch('excerpt') || '',
                    category: categories.find(cat => cat._id === watch('category'))?.name || '',
                    tags: watch('tags') || [],
                    type: 'blog'
                  }}
                  onChange={(newSeoData) => {
                    setSeoData(newSeoData);
                    setValue('seo.metaTitle', newSeoData.title);
                    setValue('seo.metaDescription', newSeoData.description);
                    setValue('seo.metaKeywords', newSeoData.keywords);
                    setValue('seo.canonicalUrl', newSeoData.canonicalUrl || '');
                  }}
                  baseUrl={import.meta.env.VITE_APP_URL || 'https://gema-events.com'}
                  path={`/blog/${watch('slug') || 'new-post'}`}
                  ogImage={watch('featuredImage')}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Publishing Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Publishing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Status
                        </label>
                        <select
                          {...field}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                    )}
                  />

                  <Controller
                    name="featured"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center">
                        <input
                          {...field}
                          type="checkbox"
                          checked={field.value}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label className="ml-2 text-sm font-medium text-gray-700">
                          Featured Post
                        </label>
                      </div>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                          <option key={cat._id} value={cat._id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                  )}
                </CardContent>
              </Card>

              {/* Featured Image */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Image className="w-5 h-5 mr-2" />
                    Featured Image
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Controller
                    name="featuredImage"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <ImageUpload
                          onImageUpload={(imageUrl) => field.onChange(imageUrl)}
                          currentImage={field.value}
                          placeholder="Upload featured image"
                          maxFileSize={5}
                        />
                        {errors.featuredImage && (
                          <p className="mt-2 text-sm text-red-600">{errors.featuredImage.message}</p>
                        )}
                      </div>
                    )}
                  />

                  {/* URL Input as fallback */}
                  <div className="text-sm text-gray-600">
                    <p className="mb-2">Or enter image URL:</p>
                    <Controller
                      name="featuredImage"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          size="sm"
                        />
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Hash className="w-5 h-5 mr-2" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddTag}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {watchedTags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(index)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting || loading}
          >
            <Save className="w-4 h-4 mr-2" />
            {blog ? 'Update Blog' : 'Create Blog'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default BlogForm;