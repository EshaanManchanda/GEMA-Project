import React, { useState, useEffect, useMemo } from 'react';
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
  FileText,
  Search,
  Filter
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
    } catch (error) {
      // Error is already handled in parent component
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'posts'>('name');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await blogAPI.admin.getAllCategories();
      setCategories(response || []);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to load categories';
      toast.error(errorMessage);
      console.error('Error fetching categories:', error);
      setCategories([]);
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

  const handleDeleteCategory = async (category: Category) => {
    const confirmMessage = category.postsCount > 0
      ? `This category has ${category.postsCount} associated blog post(s) and cannot be deleted. Please reassign or delete those posts first.`
      : `Are you sure you want to delete "${category.name}"? This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    if (category.postsCount > 0) {
      return;
    }

    try {
      await blogAPI.admin.deleteCategory(category._id);
      toast.success(`Category "${category.name}" deleted successfully`);
      fetchCategories();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete category';
      toast.error(errorMessage);
      console.error('Error deleting category:', error);
    }
  };

  const handleToggleStatus = async (categoryId: string, categoryName: string, currentStatus: boolean) => {
    try {
      await blogAPI.admin.toggleCategoryStatus(categoryId);
      toast.success(`"${categoryName}" ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchCategories();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to toggle category status';
      toast.error(errorMessage);
      console.error('Error toggling category status:', error);
    }
  };

  const handleSubmitCategory = async (data: any) => {
    try {
      if (selectedCategory) {
        await blogAPI.admin.updateCategory(selectedCategory._id, data);
        toast.success(`Category "${data.name}" updated successfully`);
      } else {
        await blogAPI.admin.createCategory(data);
        toast.success(`Category "${data.name}" created successfully`);
      }
      fetchCategories();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message ||
        `Failed to ${selectedCategory ? 'update' : 'create'} category`;
      toast.error(errorMessage);
      console.error('Error saving category:', error);
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

  // Filter and sort categories
  const filteredCategories = useMemo(() => {
    let filtered = [...categories];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((category) =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter((category) => category.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((category) => !category.isActive);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'date') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'posts') {
        return b.postsCount - a.postsCount;
      }
      return 0;
    });

    return filtered;
  }, [categories, searchQuery, statusFilter, sortBy]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'posts')}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Sort by Name</option>
              <option value="date">Sort by Date</option>
              <option value="posts">Sort by Posts</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold">{filteredCategories.length}</span> of{' '}
          <span className="font-semibold">{categories.length}</span> categories
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category) => (
          <Card key={category._id} className={`relative ${!category.isActive ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color || '#3B82F6' }}
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      {!category.isActive && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
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
                    onClick={() => handleDeleteCategory(category)}
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

                {/* Toggle Active Status */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-gray-600">Active Status</span>
                  <button
                    onClick={() => handleToggleStatus(category._id, category.name, category.isActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      category.isActive ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                    title={`Click to ${category.isActive ? 'deactivate' : 'activate'} this category`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        category.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
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

        {filteredCategories.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-12">
                <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                {categories.length === 0 ? (
                  <>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
                    <p className="text-gray-500 mb-4">
                      Create your first category to organize your blog posts.
                    </p>
                    <Button onClick={handleCreateCategory}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Category
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
                    <p className="text-gray-500 mb-4">
                      Try adjusting your search or filter criteria.
                    </p>
                    <Button onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}>
                      Clear Filters
                    </Button>
                  </>
                )}
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