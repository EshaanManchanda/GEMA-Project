import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/** Minimal shape — survives schema changes, keeps localStorage small */
export interface RecentlyViewedEvent {
  id: string;
  slug: string;
  title: string;
  image?: string;
  price?: number;
  currency?: string;
  city?: string;
  ageRange?: [number, number];
}

interface RecentlyViewedState {
  items: RecentlyViewedEvent[];
}

const MAX_ITEMS = 10;

const initialState: RecentlyViewedState = {
  items: [],
};

const recentlyViewedSlice = createSlice({
  name: 'recentlyViewed',
  initialState,
  reducers: {
    addRecentlyViewed: (state, action: PayloadAction<RecentlyViewedEvent>) => {
      // De-dupe by id, prepend (most recent first), cap at MAX_ITEMS
      const filtered = state.items.filter((i) => i.id !== action.payload.id);
      state.items = [action.payload, ...filtered].slice(0, MAX_ITEMS);
    },
    clearRecentlyViewed: (state) => {
      state.items = [];
    },
  },
});

export const { addRecentlyViewed, clearRecentlyViewed } = recentlyViewedSlice.actions;

export const selectRecentlyViewed = (state: { recentlyViewed: RecentlyViewedState }) =>
  state.recentlyViewed.items;

export default recentlyViewedSlice.reducer;
