import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import favoritesAPI from '@services/api/favoritesAPI';
import { Event } from '@types/event';
import { toast } from 'react-hot-toast';

export interface FavoriteItem {
  _id: string;
  event: Event;
  addedAt: string;
  notes?: string;
}

interface FavoritesState {
  items: FavoriteItem[];
  isLoading: boolean;
  isToggling: boolean;
  error: string | null;
  lastSyncAt: string | null;
}

const initialState: FavoritesState = {
  items: [],
  isLoading: false,
  isToggling: false,
  error: null,
  lastSyncAt: null,
};

// Async thunks
export const fetchFavorites = createAsyncThunk(
  'favorites/fetchFavorites',
  async (_, { rejectWithValue }) => {
    try {
      const response = await favoritesAPI.getFavorites();
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch favorites';
      return rejectWithValue(message);
    }
  }
);

export const addToFavorites = createAsyncThunk(
  'favorites/addToFavorites',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const response = await favoritesAPI.addToFavorites(eventId);
      toast.success('Added to favorites!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to add to favorites';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const removeFromFavorites = createAsyncThunk(
  'favorites/removeFromFavorites',
  async (eventId: string, { rejectWithValue }) => {
    try {
      await favoritesAPI.removeFromFavorites(eventId);
      toast.success('Removed from favorites');
      return eventId;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to remove from favorites';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleFavorite = createAsyncThunk(
  'favorites/toggleFavorite',
  async (eventId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { favorites: FavoritesState };
      const isFavorite = state.favorites.items.some(item => item.event._id === eventId);
      
      if (isFavorite) {
        await favoritesAPI.removeFromFavorites(eventId);
        toast.success('Removed from favorites');
        return { eventId, action: 'remove' as const };
      } else {
        const response = await favoritesAPI.addToFavorites(eventId);
        toast.success('Added to favorites!');
        return { eventId, action: 'add' as const, favoriteItem: response };
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update favorites';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateFavoriteNotes = createAsyncThunk(
  'favorites/updateFavoriteNotes',
  async ({ eventId, notes }: { eventId: string; notes: string }, { rejectWithValue }) => {
    try {
      const response = await favoritesAPI.updateFavoriteNotes(eventId, notes);
      toast.success('Notes updated!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update notes';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const clearAllFavorites = createAsyncThunk(
  'favorites/clearAllFavorites',
  async (_, { rejectWithValue }) => {
    try {
      await favoritesAPI.clearAllFavorites();
      toast.success('All favorites cleared');
      return null;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to clear favorites';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const syncFavorites = createAsyncThunk(
  'favorites/syncFavorites',
  async (localFavorites: string[], { rejectWithValue }) => {
    try {
      const response = await favoritesAPI.syncFavorites(localFavorites);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to sync favorites';
      return rejectWithValue(message);
    }
  }
);

export const exportFavorites = createAsyncThunk(
  'favorites/exportFavorites',
  async (format: 'json' | 'csv', { rejectWithValue }) => {
    try {
      const response = await favoritesAPI.exportFavorites(format);
      toast.success('Favorites exported successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to export favorites';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Favorites slice
const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    
    addToFavoritesLocal: (state, action: PayloadAction<Event>) => {
      const event = action.payload;
      const existingIndex = state.items.findIndex(item => item.event._id === event._id);
      
      if (existingIndex === -1) {
        const newFavorite: FavoriteItem = {
          _id: `local-${event._id}-${Date.now()}`,
          event,
          addedAt: new Date().toISOString(),
        };
        state.items.unshift(newFavorite);
      }
    },
    
    removeFromFavoritesLocal: (state, action: PayloadAction<string>) => {
      const eventId = action.payload;
      state.items = state.items.filter(item => item.event._id !== eventId);
    },
    
    updateFavoriteEvent: (state, action: PayloadAction<Event>) => {
      const updatedEvent = action.payload;
      const favoriteIndex = state.items.findIndex(item => item.event._id === updatedEvent._id);
      
      if (favoriteIndex !== -1) {
        state.items[favoriteIndex].event = updatedEvent;
      }
    },
    
    reorderFavorites: (state, action: PayloadAction<string[]>) => {
      const orderedIds = action.payload;
      const reorderedItems: FavoriteItem[] = [];
      
      // Add items in the specified order
      orderedIds.forEach(id => {
        const item = state.items.find(item => item.event._id === id);
        if (item) {
          reorderedItems.push(item);
        }
      });
      
      // Add any remaining items that weren't in the order
      state.items.forEach(item => {
        if (!orderedIds.includes(item.event._id)) {
          reorderedItems.push(item);
        }
      });
      
      state.items = reorderedItems;
    },
    
    filterFavoritesByCategory: (state, action: PayloadAction<string | null>) => {
      // This is handled in selectors, but we can store the filter state if needed
    },
    
    markFavoritesAsViewed: (state, action: PayloadAction<string[]>) => {
      const eventIds = action.payload;
      // Mark favorites as viewed (useful for analytics)
      eventIds.forEach(eventId => {
        const favorite = state.items.find(item => item.event._id === eventId);
        if (favorite) {
          // Add viewed timestamp or flag if needed
        }
      });
    },
    
    clearFavorites: (state) => {
      state.items = [];
      state.error = null;
    },
    
    setLastSyncAt: (state, action: PayloadAction<string>) => {
      state.lastSyncAt = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch Favorites
    builder
      .addCase(fetchFavorites.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFavorites.fulfilled, (state, action: PayloadAction<FavoriteItem[]>) => {
        state.isLoading = false;
        state.items = action.payload;
        state.lastSyncAt = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchFavorites.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Add to Favorites
      .addCase(addToFavorites.pending, (state) => {
        state.isToggling = true;
        state.error = null;
      })
      .addCase(addToFavorites.fulfilled, (state, action: PayloadAction<FavoriteItem>) => {
        state.isToggling = false;
        const existingIndex = state.items.findIndex(item => item.event._id === action.payload.event._id);
        if (existingIndex === -1) {
          state.items.unshift(action.payload);
        }
        state.error = null;
      })
      .addCase(addToFavorites.rejected, (state, action) => {
        state.isToggling = false;
        state.error = action.payload as string;
      })
      
      // Remove from Favorites
      .addCase(removeFromFavorites.pending, (state) => {
        state.isToggling = true;
        state.error = null;
      })
      .addCase(removeFromFavorites.fulfilled, (state, action: PayloadAction<string>) => {
        state.isToggling = false;
        state.items = state.items.filter(item => item.event._id !== action.payload);
        state.error = null;
      })
      .addCase(removeFromFavorites.rejected, (state, action) => {
        state.isToggling = false;
        state.error = action.payload as string;
      })
      
      // Toggle Favorite
      .addCase(toggleFavorite.pending, (state) => {
        state.isToggling = true;
        state.error = null;
      })
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        state.isToggling = false;
        const { eventId, action: toggleAction, favoriteItem } = action.payload;
        
        if (toggleAction === 'add' && favoriteItem) {
          const existingIndex = state.items.findIndex(item => item.event._id === eventId);
          if (existingIndex === -1) {
            state.items.unshift(favoriteItem);
          }
        } else if (toggleAction === 'remove') {
          state.items = state.items.filter(item => item.event._id !== eventId);
        }
        state.error = null;
      })
      .addCase(toggleFavorite.rejected, (state, action) => {
        state.isToggling = false;
        state.error = action.payload as string;
      })
      
      // Update Favorite Notes
      .addCase(updateFavoriteNotes.fulfilled, (state, action: PayloadAction<FavoriteItem>) => {
        const index = state.items.findIndex(item => item.event._id === action.payload.event._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      
      // Clear All Favorites
      .addCase(clearAllFavorites.fulfilled, (state) => {
        state.items = [];
      })
      
      // Sync Favorites
      .addCase(syncFavorites.fulfilled, (state, action: PayloadAction<FavoriteItem[]>) => {
        state.items = action.payload;
        state.lastSyncAt = new Date().toISOString();
      });
  },
});

export const {
  clearError,
  addToFavoritesLocal,
  removeFromFavoritesLocal,
  updateFavoriteEvent,
  reorderFavorites,
  filterFavoritesByCategory,
  markFavoritesAsViewed,
  clearFavorites,
  setLastSyncAt,
} = favoritesSlice.actions;

export default favoritesSlice.reducer;

// Selectors
export const selectFavorites = (state: { favorites: FavoritesState }) => state.favorites.items;
export const selectFavoritesLoading = (state: { favorites: FavoritesState }) => state.favorites.isLoading;
export const selectFavoritesToggling = (state: { favorites: FavoritesState }) => state.favorites.isToggling;
export const selectFavoritesError = (state: { favorites: FavoritesState }) => state.favorites.error;
export const selectLastSyncAt = (state: { favorites: FavoritesState }) => state.favorites.lastSyncAt;

// Helper selectors
export const selectFavoritesCount = (state: { favorites: FavoritesState }) => {
  return state.favorites.items.length;
};

export const selectIsFavorite = (eventId: string) => (state: { favorites: FavoritesState }) => {
  return state.favorites.items.some(item => item.event._id === eventId);
};

export const selectFavoriteById = (eventId: string) => (state: { favorites: FavoritesState }) => {
  return state.favorites.items.find(item => item.event._id === eventId);
};

export const selectFavoritesByCategory = (categoryId: string) => (state: { favorites: FavoritesState }) => {
  return state.favorites.items.filter(item => item.event.category === categoryId);
};

export const selectFavoritesByVendor = (vendorId: string) => (state: { favorites: FavoritesState }) => {
  return state.favorites.items.filter(item => item.event.vendor === vendorId);
};

export const selectRecentFavorites = (limit: number = 5) => (state: { favorites: FavoritesState }) => {
  return state.favorites.items
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    .slice(0, limit);
};

export const selectFavoritesByPriceRange = (minPrice: number, maxPrice: number) => (state: { favorites: FavoritesState }) => {
  return state.favorites.items.filter(item => {
    const price = item.event.pricing?.basePrice || 0;
    return price >= minPrice && price <= maxPrice;
  });
};

export const selectFavoritesByLocation = (city: string) => (state: { favorites: FavoritesState }) => {
  return state.favorites.items.filter(item => 
    item.event.venue?.address?.city?.toLowerCase().includes(city.toLowerCase())
  );
};

export const selectFavoritesWithNotes = (state: { favorites: FavoritesState }) => {
  return state.favorites.items.filter(item => item.notes && item.notes.trim().length > 0);
};

export const selectFavoriteEvents = (state: { favorites: FavoritesState }) => {
  return state.favorites.items.map(item => item.event);
};

export const selectFavoritesGroupedByCategory = (state: { favorites: FavoritesState }) => {
  const grouped: Record<string, FavoriteItem[]> = {};
  
  state.favorites.items.forEach(item => {
    const categoryName = item.event.category || 'Uncategorized';
    if (!grouped[categoryName]) {
      grouped[categoryName] = [];
    }
    grouped[categoryName].push(item);
  });
  
  return grouped;
};

export const selectFavoritesStats = (state: { favorites: FavoritesState }) => {
  const items = state.favorites.items;
  const totalCount = items.length;
  const categoriesCount = new Set(items.map(item => item.event.category)).size;
  const vendorsCount = new Set(items.map(item => item.event.vendor)).size;
  const averagePrice = items.reduce((sum, item) => sum + (item.event.pricing?.basePrice || 0), 0) / totalCount || 0;
  
  return {
    totalCount,
    categoriesCount,
    vendorsCount,
    averagePrice,
  };
};