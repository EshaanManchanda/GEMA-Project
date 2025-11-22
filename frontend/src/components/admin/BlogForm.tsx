import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import DOMPurify from 'isomorphic-dompurify';
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
import TipTapEditor from '../common/TipTapEditor';
import blogAPI from '../../services/api/blogAPI';
import SEOEditor from '../seo/SEOEditor';

// Validation schema
const blogSchema = yup.object().shape({
  title: yup.string().required('Title is required').max(200, 'Title cannot exceed 200 characters'),
  slug: yup.string().optional(),
  excerpt: yup.string().required('Excerpt is required').max(500, 'Excerpt cannot exceed 500 characters'),
  content: yup.string().required('Content is required'),
  featuredImage: yup.string().required('Featured image is required'),
  category: yup.string().required('Category is required'),
  author: yup.object().shape({
    name: yup.string().required('Author name is required').max(100, 'Author name cannot exceed 100 characters'),
    email: yup.string().email('Must be a valid email').required('Author email is required'),
    avatar: yup.string()
      .transform((value) => value === '' ? undefined : value)
      .test('is-url', 'Must be a valid URL', function(value) {
        if (!value) return true; // Optional field
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      })
      .optional(),
    bio: yup.string().max(500, 'Author bio cannot exceed 500 characters').optional(),
  }),
  tags: yup.array().of(yup.string().max(50, 'Tag cannot exceed 50 characters')),
  status: yup.string().oneOf(['draft', 'published', 'archived']).optional(),
  featured: yup.boolean().optional(),
  seo: yup.object().shape({
    metaTitle: yup.string().max(60, 'Meta title cannot exceed 60 characters').optional(),
    metaDescription: yup.string().max(160, 'Meta description cannot exceed 160 characters').optional(),
    metaKeywords: yup.array().of(yup.string()).optional(),
    canonicalUrl: yup.string()
      .transform((value) => value === '' ? undefined : value)
      .test('is-url', 'Must be a valid URL', function(value) {
        if (!value) return true; // Optional field
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      })
      .optional(),
  }),
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
    if (isOpen && blog) {
      console.log('Updating SEO data for blog');
      setSeoData({
        title: blog.seo?.metaTitle || '',
        description: blog.seo?.metaDescription || '',
        keywords: blog.seo?.metaKeywords || []
      });
    } else if (isOpen && !blog) {
      setSeoData({
        title: '',
        description: '',
        keywords: []
      });
    }
  }, [blog, isOpen]);

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
      slug: '',
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

  // Log validation errors for debugging
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.error('Form validation errors:', errors);
    }
  }, [errors]);

  // Memoized callback for SEO Editor to prevent infinite loops
  const handleSeoDataChange = useCallback((newSeoData: any) => {
    setSeoData(newSeoData);
    // Set entire SEO object at once to ensure proper validation structure
    // Convert empty strings to undefined for optional fields
    setValue('seo', {
      metaTitle: newSeoData.title || undefined,
      metaDescription: newSeoData.description || undefined,
      metaKeywords: newSeoData.keywords?.length > 0 ? newSeoData.keywords : undefined,
      canonicalUrl: newSeoData.canonicalUrl && newSeoData.canonicalUrl.trim() !== ''
        ? newSeoData.canonicalUrl
        : undefined
    }, { shouldValidate: true });
  }, [setValue]);

  // Reset form when blog changes or modal opens
  useEffect(() => {
    console.log('=== FORM RESET TRIGGERED ===');
    console.log('isOpen:', isOpen);
    console.log('blog exists:', !!blog);

    if (isOpen && blog) {
      console.log('Blog ID:', blog._id);
      console.log('Blog title:', blog.title);
      console.log('Blog content length:', blog.content?.length || 0);
      console.log('Blog content preview:', blog.content?.substring(0, 100));
      console.log('Blog excerpt:', blog.excerpt);
      console.log('Blog category:', blog.category);
      console.log('Blog tags:', blog.tags);

      const formData = {
        title: blog.title || '',
        slug: blog.slug || '',
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
      };

      console.log('Resetting form with data. Content field:', formData.content?.substring(0, 100));
      reset(formData);
      console.log('Form reset complete');
    } else if (isOpen && !blog) {
      console.log('Creating new blog, resetting to empty form');
      reset({
        title: '',
        slug: '',
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
  }, [blog, reset, isOpen]);

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

  const handleClose = () => {
    console.log('Closing modal...');

    // Reset local states only (form will be reset when modal reopens based on blog prop)
    setSeoData({
      title: '',
      description: '',
      keywords: []
    });
    setPreviewMode(false);
    setNewTag('');

    // Call parent onClose - the form reset will happen in useEffect when modal reopens
    onClose();
  };

  const cleanFormData = (data: any) => {
    // Create a deep copy to avoid mutating original data
    const cleaned = { ...data };

    // Convert empty strings to undefined for optional fields
    if (cleaned.slug === '') cleaned.slug = undefined;
    if (cleaned.author) {
      if (cleaned.author.avatar === '') cleaned.author.avatar = undefined;
      if (cleaned.author.bio === '') cleaned.author.bio = undefined;
    }
    if (cleaned.seo) {
      if (cleaned.seo.metaTitle === '') cleaned.seo.metaTitle = undefined;
      if (cleaned.seo.metaDescription === '') cleaned.seo.metaDescription = undefined;
      if (cleaned.seo.canonicalUrl === '') cleaned.seo.canonicalUrl = undefined;
      if (cleaned.seo.metaKeywords && cleaned.seo.metaKeywords.length === 0) {
        cleaned.seo.metaKeywords = undefined;
      }
    }

    return cleaned;
  };

  const handleFormSubmit = async (data: any) => {
    console.log('=== FORM SUBMIT TRIGGERED ===');
    console.log('Form is valid, submitting data...');
    console.log('Raw form data:', data);

    try {
      const cleanedData = cleanFormData(data);
      console.log('Cleaned form data:', cleanedData);
      console.log('Calling onSubmit...');

      await onSubmit(cleanedData);

      console.log('onSubmit completed successfully');
      toast.success(blog ? 'Blog updated successfully!' : 'Blog created successfully!');
      onClose();
    } catch (error: any) {
      console.error('=== FORM SUBMISSION ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);

      const errorMessage = error.message || 'An error occurred. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleSubmitClick = (e: React.MouseEvent) => {
    console.log('=== SUBMIT BUTTON CLICKED ===');
    console.log('Current errors:', errors);
    console.log('Form is submitting:', isSubmitting);
    console.log('Has validation errors:', Object.keys(errors).length > 0);
  };

  const renderPreview = () => (
    <div className="prose max-w-none">
      <h1 className="text-3xl font-bold mb-4">{watchedTitle || 'Blog Title'}</h1>
      <div
        className="blog-content"
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(watchedContent || 'Blog content will appear here...', {
            ADD_ATTR: ['style', 'class'],
            ADD_TAGS: ['iframe'],
            ALLOWED_ATTR: ['style', 'class', 'href', 'src', 'alt', 'title', 'target', 'rel', 'width', 'height', 'id']
          })
        }}
      />
    </div>
  );

  const onFormSubmit = handleSubmit(
    (data) => {
      console.log('Form validation passed, calling handleFormSubmit');
      handleFormSubmit(data);
    },
    (errors) => {
      console.error('Form validation failed:', errors);
      toast.error('Please fix the validation errors before submitting');
    }
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={blog ? 'Edit Blog Post' : 'Create New Blog Post'}
      size="full"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading blog data...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={onFormSubmit} className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto p-2">
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
          <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
            {/* Main Content */}
            <div className="space-y-4">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      name="slug"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          label="Slug (URL)"
                          placeholder="auto-generated-from-title"
                          error={errors.slug?.message}
                          helperText="Leave empty to auto-generate from title"
                        />
                      )}
                    />
                  </div>

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
                        <TipTapEditor
                          content={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Start writing your blog content... Use the toolbar to format text, add images, videos, and links."
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
                  <CardTitle className="flex items-center text-base">
                    <User className="w-5 h-5 mr-2" />
                    Author Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Controller
                      name="author.name"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          label="Name"
                          placeholder="Author name"
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
                          label="Email"
                          placeholder="Author email"
                          error={errors.author?.email?.message}
                          required
                        />
                      )}
                    />

                    <Controller
                      name="author.avatar"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="url"
                          label="Avatar URL"
                          placeholder="https://example.com/avatar.jpg"
                          error={errors.author?.avatar?.message}
                        />
                      )}
                    />
                  </div>

                  <Controller
                    name="author.bio"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bio
                        </label>
                        <textarea
                          {...field}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          rows={2}
                          placeholder="Brief author biography"
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
                  onChange={handleSeoDataChange}
                  baseUrl={import.meta.env.VITE_APP_URL || 'https://gema-events.com'}
                  path={`/blog/${watch('slug') || 'new-post'}`}
                  ogImage={watch('featuredImage')}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Publishing Options & Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Calendar className="w-5 h-5 mr-2" />
                    Publishing & Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Status
                        </label>
                        <select
                          {...field}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                    )}
                  />

                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Category
                        </label>
                        <select
                          {...field}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Category</option>
                          {categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        {errors.category && (
                          <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                        )}
                      </div>
                    )}
                  />

                  <Controller
                    name="featured"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center pt-1">
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

              {/* Featured Image */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Image className="w-5 h-5 mr-2" />
                    Featured Image
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
                          category="blogs"
                        />
                        {errors.featuredImage && (
                          <p className="mt-2 text-sm text-red-600">{errors.featuredImage.message}</p>
                        )}
                      </div>
                    )}
                  />

                  {/* URL Input as fallback */}
                  <div className="text-xs text-gray-600">
                    <p className="mb-1.5">Or enter image URL:</p>
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
                  <CardTitle className="flex items-center text-base">
                    <Hash className="w-5 h-5 mr-2" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      id="new-tag"
                      name="newTag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag"
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                  <div className="flex flex-wrap gap-1.5">
                    {watchedTags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
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
        <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-4 pb-2 -mx-2 px-2 mt-6">
          {/* Validation Error Summary */}
          {Object.keys(errors).length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-2">
                Please fix the following errors before submitting:
              </p>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {Object.entries(errors).map(([key, error]: [string, any]) => (
                  <li key={key}>
                    {key}: {error?.message || 'Invalid value'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting || loading}
              onClick={handleSubmitClick}
              animated={false}
            >
              <Save className="w-4 h-4 mr-2" />
              {blog ? 'Update Blog' : 'Create Blog'}
            </Button>
          </div>
        </div>
        </form>
      )}
    </Modal>
  );
};

export default BlogForm;