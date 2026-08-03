# GEMA — Unified Education & Event Platform (MERN)

## Purpose
Central full-stack MERN application for the GEMA ecosystem. Manages events, courses, examinations, certificates, students, schools, and authentication. Firebase + JWT auth. This is the data backbone that all WP plugins and frontend apps call.

## Stack
- **Backend:** Node.js 20 + Express + TypeScript, MongoDB 8 (Mongoose), Redis, BullMQ
- **Frontend:** React 18 + TypeScript, Vite, Zustand, React Query, Tailwind CSS
- **Real-time:** Socket.io, WebRTC (proctoring)
- **Entry:** `backend/dist/server.js` (compiled), source in `backend/src/`
- **Auth:** JWT (httpOnly cookies) + Firebase + RBAC permission system

## Architecture
**Modular Monolith** — organized by domain modules under `backend/src/modules/`.
Each module owns its controller, service, repository, routes, validators, models, types.

```
backend/src/
├── modules/                    # 39 domain modules (315 files)
│   ├── auth/                   # Registration, login, JWT, Firebase, role switching
│   ├── users/                  # User model, admin user management
│   ├── events/                 # Event CRUD, vendor/teacher/school events
│   ├── bookings/               # Booking flow, seat reservation
│   ├── orders/                 # Order management, payment routing
│   ├── payments/               # Stripe, refunds, webhooks
│   ├── tickets/                # Ticket generation, QR codes
│   ├── vendors/                # Vendor dashboard, Stripe Connect
│   ├── teachers/               # Teacher profile, payouts, subscriptions
│   ├── schools/                # School management, invites
│   ├── students/               # Student profiles, enrollment
│   ├── parents/                # Parent profiles, child management
│   ├── employees/              # Vendor + school employees
│   ├── lms/                    # Courses, lessons, quizzes, assignments
│   ├── examinations/           # Online exam system with proctoring
│   ├── certificates/           # Certificate generation, verification
│   ├── student-portal/         # Student/parent portal APIs
│   ├── erp/                    # Finance, HR, inventory, scheduling
│   ├── content/                # Blogs, SEO, reels, banners, popups
│   ├── notifications/          # Email, SMS, push
│   ├── media/                  # File uploads, Cloudinary
│   ├── reviews/                # Review CRUD, flagging
│   ├── affiliates/             # Affiliate tracking
│   ├── commissions/            # Commission calculation
│   ├── payouts/                # Payout processing
│   ├── registrations/          # Event registration
│   ├── checkin/                # Event check-in
│   ├── venues/                 # Venue management
│   ├── coupons/                # Coupon management
│   ├── categories/             # Event/course categories
│   ├── collections/            # Event collections
│   ├── settings/               # System settings
│   ├── analytics/              # Dashboard stats, analytics
│   ├── admin/                  # Cross-cutting admin operations
│   ├── messaging/              # Internal messaging
│   ├── notices/                # Notice board & announcements
│   ├── complaints/             # Grievance system
│   ├── feedback/               # Surveys & feedback
│   ├── calendar/               # Academic calendar
│   ├── audit/                  # Audit log & compliance
│   ├── integrations/           # Webhooks, API keys
│   ├── contact/                # Contact form
│   ├── partnerships/           # Partnership inquiries
│   ├── favorites/              # User favorites
│   ├── search/                 # Search
│   ├── currency/               # Currency conversion
│   └── health/                 # Health check
├── shared/                     # Cross-cutting concerns
│   ├── config/                 # env, database, redis, queue, logger
│   ├── middleware/             # auth, error, validation, security, rateLimiter
│   ├── errors/                 # AppError, error codes
│   ├── types/                  # Cross-domain types
│   ├── utils/                  # Pure helpers (otp, dateHelpers, phoneUtils)
│   ├── permissions/            # RBAC permission system (50+ permissions)
│   └── decorators/             # @Roles(), @CurrentUser()
├── workers/                    # BullMQ workers (email, qr, payout, etc.)
├── scripts/                    # Migrations, seeds, utilities
│   ├── seeds/
│   ├── migrations/
│   └── utilities/
└── server.ts                   # Thin entry point (uses registerModules())
```

## Role System (14 roles + RBAC)

```
Super Admin → Admin → [Moderator, Blog Writer, Support Agent, Content Manager, Finance Manager]
Vendor → Employee [Manager, Scanner, Coordinator, Security]
School → Teacher → Employee [School Staff]
Customer
Student → linked to Parent
Parent → linked to Student(s)
```

- **RBAC:** 50+ granular permissions across 15 domains
- **Admin sub-roles:** Custom permissions, scope restrictions, expiry support
- **Auth middleware:** `authenticate` → `requirePermission(...)` → `scopeToOwner(...)`
- **Role switching:** `POST /api/auth/switch-role`, `GET /api/auth/available-roles`

