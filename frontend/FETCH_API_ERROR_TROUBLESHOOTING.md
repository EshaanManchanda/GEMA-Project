# Fetch API Error Troubleshooting Guide
**Date**: September 30, 2025
**Status**: ⚠️ **UNRESOLVED** - Production Runtime Error
**Severity**: 🔴 **CRITICAL** - Application Breaking

---

## Error Description

### Primary Errors (Production Only):

#### Error 1: Query Chunk Error
```javascript
Uncaught TypeError: Cannot destructure property 'Request' of 'undefined' as it is undefined.
    at query-38deea46-mg6ps8kp.js:11:8410
    at query-38deea46-mg6ps8kp.js:11:8451
```

#### Error 2: Fetch Module Error
```javascript
Uncaught TypeError: Cannot destructure property 'Request' of 'undefined' as it is undefined.
    at fetch.js:15:27
    at fetch.js:17:1
```

### When Errors Occur:
- ✅ **Development (npm run dev)**: Works perfectly
- ✅ **Local Production Build (npm run preview)**: Works perfectly
- ❌ **Vercel Production Deployment**: **FAILS** - Runtime error on initial load
- ❌ **Any production CDN/hosting**: **FAILS** - Same error

### Affected Libraries:
1. **@tanstack/react-query** (query-*.js chunk)
2. **axios** (fetch.js module) - Uses internal `adapters/http.js` that destructures from global

---

## Root Cause Analysis

### Technical Explanation:

The error occurs because **axios** and **@tanstack/react-query** internally try to destructure Fetch API properties from a global object:

```javascript
// What axios/tanstack-query tries to do internally:
const { Request, Response, Headers } = global || globalThis || window;
```

**Problem**: In production builds, when these chunks load:
1. The global object exists but `Request`/`Response`/`Headers` are **not enumerable**
2. Or the global object being accessed is `undefined` or a different scope
3. The polyfill in `index.html` runs AFTER Vite's module loader initializes

### Why It Fails in Production (But Not Dev):

| Environment | Module Loading | Global Setup | Result |
|------------|----------------|--------------|--------|
| Development | Sequential, synchronous | Polyfill runs first | ✅ Works |
| Local Preview | Pre-bundled, polyfill embedded | Same order as dev | ✅ Works |
| Vercel Production | CDN, parallel chunk loading | **Race condition** | ❌ Fails |

**Key Issue**: Production uses **aggressive code splitting** and **parallel chunk loading**. The `query-*.js` chunk may load and execute **BEFORE** the polyfill script in `index.html` completes.

---

## All Attempted Fixes (Chronological)

### ✅ Fix #1: Basic Global Polyfill (FAILED)
**Date**: Initial attempt
**File**: `index.html:93-110`
**What We Did**:
```javascript
if (typeof window !== 'undefined' && !window.global) {
  window.global = window;
}
```
**Result**: ❌ Still failing - Not executed early enough

---

### ✅ Fix #2: Comprehensive Pre-Chunk Polyfill (FAILED)
**Date**: Second iteration
**File**: `index.html:93-308` (215 lines of polyfill code)
**What We Did**:
1. Set `window.global = window` for axios compatibility
2. Detected all global objects (globalThis, window, self, global)
3. Made properties enumerable with `Object.defineProperty()`:
   ```javascript
   Object.defineProperty(globalObj, 'Request', {
     value: Request,
     writable: true,
     enumerable: true,  // CRITICAL for destructuring
     configurable: true
   });
   ```
4. Applied to ALL potential globals (window, globalThis, self, global)
5. Added comprehensive verification and logging
6. Tested destructuring with multiple strategies

**Verification Tests Added**:
```javascript
// Test 1: Direct destructuring
var {Request: R, Response: Res, Headers: H} = globalThis;

// Test 2: Object.keys enumeration
var keys = Object.keys(globalThis);
var hasRequiredKeys = keys.indexOf('Request') !== -1;
```

**Result**: ❌ Still failing in production - Polyfill timing issue

---

### ✅ Fix #3: Vite Config Global Definitions (PARTIAL)
**Date**: Configuration attempt
**File**: `vite.config.ts:244-262`
**What We Did**:
```typescript
define: {
  'global': 'globalThis',
  'global.fetch': 'globalThis.fetch',
  'global.Request': 'globalThis.Request',
  'global.Response': 'globalThis.Response',
  'global.Headers': 'globalThis.Headers',
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
}
```

