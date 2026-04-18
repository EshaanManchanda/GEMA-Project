// Zustand stores — ONLY client state (UI, favorites, settings)
// Server state is managed by React Query (see app/providers/QueryProvider.tsx)
export { useUIStore } from './uiStore';
export { useFavoritesStore } from './favoritesStore';
export { useSettingsStore } from './settingsStore';

// Legacy Redux store — will be removed after migration to React Query + Zustand
// TODO: Remove Redux store after all slices are migrated
export { store, persistor } from './legacyStore';
export type { RootState, AppDispatch } from './legacyStore';
export { useAppDispatch, useAppSelector } from './legacyHooks';
