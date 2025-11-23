import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slices
import authSlice from './slices/authSlice';
import eventsSlice from './slices/eventsSlice';
import categoriesSlice from './slices/categoriesSlice';
import cartSlice from './slices/cartSlice';
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

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  // Note: auth and cart use custom persist configs below, so exclude them here
  whitelist: ['favorites', 'ui'], // Only persist these slices
  blacklist: ['events', 'categories', 'search', 'bookings', 'vendor', 'vendorPayout', 'admin', 'coupons', 'affiliates', 'payments', 'tickets', 'blog', 'registrations'], // Don't persist these (notifications removed - system disabled)
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

// Cart persist config
const cartPersistConfig = {
  key: 'cart',
  storage,
  whitelist: ['items', 'total'], // Persist cart items and total
  blacklist: ['isLoading', 'error'], // Don't persist loading states
};

// Combine reducers
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authSlice),
  events: eventsSlice,
  categories: categoriesSlice,
  cart: persistReducer(cartPersistConfig, cartSlice),
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
  devTools: import.meta.env.MODE !== 'production',
});

// Create persistor
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks
export { useAppDispatch, useAppSelector } from './hooks';

// Export actions
export * from './slices/authSlice';
export * from './slices/eventsSlice';
export * from './slices/categoriesSlice';
export * from './slices/cartSlice';
export * from './slices/favoritesSlice';
export * from './slices/uiSlice';
export * from './slices/searchSlice';
export * from './slices/bookingsSlice';
export * from './slices/vendorSlice';
export * from './slices/vendorPayoutSlice';
export * from './slices/adminSlice';
// export * from './slices/notificationsSlice'; // Commented out - notification system disabled
export * from './slices/couponsSlice';
export * from './slices/affiliatesSlice';
export * from './slices/paymentsSlice';
export * from './slices/ticketsSlice';
export * from './slices/blogSlice';
export * from './slices/registrationsSlice';