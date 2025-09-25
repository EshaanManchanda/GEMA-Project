// Safety utilities to prevent fetch API destructuring errors

// Defensive access to global fetch APIs
export const getFetchAPI = () => {
  const apis = {
    fetch: typeof fetch !== 'undefined' ? fetch : undefined,
    Request: typeof Request !== 'undefined' ? Request : undefined,
    Response: typeof Response !== 'undefined' ? Response : undefined,
    Headers: typeof Headers !== 'undefined' ? Headers : undefined,
  };

  // Log warnings for missing APIs
  const missingApis = Object.entries(apis)
    .filter(([_, value]) => value === undefined)
    .map(([key, _]) => key);

  if (missingApis.length > 0) {
    console.warn('[FetchSafety] Missing fetch APIs:', missingApis);
  }

  return apis;
};

// Safe fetch wrapper with fallback
export const safeFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const { fetch: fetchFn } = getFetchAPI();

  if (!fetchFn) {
    throw new Error('[FetchSafety] Fetch API not available. Browser may be too old or polyfill failed to load.');
  }

  try {
    return await fetchFn(input, init);
  } catch (error) {
    console.error('[FetchSafety] Fetch failed:', error);
    throw error;
  }
};

// Safe Request constructor wrapper
export const safeRequest = (
  input: RequestInfo | URL,
  init?: RequestInit
): Request | never => {
  const { Request: RequestConstructor } = getFetchAPI();

  if (!RequestConstructor) {
    throw new Error('[FetchSafety] Request constructor not available. Browser may be too old or polyfill failed to load.');
  }

  try {
    return new RequestConstructor(input, init);
  } catch (error) {
    console.error('[FetchSafety] Request construction failed:', error);
    throw error;
  }
};

// Safe Response constructor wrapper
export const safeResponse = (
  body?: BodyInit | null,
  init?: ResponseInit
): Response | never => {
  const { Response: ResponseConstructor } = getFetchAPI();

  if (!ResponseConstructor) {
    throw new Error('[FetchSafety] Response constructor not available. Browser may be too old or polyfill failed to load.');
  }

  try {
    return new ResponseConstructor(body, init);
  } catch (error) {
    console.error('[FetchSafety] Response construction failed:', error);
    throw error;
  }
};

// Safe Headers constructor wrapper
export const safeHeaders = (init?: HeadersInit): Headers | never => {
  const { Headers: HeadersConstructor } = getFetchAPI();

  if (!HeadersConstructor) {
    throw new Error('[FetchSafety] Headers constructor not available. Browser may be too old or polyfill failed to load.');
  }

  try {
    return new HeadersConstructor(init);
  } catch (error) {
    console.error('[FetchSafety] Headers construction failed:', error);
    throw error;
  }
};

// Initialize safety checks on module load
const initializeSafetyChecks = () => {
  const apis = getFetchAPI();
  const availableApis = Object.entries(apis)
    .filter(([_, value]) => value !== undefined)
    .map(([key, _]) => key);

  console.log('[FetchSafety] Available fetch APIs:', availableApis);

  if (availableApis.length === 0) {
    console.error('[FetchSafety] CRITICAL: No fetch APIs available! This will cause runtime errors.');
  } else if (availableApis.length < 4) {
    console.warn('[FetchSafety] Some fetch APIs are missing:', {
      available: availableApis,
      total: 4
    });
  }
};

// Run checks when module is imported
initializeSafetyChecks();