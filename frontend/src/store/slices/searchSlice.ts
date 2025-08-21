import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import searchAPI from '@services/api/searchAPI';
import { Event } from '@types/event';
import { Category } from '@types/category';
import { toast } from 'react-hot-toast';

export interface SearchFilters {
  query: string;
  category?: string;
  location?: {
    city?: string;
    coordinates?: {
      lat: number;
      lng: number;
      radius?: number;
    };
  };
  dateRange?: {
    start?: string;
    end?: string;
  };
  priceRange?: {
    min?: number;
    max?: number;
  };
  ageGroup?: string;
  features?: string[];
  rating?: number;
  vendor?: string;
  sortBy?: 'relevance' | 'price' | 'date' | 'rating' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  events: Event[];
  categories: Category[];
  vendors: any[];
  total: number;
  page: number;
  totalPages: number;
  suggestions: string[];
  facets: {
    categories: { name: string; count: number }[];
    locations: { name: string; count: number }[];
    priceRanges: { range: string; count: number }[];
    ageGroups: { name: string; count: number }[];
  };
}

export interface SearchHistory {
  id: string;
  query: string;
  filters: SearchFilters;
  timestamp: string;
  resultCount: number;
}

export interface PopularSearch {
  query: string;
  count: number;
  trending: boolean;
}

interface SearchState {
  // Current search
  currentQuery: string;
  currentFilters: SearchFilters;
  results: SearchResult | null;
  
  // Search state
  isSearching: boolean;
  hasSearched: boolean;
  error: string | null;
  
  // Search history and suggestions
  history: SearchHistory[];
  suggestions: string[];
  popularSearches: PopularSearch[];
  recentSearches: string[];
  
  // Quick filters
  quickFilters: {
    categories: string[];
    locations: string[];
    priceRanges: { label: string; min: number; max: number }[];
  };
  
  // Search preferences
  preferences: {
    saveHistory: boolean;
    showSuggestions: boolean;
    autoComplete: boolean;
    searchRadius: number;
  };
  
  // Advanced search
  advancedMode: boolean;
  savedSearches: {
    id: string;
    name: string;
    filters: SearchFilters;
    createdAt: string;
  }[];
}

const initialState: SearchState = {
  currentQuery: '',
  currentFilters: {
    query: '',
    sortBy: 'relevance',
    sortOrder: 'desc',
  },
  results: null,
  
  isSearching: false,
  hasSearched: false,
  error: null,
  
  history: [],
  suggestions: [],
  popularSearches: [],
  recentSearches: [],
  
  quickFilters: {
    categories: [],
    locations: [],
    priceRanges: [
      { label: 'Free', min: 0, max: 0 },
      { label: 'Under 50 AED', min: 0, max: 50 },
      { label: '50-100 AED', min: 50, max: 100 },
      { label: '100-200 AED', min: 100, max: 200 },
      { label: '200+ AED', min: 200, max: 10000 },
    ],
  },
  
  preferences: {
    saveHistory: true,
    showSuggestions: true,
    autoComplete: true,
    searchRadius: 25, // km
  },
  
  advancedMode: false,
  savedSearches: [],
};