## Key Directories
```
gema/
├── backend/
│   ├── src/
│   │   ├── modules/            # 39 domain modules (315 files)
│   │   ├── shared/             # Cross-cutting concerns
│   │   ├── models/index.ts     # Barrel re-export from modules/
│   │   ├── routes/index.ts     # Barrel re-export from modules/
│   │   └── server.ts           # Thin entry point
│   └── dist/                   # Compiled output
├── frontend/
│   └── src/
│       ├── app/                # App.tsx (thin), routes/, providers/, config/
│       ├── features/           # Feature modules (events, bookings, payments, etc.)
│       ├── shared/             # Shared components, services, utils, i18n
│       ├── pages/              # Route-level page components
│       └── store/              # Zustand — ONLY client state (ui, favorites, settings)
└── .claude/
    └── mcp/gema-mcp-server/    # Custom MCP server
```

## Integration Dependencies
- **Called by:** chatbot-by-eshaan WP plugin (class-chatbot-mern-api.php)
- **Called by:** Certificate-Generator-v7 WP plugin
- **Called by:** participant-portal WP plugin
- **Calls:** none (it is the data layer)
- **Auth:** Firebase + JWT — WP plugins must pass Firebase tokens or API keys

## API Base URL
Set in WP plugin configs — typically `http://localhost:PORT` in dev.

## Planning Documents

| Document | Purpose |
|---|---|
| `MASTER_OPTIMIZATION_PLAN.md` | **Single source of truth** — architecture, roles, all 61 modules, 120 models, roadmap |
| `AUTH_ROLES_PLATFORM_EXPANSION.md` | Role system (14 roles), RBAC (50+ permissions), admin sub-roles |
| `ARCHITECTURE_IMPROVEMENT_PLAN.md` | Modular monolith structure, migration strategy, repository pattern, DI |
| `FRONTEND_DEVELOPMENT_PLAN.md` | **Frontend plan** — UI/UX, component system, state management, 24-week timeline |
| `PLATFORM_MODULES_DETAILED_PLAN.md` | ERP, LMS, Student Portal, Certificate Generator model details |
| `COMPLETE_LMS_SYSTEM.md` | Full LMS spec (17 models, 80+ endpoints, frontend components) |
| `ONLINE_EXAMINATION_SYSTEM.md` | SpeedExam-style exam platform (8 models, proctoring, anti-cheat) |
| `ADDITIONAL_FEATURES_AND_MODELS.md` | 20 additional features (messaging, transport, library, etc.) |
| `PROJECT_PLAN.md` | Timeline (26 weeks), team allocation, tools, risks, success metrics |
| `FILE_STRUCTURE_IMPROVEMENTS.md` | Workspace-wide file structure migration plan |

## Module Count

| Category | Modules | Models |
|---|---|---|
| Core (migrated) | 24 | ~30 |
| New roles | 3 | 4 |
| LMS | 1 | 7 |
| Examinations | 1 | 8 |
| Certificates | 1 | 4 |
| Student Portal | 1 | 1 |
| ERP | 4 | 12 |
| Additional features | 22 | 36 |
| **Total** | **61** | **~120** |

## Sub-Brain Tasks (use Ollama, not Claude tokens)
- Explain any Express controller or route → `qwen2.5-coder:7b`
- Generate new Express route + controller → `qwen2.5-coder:7b`
- Write JSDoc/TypeDoc → `qwen2.5-coder:7b`
- Analyze API response structure → `deepseek-coder-v2:16b-lite-instruct-q4_K_M`
- Summarize backend architecture → `llama3.1:8b`
- Explain Mongoose model relationships → `qwen2.5-coder:7b`
- Generate React component → `qwen2.5-coder:7b`
- Cross-module integration design → **Claude main brain** (multi-file)

## Local Test-Generation Agent (`tools/local-test-agent/`)
Shell + Ollama pipeline for backend Jest/Supertest test drafts — keeps test writing off Claude
tokens per the sub-brain routing rules above. Suggest → human review → manual copy only; it
never writes into `backend/src/tests/`.

```bash
./tools/local-test-agent/scan-module.sh <module> plan       # test plan, no code
./tools/local-test-agent/scan-module.sh <module> generate   # draft test file
./tools/local-test-agent/check-output.sh <output-file>       # sanity gate before copying
```

- Modules seeded in `module-files.json`: auth, events, admin, vendor, booking, payment, stripe,
  coupon. Unlisted modules fall back to grep discovery over `backend/src`.
