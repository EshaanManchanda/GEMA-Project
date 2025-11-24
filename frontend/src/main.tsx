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
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CartProvider } from '@/contexts/CartContext';
import ErrorBoundary from '@components/common/ErrorBoundary';

import '@/styles/index.css';
// Initialize i18n synchronously before React renders to prevent hook order issues
import '@/i18n/config';

// Initialize PWA
import { initializePWA } from './services/pwaService';

// Development-only auth debugging
if (import.meta.env.VITE_NODE_ENV === 'development') {
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

// Initialize PWA
initializePWA().catch(console.error);

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
                <ThemeProvider>
                  <LanguageProvider>
                    <CurrencyProvider>
                      <AuthProvider>
                        <CartProvider>
                          <App />
                          {import.meta.env.VITE_NODE_ENV === 'development' && (
                            <Suspense fallback={null}>
                              <ReactQueryDevtools initialIsOpen={false} />
                            </Suspense>
                          )}
                        </CartProvider>
                      </AuthProvider>
                    </CurrencyProvider>
                  </LanguageProvider>
                </ThemeProvider>
              </HelmetProvider>
            </BrowserRouter>
          </QueryClientProvider>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);