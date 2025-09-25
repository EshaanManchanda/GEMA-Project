// Import whatwg-fetch polyfill first and ensure it's available
import 'whatwg-fetch';

// Immediately ensure fetch APIs are available globally after import
// This must happen synchronously before any other imports
if (typeof globalThis !== 'undefined') {
  globalThis.fetch = globalThis.fetch || fetch;
  globalThis.Request = globalThis.Request || Request;
  globalThis.Response = globalThis.Response || Response;
  globalThis.Headers = globalThis.Headers || Headers;

  // Also ensure on global object for compatibility
  if (typeof global !== 'undefined') {
    global.fetch = global.fetch || fetch;
    global.Request = global.Request || Request;
    global.Response = global.Response || Response;
    global.Headers = global.Headers || Headers;
  }

  // Also ensure on window object
  if (typeof window !== 'undefined') {
    window.fetch = window.fetch || fetch;
    window.Request = window.Request || Request;
    window.Response = window.Response || Response;
    window.Headers = window.Headers || Headers;
  }
}

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

// Final verification and emergency fallbacks before React bootstraps
const ensureFetchAPIs = () => {
  const missingApis = [];

  if (typeof fetch === 'undefined') {
    missingApis.push('fetch');
    console.error('[Emergency] fetch API still undefined after polyfill loading');
  }

  if (typeof Request === 'undefined') {
    missingApis.push('Request');
    console.error('[Emergency] Request API still undefined after polyfill loading');
    // Emergency fallback to prevent destructuring errors
    globalThis.Request = globalThis.Request || function() {
      throw new Error('Request API not available');
    };
    if (typeof global !== 'undefined') global.Request = globalThis.Request;
    if (typeof window !== 'undefined') window.Request = globalThis.Request;
  }

  if (typeof Response === 'undefined') {
    missingApis.push('Response');
    console.error('[Emergency] Response API still undefined after polyfill loading');
    globalThis.Response = globalThis.Response || function() {
      throw new Error('Response API not available');
    };
    if (typeof global !== 'undefined') global.Response = globalThis.Response;
    if (typeof window !== 'undefined') window.Response = globalThis.Response;
  }

  if (typeof Headers === 'undefined') {
    missingApis.push('Headers');
    console.error('[Emergency] Headers API still undefined after polyfill loading');
    globalThis.Headers = globalThis.Headers || function() {
      throw new Error('Headers API not available');
    };
    if (typeof global !== 'undefined') global.Headers = globalThis.Headers;
    if (typeof window !== 'undefined') window.Headers = globalThis.Headers;
  }

  if (missingApis.length === 0) {
    console.log('[Bootstrap] All fetch APIs verified and available');
  } else {
    console.warn('[Bootstrap] Some APIs required emergency fallbacks:', missingApis);
  }
};

ensureFetchAPIs();

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