**Purpose**: Replace references to `global.Request` with `globalThis.Request` at build time

**Result**: ⚠️ Partial success - Works for some modules, but not the query chunk

---

### ✅ Fix #4: Emergency Axios Protection (FAILED)
**Date**: Fallback attempt
**File**: `index.html:288-304`
**What We Did**:
```javascript
window.getGlobal = function() {
  return globalThis; // Force axios to use globalThis
};
```

**Result**: ❌ Axios doesn't use this function in production build

---

### ✅ Fix #5: Remove Node.js Polyfills (PARTIAL)
**Date**: Cleanup attempt
**What We Did**:
- Ensured NO server-side fetch polyfills (node-fetch, cross-fetch, whatwg-fetch)
- Removed any Node.js polyfill imports
- Verified package.json has no fetch polyfill dependencies

**Verification**:
```bash
grep -r "node-fetch\|cross-fetch\|whatwg-fetch" src/
# Result: No matches ✅
```

**Result**: ⚠️ Confirmed not a polyfill conflict, but error persists

---

### ✅ Fix #6: Production Sourcemaps Disabled (UNRELATED)
**Date**: Optimization attempt
**File**: `vite.config.ts:118`
```typescript
sourcemap: process.env.NODE_ENV !== 'production'
```

**Result**: ⚠️ Reduces bundle size but doesn't fix the error

---

## Current Configuration Status

### ✅ What's Currently In Place:

#### 1. Index.html Polyfill (Lines 93-308):
- 215 lines of comprehensive polyfill code
- Runs before `<script type="module" src="/src/main.tsx">`
- Sets up fetch APIs on all globals
- Includes verification and logging
- **Status**: ⚠️ May run too late for parallel chunks

#### 2. Vite Config Global Definitions (Lines 244-262):
- Build-time replacements for global references
- Ensures `global` points to `globalThis`
- **Status**: ✅ Working for main bundle, not for query chunk

#### 3. Axios Configuration (src/services/api.ts):
- Uses standard axios without custom adapters
- Relies on browser's native fetch
- **Status**: ✅ Should work if globals are set

#### 4. Package Dependencies:
- `axios`: ^1.12.2
- `@tanstack/react-query`: ^5.90.2
- **No fetch polyfills**: ✅ Confirmed

---

## Why Current Fixes Don't Work in Production

### The Timing Problem:

```mermaid
Development Flow (Works):
index.html loads → Polyfill runs → Modules load sequentially → ✅ APIs ready

Production Flow (Fails):
index.html loads → Module loader starts → Chunks load in parallel
                ↓
        Polyfill runs (slow)
                ↓
      query-*.js loads (fast) → ❌ APIs not ready yet
```

### The Real Issue:

1. **Vite's module preload**: Production builds use `<link rel="modulepreload">` which starts downloading chunks immediately
2. **Parallel execution**: Multiple chunks execute simultaneously
3. **Race condition**: query chunk initializes before polyfill completes
4. **Different global context**: Chunk may be executing in a different scope

---

## Known Issues & Limitations

### Issue #1: Polyfill Timing
**Problem**: Inline `<script>` in `<head>` may not block module loading in production
**Impact**: Query chunk loads before globals are set
**Workaround Needed**: Move polyfill to external file loaded synchronously

### Issue #2: Vite Module Preloading
**Problem**: `<link rel="modulepreload">` starts chunk downloads early
**Impact**: Chunks may execute out of order
**Possible Fix**: Disable preloading (performance hit)

### Issue #3: Different Global Context
**Problem**: Web Workers or isolated contexts may have different `globalThis`
**Impact**: Polyfill doesn't apply to all execution contexts
**Detection Needed**: Check if query chunk runs in worker

### Issue #4: Tree Shaking Side Effects
**Problem**: Vite may remove "unused" polyfill code
**Impact**: Polyfill doesn't execute in optimized build
**Verification Needed**: Check production bundle for polyfill code

---

## Next Steps & Advanced Troubleshooting

### Step 1: Verify Polyfill Execution Order

