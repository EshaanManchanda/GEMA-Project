// Polyfills for older browsers and environments

// Import whatwg-fetch polyfill for Request/Response APIs FIRST
// This is the PRIMARY polyfill source (no CDN dependency)
import 'whatwg-fetch';

// Ensure fetch APIs are available globally before any other code runs
declare global {
  interface Window {
    fetch: typeof fetch;
    Request: typeof Request;
    Response: typeof Response;
    Headers: typeof Headers;
  }
}

// Safe console logging for polyfill status
const polyfillLog = (message: string, level: 'log' | 'warn' | 'error' = 'log') => {
  if (typeof console !== 'undefined' && console[level]) {
    console[level](`[Polyfills] ${message}`);
  }
};

// Feature detection helper
const hasFeature = (obj: any, prop: string): boolean => {
  try {
    return obj && typeof obj[prop] !== 'undefined';
  } catch (e) {
    return false;
  }
};

// Force polyfill APIs into global scope to prevent destructuring errors
const ensureGlobalAPIs = () => {
  if (typeof globalThis !== 'undefined') {
    // Ensure all fetch APIs are available on globalThis
    if (typeof fetch !== 'undefined' && !globalThis.fetch) {
      globalThis.fetch = fetch;
    }
    if (typeof Request !== 'undefined' && !globalThis.Request) {
      globalThis.Request = Request;
    }
    if (typeof Response !== 'undefined' && !globalThis.Response) {
      globalThis.Response = Response;
    }
    if (typeof Headers !== 'undefined' && !globalThis.Headers) {
      globalThis.Headers = Headers;
    }
  }

  // Also ensure on window object
  if (typeof window !== 'undefined') {
    if (typeof fetch !== 'undefined' && !window.fetch) {
      window.fetch = fetch;
    }
    if (typeof Request !== 'undefined' && !window.Request) {
      window.Request = Request;
    }
    if (typeof Response !== 'undefined' && !window.Response) {
      window.Response = Response;
    }
    if (typeof Headers !== 'undefined' && !window.Headers) {
      window.Headers = Headers;
    }
  }
};

// Initialize polyfills and update status
try {
  polyfillLog('Loading local whatwg-fetch polyfills...');

  // Ensure APIs are available immediately after import
  ensureGlobalAPIs();

  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Update polyfill status after local loading
    const polyfillStatus = {
      fetch: hasFeature(window, 'fetch'),
      request: hasFeature(window, 'Request'),
      response: hasFeature(window, 'Response'),
      headers: hasFeature(window, 'Headers'),
      source: 'bundled' // Mark as bundled polyfills
    };

    // Update global status
    if ((window as any).__POLYFILL_STATUS__) {
      (window as any).__POLYFILL_STATUS__ = polyfillStatus;
    }

    polyfillLog('Post-bundle polyfill status:', polyfillStatus);

    // Ensure globalThis has all APIs
    if (typeof globalThis !== 'undefined') {
      ['fetch', 'Request', 'Response', 'Headers'].forEach(api => {
        if (hasFeature(window, api)) {
          if (!hasFeature(globalThis, api)) {
            try {
              (globalThis as any)[api] = (window as any)[api];
              polyfillLog(`Set ${api} on globalThis from bundled polyfill`);
            } catch (e) {
              polyfillLog(`Failed to set ${api} on globalThis: ${e}`, 'error');
            }
          }
        } else {
          polyfillLog(`${api} not available even after polyfill loading`, 'error');
        }
      });
    }

    // Additional Web API polyfills
    if (!hasFeature(window, 'URL') && hasFeature(window, 'webkitURL')) {
      try {
        (window as any).URL = (window as any).webkitURL;
        polyfillLog('Applied webkitURL polyfill');
      } catch (e) {
        polyfillLog(`Failed to apply URL polyfill: ${e}`, 'error');
      }
    }

    // Feature availability warnings
    if (!hasFeature(window, 'AbortController')) {
      polyfillLog('AbortController not available - some fetch operations may not be cancellable', 'warn');
    }

    // Final verification
    const missingApis = [];
    if (!hasFeature(window, 'fetch')) missingApis.push('fetch');
    if (!hasFeature(window, 'Request')) missingApis.push('Request');
    if (!hasFeature(window, 'Response')) missingApis.push('Response');
    if (!hasFeature(window, 'Headers')) missingApis.push('Headers');

    if (missingApis.length > 0) {
      polyfillLog(`CRITICAL: Missing APIs after local polyfill loading: ${missingApis.join(', ')}`, 'error');
    } else {
      polyfillLog('SUCCESS: All fetch APIs available via local polyfills');
    }
  }
} catch (error) {
  polyfillLog(`Error during local polyfill initialization: ${error}`, 'error');
}

// Export feature detection utilities for use in components
export const features = {
  fetch: typeof fetch !== 'undefined',
  request: typeof Request !== 'undefined',
  response: typeof Response !== 'undefined',
  headers: typeof Headers !== 'undefined',
  abortController: typeof AbortController !== 'undefined',
  url: typeof URL !== 'undefined',
  promise: typeof Promise !== 'undefined',
};

// Safe fetch wrapper with error handling
export const safeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  if (!features.fetch) {
    throw new Error('Fetch API not available and polyfill failed to load');
  }

  try {
    return await fetch(input, init);
  } catch (error) {
    console.error('[SafeFetch] Request failed:', error);
    throw error;
  }
};

// Export safe references to prevent destructuring from undefined
export const FetchPolyfills = {
  fetch: typeof fetch !== 'undefined' ? fetch : undefined,
  Request: typeof Request !== 'undefined' ? Request : undefined,
  Response: typeof Response !== 'undefined' ? Response : undefined,
  Headers: typeof Headers !== 'undefined' ? Headers : undefined,
};

// Safe destructuring helper
export const safeDestructure = <T extends Record<string, any>>(
  source: T | undefined,
  keys: (keyof T)[],
  fallbacks: Partial<T> = {}
): T => {
  if (!source) {
    console.warn('[Polyfills] Attempting to destructure from undefined object, using fallbacks');
    return fallbacks as T;
  }

  const result = {} as T;
  keys.forEach(key => {
    result[key] = source[key] !== undefined ? source[key] : fallbacks[key];
  });

  return result;
};

export {}; // Make this a module