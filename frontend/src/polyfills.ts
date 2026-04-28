/**
 * CRITICAL POLYFILLS - Must execute FIRST before any other code
 *
 * This file patches the global environment to ensure axios and other libraries
 * can properly destructure fetch API objects from the global scope.
 *
 * IMPORTANT: This file is bundled into the main entry chunk (not a separate chunk)
 * to guarantee synchronous execution before any other modules load.
 */

// Import whatwg-fetch polyfill for browsers that need it
import 'whatwg-fetch';

/**
 * Comprehensive global patching for all global object variations
 */
function patchGlobalEnvironment() {
  // Get all possible global objects
  const allGlobals: any[] = [];

  if (typeof globalThis !== 'undefined') allGlobals.push(globalThis);
  if (typeof window !== 'undefined') allGlobals.push(window);
  if (typeof self !== 'undefined') allGlobals.push(self);
  if (typeof global !== 'undefined') allGlobals.push(global);

  // Primary global object (what axios will use)
  const primaryGlobal = (typeof globalThis !== 'undefined' && globalThis) ||
    (typeof window !== 'undefined' && window) ||
    (typeof self !== 'undefined' && self) ||
    (typeof global !== 'undefined' && global) ||
    {};

  // Ensure window.global points to window (critical for axios)
  if (typeof window !== 'undefined') {
    if (!(window as any).global) {
      (window as any).global = window;
    }
    if (!allGlobals.includes((window as any).global)) {
      allGlobals.push((window as any).global);
    }
  }

  // Get fetch API references
  const fetchAPIs = {
    fetch: typeof fetch !== 'undefined' ? fetch : undefined,
    Request: typeof Request !== 'undefined' ? Request : undefined,
    Response: typeof Response !== 'undefined' ? Response : undefined,
    Headers: typeof Headers !== 'undefined' ? Headers : undefined,
  };

  // Patch all global objects with fetch APIs
  let patchedCount = 0;
  for (const globalObj of allGlobals) {
    if (!globalObj || typeof globalObj !== 'object') continue;

    for (const [apiName, apiValue] of Object.entries(fetchAPIs)) {
      if (!apiValue) continue;

      try {
        // Check if already properly defined
        const descriptor = Object.getOwnPropertyDescriptor(globalObj, apiName);
        if (descriptor && descriptor.enumerable && descriptor.value === apiValue) {
          continue; // Already properly patched
        }

        // Delete any existing non-enumerable property
        if (descriptor) {
          delete globalObj[apiName];
        }

        // Define as enumerable (CRITICAL for destructuring)
        Object.defineProperty(globalObj, apiName, {
          value: apiValue,
          writable: true,
          enumerable: true,  // Must be true for destructuring to work
          configurable: true
        });

        patchedCount++;
      } catch (error) {
        // Fallback: direct assignment
        try {
          globalObj[apiName] = apiValue;
          patchedCount++;
        } catch (e) {
          console.warn(`[Polyfills] Failed to patch ${apiName}:`, e);
        }
      }
    }
  }

  // Verification: Test destructuring
  let destructureWorks = false;
  try {
    const { Request: R, Response: Res, Headers: H, fetch: F } = primaryGlobal as any;
    destructureWorks = !!(R && Res && H && F);
  } catch (error) {
    console.error('[Polyfills] Destructuring test failed:', error);
  }

  // Log status (always log in production for debugging)
  const status = {
    timestamp: new Date().toISOString(),
    patchedProperties: patchedCount,
    primaryGlobal: primaryGlobal === globalThis ? 'globalThis' :
      primaryGlobal === window ? 'window' :
        primaryGlobal === self ? 'self' : 'global',
    destructureWorks,
    apis: {
      fetch: !!fetchAPIs.fetch,
      Request: !!fetchAPIs.Request,
      Response: !!fetchAPIs.Response,
      Headers: !!fetchAPIs.Headers,
    },
    verification: {
      requestEnumerable: primaryGlobal.propertyIsEnumerable?.('Request') || false,
      responseEnumerable: primaryGlobal.propertyIsEnumerable?.('Response') || false,
    }
  };

  console.log('[Polyfills] ✅ Global environment patched:', status);

  if (!destructureWorks) {
    console.error('[Polyfills] ⚠️ WARNING: Destructuring test failed! Axios may not work correctly.');
  }

  return status;
}