- Model by risk: `qwen2.5-coder:7b` for auth/events; `deepseek-coder-v2:16b-lite-instruct-q4_K_M`
  for admin/vendor/booking/payment/stripe (also useful as a second opinion when qwen's draft
  fails review — it's slower on CPU, expect several minutes per call).
- `check-output.sh` hard-fails on forbidden patterns (`server.ts` import, token in response
  body, real Stripe/Mongo/Cloudinary/Nodemailer calls) but a PASS is not a green light to copy
  — it still warns-only on missing DB lifecycle calls and wrong duplicate-email status, both of
  which qwen2.5-coder:7b has hallucinated in practice. Always eyeball the draft against
  `backend/src/tests/integration/auth/auth.test.ts` before copying.
- Full workflow, red-flag checklist, and prompt details: `tools/local-test-agent/README.md`.

## How to Run
```bash
cd backend && npm install && npm run dev   # or npm start for dist
cd frontend && npm install && npm run dev
```

## Backend Rules & Conventions
- **Controllers stay thin** — max 200 lines, delegate to services
- **Business logic in Services** — no Express/Mongoose coupling
- **DB queries in Repositories only** — no direct Mongoose in controllers
- **Validate at boundaries** — express-validator on input, not internally
- **No raw SQL/Mongoose in controllers** — use repository layer
- **Use RBAC permissions** — `requirePermission(Permission.X)` not `authorize(["admin"])`
- **Use enum for roles** — `UserRole.ADMIN` not `"admin"`
- **One module per PR** — extract, test, merge, repeat
- **No breaking changes** — all routes must work after move
- **No duplicate models** — each model exists in ONE module only

## Frontend Rules & Conventions
- **Pages are thin** — compose feature components, no business logic
- **Feature components own their data** — use React Query hooks, not Redux
- **Zustand for client state only** — UI, preferences, notifications
- **React Query for server state** — all API data goes through React Query
- **Custom hooks for reusable logic** — extract from components
- **Atomic components in shared/ui/** — Button, Input, Card, Modal, Badge, Table
- **Layout components in shared/layout/** — Header, Sidebar, page shells
- **Mobile-first responsive** — use Tailwind responsive prefixes
- **Accessibility first** — keyboard nav, ARIA, contrast ratios (WCAG 2.1 AA)
- **Externalize i18n** — no inline translation strings, use JSON files
- **Lazy load routes** — `React.lazy()` + `Suspense` for all route components
- **Type everything** — no `any`, use proper TypeScript interfaces
- **One feature per PR** — extract, test, merge, repeat
- **No breaking changes** — all routes must work after restructure

## Frontend Architecture
```
frontend/src/
├── app/                    # App-level config (routes, providers, config)
│   ├── App.tsx             # Thin (~80 lines)
│   ├── routes/             # Split by namespace (public, customer, student, etc.)
│   ├── providers/          # Provider tree (Query, Store, Theme)
│   └── config/             # API, env, constants, Firebase
├── features/               # Feature modules (auth, events, bookings, etc.)
│   └── <feature>/
│       ├── components/     # Feature-specific components
│       ├── hooks/          # Custom hooks (useEvents, useBookings, etc.)
│       ├── services/       # API service layer
│       ├── types/          # TypeScript types
│       └── index.ts        # Barrel export
├── shared/                 # Shared across features
│   ├── components/
│   │   ├── ui/             # Atomic UI (Button, Input, Card, Modal)
│   │   ├── layout/         # Layout shells (Header, Sidebar, MainLayout)
│   │   ├── forms/          # Form wrappers
│   │   └── common/         # ErrorBoundary, LoadingSpinner, EmptyState
│   ├── hooks/              # useDebounce, useClickOutside, etc.
│   ├── services/api/       # Axios client + interceptors
│   ├── utils/              # Validators, formatters, dateHelpers
│   ├── types/              # API types, common types
│   ├── styles/             # Design tokens (CSS custom properties)
│   ├── contexts/           # Theme, Notification
│   └── i18n/               # Externalized translations (EN, AR)
├── pages/                  # Route-level pages (thin — compose features)
└── store/                  # Zustand — ONLY client state
    ├── uiStore.ts          # Modals, sidebar, theme
    ├── favoritesStore.ts   # User wishlist
    └── settingsStore.ts    # Client preferences
```

## Frontend State Management
| State Type | Tool | Examples |
|---|---|---|
| Server data | React Query | Events, bookings, users, courses |
| UI state | Zustand | Modals, sidebar, theme |
| User prefs | Zustand | Favorites, settings |
| Notifications | Context | Toast, alerts |
| Persistence | localStorage | Theme, language |

**REMOVE:** 16 Redux slices for server state → replace with React Query
**KEEP:** 3 Zustand stores for client state only

## Frontend Target Metrics
| Metric | Current | Target |
|---|---|---|
| App.tsx lines | 1240+ | <80 |
| Bundle size | ~2.8MB | <600KB |
| Lighthouse | ~52 | >85 |
| TTI | 8.2s | <3s |
| Redux slices | 19 | 3 (Zustand) |
| Test coverage | <10% | 80%+ |
| TypeScript errors | 60+ | 0 |

## Notes
- The `gema-mcp-server` in `.claude/mcp/` was originally developed on Windows — build is missing. Needs `npm run build` once source is ported to Linux.
- `.mcp.json` paths have been fixed to Linux paths.
- **Backend migration complete:** 39 modules, 315 files, 0 TypeScript errors
- **Frontend migration pending:** See `FRONTEND_DEVELOPMENT_PLAN.md` for 24-week roadmap
- **GitHub token:** Set in `.opencode.json` — only `backup` branch can be updated (pre-push hook protects other branches)
