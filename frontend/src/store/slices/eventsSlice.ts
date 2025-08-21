import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import eventsAPI from '@services/api/eventsAPI';
import { Event, EventFilters, EventsResponse, CreateEventData, UpdateEventData } from '@types/event';
import { toast } from 'react-hot-toast';

interface EventsState {
  events: Event[];
  featuredEvents: Event[];
  currentEvent: Event | null;
  relatedEvents: Event[];
  totalEvents: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  filters: EventFilters;
  searchQuery: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list' | 'map';
}

const initialState: EventsState = {
  events: [],
  featuredEvents: [],
  currentEvent: null,
  relatedEvents: [],
  totalEvents: 0,
  currentPage: 1,
  totalPages: 0,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  filters: {
    category: '',
    location: '',
    dateRange: { start: '', end: '' },
    priceRange: { min: 0, max: 1000 },
    ageGroup: '',
    features: [],
    status: 'active',
    vendor: '',
  },
  searchQuery: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  viewMode: 'grid',
};

// Async thunks
export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async (params: {
    page?: number;
    limit?: number;
    filters?: Partial<EventFilters>;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}, { rejectWithValue }) => {
    try {
      const response = await eventsAPI.getEvents(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch events';
      return rejectWithValue(message);
    }
  }
);

export const fetchFeaturedEvents = createAsyncThunk(
  'events/fetchFeaturedEvents',
  async (limit: number = 6, { rejectWithValue }) => {
    try {
      const response = await eventsAPI.getFeaturedEvents(limit);
      return response.events;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch featured events';
      return rejectWithValue(message);
    }
  }
);

export const fetchEventById = createAsyncThunk(
  'events/fetchEventById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await eventsAPI.getEventById(id);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch event';
      return rejectWithValue(message);
    }
  }
);

export const fetchEventBySlug = createAsyncThunk(
  'events/fetchEventBySlug',
  async (slug: string, { rejectWithValue }) => {
    try {
      const response = await eventsAPI.getEventBySlug(slug);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch event';
      return rejectWithValue(message);
    }
  }
);

export const fetchRelatedEvents = createAsyncThunk(
  'events/fetchRelatedEvents',
  async ({ eventId, limit = 4 }: { eventId: string; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await eventsAPI.getRelatedEvents(eventId, limit);
      return response.events;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch related events';
      return rejectWithValue(message);
    }
  }
);

