// CRITICAL: Import whatwg-fetch polyfill first and ensure APIs are immediately available
import 'whatwg-fetch';

// AXIOS FIX: Aggressively populate ALL possible global objects before any other code can run
// This is specifically to prevent axios fetch adapter from destructuring undefined objects
(() => {
  const ensureAPI = (globalObj: any, apiName: string, api: any) => {
    if (api && typeof api !== 'undefined') {
      try {
        Object.defineProperty(globalObj, apiName, {
          value: api,
          writable: true,
          enumerable: true,
          configurable: true
        });
      } catch (e) {
        // Fallback for read-only objects
        globalObj[apiName] = api;
      }
    }
  };

  const populateGlobal = (obj: any) => {
    if (!obj) return;
    ensureAPI(obj, 'fetch', fetch);
    ensureAPI(obj, 'Request', Request);
    ensureAPI(obj, 'Response', Response);
    ensureAPI(obj, 'Headers', Headers);
  };

  // Populate ALL possible global objects that axios might check
  if (typeof globalThis !== 'undefined') populateGlobal(globalThis);
  if (typeof window !== 'undefined') populateGlobal(window);
  if (typeof global !== 'undefined') populateGlobal(global);
  if (typeof self !== 'undefined') populateGlobal(self);

  // Extra defensive measure: ensure axios utils.global will find these APIs
  console.log('[Polyfill Fix] Populated fetch APIs on all global objects');

  // AXIOS SPECIFIC FIX: Create a bulletproof global object for axios destructuring
  const createSafeGlobal = () => {
    // Determine which global object axios will use (mimicking axios utils.js logic)
    let axiosGlobal;
    if (typeof globalThis !== "undefined") {
      axiosGlobal = globalThis;
    } else if (typeof self !== "undefined") {
      axiosGlobal = self;
    } else if (typeof window !== 'undefined') {
      axiosGlobal = window;
    } else {
      axiosGlobal = global;
    }

    // Ensure the exact properties axios expects are enumerable and accessible
    const requiredAPIs = {
      fetch: fetch,
      Request: Request,
      Response: Response,
      Headers: Headers,
      ReadableStream: typeof ReadableStream !== 'undefined' ? ReadableStream : undefined,
      TextEncoder: typeof TextEncoder !== 'undefined' ? TextEncoder : undefined,
    };

    // Use defineProperty to ensure these are enumerable (crucial for destructuring)
    Object.keys(requiredAPIs).forEach(apiName => {
      const apiValue = requiredAPIs[apiName];
      if (apiValue && typeof apiValue !== 'undefined') {
        try {
          Object.defineProperty(axiosGlobal, apiName, {
            value: apiValue,
            writable: true,
            enumerable: true,  // CRITICAL: Must be enumerable for destructuring to work
            configurable: true
          });
        } catch (e) {
          // Fallback for environments where defineProperty fails
          axiosGlobal[apiName] = apiValue;
        }
      }
    });

    return axiosGlobal;
  };

  const axiosGlobal = createSafeGlobal();
  console.log('[Axios Fix] Prepared global object for axios with enumerable APIs:', {
    hasRequest: 'Request' in axiosGlobal,
    hasResponse: 'Response' in axiosGlobal,
    requestEnumerable: Object.propertyIsEnumerable.call(axiosGlobal, 'Request'),
    responseEnumerable: Object.propertyIsEnumerable.call(axiosGlobal, 'Response')
  });
})();

// ULTIMATE AXIOS DESTRUCTURING FIX
// Override any potential axios utils.global before axios can load
try {
  // Ensure we create the most compatible global reference for axios
  const ultimateGlobal = (() => {
    if (typeof globalThis !== "undefined") return globalThis;
    return typeof self !== "undefined" ? self : (typeof window !== 'undefined' ? window : global);
  })();

  // Guarantee these properties exist and are enumerable before any module can destructure them
  const ensureEnumerableAPI = (obj: any, name: string, api: any) => {
    if (obj && api && typeof api !== 'undefined') {
      // Delete first to ensure we can redefine
      delete obj[name];
      // Define as enumerable
      Object.defineProperty(obj, name, {
        value: api,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
  };

  ensureEnumerableAPI(ultimateGlobal, 'fetch', fetch);
  ensureEnumerableAPI(ultimateGlobal, 'Request', Request);
  ensureEnumerableAPI(ultimateGlobal, 'Response', Response);
  ensureEnumerableAPI(ultimateGlobal, 'Headers', Headers);

  console.log('[Ultimate Fix] Axios destructuring should now work - APIs are enumerable');
} catch (e) {
  console.error('[Ultimate Fix] Failed to apply axios destructuring fix:', e);
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

// Final verification and debug logging before React bootstraps
const ensureFetchAPIs = () => {
  const checkGlobal = (obj: any, name: string) => {
    if (!obj) return { available: false, apis: {} };
    return {
      available: true,
      apis: {
        fetch: typeof obj.fetch !== 'undefined',
        Request: typeof obj.Request !== 'undefined',
        Response: typeof obj.Response !== 'undefined',
        Headers: typeof obj.Headers !== 'undefined'
      }
    };
  };

  // Debug: Check all global objects
  const globalStatus = {
    globalThis: checkGlobal(typeof globalThis !== 'undefined' ? globalThis : null, 'globalThis'),
    window: checkGlobal(typeof window !== 'undefined' ? window : null, 'window'),
    global: checkGlobal(typeof global !== 'undefined' ? global : null, 'global'),
    self: checkGlobal(typeof self !== 'undefined' ? self : null, 'self')
  };

  console.log('[Debug] Global object status before React bootstrap:', globalStatus);

  const missingApis = [];
  if (typeof fetch === 'undefined') missingApis.push('fetch');
  if (typeof Request === 'undefined') missingApis.push('Request');
  if (typeof Response === 'undefined') missingApis.push('Response');
  if (typeof Headers === 'undefined') missingApis.push('Headers');

  if (missingApis.length === 0) {
    console.log('[Bootstrap] ✅ All fetch APIs verified and available');
  } else {
    console.error('[Bootstrap] ❌ Missing APIs:', missingApis);
    // Emergency fallbacks
    missingApis.forEach(api => {
      const fallback = function() { throw new Error(`${api} API not available`); };
      if (typeof globalThis !== 'undefined') globalThis[api] = globalThis[api] || fallback;
      if (typeof window !== 'undefined') window[api] = window[api] || fallback;
    });
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