// Execute polyfill immediately (synchronous) - BEFORE any other code
if (typeof window !== 'undefined') {
  patchGlobalEnvironment();

  // CRITICAL: Axios-specific fix
  // Axios resolves global using this exact pattern (from axios source code):
  // const _global = (typeof globalThis !== 'undefined' && globalThis) ||
  //                 (typeof window !== 'undefined' && window) ||
  //                 (typeof self !== 'undefined' && self) ||
  //                 (typeof global !== 'undefined' && global) || {};
  //
  // We need to ensure Request, Response, Headers are ENUMERABLE on ALL these objects

  const axiosGlobal =
    (typeof globalThis !== 'undefined' && globalThis) ||
    (typeof window !== 'undefined' && window) ||
    (typeof self !== 'undefined' && self) ||
    {} as any;

  // Double-check axios's specific global has enumerable properties
  const fetchAPIs = ['fetch', 'Request', 'Response', 'Headers'];
  let axiosPatchCount = 0;

  for (const apiName of fetchAPIs) {
    const apiValue = (window as any)[apiName];
    if (apiValue) {
      const desc = Object.getOwnPropertyDescriptor(axiosGlobal, apiName);
      if (!desc || !desc.enumerable) {
        try {
          if (desc) delete axiosGlobal[apiName];
          Object.defineProperty(axiosGlobal, apiName, {
            value: apiValue,
            writable: true,
            enumerable: true,  // CRITICAL
            configurable: true
          });
          axiosPatchCount++;
        } catch (e) {
          console.warn(`[Polyfills] Failed axios-specific patch for ${apiName}:`, e);
        }
      }
    }
  }

  console.log(`[Polyfills] 🎯 Axios-specific global patched (${axiosPatchCount} properties)`);

  // Store status for debugging
  (window as any).__POLYFILL_STATUS__ = {
    loaded: true,
    timestamp: Date.now(),
    version: '3.0-axios-specific',
    axiosPatchCount,
    axiosGlobalType: axiosGlobal === globalThis ? 'globalThis' :
      axiosGlobal === window ? 'window' :
        axiosGlobal === self ? 'self' : 'unknown'
  };

  // Final verification test using axios's pattern
  try {
    const testGlobal = axiosGlobal;
    const { Request: R, Response: Res, Headers: H, fetch: F } = testGlobal;
    if (R && Res && H && F) {
      console.log('[Polyfills] ✅ Final axios destructuring test: PASSED');
    } else {
      console.error('[Polyfills] ❌ Final axios destructuring test: FAILED', { R: !!R, Res: !!Res, H: !!H, F: !!F });
    }
  } catch (e) {
    console.error('[Polyfills] ❌ Final axios destructuring test EXCEPTION:', e);
  }
}

// Export empty object to make this a module
// CRITICAL: Global error handler for dynamic import failures (Version Mismatch)
// This handles the "Failed to fetch dynamically imported module" error by reloading
// the page to get the latest index.html and chunks.
window.addEventListener('vite:preloadError', (event) => {
  console.error('[Vite] Detected dynamic import error, reloading...', event);

  // Prevent infinite reload loops (limit to 1 reload per 10 seconds)
  const lastReload = parseInt(sessionStorage.getItem('__vite_reload_timestamp') || '0', 10);
  const now = Date.now();

  if (now - lastReload > 10000) {
    sessionStorage.setItem('__vite_reload_timestamp', now.toString());
    window.location.reload();
  } else {
    console.error('[Vite] Reload loop detected, not reloading.');
  }
});

export { };
