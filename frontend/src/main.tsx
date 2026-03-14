// CRITICAL: Import polyfills FIRST before any other imports
// This ensures fetch API is available for all modules, especially axios
import './polyfills';

import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';

// CRITICAL: Signal that React is loaded and available
// This works with the React Guard in index.html to prevent race conditions
if (typeof window !== 'undefined') {
  (window as any).__REACT_LOADED__ = true;
  console.log('[React Guard] ✅ React loaded and available');
}

import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Lazy load dev tools to reduce initial bundle size
const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then(module => ({
    default: module.ReactQueryDevtools
  }))
);
import { HelmetProvider } from 'react-helmet-async';

import { Provider } from 'react-redux';
import { store, persistor } from './store';
import { PersistGate } from 'redux-persist/integration/react';

import App from './App';
import { AuthProvider } from '@/contexts/AuthContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { AnimationsProvider } from '@/contexts/AnimationsContext';
import ErrorBoundary from '@components/common/ErrorBoundary';

import '@/styles/index.css';
// Initialize i18n synchronously before React renders to prevent hook order issues
import '@/i18n/config';

// Initialize PWA
import { initializePWA, pwaService } from './services/pwaService';

// Development-only auth debugging
if (import.meta.env.DEV) {
  import('./utils/authDebug');
}

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error: any) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Initialize PWA and clear HTML cache for SEO
initializePWA()
  .then(() => {
    // Critical for SEO: Clear any cached HTML on startup
    // This ensures fresh content delivery to search engines
    pwaService.clearHTMLCache();
  })
  .catch(console.error);

// DevTools component — only renders in dev, named so Vite Fast Refresh is happy
const DevTools: React.FC = () => {
  if (!import.meta.env.DEV) return null;
  return (
    <Suspense fallback={null}>
      <ReactQueryDevtools initialIsOpen={false} />
    </Suspense>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <HelmetProvider>
                <PreferencesProvider>
                  <AuthProvider>
                    <AnimationsProvider>
                      <App />
                      <DevTools />
                    </AnimationsProvider>
                  </AuthProvider>
                </PreferencesProvider>
              </HelmetProvider>
            </BrowserRouter>
          </QueryClientProvider>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Signal to prerenderer that the app is rendered
// SEO: Increased delay to 5000ms to match vite.config.ts renderAfterTime
// This ensures data from API calls has loaded before prerender captures the page
if (typeof window !== 'undefined') {
  // Delay to ensure API data loads and heavy components (maps, charts) have mounted
  // Must match or be slightly less than renderAfterTime in vite.config.ts (5000ms)
  setTimeout(() => {
    window.dispatchEvent(new Event('render-event'));
    console.log('[SEO] Prerender signal dispatched - page ready for capture');
  }, 4500);
}