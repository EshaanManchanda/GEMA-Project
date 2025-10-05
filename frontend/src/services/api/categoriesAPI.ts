import { ApiService } from '../api';
import { extractApiData, logApiResponse } from '../../utils/apiResponseHandler';

// Category interfaces
export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string;
  level: number;
  isActive: boolean;
  sortOrder: number;
  seoMeta: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  featuredImage?: string;
  children?: Category[];
  eventCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryData {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
  seoMeta?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  featuredImage?: string;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {}

const categoriesAPI = {
  // Get all categories (tree structure or flat)
  getAllCategories: async (params?: { tree?: boolean; includeInactive?: boolean }) => {
    try {
      const response = await ApiService.get('/categories', { params });
      logApiResponse('GET /categories', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /categories', null, error);
      throw error;
    }
  },

  // Get single category by ID or slug
  getCategoryById: async (id: string) => {
    try {
      const response = await ApiService.get(`/categories/${id}`);
      logApiResponse(`GET /categories/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`GET /categories/${id}`, null, error);
      throw error;
    }
  },

  // Get root categories only
  getRootCategories: async () => {
    try {
      const response = await ApiService.get('/categories/roots');
      logApiResponse('GET /categories/roots', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /categories/roots', null, error);
      throw error;
    }
  },

  // Get categories by parent ID
  getCategoriesByParent: async (parentId: string | null) => {
    try {
      const response = await ApiService.get(`/categories/parent/${parentId || 'null'}`);
      logApiResponse(`GET /categories/parent/${parentId || 'null'}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`GET /categories/parent/${parentId || 'null'}`, null, error);
      throw error;
    }
  },

  // Search categories
  searchCategories: async (query: string, limit?: number) => {
    try {
      const response = await ApiService.get('/categories/search', {
        params: { q: query, limit }
      });
      logApiResponse('GET /categories/search', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /categories/search', null, error);
      throw error;
    }
  },

  // Admin only: Create new category
  createCategory: async (categoryData: CreateCategoryData) => {
    try {
      const response = await ApiService.post('/categories', categoryData);
      logApiResponse('POST /categories', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /categories', null, error);
      throw error;
    }
  },

  // Admin only: Update category
  updateCategory: async (id: string, categoryData: UpdateCategoryData) => {
    try {
      const response = await ApiService.put(`/categories/${id}`, categoryData);
      logApiResponse(`PUT /categories/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`PUT /categories/${id}`, null, error);
      throw error;
    }
  },

  // Admin only: Delete category
  deleteCategory: async (id: string) => {
    try {
      const response = await ApiService.delete(`/categories/${id}`);
      logApiResponse(`DELETE /categories/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`DELETE /categories/${id}`, null, error);
      throw error;
    }
  },

  // Admin only: Update category sort order
  updateSortOrder: async (categories: Array<{ id: string; sortOrder: number }>) => {
    try {
      const response = await ApiService.put('/categories/sort-order/bulk', {
        categories
      });
      logApiResponse('PUT /categories/sort-order/bulk', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('PUT /categories/sort-order/bulk', null, error);
      throw error;
    }
  },

  // Admin only: Update event counts for all categories
  updateEventCounts: async () => {
    try {
      const response = await ApiService.post('/categories/update-counts');
      logApiResponse('POST /categories/update-counts', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /categories/update-counts', null, error);
      throw error;
    }
  },
};

export default categoriesAPI;