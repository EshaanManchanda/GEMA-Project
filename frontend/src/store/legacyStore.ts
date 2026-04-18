import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';
import authSlice from './legacySlices/authSlice';
import eventsSlice from './legacySlices/eventsSlice';
import categoriesSlice from './legacySlices/categoriesSlice';
import favoritesSlice from './legacySlices/favoritesSlice';
import uiSlice from './legacySlices/uiSlice';
import searchSlice from './legacySlices/searchSlice';
import bookingsSlice from './legacySlices/bookingsSlice';
import vendorSlice from './legacySlices/vendorSlice';
import vendorPayoutSlice from './legacySlices/vendorPayoutSlice';
import adminSlice from './legacySlices/adminSlice';
import couponsSlice from './legacySlices/couponsSlice';
import affiliatesSlice from './legacySlices/affiliatesSlice';
import paymentsSlice from './legacySlices/paymentsSlice';
import ticketsSlice from './legacySlices/ticketsSlice';
import blogSlice from './legacySlices/blogSlice';
import registrationsSlice from './legacySlices/registrationsSlice';
import settingsSlice from './legacySlices/settingsSlice';
import mediaSlice from './legacySlices/mediaSlice';

const persistConfig = { key: 'root', storage, whitelist: ['favorites', 'ui', 'settings'] };
const authPersistConfig = { key: 'auth', storage, whitelist: [], blacklist: ['user', 'isAuthenticated', 'token', 'refreshToken', 'isLoading', 'loading', 'error', 'profileError', 'isProfileLoading'] };
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authSlice),
  events: eventsSlice, categories: categoriesSlice, favorites: favoritesSlice,
  ui: uiSlice, search: searchSlice, bookings: bookingsSlice, vendor: vendorSlice,
  vendorPayout: vendorPayoutSlice, admin: adminSlice, coupons: couponsSlice,
  affiliates: affiliatesSlice, payments: paymentsSlice, tickets: ticketsSlice,
  blog: blogSlice, registrations: registrationsSlice, settings: settingsSlice, media: mediaSlice,
});
const persistedReducer = persistReducer(persistConfig, rootReducer);
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (gdm) => gdm({ serializableCheck: { ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'] } }),
  devTools: import.meta.env.DEV,
});
export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
