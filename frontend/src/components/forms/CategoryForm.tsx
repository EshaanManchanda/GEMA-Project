import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import categoriesAPI from '../../services/api/categoriesAPI';
import type { Category, CreateCategoryData, UpdateCategoryData } from '../../services/api/categoriesAPI';
import LoadingSpinner from '../common/LoadingSpinner';
import ImageUploader from '../common/ImageUploader';
import logger from '../../utils/logger';

interface CategoryFormProps {
  category?: Category;
  onSuccess?: (category: Category) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

interface FormData {
  name: string;
  description: string;
  parentId?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  order: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  category,
  onSuccess,
  onCancel,
  mode = 'create'
}) => {
  const [loading, setLoading] = useState(false);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [uploadedImages, setUploadedImages] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<FormData>({
    defaultValues: {
      name: category?.name || '',
      description: category?.description || '',
      parentId: category?.parent?._id || '',
      icon: category?.icon || '',
      color: category?.color || '#6366f1',
      isActive: category?.isActive ?? true,
      order: (category as any)?.order || 0,
      seoTitle: (category as any)?.seo?.title || '',
      seoDescription: (category as any)?.seo?.description || '',
      seoKeywords: (category as any)?.seo?.keywords?.join(', ') || ''
    }
  });

  const watchIcon = watch('icon');

  useEffect(() => {
    loadParentCategories();
  }, []);

  useEffect(() => {
    if (category && mode === 'edit') {
      reset({
        name: category.name,
        description: category.description,
        parentId: category.parent?._id || '',
        icon: category.icon || '',
        color: category.color || '#6366f1',
        isActive: category.isActive,
        order: (category as any).order,
        seoTitle: (category as any).seo?.title || '',
        seoDescription: (category as any).seo?.description || '',
        seoKeywords: (category as any).seo?.keywords?.join(', ') || ''
      });
    }
  }, [category, mode, reset]);

  const loadParentCategories = async () => {
    try {
      const response = await categoriesAPI.getAllCategories({ tree: false });
      let categories = (response as any).data || response;

      // Filter out current category to prevent circular reference
      if (category) {
        categories = categories.filter((cat: Category) => cat._id !== category._id);
      }

      setParentCategories(categories);
    } catch (error) {
      logger.error('Failed to load parent categories:', error);
      toast.error('Failed to load parent categories');
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    try {
      const categoryData: any = {
        name: data.name,
        description: data.description,
        parentId: data.parentId || undefined,
        icon: uploadedImages[0]?.url || data.icon,
        color: data.color,
        isActive: data.isActive,
        order: data.order,
        seo: {
          title: data.seoTitle,
          description: data.seoDescription,
          keywords: data.seoKeywords ? data.seoKeywords.split(',').map(k => k.trim()).filter(Boolean) : undefined
        }
      };

      let result;
      if (mode === 'create') {
        result = await categoriesAPI.createCategory(categoryData as CreateCategoryData);
      } else {
        result = await categoriesAPI.updateCategory(category!._id, categoryData as UpdateCategoryData);
      }

      const savedCategory = (result as any).data || result;
      toast.success(`Category ${mode === 'create' ? 'created' : 'updated'} successfully`);
      onSuccess?.(savedCategory);

      if (mode === 'create') {
        reset();
        setUploadedImages([]);
      }

    } catch (error: any) {
      logger.error('Failed to save category:', error);

      // Extract error message from various formats
      let errorMessage = `Failed to ${mode} category`;

      if (error.response?.data) {
        const data = error.response.data;

        // Format 1: Validation errors array (Mongoose)
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          errorMessage = data.errors[0]; // Show first error
        }
        // Format 2: Single message field (express-validator)
        else if (data.message && data.message !== 'Validation Error') {
          errorMessage = data.message;
        }
        // Format 3: Error field (some controllers)
        else if (data.error) {
          errorMessage = data.error;
        }
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (files: any[]) => {
    setUploadedImages(files);
    if (files[0]) {
      setValue('icon', files[0].url);
    }
  };

  const iconOptions = [
    { value: '🎨', label: 'Art & Crafts' },
    { value: '⚽', label: 'Sports' },
    { value: '🎭', label: 'Entertainment' },
    { value: '📚', label: 'Education' },
    { value: '🏊', label: 'Water Sports' },
    { value: '🏃', label: 'Fitness' },
    { value: '🎵', label: 'Music' },
    { value: '🍳', label: 'Cooking' },
    { value: '🌟', label: 'Featured' },
    { value: '🎪', label: 'Events' }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Create New Category' : 'Edit Category'}
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Name *
              </label>
              <input
                type="text"
                {...register('name', { required: 'Category name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter category name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Category
              </label>
              <select
                {...register('parentId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No Parent (Root Category)</option>
                {parentCategories.map((parent) => (
                  <option key={parent._id} value={parent._id}>
                    {parent.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter category description"
            />
          </div>

          {/* Icon and Color */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon
              </label>
              <select
                {...register('icon')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Icon</option>
                {iconOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value} {option.label}
                  </option>
                ))}
              </select>
              {watchIcon && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-center">
                  <span className="text-2xl">{watchIcon}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <input
                type="color"
                {...register('color')}
                className="w-full h-10 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order
              </label>
              <input
                type="number"
                {...register('order', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Image (Optional)
            </label>
            <ImageUploader
              category="categories"
              maxFiles={1}
              multiple={false}
              onUploadSuccess={handleImageUpload}
              existingFiles={uploadedImages}
            />
          </div>

          {/* Status */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('isActive')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Active
              </span>
            </label>
          </div>

          {/* SEO Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">SEO Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SEO Title
                </label>
                <input
                  type="text"
                  {...register('seoTitle')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="SEO title for search engines"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SEO Description
                </label>
                <textarea
                  {...register('seoDescription')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="SEO description for search engines"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SEO Keywords
                </label>
                <input
                  type="text"
                  {...register('seoKeywords')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="keyword1, keyword2, keyword3"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Separate keywords with commas
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              disabled={loading}
            >
              {loading && <LoadingSpinner size="small" className="mr-2" />}
              {mode === 'create' ? 'Create Category' : 'Update Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryForm;