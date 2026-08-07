# GEMA — Unified Education & Event Platform (MERN)

## Purpose
Central full-stack MERN application for the GEMA ecosystem. Manages events, courses, examinations, certificates, students, schools, and authentication. Firebase + JWT auth. This is the data backbone that all WP plugins and frontend apps call.

## Stack
- **Backend:** Node.js 20 + Express + TypeScript, MongoDB 8 (Mongoose), Redis, BullMQ
- **Frontend:** React 18 + TypeScript, Vite, Zustand, React Query, Tailwind CSS
- **Real-time:** Socket.io, WebRTC (proctoring)
- **Entry:** `backend/dist/server.js` (compiled), source in `backend/src/`
- **Auth:** JWT (httpOnly cookies) + Firebase + string-role authorization (`authorize([...])`) — see Role System below

## Architecture
**Classic layered app, not a modular monolith.** No `backend/src/modules/` (except a single
`certificates` folder), no `shared/` tree, no `Permission` enum, no `requirePermission`, no
`scopeToOwner`. Everything lives in flat, type-grouped top-level folders. Verify counts with
`find backend/src -name '*.ts' | xargs wc -l` before trusting anything below — this doc drifts.

```
backend/src/  (~161k LOC)
├── controllers/    # ~75 files — auth.controller.ts is 2,300+ lines, no service layer
├── routes/         # ~82 files
├── services/       # ~49 files
├── models/         # ~69 Mongoose models
├── middleware/      # ~13 files (auth, error, validation, upload, rateLimiter, timeout...)
├── validators/      # ~29 files (express-validator schemas) — coverage is partial, not universal
├── utils/           # ~34 files (otp, dateHelpers, phoneUtils, css utils...)
├── config/          # ~15 files (env, database, redis, queue, logger, jwt, cloudinary...)
├── workers/         # ~12 BullMQ workers (email, qr, payout, etc.)
├── modules/         # ONLY `certificates/` — not a pattern, an outlier
├── tests/           # ~29 files — mostly integration/unit, minimal security-specific coverage
└── server.ts        # NOT thin — inline helmet/CORS/rate-limiter/sanitizer config
```

## Role System (7 roles, string-based authorization)

Actual `UserRole` enum (`models/User.ts`):
```
admin | customer | vendor | employee | teacher | parent | student
```

- **No RBAC permission system.** Authorization is ~196 call sites of
  `authorize(["admin", "vendor", ...])` scattered across ~58 route files — string-role checks,
  not permission-based. A few sites reference a phantom `"superadmin"` role that isn't in the
  enum (fails closed, but is dead/misleading code).
- **No admin sub-roles, no scope restrictions, no permission expiry.**
- **Auth middleware chain in practice:** `authenticate` → `authorize([...roles])`. There is no
  `scopeToOwner` — per-resource ownership checks are hand-rolled per controller (an IDOR risk
  surface — see security audit plan if present under `~/.claude/plans/`).
- **No role switching.** `POST /api/auth/switch-role` and `GET /api/auth/available-roles` do
  not exist. A user has exactly one role for the life of their account.

If you are about to write code against `Permission.X`, `requirePermission(...)`, or
`switch-role`, stop — grep first. These do not exist yet.

## Key Directories
```
gema/
├── backend/
│   ├── src/
│   │   ├── controllers/ routes/ services/ models/  # flat, layered (see Architecture)
│   │   ├── middleware/ validators/ utils/ config/
│   │   └── server.ts           # inline app setup, not a thin bootstrap
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

**These describe a target/aspirational architecture (39-61 modules, 14 roles, 50+ permission
RBAC) that was never built.** The live backend is the flat layered structure described above
under Architecture and Role System. Treat this table as a roadmap of intent, not current state
— always verify against actual source before relying on a claim from one of these docs.

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

**Aspirational (see Planning Documents caveat above) — not current state.** The live backend
has no module boundaries; it has ~69 Mongoose models in one flat `models/` directory and no
module/feature grouping at all.

| Category | Modules (target) | Models (target) |
|---|---|---|
| Core (migrated) | 24 | ~30 |
| New roles | 3 | 4 |
| LMS | 1 | 7 |
| Examinations | 1 | 8 |
| Certificates | 1 | 4 |
| Student Portal | 1 | 1 |
| ERP | 4 | 12 |
| Additional features | 22 | 36 |
| **Total (target)** | **61** | **~120** |

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
**Aspirational — the live code does not follow all of these yet** (e.g. `auth.controller.ts`
is 2,300+ lines with no service layer; there is no repository layer at all; DB queries happen
directly in controllers/services via Mongoose throughout). Apply these to new/touched code;
don't assume existing files already comply.
- **Controllers stay thin** — max 200 lines, delegate to services
- **Business logic in Services** — no Express/Mongoose coupling
- **Validate at boundaries** — express-validator on input, not internally
- **Use `UserRole` enum for role checks** — `authorize([UserRole.ADMIN])` not `authorize(["admin"])`
  is the real pattern today; there is no permission system to migrate to yet (see Role System)
- **No breaking changes** — all routes must work after any refactor
- **No duplicate models** — each model exists in exactly one place under `models/`

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
- **Backend is NOT modularized.** The 39/61-module structure described in the Planning
  Documents was never built — see Architecture and Module Count above. `npm run typecheck`
  does currently pass with 0 errors as of 2026-08-07; re-verify before relying on that.
- **Frontend migration pending:** See `FRONTEND_DEVELOPMENT_PLAN.md` for 24-week roadmap
- **GitHub token:** Set in `.opencode.json` — only `backup` branch can be updated (pre-push hook protects other branches)