Add this to the TOP of `index.html` `<head>` (before everything):

```html
<script>
  console.log('[EARLIEST] Polyfill starting at:', Date.now());
  window.__POLYFILL_START__ = Date.now();
</script>
```

And in the polyfill script, add:
```javascript
console.log('[Polyfill] Completed at:', Date.now(),
            'Delta:', Date.now() - window.__POLYFILL_START__);
```

**What to check in production**:
- Does `[EARLIEST]` log appear first?
- Is polyfill completing before `query-*.js` loads?

---

### Step 2: Add Entry Point Protection

**File**: `src/main.tsx` (VERY TOP, line 1)

```typescript
// CRITICAL: Emergency fetch API protection at entry point
if (typeof globalThis !== 'undefined') {
  if (!globalThis.Request && typeof Request !== 'undefined') {
    globalThis.Request = Request;
  }
  if (!globalThis.Response && typeof Response !== 'undefined') {
    globalThis.Response = Response;
  }
  if (!globalThis.Headers && typeof Headers !== 'undefined') {
    globalThis.Headers = Headers;
  }
  if (!globalThis.fetch && typeof fetch !== 'undefined') {
    globalThis.fetch = fetch;
  }
  console.log('[main.tsx] Emergency polyfill applied');
}

// Rest of imports...
import React from 'react';
```

**Why this might work**: Runs INSIDE the module context where chunks execute

---

### Step 3: Disable Vite Module Preloading

**File**: `vite.config.ts`

```typescript
build: {
  // ... existing config
  modulePreload: false, // Disable aggressive preloading
  // This forces sequential loading but hurts performance
}
```

**Trade-off**: Slower initial load, but ensures proper execution order

---

### Step 4: External Fetch API Polyfill (Last Resort)

**Option A**: Use a proven polyfill library:

```bash
npm install whatwg-fetch
```

**File**: `src/main.tsx` (line 1)
```typescript
import 'whatwg-fetch'; // Comprehensive polyfill
```

**Option B**: Use CDN polyfill in `index.html` (line 3):
```html
<script src="https://cdn.jsdelivr.net/npm/whatwg-fetch@3.6.20/dist/fetch.umd.js"
        crossorigin="anonymous"
        integrity="sha384-..."
        defer></script>
```

**Why this might work**: External polyfills load synchronously and block parser

---

### Step 5: Patch Axios Adapter

**File**: Create `src/utils/axios-fetch-patch.ts`

```typescript
// Emergency patch for axios fetch adapter
import axios from 'axios';

// Ensure axios uses XMLHttpRequest adapter instead of fetch
if (typeof XMLHttpRequest !== 'undefined') {
  axios.defaults.adapter = 'xhr';
  console.log('[Axios Patch] Forced XMLHttpRequest adapter');
}

export default axios;
```

**Usage**: Import this patched axios everywhere instead of base axios

**Why this works**: Bypasses fetch API completely, uses XHR

---

### Step 6: Debug Production Build Locally

**Steps**:
1. Build production bundle:
   ```bash
   npm run build
   ```

2. Serve with production headers:
   ```bash
   npx serve dist -l 3001
   ```

3. Open Chrome DevTools → Sources → Check execution order:
   - Set breakpoint in `index.html` polyfill
   - Set breakpoint in `query-*.js` (search for "Request")
   - See which executes first

4. Check console for polyfill logs:
   - `[Pre-Chunk Fix]` messages
   - `[Polyfill] Completed at:` timestamp

**Expected**: Polyfill should complete before query chunk initializes

---

### Step 7: Vercel-Specific Investigation

**Hypothesis**: Vercel's edge network may modify or cache bundles differently

**Test**:
1. Deploy to a different host (Netlify, Cloudflare Pages)
2. If it works elsewhere → Vercel-specific issue
3. If it fails everywhere → Bundle configuration issue

**Vercel Edge Config to try** (vercel.json):
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

---

## Recommended Solution Priority

### 🥇 **Highest Priority** - Try First:

**Step 2: Add Entry Point Protection** in `src/main.tsx`
- ✅ Simplest to implement
- ✅ Executes in same context as failing chunk
- ✅ No performance impact
- ⚠️ May still have timing issue

---

### 🥈 **High Priority** - If Step 2 Fails:

**Step 5: Patch Axios Adapter** to use XHR
- ✅ Completely bypasses fetch API
- ✅ Proven to work in all browsers
- ✅ No polyfill needed
- ⚠️ Slightly different behavior than fetch

---

### 🥉 **Medium Priority** - If Desperate:

**Step 3: Disable Module Preloading**
- ✅ Guarantees execution order
- ✅ Should fix race condition
- ❌ Performance degradation (~500ms slower load)

---

### 🏅 **Last Resort** - If Nothing Works:

**Step 4: External Polyfill Library** (whatwg-fetch)
- ✅ Industry-standard solution
- ✅ Handles all edge cases
- ❌ Adds 10KB to bundle
- ❌ Admits defeat to a solved problem

---

## Testing Checklist

After implementing any fix, verify:

- [ ] **Development**: `npm run dev` - Should work (already does)
- [ ] **Local Production**: `npm run build && npm run preview` - Should work (already does)
- [ ] **Production Bundle Analysis**:
  ```bash
  npm run build
  grep -r "Request" dist/js/query-*.js
  # Check if destructuring is present
  ```
- [ ] **Vercel Deployment**:
  - [ ] Push to GitHub
  - [ ] Check Vercel build logs for errors
  - [ ] Test deployed URL in Chrome
  - [ ] Test deployed URL in Firefox
  - [ ] Test deployed URL in Safari
  - [ ] Check browser console for polyfill logs
- [ ] **Error Monitoring**:
  - [ ] No console errors on initial load
  - [ ] API calls work (check Network tab)
  - [ ] React Query devtools show queries executing

---

## Additional Debugging Commands

### Check Production Bundle for Polyfill Code:
```bash
cd dist
grep -r "Pre-Chunk Fix" .
# Should find code in index.html
```

### Check Query Chunk for Destructuring:
```bash
cd dist/js
grep -r "Request.*Response.*Headers" query-*.js
# Shows if destructuring is still present
```

### Verify Global Definitions Were Applied:
```bash
grep -r "globalThis.Request\|global.Request" dist/js/*.js | head -20
# Should show replaced references
```

### Test Polyfill in Browser Console:
```javascript
// Open production site, paste in console:
console.log({
  Request: typeof Request,
  Response: typeof Response,
  Headers: typeof Headers,
  fetch: typeof fetch,
  global: typeof global,
  globalThis: typeof globalThis,
  windowGlobal: typeof window.global
});

// Should show all as "function" or "object"
```

---

## Success Criteria

Fix is considered successful when:

1. ✅ No console errors on Vercel production deployment
2. ✅ `query-*.js` chunk loads without destructuring error
3. ✅ API calls execute successfully (check Network tab)
4. ✅ React Query initializes properly
5. ✅ Application loads and functions normally
6. ✅ Polyfill logs appear in correct order in console

---

## Related Files & Line Numbers

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | 93-308 | Pre-chunk polyfill script |
| `vite.config.ts` | 118 | Sourcemap configuration |
| `vite.config.ts` | 120 | Minification setting |
| `vite.config.ts` | 244-262 | Global definitions |
| `src/services/api.ts` | 1-42 | Axios configuration |
| `package.json` | 45 | axios dependency |
| `package.json` | 41 | @tanstack/react-query dependency |

---

## References & Documentation

- [Axios Issue #5622](https://github.com/axios/axios/issues/5622) - Similar destructuring errors
- [Vite Module Preload Docs](https://vitejs.dev/guide/features.html#preload-directives)
- [MDN: Making Properties Enumerable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Enumerability_and_ownership_of_properties)
- [Fetch API Polyfill (whatwg-fetch)](https://github.com/github/fetch)

---

## Conclusion

This is a **race condition** between:
1. Polyfill execution (setting up globals)
2. Chunk loading (using globals)

**Root cause**: Production build's parallel chunk loading bypasses polyfill timing

**Most likely fix**: Entry point protection (Step 2) or XHR adapter (Step 5)

**Nuclear option**: External polyfill library (Step 4)

---

**Last Updated**: September 30, 2025
**Next Review**: After implementing Step 2 (Entry Point Protection)
**Status**: ⚠️ **AWAITING FIX IMPLEMENTATION**