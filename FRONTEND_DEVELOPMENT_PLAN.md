# GEMA Frontend — Professional Development Plan

> Comprehensive UI/UX architecture, component system, state management, and 24-week implementation roadmap.
> **Created:** 2026-04-04 | **Status:** Ready for Implementation

---

## Table of Contents

1. [Current State](#1-current-state)
2. [Target Architecture](#2-target-architecture)
3. [Design System](#3-design-system)
4. [Component Patterns](#4-component-patterns)
5. [State Management](#5-state-management)
6. [API Integration](#6-api-integration)
7. [Performance Optimization](#7-performance-optimization)
8. [Accessibility](#8-accessibility)
9. [Testing Strategy](#9-testing-strategy)
10. [Internationalization](#10-internationalization)
11. [24-Week Timeline](#11-24-week-timeline)
12. [Success Metrics](#12-success-metrics)

---

## 1. Current State

### Frontend Metrics
| Metric | Value | Problem |
|---|---|---|
| App.tsx | 1240+ lines | All routes in one file |
| Component dirs | 27 subdirectories | Mixed taxonomy (type + feature) |
| Redux slices | 19 | Server state should be React Query |
| Data fetching | Redux + React Query + direct API | Inconsistent patterns |
| Bundle size | ~2.8MB | Too large, no code splitting |
| Lighthouse | ~52 | Poor performance |
| TypeScript errors | 60+ | Type safety compromised |

### Current Stack
- React 18 + TypeScript + Vite
- Redux Toolkit (19 slices — most should be React Query)
- React Query (already installed, underutilized)
- Tailwind CSS
- i18next (translations inline in config)
- Firebase + JWT auth
- React Hook Form + Zod validation
- TipTap rich text editor
- Chart.js + Recharts

---

## 2. Target Architecture

### 2.1 Technology Stack

```
CORE
├── React 18+ — UI library
├── TypeScript — Type safety
├── Vite — Build tool
└── React Router v6 — Client-side routing

STATE MANAGEMENT
├── React Query (TanStack Query) — Server state (replaces 16 Redux slices)
├── Zustand — Client state (UI, preferences, notifications)
├── Context API — Theme, auth provider
└── localStorage — Persistence

STYLING
├── Tailwind CSS — Utility-first CSS
├── CSS Modules — Component scoping (where needed)
└── clsx + tailwind-merge — Conditional classes

FORMS & VALIDATION
├── React Hook Form — Form management
├── Zod — Schema validation
└── @hookform/resolvers — Form + Zod integration

HTTP & API
├── Axios — HTTP client with interceptors
├── React Query — Caching, retries, optimistic updates
└── Error boundaries — Graceful error handling

TESTING
├── Vitest — Unit testing (faster than Jest)
├── React Testing Library — Component testing
├── Playwright — E2E testing
└── MSW — API mocking

PERFORMANCE
├── Code splitting — Route-level + component-level
├── Lazy loading — Images, components, routes
├── Bundle analysis — rollup-plugin-visualizer
└── Web Vitals — Core Web Vitals monitoring

DEVELOPMENT
├── ESLint + Prettier — Code quality
├── Storybook — Component development
├── Husky + lint-staged — Pre-commit hooks
└── Figma — Design collaboration
```

### 2.2 Target Folder Structure

```
frontend/src/
├── app/                          # App-level configuration
│   ├── App.tsx                   # Thin (~80 lines)
│   ├── routes/                   # Split by namespace
│   │   ├── public.routes.tsx
│   │   ├── customer.routes.tsx
│   │   ├── vendor.routes.tsx
│   │   ├── teacher.routes.tsx
│   │   ├── student.routes.tsx    # NEW
│   │   ├── parent.routes.tsx     # NEW
│   │   ├── school.routes.tsx     # NEW
│   │   ├── employee.routes.tsx
│   │   ├── admin.routes.tsx
│   │   ├── route-guards.tsx      # ProtectedRoute, RoleRoute
│   │   └── index.tsx
│   ├── providers/                # Provider tree
│   │   ├── AppProviders.tsx
│   │   ├── QueryProvider.tsx
│   │   ├── StoreProvider.tsx
│   │   └── ThemeProvider.tsx
│   └── config/
│       ├── api.config.ts
│       ├── env.ts
│       ├── constants.ts
│       ├── firebase.config.ts
│       └── queryClient.ts
│
├── features/                     # Feature modules (per domain)
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   ├── events/
│   ├── bookings/
│   ├── orders/
│   ├── payments/
│   ├── tickets/
│   ├── reviews/
│   ├── vendors/
│   ├── teachers/
│   ├── students/                 # NEW
│   ├── parents/                  # NEW
│   ├── schools/                  # NEW
│   ├── certificates/             # NEW
│   ├── lms/                      # NEW
│   ├── analytics/
│   └── content/
│
├── shared/                       # Shared across features
│   ├── components/
│   │   ├── ui/                   # Atomic UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── index.ts
│   │   ├── layout/               # Layout shells
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── MainLayout.tsx
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── VendorLayout.tsx
│   │   │   ├── StudentLayout.tsx
│   │   │   └── index.ts
│   │   ├── forms/                # Form wrappers
│   │   └── common/               # Generic components
│   │       ├── ErrorBoundary.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── EmptyState.tsx
│   │       └── index.ts
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   ├── useClickOutside.ts
│   │   ├── useLocalStorage.ts
│   │   ├── usePagination.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts         # Axios instance + interceptors
│   │   │   ├── endpoints.ts      # API URL constants
│   │   │   └── handlers.ts       # Error handling
│   │   └── index.ts
│   ├── utils/
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   ├── dateHelpers.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── api.types.ts
│   │   └── common.types.ts
│   ├── styles/
│   │   ├── variables.css         # Design tokens (CSS custom properties)
│   │   ├── typography.css
│   │   └── global.css
│   ├── contexts/
│   │   ├── ThemeContext.tsx
│   │   └── NotificationContext.tsx
│   └── i18n/
│       ├── locales/
│       │   ├── en/
│       │   │   ├── common.json
│       │   │   ├── auth.json
│       │   │   ├── events.json
│       │   │   └── bookings.json
│       │   └── ar/
│       └── i18n.config.ts
│
├── pages/                        # Route-level pages (thin — compose features)
│   ├── public/
│   │   ├── HomePage.tsx
│   │   ├── EventsPage.tsx
│   │   └── EventDetailPage.tsx
│   ├── auth/
│   ├── customer/
│   ├── student/                  # NEW
│   ├── parent/                   # NEW
│   ├── school/                   # NEW
│   ├── vendor/
│   ├── teacher/
│   ├── employee/
│   ├── admin/
│   └── error/
│
├── store/                        # Zustand — ONLY client state
│   ├── uiStore.ts               # Modals, sidebar, theme
│   ├── favoritesStore.ts        # User wishlist
│   ├── settingsStore.ts         # Client preferences
│   └── index.ts
│
└── tests/
    ├── unit/
    ├── integration/
    ├── e2e/
    └── setup.ts
```

### 2.3 Multi-App Route Namespaces

| Namespace | Path | Roles | Layout |
|---|---|---|---|
| Public | `/` | All | MainLayout |
| Customer | `/customer/*` | customer | MainLayout |
| Student | `/student/*` | student | StudentLayout |
| Parent | `/parent/*` | parent | ParentLayout |
| Vendor | `/vendor/*` | vendor | VendorLayout |
| Teacher | `/teacher/*` | teacher | TeacherLayout |
| School | `/school/*` | school | SchoolLayout |
| Employee | `/employee/*` | employee | EmployeeLayout |
| Admin | `/admin/*` | admin + sub-roles | AdminLayout |

---

## 3. Design System

### 3.1 Design Tokens

#### Colors
```
PRIMARY
├── Primary: #007BFF (actions, links, focus)
│   ├── Primary Dark: #0056B3
│   └── Primary Light: #E7F1FF
│
SEMANTIC
├── Success: #28A745
├── Warning: #FFC107
├── Danger: #DC3545
└── Info: #17A2B8

NEUTRAL
├── White: #FFFFFF
├── Black: #000000
├── Grays: #F8F9FA → #212529 (10 shades)
└── Dark Mode Background: #1A1A1A
```

#### Typography
```
FONT: 'Segoe UI', 'Roboto', system fonts
SIZES: Display(96px) → H1(48px) → H2(40px) → H3(32px) → H4(24px) → Title(20px) → Body(14px) → Small(12px)
WEIGHTS: Regular(400), Medium(500), Semi-Bold(600), Bold(700)
```

#### Spacing (8px base)
```
XS: 4px | SM: 8px | MD: 16px | LG: 24px | XL: 32px | 2XL: 48px | 3XL: 64px
```

#### Shadows
```
Shadow 1: 0 1px 2px rgba(0,0,0,0.05)
Shadow 2: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)
Shadow 3: 0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)
Shadow 4: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)
Shadow 5: 0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)
```

#### Border Radius
```
None: 0 | XS: 2px | SM: 4px | MD: 8px | LG: 12px | XL: 16px | Full: 9999px
```

### 3.2 Breakpoints
```
sm: 640px   (mobile)
md: 768px   (tablet)
lg: 1024px  (small laptop)
xl: 1280px  (laptop)
2xl: 1536px (large screen)
```

---

## 4. Component Patterns

### 4.1 Atomic Components
Small, reusable, single-responsibility UI building blocks.

```tsx
// shared/components/ui/Button.tsx
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'text';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export function Button({ variant = 'primary', size = 'md', isLoading, fullWidth, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        isLoading && 'opacity-70 cursor-not-allowed',
      )}
      disabled={props.disabled || isLoading}
      {...props}
    >
      {isLoading && <Spinner className="mr-2" />}
      {children}
    </button>
  );
}
```

### 4.2 Container/Presentational Pattern
Separate data logic from UI rendering.

```tsx
// Container (data fetching)
export function MyBookingsPage() {
  const { data, isLoading, error } = useBookings();
  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorMessage error={error.message} />;
  return <BookingsView bookings={data} />;
}

// Presentational (pure UI)
export function BookingsView({ bookings }: { bookings: Booking[] }) {
  if (!bookings.length) return <EmptyState title="No bookings yet" />;
  return <div className="grid gap-4">{bookings.map(b => <BookingCard key={b.id} booking={b} />)}</div>;
}
```

### 4.3 Custom Hooks Pattern
Extract and reuse component logic.

```tsx
// features/events/hooks/useEventFilters.ts
export function useEventFilters() {
  const [filters, setFilters] = useState<EventFilters>({ category: '', city: '', searchQuery: '' });
  const updateFilter = useCallback((key, value) => setFilters(prev => ({ ...prev, [key]: value })), []);
  const resetFilters = useCallback(() => setFilters(defaultFilters), []);
  return { filters, updateFilter, resetFilters };
}
```

---

## 5. State Management

### 5.1 Server State → React Query (replaces 16 Redux slices)

```tsx
// features/events/hooks/useEvents.ts
export function useEvents(filters = {}) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => eventsService.getEvents(filters),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => eventsService.createEvent(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });
}
```

**Redux slices to REMOVE (replace with React Query):**
- eventsSlice, categoriesSlice, bookingsSlice, vendorSlice, adminSlice
- couponsSlice, affiliatesSlice, paymentsSlice, ticketsSlice
- blogSlice, registrationsSlice, mediaSlice, ordersSlice, reviewsSlice
- analyticsSlice, settingsSlice (server-state portions)

**Redux slices to KEEP (client state only):**
- uiSlice → Zustand uiStore (modals, sidebar, theme)
- favoritesSlice → Zustand favoritesStore (wishlist)
- settingsSlice → Zustand settingsStore (client preferences)

### 5.2 Client State → Zustand

```tsx
// store/uiStore.ts
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      modals: {},
      openModal: (name) => set((s) => ({ modals: { ...s.modals, [name]: true } })),
      closeModal: (name) => set((s) => ({ modals: { ...s.modals, [name]: false } })),
      sidebarOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      theme: 'light',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
    }),
    { name: 'gema-ui-store', partialize: (s) => ({ theme: s.theme }) },
  ),
);
```

---

## 6. API Integration

### 6.1 Axios Client with Interceptors

```tsx
// shared/services/api/client.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
  timeout: 30000,
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      // Redirect to login, clear session
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
```

### 6.2 Feature Service Pattern

```tsx
// features/events/services/events.service.ts
export const eventsService = {
  getEvents: (params) => api.get('/events', { params }),
  getEvent: (id) => api.get(`/events/${id}`),
  createEvent: (data) => api.post('/events', data),
  updateEvent: (id, data) => api.put(`/events/${id}`, data),
  deleteEvent: (id) => api.delete(`/events/${id}`),
};
```

---

## 7. Performance Optimization

### 7.1 Code Splitting
```tsx
// app/routes/vendor.routes.tsx
const VendorDashboard = lazy(() => import('@pages/vendor/DashboardPage'));
const EventsManagement = lazy(() => import('@pages/vendor/EventsPage'));

export const vendorRoutes = {
  element: <Suspense fallback={<PageSkeleton />}><VendorLayout /></Suspense>,
  children: [
    { index: true, element: <VendorDashboard /> },
    { path: 'events', element: <EventsManagement /> },
  ],
};
```

### 7.2 Bundle Targets
| Metric | Current | Target |
|---|---|---|
| Total bundle | ~2.8MB | <600KB |
| Initial JS | ~1.2MB | <200KB |
| Vendor chunk | ~800KB | <300KB |
| CSS | ~150KB | <50KB |

### 7.3 Vite Build Optimization
```ts
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'form-vendor': ['react-hook-form', 'zod'],
        'query-vendor': ['@tanstack/react-query'],
        'chart-vendor': ['chart.js', 'react-chartjs-2', 'recharts'],
      },
    },
  },
}
```

---

## 8. Accessibility

- WCAG 2.1 AA compliance
- All interactive elements keyboard accessible
- Focus indicators (3px outline)
- Color contrast ≥ 4.5:1 for text
- Alt text for all images
- ARIA labels for icon buttons
- Skip links for main content
- Screen reader testing (NVDA, JAWS)

---

## 9. Testing Strategy

### Test Pyramid
```
         E2E (10%) — Critical user workflows
    Integration (30%) — Component interactions
  Unit (60%) — Functions, hooks, utilities
```

### Tools
- **Vitest** — Unit testing
- **React Testing Library** — Component testing
- **Playwright** — E2E testing
- **MSW** — API mocking
- **Target:** 80%+ coverage

---

## 10. Internationalization

- i18next with externalized JSON files
- Languages: English (EN), Arabic (AR)
- RTL support for Arabic
- Language detection from browser/locale
- Translation files per feature domain

```
shared/i18n/locales/
├── en/
│   ├── common.json
│   ├── auth.json
│   ├── events.json
│   ├── bookings.json
│   └── [feature].json
└── ar/
    └── [same structure]
```

---

## 11. 24-Week Timeline

### Phase 1: Design System & Setup (Weeks 1-6)
| Week | Deliverables |
|---|---|
| 1-2 | Design tokens, component specifications, Figma setup |
| 3 | Base UI components (Button, Input, Card, Modal, Badge, Table) |
| 4 | Layout components (Header, Sidebar, Footer, MainLayout, AdminLayout) |
| 5 | Storybook setup, component documentation |
| 6 | Environment setup, Vite config, ESLint/Prettier, path aliases |

### Phase 2: Core Architecture (Weeks 7-10)
| Week | Deliverables |
|---|---|
| 7 | Split App.tsx into route config files, folder reorganization |
| 8 | Remove Redux slices, set up React Query for server state |
| 9 | Zustand store setup (uiStore, favoritesStore, settingsStore) |
| 10 | Context providers (Theme, Auth, Notification), API client |

### Phase 3: Feature Modules (Weeks 11-18)
| Week | Deliverables |
|---|---|
| 11-12 | Auth module (login, register, password reset, phone verification) |
| 13-14 | Events module (listing, detail, search, filters, vendor events) |
| 15-16 | Bookings + Orders modules (booking flow, checkout, order history) |
| 17-18 | New portals: Student, Parent, School (dashboards, enrollments) |

### Phase 4: Optimization & Polish (Weeks 19-22)
| Week | Deliverables |
|---|---|
| 19 | Code splitting, lazy loading, bundle optimization |
| 20 | Performance optimization (image optimization, caching, memoization) |
| 21 | i18n externalization, RTL support for Arabic |
| 22 | Dark mode, responsive design polish, accessibility audit |

### Phase 5: Testing & Launch (Weeks 23-24)
| Week | Deliverables |
|---|---|
| 23 | Unit tests, integration tests, E2E tests, bug fixes |
| 24 | Deployment preparation, documentation, go-live |

---

## 12. Success Metrics

### Technical
| Metric | Current | Target | Timeline |
|---|---|---|---|
| TypeScript Errors | 60+ | 0 | Week 6 |
| Bundle Size | 2.8MB | <600KB | Week 15 |
| Lighthouse Score | 52 | >85 | Week 15 |
| TTI | 8.2s | <3s | Week 15 |
| FCP | 3.1s | <1.5s | Week 15 |
| Test Coverage | <10% | 80%+ | Week 22 |
| App.tsx lines | 1240+ | <80 | Week 7 |
| Redux slices | 19 | 3 (Zustand) | Week 9 |

### Product
| Metric | Target |
|---|---|
| Page Load Time | <3s |
| User Satisfaction | >4.5/5 |
| Bug Reports | <10/week |
| Feature Completion | 100% on time |
| Code Review Time | <24hrs |

---

## Frontend Rules & Conventions

1. **Pages are thin** — compose feature components, no business logic
2. **Feature components own their data** — use React Query hooks, not Redux
3. **Zustand for client state only** — UI, preferences, notifications
4. **React Query for server state** — all API data goes through React Query
5. **Custom hooks for reusable logic** — extract from components
6. **Atomic components in shared/ui/** — Button, Input, Card, etc.
7. **Layout components in shared/layout/** — Header, Sidebar, page shells
8. **Mobile-first responsive** — use Tailwind responsive prefixes
9. **Accessibility first** — keyboard nav, ARIA, contrast ratios
10. **Externalize i18n** — no inline translation strings
11. **Lazy load routes** — `React.lazy()` + `Suspense` for all route components
12. **Type everything** — no `any`, use proper TypeScript interfaces
13. **One feature per PR** — extract, test, merge, repeat
14. **No breaking changes** — all routes must work after restructure
