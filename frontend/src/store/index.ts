import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slices
import authSlice from './slices/authSlice';
import eventsSlice from './slices/eventsSlice';
import categoriesSlice from './slices/categoriesSlice';
import favoritesSlice from './slices/favoritesSlice';
import uiSlice from './slices/uiSlice';
import searchSlice from './slices/searchSlice';
import bookingsSlice from './slices/bookingsSlice';
import vendorSlice from './slices/vendorSlice';
import vendorPayoutSlice from './slices/vendorPayoutSlice';
import adminSlice from './slices/adminSlice';
// import notificationsSlice from './slices/notificationsSlice'; // Commented out - notification system disabled
import couponsSlice from './slices/couponsSlice';
import affiliatesSlice from './slices/affiliatesSlice';
import paymentsSlice from './slices/paymentsSlice';
import ticketsSlice from './slices/ticketsSlice';
import blogSlice from './slices/blogSlice';
import registrationsSlice from './slices/registrationsSlice';
import settingsSlice from './slices/settingsSlice';
import mediaSlice from './slices/mediaSlice';
import recentlyViewedSlice from './slices/recentlyViewedSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  // Note: auth uses a custom persist config below, so exclude it here
  whitelist: ['favorites', 'ui', 'settings', 'recentlyViewed'], // Only persist these slices
  blacklist: ['events', 'categories', 'search', 'bookings', 'vendor', 'vendorPayout', 'admin', 'coupons', 'affiliates', 'payments', 'tickets', 'blog', 'registrations', 'media'], // Don't persist these (notifications removed - system disabled)
};

// Auth persist config (separate for sensitive data)
// Note: Tokens are now stored in httpOnly cookies (more secure), not in Redux
// Auth state is NOT persisted - httpOnly cookies are the single source of truth
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: [], // Don't persist any auth state - rely on server cookies
  blacklist: ['user', 'isAuthenticated', 'isEmailVerified', 'token', 'refreshToken', 'isLoading', 'loading', 'error', 'profileError', 'isProfileLoading'],
};

// Combine reducers
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authSlice),
  events: eventsSlice,
  categories: categoriesSlice,
  favorites: favoritesSlice,
  ui: uiSlice,
  search: searchSlice,
  bookings: bookingsSlice,
  vendor: vendorSlice,
  vendorPayout: vendorPayoutSlice,
  admin: adminSlice,
  // notifications: notificationsSlice, // Commented out - notification system disabled
  coupons: couponsSlice,
  affiliates: affiliatesSlice,
  payments: paymentsSlice,
  tickets: ticketsSlice,
  blog: blogSlice,
  registrations: registrationsSlice,
  settings: settingsSlice,
  media: mediaSlice,
  recentlyViewed: recentlyViewedSlice,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
          'persist/FLUSH',
        ],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['items.dates'],
      },
      immutableCheck: {
        ignoredPaths: ['items.dates'],
      },
    }),
  devTools: import.meta.env.DEV,
});

// Create persistor
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks
export { useAppDispatch, useAppSelector } from './hooks';

// NOTE: We do NOT re-export all actions from slices here to avoid naming conflicts
// (many slices have common action names like clearError, setLoading, etc.)
// Instead, import actions directly from the specific slice you need:
// Example: import { clearError } from '@/store/slices/authSlice';
//
// If you need actions from multiple slices, import them with aliases:
// Example: import { clearError as clearAuthError } from '@/store/slices/authSlice';
//          import { clearError as clearEventsError } from '@/store/slices/eventsSlice';