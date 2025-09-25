// Import whatwg-fetch first to guarantee fetch APIs are available
import 'whatwg-fetch';

// Import polyfills first to ensure they're available before any other code runs
import './polyfills';

// Import safety checks immediately after polyfills
import './utils/fetchSafety';

// Global error handler for destructuring errors
window.addEventListener('error', (event) => {
  if (event.error?.message?.includes('destructure') && event.error?.message?.includes('Request')) {
    console.error('[Global Error Handler] Caught Request destructuring error:', {
      message: event.error.message,
      stack: event.error.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });

    // Prevent the error from breaking the app
    event.preventDefault();

    // Show user-friendly error
    console.error('A polyfill loading issue has been detected and handled. The app should still function.');
  }
});

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';

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
import '@/i18n/config';

// Initialize PWA
import { initializePWA } from './services/pwaService';

// Auth debugging tools (development only)
if (process.env.NODE_ENV === 'development') {
  import('./utils/authDebug');
}

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
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

// Toast configuration
const toastOptions = {
  duration: 4000,
  position: 'top-right' as const,
  style: {
    background: '#363636',
    color: '#fff',
    borderRadius: '8px',
    fontSize: '14px',
    maxWidth: '400px',
  },
  success: {
    iconTheme: {
      primary: '#22c55e',
      secondary: '#fff',
    },
  },
  error: {
    iconTheme: {
      primary: '#ef4444',
      secondary: '#fff',
    },
  },
};

// Initialize PWA when app loads
initializePWA().catch(console.error);

// Final runtime safety guard - ensure fetch APIs exist before React bootstraps
if (typeof globalThis !== 'undefined') {
  if (typeof globalThis.fetch === 'undefined') {
    console.error('[Runtime Guard] fetch API missing - polyfill failed to load');
  }
  if (typeof globalThis.Request === 'undefined') {
    console.error('[Runtime Guard] Request constructor missing - polyfill failed to load');
    // Emergency fallback - prevent destructuring errors
    globalThis.Request = function() {
      throw new Error('Request constructor not available - polyfill failed');
    } as any;
  }
  if (typeof globalThis.Response === 'undefined') {
    console.error('[Runtime Guard] Response constructor missing - polyfill failed to load');
    globalThis.Response = function() {
      throw new Error('Response constructor not available - polyfill failed');
    } as any;
  }
  if (typeof globalThis.Headers === 'undefined') {
    console.error('[Runtime Guard] Headers constructor missing - polyfill failed to load');
    globalThis.Headers = function() {
      throw new Error('Headers constructor not available - polyfill failed');
    } as any;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <QueryClientProvider client={queryClient}>
            <HelmetProvider>
              <LanguageProvider>
                <CurrencyProvider>
                  <ThemeProvider>
                    <AuthProvider>
                      <CartProvider>
                        <ErrorBoundary>
                          <App />
                        </ErrorBoundary>
                      </CartProvider>
                    </AuthProvider>
                  </ThemeProvider>
                </CurrencyProvider>
              </LanguageProvider>
            </HelmetProvider>
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </BrowserRouter>
      </PersistGate>
    </Provider>
    <Toaster toastOptions={toastOptions} />
  </React.StrictMode>,
);