export const createEvent = createAsyncThunk(
  'events/createEvent',
  async (eventData: CreateEventData, { rejectWithValue }) => {
    try {
      const response = await eventsAPI.createEvent(eventData);
      toast.success('Event created successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create event';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateEvent = createAsyncThunk(
  'events/updateEvent',
  async ({ id, eventData }: { id: string; eventData: UpdateEventData }, { rejectWithValue }) => {
    try {
      const response = await eventsAPI.updateEvent(id, eventData);
      toast.success('Event updated successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update event';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteEvent = createAsyncThunk(
  'events/deleteEvent',
  async (id: string, { rejectWithValue }) => {
    try {
      await eventsAPI.deleteEvent(id);
      toast.success('Event deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete event';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleEventStatus = createAsyncThunk(
  'events/toggleEventStatus',
  async ({ id, status }: { id: string; status: 'active' | 'inactive' | 'draft' }, { rejectWithValue }) => {
    try {
      const response = await eventsAPI.updateEventStatus(id, status);
      toast.success(`Event ${status === 'active' ? 'activated' : status === 'inactive' ? 'deactivated' : 'saved as draft'}!`);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update event status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const searchEvents = createAsyncThunk(
  'events/searchEvents',
  async (params: {
    query: string;
    filters?: Partial<EventFilters>;
    page?: number;
    limit?: number;
  }, { rejectWithValue }) => {
    try {
      const response = await eventsAPI.searchEvents(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Search failed';
      return rejectWithValue(message);
    }
  }
);

export const fetchEventsByLocation = createAsyncThunk(
  'events/fetchEventsByLocation',
  async (params: {
    latitude: number;
    longitude: number;
    radius?: number;
    limit?: number;
  }, { rejectWithValue }) => {
    try {
      const response = await eventsAPI.getEventsByLocation(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch events by location';
      return rejectWithValue(message);
    }
  }
);

export const fetchEventsByVendor = createAsyncThunk(
  'events/fetchEventsByVendor',
  async (params: {
    vendorId: string;
    page?: number;
    limit?: number;
    status?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await eventsAPI.getEventsByVendor(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch vendor events';
      return rejectWithValue(message);
    }
  }
);

// Events slice
const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentEvent: (state, action: PayloadAction<Event | null>) => {
      state.currentEvent = action.payload;
    },
    updateFilters: (state, action: PayloadAction<Partial<EventFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSortBy: (state, action: PayloadAction<string>) => {
      state.sortBy = action.payload;
    },
    setSortOrder: (state, action: PayloadAction<'asc' | 'desc'>) => {
      state.sortOrder = action.payload;
    },
    setViewMode: (state, action: PayloadAction<'grid' | 'list' | 'map'>) => {
      state.viewMode = action.payload;
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    clearEvents: (state) => {
      state.events = [];
      state.totalEvents = 0;
      state.currentPage = 1;
      state.totalPages = 0;
    },
    updateEventInList: (state, action: PayloadAction<Event>) => {
      const index = state.events.findIndex(event => event._id === action.payload._id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
    },
    removeEventFromList: (state, action: PayloadAction<string>) => {
      state.events = state.events.filter(event => event._id !== action.payload);
      state.totalEvents = Math.max(0, state.totalEvents - 1);
    },
  },
  extraReducers: (builder) => {
    // Fetch Events
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action: PayloadAction<EventsResponse>) => {
        state.isLoading = false;
        state.events = action.payload.events;
        state.totalEvents = action.payload.total;
        state.currentPage = action.payload.page;
        state.totalPages = action.payload.totalPages;
        state.error = null;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch Featured Events
      .addCase(fetchFeaturedEvents.fulfilled, (state, action: PayloadAction<Event[]>) => {
        state.featuredEvents = action.payload;
      })
      
      // Fetch Event by ID
      .addCase(fetchEventById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEventById.fulfilled, (state, action: PayloadAction<Event>) => {
        state.isLoading = false;
        state.currentEvent = action.payload;
        state.error = null;
      })
      .addCase(fetchEventById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.currentEvent = null;
      })
      
      // Fetch Event by Slug
      .addCase(fetchEventBySlug.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEventBySlug.fulfilled, (state, action: PayloadAction<Event>) => {
        state.isLoading = false;
        state.currentEvent = action.payload;
        state.error = null;
      })
      .addCase(fetchEventBySlug.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.currentEvent = null;
      })
      
      // Fetch Related Events
      .addCase(fetchRelatedEvents.fulfilled, (state, action: PayloadAction<Event[]>) => {
        state.relatedEvents = action.payload;
      })
      
      // Create Event
      .addCase(createEvent.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createEvent.fulfilled, (state, action: PayloadAction<Event>) => {
        state.isCreating = false;
        state.events.unshift(action.payload);
        state.totalEvents += 1;
        state.error = null;
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })
      
      // Update Event
      .addCase(updateEvent.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateEvent.fulfilled, (state, action: PayloadAction<Event>) => {
        state.isUpdating = false;
        const index = state.events.findIndex(event => event._id === action.payload._id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
        if (state.currentEvent && state.currentEvent._id === action.payload._id) {
          state.currentEvent = action.payload;
        }
        state.error = null;
      })
      .addCase(updateEvent.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      
      // Delete Event
      .addCase(deleteEvent.pending, (state) => {
        state.isDeleting = true;
        state.error = null;
      })
      .addCase(deleteEvent.fulfilled, (state, action: PayloadAction<string>) => {
        state.isDeleting = false;
        state.events = state.events.filter(event => event._id !== action.payload);
        state.totalEvents = Math.max(0, state.totalEvents - 1);
        if (state.currentEvent && state.currentEvent._id === action.payload) {
          state.currentEvent = null;
        }
        state.error = null;
      })
      .addCase(deleteEvent.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = action.payload as string;
      })
      
      // Toggle Event Status
      .addCase(toggleEventStatus.fulfilled, (state, action: PayloadAction<Event>) => {
        const index = state.events.findIndex(event => event._id === action.payload._id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
        if (state.currentEvent && state.currentEvent._id === action.payload._id) {
          state.currentEvent = action.payload;
        }
      })
      
      // Search Events
      .addCase(searchEvents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchEvents.fulfilled, (state, action: PayloadAction<EventsResponse>) => {
        state.isLoading = false;
        state.events = action.payload.events;
        state.totalEvents = action.payload.total;
        state.currentPage = action.payload.page;
        state.totalPages = action.payload.totalPages;
        state.error = null;
      })
      .addCase(searchEvents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch Events by Location
      .addCase(fetchEventsByLocation.fulfilled, (state, action: PayloadAction<EventsResponse>) => {
        state.events = action.payload.events;
        state.totalEvents = action.payload.total;
        state.currentPage = action.payload.page;
        state.totalPages = action.payload.totalPages;
      })
      
      // Fetch Events by Vendor
      .addCase(fetchEventsByVendor.fulfilled, (state, action: PayloadAction<EventsResponse>) => {
        state.events = action.payload.events;
        state.totalEvents = action.payload.total;
        state.currentPage = action.payload.page;
        state.totalPages = action.payload.totalPages;
      });
  },
});

export const {
  clearError,
  setCurrentEvent,
  updateFilters,
  clearFilters,
  setSearchQuery,
  setSortBy,
  setSortOrder,
  setViewMode,
  setCurrentPage,
  clearEvents,
  updateEventInList,
  removeEventFromList,
} = eventsSlice.actions;

export default eventsSlice.reducer;

// Selectors
export const selectEvents = (state: { events: EventsState }) => state.events.events;
export const selectFeaturedEvents = (state: { events: EventsState }) => state.events.featuredEvents;
export const selectCurrentEvent = (state: { events: EventsState }) => state.events.currentEvent;
export const selectRelatedEvents = (state: { events: EventsState }) => state.events.relatedEvents;
export const selectEventsLoading = (state: { events: EventsState }) => state.events.isLoading;
export const selectEventsError = (state: { events: EventsState }) => state.events.error;
export const selectEventsPagination = (state: { events: EventsState }) => ({
  currentPage: state.events.currentPage,
  totalPages: state.events.totalPages,
  totalEvents: state.events.totalEvents,
});
export const selectEventsFilters = (state: { events: EventsState }) => state.events.filters;
export const selectSearchQuery = (state: { events: EventsState }) => state.events.searchQuery;
export const selectViewMode = (state: { events: EventsState }) => state.events.viewMode;
export const selectSortOptions = (state: { events: EventsState }) => ({
  sortBy: state.events.sortBy,
  sortOrder: state.events.sortOrder,
});