import { ApiService } from '../api';

const categoriesAPI = {
  getAllCategories: async () => {
    try {
      const response = await ApiService.get('/events/categories');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCategoryById: async (id: string) => {
    try {
      // Backend doesn't have individual category endpoints
      // Get all categories and filter by id
      const response = await ApiService.get('/events/categories');
      const categories = response.data?.categories || [];
      const category = categories.find((cat: any) => cat.id === id || cat.name === id);
      return { data: category };
    } catch (error) {
      throw error;
    }
  },

  getFeaturedCategories: async () => {
    try {
      // Backend doesn't have featured categories endpoint
      // Return all categories for now
      const response = await ApiService.get('/events/categories');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createCategory: async (categoryData: any) => {
    try {
      // Backend doesn't have category management endpoints
      // This would need to be implemented in the backend
      throw new Error('Category creation not implemented in backend');
    } catch (error) {
      throw error;
    }
  },

  updateCategory: async (id: string, categoryData: any) => {
    try {
      // Backend doesn't have category management endpoints
      // This would need to be implemented in the backend
      throw new Error('Category update not implemented in backend');
    } catch (error) {
      throw error;
    }
  },

  deleteCategory: async (id: string) => {
    try {
      // Backend doesn't have category management endpoints
      // This would need to be implemented in the backend
      throw new Error('Category deletion not implemented in backend');
    } catch (error) {
      throw error;
    }
  },
};

export default categoriesAPI;