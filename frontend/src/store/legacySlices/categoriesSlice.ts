import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import categoriesAPI from '../../services/api/categoriesAPI';
import { Category, CreateCategoryData, UpdateCategoryData, GetCategoriesParams } from '../../types/category';
import { toast } from 'react-hot-toast';

interface CategoriesState {
  categories: Category[];
  currentCategory: Category | null;
  categoryTree: Category[];
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
}

const initialState: CategoriesState = {
  categories: [],
  currentCategory: null,
  categoryTree: [],
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
};

// Async thunks
export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (params: GetCategoriesParams = {}, { rejectWithValue }) => {
    try {
      const response = await categoriesAPI.getAllCategories(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch categories';
      return rejectWithValue(message);
    }
  }
);

export const fetchCategoryTree = createAsyncThunk(
  'categories/fetchCategoryTree',
  async (_, { rejectWithValue }) => {
    try {
      const response = await categoriesAPI.getAllCategories({
        tree: true,
        includeInactive: false
      });
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch category tree';
      return rejectWithValue(message);
    }
  }
);

export const fetchCategoryById = createAsyncThunk(
  'categories/fetchCategoryById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await categoriesAPI.getCategoryById(id);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch category';
      return rejectWithValue(message);
    }
  }
);

export const fetchRootCategories = createAsyncThunk(
  'categories/fetchRootCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await categoriesAPI.getRootCategories();
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch root categories';
      return rejectWithValue(message);
    }
  }
);

export const fetchCategoriesByParent = createAsyncThunk(
  'categories/fetchCategoriesByParent',
  async (parentId: string | null, { rejectWithValue }) => {
    try {
      const response = await categoriesAPI.getCategoriesByParent(parentId);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch categories';
      return rejectWithValue(message);
    }
  }
);

export const searchCategories = createAsyncThunk(
  'categories/searchCategories',
  async ({ query, limit }: { query: string; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await categoriesAPI.searchCategories(query, limit);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Search failed';
      return rejectWithValue(message);
    }
  }
);

