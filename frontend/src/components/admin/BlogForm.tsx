import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import DOMPurify from 'isomorphic-dompurify';
import {
  Save,
  X,
  Image,
  Eye,
  Hash,
  Calendar,
  User,
  FileText,
  ExternalLink
} from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import MediaPickerModal from './media/MediaPickerModal';
import SEOEditor from '../seo/SEOEditor';

// Lazy load TipTapEditor (~200KB) - only loaded when form renders
const TipTapEditor = lazy(() => import('../common/TipTapEditor'));
const TipTapEditorFallback = () => (
  <div className="border border-gray-300 rounded-lg p-4 min-h-[300px] bg-gray-50 animate-pulse">
    <div className="h-10 bg-gray-200 rounded mb-4" />
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);
import TagInput from '../common/TagInput';
import { MediaAsset } from '../../store/slices/mediaSlice';
import { config } from '../../config';
import logger from '../../utils/logger';
import { getImageAlt } from '../../utils/imageAlt';

// Validation schema
const blogSchema = yup.object().shape({
  title: yup.string().required('Title is required').max(200, 'Title cannot exceed 200 characters'),
  slug: yup.string().optional(),
  excerpt: yup.string().required('Excerpt is required').max(500, 'Excerpt cannot exceed 500 characters'),
  content: yup.string().required('Content is required'),
  customCSS: yup.string().max(50000, 'Custom CSS cannot exceed 50,000 characters').optional(),
  featuredImage: yup.string().optional(),            // Old field, optional
  featuredImageAsset: yup.string().optional(),       // New field, optional
  category: yup.string().required('Category is required'),
  readTime: yup.number().min(1, 'Read time must be at least 1 minute').optional(),
  author: yup.object().shape({
    name: yup.string().required('Author name is required').max(100, 'Author name cannot exceed 100 characters'),
    email: yup.string().email('Must be a valid email').required('Author email is required'),
    avatar: yup.string()
      .transform((value) => value === '' ? undefined : value)
      .test('is-url', 'Must be a valid URL', function (value) {
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
      .test('is-url', 'Must be a valid URL', function (value) {
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
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  categories: any[];
  loading?: boolean;
}

const BlogForm: React.FC<BlogFormProps> = ({
  blog,
  onSubmit,
  onCancel,
  categories,
  loading = false
}) => {
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedFeaturedImageAsset, setSelectedFeaturedImageAsset] = useState<MediaAsset | null>(null);
  const [seoData, setSeoData] = useState({
    title: blog?.seo?.metaTitle || '',
    description: blog?.seo?.metaDescription || '',
    keywords: blog?.seo?.metaKeywords || []
  });
  const [previewMode, setPreviewMode] = useState(false);

  // Update SEO data when blog changes
  useEffect(() => {
    if (blog) {
      logger.debug('Updating SEO data for blog');
      setSeoData({
        title: blog.seo?.metaTitle || '',
        description: blog.seo?.metaDescription || '',
        keywords: blog.seo?.metaKeywords || []
      });
    } else {
      setSeoData({
        title: '',
        description: '',
        keywords: []
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
      slug: '',
      excerpt: '',
      content: '',
      featuredImage: '',
      category: '',
      readTime: 1,
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

  const watchedTags = (watch('tags') || []).filter((tag): tag is string => tag !== undefined);
  const watchedContent = watch('content');
  const watchedTitle = watch('title');

  // Log validation errors for debugging
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      logger.error('Form validation errors', errors);
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

  // Reset form when blog changes
  useEffect(() => {

    if (blog) {
      logger.debug('Restoring blog form data', {
        id: blog._id,
        title: blog.title,
        contentLength: blog.content?.length || 0
      });

      const formData = {
        title: blog.title || '',
        slug: blog.slug || '',
        excerpt: blog.excerpt || '',
        content: blog.content || '',
        customCSS: blog.customCSS || '',
        featuredImage: blog.featuredImage || '',
        featuredImageAsset: blog.featuredImageAsset?._id || blog.featuredImageAsset || '',
        category: blog.category?._id || '',
        readTime: blog.readTime || 1,
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
        }
      };

      reset(formData);
      logger.debug('Form reset complete with existing blog data');
    } else {
      logger.debug('Creating new blog, resetting to empty form');
      reset({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        featuredImage: '',
        category: '',
        readTime: 1,
        author: {
          name: config.defaultAuthor.name,
          email: config.defaultAuthor.email,
          avatar: config.defaultAuthor.avatar,
          bio: config.defaultAuthor.bio
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

  // Auto-calculate and set readTime when content changes
  useEffect(() => {
    const content = watch('content');
    if (content && content.trim()) {
      // Calculate word count from content (strip HTML tags)
      const wordCount = content
        .replace(/<[^>]*>/g, ' ') // Strip HTML tags
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      const calculatedReadTime = Math.max(1, Math.ceil(wordCount / 200));

      // Only auto-set if user hasn't manually set a custom readTime
      const currentReadTime = watch('readTime');
      if (!currentReadTime || currentReadTime === 0) {
        setValue('readTime', calculatedReadTime, { shouldValidate: false });
      }
    }
  }, [watchedContent, setValue, watch]);

  // Initialize featured image preview on edit mode
  useEffect(() => {
    if (blog && blog.featuredImageAsset) {
      // If blog has populated featuredImageAsset object, use it for preview
      if (typeof blog.featuredImageAsset === 'object' && blog.featuredImageAsset.url) {
        setSelectedFeaturedImageAsset(blog.featuredImageAsset as MediaAsset);
      }
    } else if (!blog) {
      // Clear preview when creating new blog
      setSelectedFeaturedImageAsset(null);
    }
  }, [blog]);

  const handleCancel = () => {
    logger.info('Cancelling blog form');

    // Reset local states
    setSeoData({
      title: '',
      description: '',
      keywords: []
    });
    setPreviewMode(false);

    // Call parent onCancel
    onCancel();
  };

  const cleanFormData = (data: any) => {
    // Create a deep copy to avoid mutating original data
    const cleaned = { ...data };

    // Convert empty strings to undefined for optional fields
    if (cleaned.slug === '') cleaned.slug = undefined;
    if (cleaned.featuredImage === '') cleaned.featuredImage = undefined;
    if (cleaned.featuredImageAsset === '') cleaned.featuredImageAsset = undefined;
    if (cleaned.customCSS === '') cleaned.customCSS = undefined;
    if (cleaned.author) {
      if (cleaned.author.avatar === '') cleaned.author.avatar = undefined;
      if (cleaned.author.bio === '') cleaned.author.bio = undefined;
    }

    // Handle SEO object - remove entirely if all fields are empty/undefined
    if (cleaned.seo) {
      if (cleaned.seo.metaTitle === '') cleaned.seo.metaTitle = undefined;
      if (cleaned.seo.metaDescription === '') cleaned.seo.metaDescription = undefined;
      if (cleaned.seo.canonicalUrl === '') cleaned.seo.canonicalUrl = undefined;
      if (cleaned.seo.metaKeywords && cleaned.seo.metaKeywords.length === 0) {
        cleaned.seo.metaKeywords = undefined;
      }

      // Check if all SEO fields are undefined
      const hasAnySeoData = cleaned.seo.metaTitle ||
        cleaned.seo.metaDescription ||
        cleaned.seo.canonicalUrl ||
        (cleaned.seo.metaKeywords && cleaned.seo.metaKeywords.length > 0);

      // Remove entire seo object if all fields are undefined
      if (!hasAnySeoData) {
        cleaned.seo = undefined;
      }
    }

    return cleaned;
  };

  const handleFormSubmit = async (data: any) => {
    logger.info('Submitting blog form', { title: data.title });

    try {
      const cleanedData = cleanFormData(data);

      // Extract category ID if object was populated
      if (cleanedData.category && typeof cleanedData.category === 'object') {
        cleanedData.category = cleanedData.category._id;
      }

      // Extract MediaAsset ID if object was populated
      if (cleanedData.featuredImageAsset && typeof cleanedData.featuredImageAsset === 'object') {
        cleanedData.featuredImageAsset = cleanedData.featuredImageAsset._id;
      }

      // Handle Raw HTML mode - check for special marker
      if (cleanedData.content && cleanedData.content.startsWith('__RAW_HTML__')) {
        // Extract raw HTML and store separately
        cleanedData.rawHtmlContent = cleanedData.content.replace('__RAW_HTML__', '');
        cleanedData.content = '<p>This blog uses custom HTML layout. View the published page to see the content.</p>';
        logger.info('Raw HTML mode detected - content moved to rawHtmlContent field');
      } else {
        // Clear rawHtmlContent if not using raw mode
        cleanedData.rawHtmlContent = null;
      }

      // Calculate readTime if missing (defensive fallback)
      if (!cleanedData.readTime && cleanedData.content) {
        const wordCount = cleanedData.content
          .replace(/<[^>]*>/g, ' ') // Strip HTML tags
          .trim()
          .split(/\s+/)
          .length;
        cleanedData.readTime = Math.max(1, Math.ceil(wordCount / 200));
      }

      logger.debug('Cleaned form data prepared, calling onSubmit');

      await onSubmit(cleanedData);

      logger.info('Blog form submitted successfully');
      toast.success(blog ? 'Blog updated successfully!' : 'Blog created successfully!');
    } catch (error: any) {
      logger.error('Blog form submission error', { error: error.message || error });

      const errorMessage = error.message || 'An error occurred. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleSubmitClick = () => {
    // Debug helper
    if (Object.keys(errors).length > 0) {
      logger.debug('Submit clicked with validation errors', { errors });
    }
  };

  const renderPreview = () => (
    <div className="prose max-w-none">
      <h1 className="text-3xl font-bold mb-4">{watchedTitle || 'Blog Title'}</h1>
      <div
        className="blog-content text-gray-900"
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(watchedContent || 'Blog content will appear here...', {
            ADD_ATTR: ['style', 'class', 'id', 'data-*', 'width', 'height', 'colspan', 'rowspan', 'align', 'valign'],
            ADD_TAGS: ['div', 'span', 'section', 'article', 'main', 'aside', 'header', 'footer', 'blockquote', 'iframe', 'svg', 'path', 'circle', 'rect', 'g', 'defs', 'clipPath', 'polygon', 'polyline', 'line', 'ellipse'],
            ALLOWED_ATTR: ['style', 'class', 'href', 'src', 'alt', 'title', 'target', 'rel', 'width', 'height', 'id']
          })
        }}
      />
    </div>
  );

  const onFormSubmit = handleSubmit(
    (data) => {
      handleFormSubmit(data);
    },
    (errors) => {
      logger.warn('Form validation failed on submit', errors);
      toast.error('Please fix the validation errors before submitting');
    }
  );

  return (
    <div className="p-6">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading blog data...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={onFormSubmit} className="space-y-6">
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
            <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6 text-gray-900">
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
                          <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                            <strong>💡 New Features:</strong> Table button • Color & Highlight pickers (hover icons) • 40+ layout classes (Insert HTML) •
                            <a href="/admin/blog-style-guide" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900 ml-1">
                              View Style Guide →
                            </a>
                          </div>
                          <Suspense fallback={<TipTapEditorFallback />}>
                            <TipTapEditor
                              key={blog?._id || 'new'}
                              content={field.value || ''}
                              onChange={field.onChange}
                              placeholder="Start writing your blog content... Use the toolbar to format text, add images, videos, and links."
                              mediaCategory="blog"
                              mediaFolder="blogs"
                              characterLimit={10000}
                            />
                          </Suspense>
                          <div className="mt-3 flex items-center justify-between text-sm border-t border-gray-200 pt-3">
                            <p className="text-gray-600">
                              Need help using the editor?
                            </p>
                            <a
                              href="/admin/blog-style-guide"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                            >
                              📚 View Editor Tutorial & Style Guide
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                          {errors.content && (
                            <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                          )}
                        </div>
                      )}
                    />

                    <Controller
                      name="customCSS"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Custom CSS (Optional)
                            <span className="text-xs text-gray-500 ml-2">- WordPress-like styling control</span>
                          </label>
                          <textarea
                            {...field}
                            rows={8}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                            placeholder="/* Add custom CSS for this post only */
.my-custom-class {
  color: #ff6b00;
  font-size: 1.2rem;
}

/* Available utility classes: blog-grid-2, blog-callout, blog-card, etc. */
/* See Style Guide for all available classes */"
                            spellCheck={false}
                          />
                          {errors.customCSS && (
                            <p className="mt-1 text-sm text-red-600">{errors.customCSS.message}</p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <p className="text-xs text-gray-500">
                              Add custom styles for advanced layouts. Dangerous properties (@import, external URLs) will be sanitized.
                            </p>
                            <a
                              href="/admin/blog-style-guide"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary-600 hover:text-primary-700 underline whitespace-nowrap"
                            >
                              📖 View Style Guide
                            </a>
                          </div>
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
                      tags: (watch('tags') || []).filter((tag): tag is string => typeof tag === 'string'),
                      type: 'blog'
                    }}
                    onChange={handleSeoDataChange}
                    baseUrl={config.appUrl}
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
                      render={({ field: { value, ...field } }) => (
                        <div className="flex items-center pt-1">
                          <input
                            {...field}
                            type="checkbox"
                            checked={value}
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
                      name="featuredImageAsset"
                      control={control}
                      render={({ field }) => (
                        <div>
                          {/* Preview */}
                          {(selectedFeaturedImageAsset || field.value) && (
                            <div className="relative mb-3">
                              <img
                                src={
                                  selectedFeaturedImageAsset
                                    ? selectedFeaturedImageAsset.url
                                    : typeof field.value === 'object' && field.value !== null && 'url' in field.value
                                      ? (field.value as { url: string }).url
                                      : typeof field.value === 'string'
                                        ? field.value
                                        : ''
                                }
                                alt={getImageAlt(selectedFeaturedImageAsset, watchedTitle || 'Featured')}
                                className="w-full h-48 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setValue('featuredImageAsset', '');
                                  setValue('featuredImage', '');
                                  setSelectedFeaturedImageAsset(null);
                                }}
                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* Media Picker Button */}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowMediaPicker(true)}
                            className="w-full"
                          >
                            <Image className="w-4 h-4 mr-2" />
                            {field.value ? 'Change Image' : 'Select from Library'}
                          </Button>

                          {errors.featuredImageAsset && (
                            <p className="mt-2 text-sm text-red-600">
                              {errors.featuredImageAsset.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
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
                  <CardContent>
                    <TagInput
                      tags={watchedTags}
                      onChange={(newTags) => setValue('tags', newTags)}
                      maxTags={20}
                      allowBulkAdd={true}
                      placeholder="Add tag"
                      showCount={true}
                    />
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
                onClick={handleCancel}
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

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(assets) => {
          if (assets.length > 0) {
            // Store full asset object for preview
            setSelectedFeaturedImageAsset(assets[0]);

            // Set the MediaAsset ID reference for backend submission
            setValue('featuredImageAsset', assets[0]._id);

            // Clear old field
            setValue('featuredImage', '');
          }
          setShowMediaPicker(false);
        }}
        category="blog"
        folder="blogs"
        multiple={false}
        title="Select Featured Image"
      />
    </div>
  );
};

export default BlogForm;