// Async thunks
export const performSearch = createAsyncThunk(
  'search/performSearch',
  async (params: {
    filters: SearchFilters;
    page?: number;
    limit?: number;
  }, { rejectWithValue }) => {
    try {
      const response = await searchAPI.search(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Search failed';
      return rejectWithValue(message);
    }
  }
);

export const getSearchSuggestions = createAsyncThunk(
  'search/getSearchSuggestions',
  async (query: string, { rejectWithValue }) => {
    try {
      if (query.length < 2) return [];
      const response = await searchAPI.getSuggestions(query);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to get suggestions';
      return rejectWithValue(message);
    }
  }
);

export const getPopularSearches = createAsyncThunk(
  'search/getPopularSearches',
  async (limit: number = 10, { rejectWithValue }) => {
    try {
      const response = await searchAPI.getPopularSearches(limit);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to get popular searches';
      return rejectWithValue(message);
    }
  }
);

export const saveSearch = createAsyncThunk(
  'search/saveSearch',
  async (params: {
    name: string;
    filters: SearchFilters;
  }, { rejectWithValue }) => {
    try {
      const response = await searchAPI.saveSearch(params);
      toast.success('Search saved successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save search';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const getSavedSearches = createAsyncThunk(
  'search/getSavedSearches',
  async (_, { rejectWithValue }) => {
    try {
      const response = await searchAPI.getSavedSearches();
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to get saved searches';
      return rejectWithValue(message);
    }
  }
);

export const deleteSavedSearch = createAsyncThunk(
  'search/deleteSavedSearch',
  async (id: string, { rejectWithValue }) => {
    try {
      await searchAPI.deleteSavedSearch(id);
      toast.success('Saved search deleted');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete saved search';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const getSearchHistory = createAsyncThunk(
  'search/getSearchHistory',
  async (limit: number = 20, { rejectWithValue }) => {
    try {
      const response = await searchAPI.getSearchHistory(limit);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to get search history';
      return rejectWithValue(message);
    }
  }
);

export const clearSearchHistory = createAsyncThunk(
  'search/clearSearchHistory',
  async (_, { rejectWithValue }) => {
    try {
      await searchAPI.clearSearchHistory();
      toast.success('Search history cleared');
      return null;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to clear search history';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Search slice
const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<string>) => {
      state.currentQuery = action.payload;
      state.currentFilters.query = action.payload;
    },
    
    setFilters: (state, action: PayloadAction<Partial<SearchFilters>>) => {
      state.currentFilters = { ...state.currentFilters, ...action.payload };
    },
    
    updateFilter: (state, action: PayloadAction<{ key: keyof SearchFilters; value: any }>) => {
      const { key, value } = action.payload;
      (state.currentFilters as any)[key] = value;
    },
    
    clearFilters: (state) => {
      state.currentFilters = {
        query: state.currentQuery,
        sortBy: 'relevance',
        sortOrder: 'desc',
      };
    },
    
    clearSearch: (state) => {
      state.currentQuery = '';
      state.currentFilters = {
        query: '',
        sortBy: 'relevance',
        sortOrder: 'desc',
      };
      state.results = null;
      state.hasSearched = false;
      state.error = null;
    },
    
    addToHistory: (state, action: PayloadAction<{
      query: string;
      filters: SearchFilters;
      resultCount: number;
    }>) => {
      if (!state.preferences.saveHistory) return;
      
      const { query, filters, resultCount } = action.payload;
      
      // Remove existing entry with same query
      state.history = state.history.filter(item => item.query !== query);
      
      // Add new entry at the beginning
      const newHistoryItem: SearchHistory = {
        id: `search-${Date.now()}`,
        query,
        filters,
        timestamp: new Date().toISOString(),
        resultCount,
      };
      
      state.history.unshift(newHistoryItem);
      
      // Limit history to 50 items
      if (state.history.length > 50) {
        state.history = state.history.slice(0, 50);
      }
      
      // Update recent searches
      state.recentSearches = state.recentSearches.filter(q => q !== query);
      state.recentSearches.unshift(query);
      if (state.recentSearches.length > 10) {
        state.recentSearches = state.recentSearches.slice(0, 10);
      }
    },
    
    removeFromHistory: (state, action: PayloadAction<string>) => {
      state.history = state.history.filter(item => item.id !== action.payload);
    },
    
    clearHistoryLocal: (state) => {
      state.history = [];
      state.recentSearches = [];
    },
    
    setSuggestions: (state, action: PayloadAction<string[]>) => {
      state.suggestions = action.payload;
    },
    
    clearSuggestions: (state) => {
      state.suggestions = [];
    },
    
    setAdvancedMode: (state, action: PayloadAction<boolean>) => {
      state.advancedMode = action.payload;
    },
    
    updatePreferences: (state, action: PayloadAction<Partial<SearchState['preferences']>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    
    setQuickFilters: (state, action: PayloadAction<Partial<SearchState['quickFilters']>>) => {
      state.quickFilters = { ...state.quickFilters, ...action.payload };
    },
    
    applyQuickFilter: (state, action: PayloadAction<{
      type: 'category' | 'location' | 'priceRange';
      value: any;
    }>) => {
      const { type, value } = action.payload;
      
      switch (type) {
        case 'category':
          state.currentFilters.category = value;
          break;
        case 'location':
          state.currentFilters.location = { city: value };
          break;
        case 'priceRange':
          state.currentFilters.priceRange = value;
          break;
      }
    },
    
    loadSavedSearch: (state, action: PayloadAction<string>) => {
      const savedSearch = state.savedSearches.find(search => search.id === action.payload);
      if (savedSearch) {
        state.currentFilters = { ...savedSearch.filters };
        state.currentQuery = savedSearch.filters.query;
      }
    },
    
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Perform Search
    builder
      .addCase(performSearch.pending, (state) => {
        state.isSearching = true;
        state.error = null;
      })
      .addCase(performSearch.fulfilled, (state, action: PayloadAction<SearchResult>) => {
        state.isSearching = false;
        state.results = action.payload;
        state.hasSearched = true;
        state.error = null;
        
        // Add to history
        if (state.currentQuery.trim()) {
          searchSlice.caseReducers.addToHistory(state, {
            type: 'search/addToHistory',
            payload: {
              query: state.currentQuery,
              filters: state.currentFilters,
              resultCount: action.payload.total,
            },
          });
        }
      })
      .addCase(performSearch.rejected, (state, action) => {
        state.isSearching = false;
        state.error = action.payload as string;
        state.hasSearched = true;
      })
      
      // Get Search Suggestions
      .addCase(getSearchSuggestions.fulfilled, (state, action: PayloadAction<string[]>) => {
        state.suggestions = action.payload;
      })
      
      // Get Popular Searches
      .addCase(getPopularSearches.fulfilled, (state, action: PayloadAction<PopularSearch[]>) => {
        state.popularSearches = action.payload;
      })
      
      // Save Search
      .addCase(saveSearch.fulfilled, (state, action) => {
        state.savedSearches.unshift(action.payload);
      })
      
      // Get Saved Searches
      .addCase(getSavedSearches.fulfilled, (state, action) => {
        state.savedSearches = action.payload;
      })
      
      // Delete Saved Search
      .addCase(deleteSavedSearch.fulfilled, (state, action: PayloadAction<string>) => {
        state.savedSearches = state.savedSearches.filter(search => search.id !== action.payload);
      })
      
      // Get Search History
      .addCase(getSearchHistory.fulfilled, (state, action: PayloadAction<SearchHistory[]>) => {
        state.history = action.payload;
        state.recentSearches = action.payload.slice(0, 10).map(item => item.query);
      })
      
      // Clear Search History
      .addCase(clearSearchHistory.fulfilled, (state) => {
        state.history = [];
        state.recentSearches = [];
      });
  },
});

export const {
  setQuery,
  setFilters,
  updateFilter,
  clearFilters,
  clearSearch,
  addToHistory,
  removeFromHistory,
  clearHistoryLocal,
  setSuggestions,
  clearSuggestions,
  setAdvancedMode,
  updatePreferences,
  setQuickFilters,
  applyQuickFilter,
  loadSavedSearch,
  clearError,
} = searchSlice.actions;

export default searchSlice.reducer;

// Selectors
export const selectCurrentQuery = (state: { search: SearchState }) => state.search.currentQuery;
export const selectCurrentFilters = (state: { search: SearchState }) => state.search.currentFilters;
export const selectSearchResults = (state: { search: SearchState }) => state.search.results;
export const selectIsSearching = (state: { search: SearchState }) => state.search.isSearching;
export const selectHasSearched = (state: { search: SearchState }) => state.search.hasSearched;
export const selectSearchError = (state: { search: SearchState }) => state.search.error;

export const selectSearchHistory = (state: { search: SearchState }) => state.search.history;
export const selectSuggestions = (state: { search: SearchState }) => state.search.suggestions;
export const selectPopularSearches = (state: { search: SearchState }) => state.search.popularSearches;
export const selectRecentSearches = (state: { search: SearchState }) => state.search.recentSearches;

export const selectQuickFilters = (state: { search: SearchState }) => state.search.quickFilters;
export const selectSearchPreferences = (state: { search: SearchState }) => state.search.preferences;
export const selectAdvancedMode = (state: { search: SearchState }) => state.search.advancedMode;
export const selectSavedSearches = (state: { search: SearchState }) => state.search.savedSearches;

// Helper selectors
export const selectHasActiveFilters = (state: { search: SearchState }) => {
  const filters = state.search.currentFilters;
  return !!(filters.category || filters.location || filters.dateRange || 
           filters.priceRange || filters.ageGroup || 
           (filters.features && filters.features.length > 0) ||
           filters.rating || filters.vendor);
};

export const selectActiveFiltersCount = (state: { search: SearchState }) => {
  const filters = state.search.currentFilters;
  let count = 0;
  
  if (filters.category) count++;
  if (filters.location) count++;
  if (filters.dateRange) count++;
  if (filters.priceRange) count++;
  if (filters.ageGroup) count++;
  if (filters.features && filters.features.length > 0) count++;
  if (filters.rating) count++;
  if (filters.vendor) count++;
  
  return count;
};

export const selectSearchResultsCount = (state: { search: SearchState }) => {
  return state.search.results?.total || 0;
};

export const selectSearchEvents = (state: { search: SearchState }) => {
  return state.search.results?.events || [];
};

export const selectSearchFacets = (state: { search: SearchState }) => {
  return state.search.results?.facets || {
    categories: [],
    locations: [],
    priceRanges: [],
    ageGroups: [],
  };
};

export const selectSearchPagination = (state: { search: SearchState }) => {
  const results = state.search.results;
  return {
    page: results?.page || 1,
    totalPages: results?.totalPages || 0,
    total: results?.total || 0,
  };
};

export const selectCanSearch = (state: { search: SearchState }) => {
  return state.search.currentQuery.trim().length > 0 || selectHasActiveFilters(state);
};

export const selectSearchSummary = (state: { search: SearchState }) => {
  const { currentQuery, currentFilters, results } = state.search;
  
  return {
    query: currentQuery,
    hasFilters: selectHasActiveFilters(state),
    filtersCount: selectActiveFiltersCount(state),
    resultsCount: results?.total || 0,
    hasResults: (results?.total || 0) > 0,
  };
};