export const createCategory = createAsyncThunk(
  'categories/createCategory',
  async (categoryData: CreateCategoryData, { rejectWithValue }) => {
    try {
      const response = await categoriesAPI.createCategory(categoryData);
      toast.success('Category created successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to create category';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateCategory = createAsyncThunk(
  'categories/updateCategory',
  async ({ id, categoryData }: { id: string; categoryData: UpdateCategoryData }, { rejectWithValue }) => {
    try {
      const response = await categoriesAPI.updateCategory(id, categoryData);
      toast.success('Category updated successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to update category';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/deleteCategory',
  async (id: string, { rejectWithValue }) => {
    try {
      await categoriesAPI.deleteCategory(id);
      toast.success('Category deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to delete category';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateSortOrder = createAsyncThunk(
  'categories/updateSortOrder',
  async (categories: Array<{ id: string; sortOrder: number }>, { rejectWithValue }) => {
    try {
      await categoriesAPI.updateSortOrder(categories);
      toast.success('Categories reordered successfully!');
      return categories;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to reorder categories';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Categories slice
const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentCategory: (state, action: PayloadAction<Category | null>) => {
      state.currentCategory = action.payload;
    },
    clearCategories: (state) => {
      state.categories = [];
    },
    updateCategoryInList: (state, action: PayloadAction<Category>) => {
      const index = state.categories.findIndex(category => category._id === action.payload._id);
      if (index !== -1) {
        state.categories[index] = action.payload;
      }

      // Update in category tree if exists
      const updateInTree = (categories: Category[]): Category[] => {
        return categories.map(category => {
          if (category._id === action.payload._id) {
            return action.payload;
          }
          if (category.children && category.children.length > 0) {
            return {
              ...category,
              children: updateInTree(category.children)
            };
          }
          return category;
        });
      };
      state.categoryTree = updateInTree(state.categoryTree);
    },
    removeCategoryFromList: (state, action: PayloadAction<string>) => {
      state.categories = state.categories.filter(category => category._id !== action.payload);

      // Remove from category tree
      const removeFromTree = (categories: Category[]): Category[] => {
        return categories.filter(category => {
          if (category._id === action.payload) {
            return false;
          }
          if (category.children && category.children.length > 0) {
            category.children = removeFromTree(category.children);
          }
          return true;
        });
      };
      state.categoryTree = removeFromTree(state.categoryTree);
    },
  },
  extraReducers: (builder) => {
    // Fetch Categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.isLoading = false;
        state.categories = action.payload;
        state.error = null;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch Category Tree
      .addCase(fetchCategoryTree.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCategoryTree.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.isLoading = false;
        state.categoryTree = action.payload;
        state.error = null;
      })
      .addCase(fetchCategoryTree.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch Root Categories
      .addCase(fetchRootCategories.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.categories = action.payload;
      })

      // Fetch Categories By Parent
      .addCase(fetchCategoriesByParent.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.categories = action.payload;
      })

      // Fetch Category by ID
      .addCase(fetchCategoryById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCategoryById.fulfilled, (state, action: PayloadAction<Category>) => {
        state.isLoading = false;
        state.currentCategory = action.payload;
        state.error = null;
      })
      .addCase(fetchCategoryById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.currentCategory = null;
      })

      // Search Categories
      .addCase(searchCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchCategories.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.isLoading = false;
        state.categories = action.payload;
        state.error = null;
      })
      .addCase(searchCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Create Category
      .addCase(createCategory.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action: PayloadAction<Category>) => {
        state.isCreating = false;
        state.categories.unshift(action.payload);
        state.error = null;
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })

      // Update Category
      .addCase(updateCategory.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action: PayloadAction<Category>) => {
        state.isUpdating = false;
        const index = state.categories.findIndex(category => category._id === action.payload._id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
        if (state.currentCategory && state.currentCategory._id === action.payload._id) {
          state.currentCategory = action.payload;
        }
        state.error = null;
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })

      // Delete Category
      .addCase(deleteCategory.pending, (state) => {
        state.isDeleting = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action: PayloadAction<string>) => {
        state.isDeleting = false;
        state.categories = state.categories.filter(category => category._id !== action.payload);
        if (state.currentCategory && state.currentCategory._id === action.payload) {
          state.currentCategory = null;
        }
        state.error = null;
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = action.payload as string;
      })

      // Update Sort Order
      .addCase(updateSortOrder.fulfilled, (state) => {
        // Optionally refetch categories after reordering
        state.error = null;
      });
  },
});

export const {
  clearError,
  setCurrentCategory,
  clearCategories,
  updateCategoryInList,
  removeCategoryFromList,
} = categoriesSlice.actions;

export default categoriesSlice.reducer;

// Selectors
export const selectCategories = (state: { categories: CategoriesState }) => state.categories.categories;
export const selectCurrentCategory = (state: { categories: CategoriesState }) => state.categories.currentCategory;
export const selectCategoryTree = (state: { categories: CategoriesState }) => state.categories.categoryTree;
export const selectCategoriesLoading = (state: { categories: CategoriesState }) => state.categories.isLoading;
export const selectCategoriesError = (state: { categories: CategoriesState }) => state.categories.error;
export const selectCategoriesOperations = (state: { categories: CategoriesState }) => ({
  isCreating: state.categories.isCreating,
  isUpdating: state.categories.isUpdating,
  isDeleting: state.categories.isDeleting,
});

// Helper selectors
export const selectCategoriesByParentId = (parentId: string | null) => (state: { categories: CategoriesState }) => {
  return state.categories.categories.filter(category => category.parentId === parentId);
};

export const selectRootCategories = (state: { categories: CategoriesState }) => {
  return state.categories.categories.filter(category => !category.parentId || category.level === 0);
};

export const selectCategoryById = (id: string) => (state: { categories: CategoriesState }) => {
  return state.categories.categories.find(category => category._id === id);
};

export const selectCategoryBySlug = (slug: string) => (state: { categories: CategoriesState }) => {
  return state.categories.categories.find(category => category.slug === slug);
};
