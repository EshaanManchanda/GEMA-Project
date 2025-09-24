import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Tag,
  Palette,
  FileText
} from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import blogAPI from '../../services/api/blogAPI';

// Validation schema
const categorySchema = yup.object().shape({
  name: yup.string().required('Name is required').max(100, 'Name cannot exceed 100 characters'),
  description: yup.string().max(500, 'Description cannot exceed 500 characters'),
  color: yup.string().matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color'),
});

interface Category {
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

interface CategoryFormProps {
  category?: Category | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  loading?: boolean;
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  category,
  isOpen,
  onClose,
  onSubmit,
  loading = false
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#3B82F6'
    }
  });

  useEffect(() => {
    if (category) {
      reset({
        name: category.name || '',
        description: category.description || '',
        color: category.color || '#3B82F6'
      });
    } else {
      reset({
        name: '',
        description: '',
        color: '#3B82F6'
      });
    }
  }, [category, reset]);

  const handleFormSubmit = async (data: any) => {
    try {
      await onSubmit(data);
      onClose();
      toast.success(category ? 'Category updated successfully!' : 'Category created successfully!');
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    }
  };

  const predefinedColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    '#F97316', '#6366F1', '#14B8A6', '#F43F5E'
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? 'Edit Category' : 'Create New Category'}
      size="md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              label="Category Name"
              placeholder="Enter category name"
              error={errors.name?.message}
              required
            />
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                {...field}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Category description (optional)"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>
          )}
        />

        <Controller
          name="color"
          control={control}
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    {...field}
                    type="color"
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <Input
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => field.onChange(color)}
                      className={`w-10 h-10 rounded border-2 ${
                        field.value === color ? 'border-gray-400' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              {errors.color && (
                <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>
              )}
            </div>
          )}
        />

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
            {category ? 'Update Category' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const BlogCategoryManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await blogAPI.admin.getAllCategories();
      setCategories(response.data.categories);
    } catch (error) {
      toast.error('Failed to fetch categories');
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = () => {
    setSelectedCategory(null);
    setShowCategoryForm(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      await blogAPI.admin.deleteCategory(categoryId);
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.error('Cannot delete category with associated blogs');
      } else {
        toast.error('Failed to delete category');
      }
    }
  };

  const handleSubmitCategory = async (data: any) => {
    try {
      if (selectedCategory) {
        await blogAPI.admin.updateCategory(selectedCategory._id, data);
      } else {
        await blogAPI.admin.createCategory(data);
      }
      fetchCategories();
    } catch (error) {
      throw error;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading categories...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Category Management</h2>
          <p className="text-sm text-gray-600">
            Organize your blog posts with categories
          </p>
        </div>
        <Button onClick={handleCreateCategory}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card key={category._id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color || '#3B82F6' }}
                  />
                  <div>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <p className="text-sm text-gray-500">{category.slug}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEditCategory(category)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteCategory(category._id)}
                    disabled={category.postsCount > 0}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {category.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {category.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1 text-gray-500">
                    <FileText className="w-4 h-4" />
                    <span>{category.postsCount} posts</span>
                  </div>
                  <span className="text-gray-400">
                    {formatDate(category.createdAt)}
                  </span>
                </div>

                {category.postsCount > 0 && (
                  <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    Cannot delete - has associated posts
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {categories.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-12">
                <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
                <p className="text-gray-500 mb-4">
                  Create your first category to organize your blog posts.
                </p>
                <Button onClick={handleCreateCategory}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Category
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Category Form Modal */}
      <CategoryForm
        category={selectedCategory}
        isOpen={showCategoryForm}
        onClose={() => setShowCategoryForm(false)}
        onSubmit={handleSubmitCategory}
      />
    </div>
  );
};

export default BlogCategoryManager;