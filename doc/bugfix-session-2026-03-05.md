# Bug Fix Session — 2026-03-05

## Overview

This session fixed three interconnected frontend bugs that all presented as "blank screen" or "invisible content" issues. Changes were made exclusively in the frontend (`e:/coding/gema/frontend/src`).

---

## Bug 1 — Initial Load Blank Screen (Auth Spinner Stuck Forever)

### Symptom
On app load, the loading spinner would persist indefinitely. The app would never show any content. Only a hard refresh (`Ctrl+Shift+R`) would recover.

### Root Cause
The authentication initialization in `AuthContext.tsx` had `isInitialized` in its `useEffect` dependency array:

```ts
// BEFORE (broken)
useEffect(() => {
  const initializeAuth = async () => {
    if (isInitialized) return; // ← skips if already true!
    await dispatch(getCurrentUser());
  };
  initializeAuth();
}, [dispatch, isInitialized]); // ← isInitialized as dependency
```

When `redux-persist` rehydrated the Redux store from `localStorage`, it restored the previous session's `isInitialized: true`. On mount, the effect ran and immediately returned because `isInitialized` was already `true` — **skipping the session verification entirely**. If the cookies had expired since the last session, the app thought it was initialized but had no valid auth state → blank content or 401 errors everywhere.

Additionally, in React StrictMode, effects are double-invoked, causing `getCurrentUser` to fire twice simultaneously (race condition).

### Fix

**File:** `frontend/src/contexts/AuthContext.tsx`

Replaced the `isInitialized` dependency with a `useRef` guard. The ref ensures the session check runs **exactly once per mount**, regardless of what `redux-persist` rehydrated:

```ts
// AFTER (fixed)
const hasInitialized = useRef(false);

useEffect(() => {
  if (hasInitialized.current) return; // prevents double-fire in StrictMode
  hasInitialized.current = true;

  const initializeAuth = async () => {
    await dispatch(getCurrentUser()); // always verify session on mount
  };
  initializeAuth();
}, [dispatch]); // ← isInitialized intentionally removed
```

### Why This Works
- Session is always verified against the server on every app load
- Redux-persist's cached `isInitialized: true` no longer causes the check to be skipped
- The ref guard prevents StrictMode's double-invocation from firing two parallel requests

---

## Bug 2 — HMR Fast Refresh Warnings (Vite Dev Experience)

### Symptom
Every time a context file changed, the Vite dev server logged:
```
hmr invalidate /src/contexts/AuthContext.tsx
Could not Fast Refresh ("useAuthContext" export is incompatible)

hmr invalidate /src/main.tsx
Could not Fast Refresh ("true" export is incompatible)
```

These warnings caused full page reloads instead of Hot Module Replacement, slowing down development.

### Root Cause

**Warning 1 — `useAuthContext` incompatible:**
Vite's Fast Refresh requires `.tsx` files to export **only React components**. `AuthContext.tsx` exported both `AuthProvider` (a component) and `useAuthContext` (a hook). Mixing component and non-component exports in the same `.tsx` file breaks Fast Refresh.

**Warning 2 — `"true"` export incompatible:**
In `main.tsx`, this inline conditional in JSX:
```tsx
{import.meta.env.DEV && (
  <Suspense fallback={null}>
    <ReactQueryDevtools />
  </Suspense>
)}
```
caused Vite to generate a module-level export named `"true"` (the evaluated `DEV` boolean), which broke Fast Refresh for the entire `main.tsx` module.

### Fix

**Files Changed:**

#### `AuthContext.tsx` / `AnimationsContext.tsx` → Split into 3 files each

| File | Exports | Fast Refresh? |
|------|---------|---------------|
| `contexts/authContextDef.ts` | `AuthContext` object + `AuthContextType` | ✅ `.ts` file — ignored |
| `contexts/AuthContext.tsx` | `AuthProvider` component only | ✅ only components |
| `hooks/useAuthContext.ts` | `useAuthContext` hook only | ✅ `.ts` file — ignored |

Same split applied to `AnimationsContext`:
- `contexts/animationsContextDef.ts`
- `contexts/AnimationsContext.tsx`
- `hooks/useAnimationsEnabled.ts`

#### `main.tsx` — Extract `DevTools` component

```tsx
// BEFORE (broken)
{import.meta.env.DEV && <Suspense><ReactQueryDevtools /></Suspense>}

// AFTER (fixed)
const DevTools: React.FC = () => {
  if (!import.meta.env.DEV) return null;
  return <Suspense fallback={null}><ReactQueryDevtools initialIsOpen={false} /></Suspense>;
};
// In render:
<DevTools />
```

#### Updated import paths in:
- `hooks/useAuth.ts` → `import { useAuthContext } from '@/hooks/useAuthContext'`
- `pages/EventDetailPage.tsx` → `import { useAuthContext } from '@/hooks/useAuthContext'`
- `components/animations/MotionAnimations.tsx` → `import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled'`
- `components/client/ReviewSubmissionForm.tsx` → `import { useAuthContext } from '@/hooks/useAuthContext'`

---

## Bug 3 — Navigation Blank Screen (Switching Between Pages)

### Symptom
Navigating from any page to another (e.g., `/faq` → `/blog`) would cause the destination page to show a completely blank content area. The browser DevTools confirmed the DOM elements existed but had empty text content or zero opacity. A manual refresh (`Ctrl+R`) would restore the content.

### Root Cause — Part A: `AnimatePresence` + `React.lazy` Race Condition

**File:** `frontend/src/components/layout/Layout.tsx`

The route transition animation in Layout was configured as:
```tsx
<AnimatePresence mode="wait" initial={false}>
  <motion.div
    key={location.pathname}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    {children || <Outlet />}
  </motion.div>
</AnimatePresence>
```

`mode="wait"` means AnimatePresence **waits for the exit animation to complete** before allowing the new component to mount. All pages are loaded with `React.lazy`, which triggers React's `Suspense` during navigation.

Timeline of the bug:
1. User navigates to `/blog`
2. Old page's `motion.div` plays exit animation (`opacity: 1 → 0`)
3. `mode="wait"` holds: new page cannot mount yet
4. Once exit completes, new `motion.div` mounts with `initial={{ opacity: 0 }}`
5. New lazy component (BlogPage) triggers `Suspense` → throws a Promise
6. React's Suspense boundary catches it, renders the loading fallback **instead of** the motion.div's children
7. `animate={{ opacity: 1 }}` never fires because the actual page component is suspended
8. When Suspense resolves, the component renders but the framer-motion lifecycle has already "completed"
9. Result: page stuck at `opacity: 0` → **blank screen**

### Root Cause — Part B: Duplicate `motion.div` in BlogPage

**File:** `frontend/src/pages/static/BlogPage.tsx`

BlogPage had its **own** `motion.div` with `initial={{ opacity: 0 }} animate={{ opacity: 1 }}`:
```tsx
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
  ...blog content...
</motion.div>
```

This created two competing opacity animations: Layout's route transition + BlogPage's own animation. On re-navigation, both would try to animate from 0→1 simultaneously, creating a race where content would intermittently fail to become visible.

### Root Cause — Part C: Data Loss on Remount (BlogPage state reset)

**File:** `frontend/src/pages/static/BlogPage.tsx`

BlogPage used `useState` + `useEffect` for data fetching:
```ts
const [blogs, setBlogs] = useState<Blog[]>([]); // starts empty
useEffect(() => { fetchBlogs(); }, []); // fires after mount
```

Every time the user navigated away and back, `BlogPage` would unmount (clearing all state) then remount with `blogs: []`. During the brief re-fetch period, the page showed empty blog cards. Combined with the animation bug, this made the page appear completely blank.

### Fixes

#### Fix A — `Layout.tsx`: `mode="sync"` + `Suspense` inside `motion.div`

```tsx
// AFTER (fixed)
<AnimatePresence mode="sync" initial={false}>
  <motion.div
    key={location.pathname}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
  >
    <Suspense fallback={<GenericPageSkeleton />}>
      {children || <Outlet />}
    </Suspense>
  </motion.div>
</AnimatePresence>
```

- `mode="sync"`: Enter and exit animations overlap — the new page mounts **immediately** at `opacity: 0` and animates to `opacity: 1`, while the old page exits simultaneously
- `Suspense` is **inside** the `motion.div`: The animation wrapper is mounted instantly, so `animate: opacity: 1` fires right away. The Suspense skeleton shows within an already-visible container while the lazy component loads.

#### Fix B — `BlogPage.tsx`: Remove duplicate `motion.div`

Removed the `motion.div` wrapper — Layout already handles all route transitions. Pages should not add their own route-level animations.

#### Fix C — `BlogPage.tsx`: Replace `useState` with `useQuery`

```ts
// BEFORE — data lost on unmount
const [blogs, setBlogs] = useState<Blog[]>([]);
useEffect(() => { fetchBlogs(); }, []);

// AFTER — data cached across navigations
const { data: blogsData, isLoading } = useQuery({
  queryKey: ['blogs', currentPage, categoryId],
  queryFn: fetchBlogs,
  staleTime: 2 * 60 * 1000,
  placeholderData: (prev) => prev, // ← show previous data while refetching
});
```

`placeholderData: (prev) => prev` is the key: when navigating back to `/blog`, TanStack Query immediately serves the **cached data** from the previous visit while a background refetch validates it. **No blank flash, no loading state on re-visit.**

---

## Summary of All Files Changed

| File | Change Type | Reason |
|------|------------|--------|
| `frontend/src/contexts/AuthContext.tsx` | Modified | Fix auth init stuck spinner; split for HMR Fast Refresh |
| `frontend/src/contexts/authContextDef.ts` | **Created** | Hold AuthContext object in `.ts` file for HMR compatibility |
| `frontend/src/contexts/AnimationsContext.tsx` | Modified | Split for HMR Fast Refresh |
| `frontend/src/contexts/animationsContextDef.ts` | **Created** | Hold AnimationsContext object in `.ts` file for HMR compatibility |
| `frontend/src/hooks/useAuthContext.ts` | **Created** | Standalone hook — separates hook from provider for HMR |
| `frontend/src/hooks/useAnimationsEnabled.ts` | **Created** | Standalone hook — separates hook from provider for HMR |
| `frontend/src/hooks/useAuth.ts` | Modified | Updated import to use `@/hooks/useAuthContext` |
| `frontend/src/main.tsx` | Modified | Extract `DevTools` component to fix HMR "true" export warning |
| `frontend/src/components/layout/Layout.tsx` | Modified | Fix navigation blank screen: `mode="sync"` + Suspense inside motion.div |
| `frontend/src/pages/static/BlogPage.tsx` | Modified | Fix navigation blank screen: remove duplicate motion.div + switch to useQuery |
| `frontend/src/pages/EventDetailPage.tsx` | Modified | Updated import path for `useAuthContext` |
| `frontend/src/components/animations/MotionAnimations.tsx` | Modified | Updated import path for `useAnimationsEnabled` |
| `frontend/src/components/client/ReviewSubmissionForm.tsx` | Modified | Updated import path for `useAuthContext` |

---

## Key Concepts

### Why `mode="wait"` breaks with `React.lazy`
`mode="wait"` tells framer-motion to block the entering element's mount until the exiting element's animation finishes. `React.lazy` uses React's Suspense mechanism which works by throwing a Promise during render. When both happen simultaneously, Suspense intercepts the entering element before framer-motion can animate it — leaving the component permanently at `opacity: 0`.

### Why `useRef` instead of `isInitialized` dependency
React hooks re-run whenever their dependencies change. Adding `isInitialized` to the dependency array meant the effect re-ran when `isInitialized` changed — but the early return meant it would do nothing if `isInitialized` was already `true`. The flaw: `redux-persist` restores `isInitialized: true` synchronously before the effect ever runs, so the guard short-circuits before any server check happens. A `useRef` is stable across renders and doesn't cause re-runs.

### Why `placeholderData` not `keepPreviousData`
`placeholderData: (prev) => prev` is the TanStack Query v5 equivalent of the deprecated `keepPreviousData: true`. It tells the query to immediately show the previous query's data while the new query is loading, preventing any loading flash when the cache key changes (e.g., page number or category filter changes).
