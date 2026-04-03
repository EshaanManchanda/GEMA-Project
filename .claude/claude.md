# Project: Gema Event Management Platform

> Prioritize readability. Ask before architectural changes.

## Stack

**Backend:**
- Runtime: Node.js 20.x
- Framework: Express.js 4.18 + TypeScript 5.3
- DB: MongoDB 8.0 (Mongoose ODM) + Redis (ioredis)
- Queue: BullMQ 5.60 for background jobs
- Auth: Firebase Admin SDK + JWT (jsonwebtoken)
- Payments: Stripe 18.4 with Connect
- Storage: Cloudinary 1.41
- Email: Nodemailer 7.0
- Testing: Jest with 70-80% coverage thresholds

**Frontend:**
- Runtime: Node.js 22.x
- Framework: React 18 + TypeScript 5.2 + Vite 4.5
- State: Redux Toolkit + redux-persist + TanStack Query 5.90
- Routing: React Router v6
- Forms: React Hook Form + Yup/Zod
- UI: Tailwind CSS + Headless UI + Framer Motion
- i18n: i18next 23.7
- Testing: Jest + React Testing Library + MSW

## Structure

```
gema/
├── backend/src/
│   ├── server.ts           # Express app entry
│   ├── config/             # DB, Redis, Firebase, Stripe, Cloudinary
│   ├── controllers/        # HTTP request handlers (~25 files)
│   ├── models/             # Mongoose schemas (~20 models)
│   ├── routes/             # API endpoint definitions
│   ├── middleware/         # Auth, security, upload, performance
│   ├── services/           # Business logic layer (~18 files)
│   ├── validators/         # express-validator rules
│   ├── workers/            # BullMQ job processors
│   ├── utils/              # Helpers, cron jobs
│   ├── scripts/            # DB seeding, migrations
│   └── tests/              # Unit tests
├── frontend/src/
│   ├── main.tsx            # React 18 entry + PWA init
│   ├── App.tsx             # Route definitions
│   ├── components/         # Reusable components
│   │   ├── admin/          # Admin panel
│   │   ├── vendor/         # Vendor dashboard
│   │   ├── ui/             # Primitives
│   │   └── ...
│   ├── pages/              # Page components
│   ├── services/api/       # API client layer
│   ├── store/slices/       # Redux state (~15 slices)
│   ├── contexts/           # React Context providers
│   ├── hooks/              # Custom hooks
│   └── tests/              # Integration, performance, security tests
```

## Commands

**Backend:**
```bash
npm run dev              # nodemon with auto-reload
npm run dev:worker      # Background worker process (required!)
npm run build           # TS compilation
npm test                # Jest with coverage
npm test:watch          # Watch mode
npm lint                # ESLint check
npm lint:fix            # Auto-fix
npm db:seed             # Seed database
```

**Frontend:**
```bash
npm run dev              # Vite dev server (port 3000)
npm run build           # Production build
npm run preview         # Preview prod build
npm test                # Jest + RTL
npm run type-check      # TypeScript strict check
npm lint                # ESLint
npm lint:fix            # Auto-fix
```

## Communication

- All interactions & commit msgs: extremely concise, sacrifice grammar for brevity
- No fluff, filler words, or unnecessary context
- Direct, factual technical info

## Plans

- End each plan with unresolved questions (if any)
- Questions: ultra-concise, skip grammar

## Rules

### Code Style
- Type hints on backend functions (strict mode OFF, but still type where possible)
- Frontend: Full TypeScript strict mode
- Max 100 chars/line
- Descriptive names > comments
- No magic numbers—use constants

### Git
- Branch: `feat/`, `fix/`, `refactor/`
- Commits: `type: brief description`
- Always run tests before commit

### Patterns
- **Service layer handles ALL business logic, not controllers**
- Controllers: HTTP in/out only
- Services imported into controllers
- Custom `AppError` class for errors
- Never bare `except:` or empty `catch {}`

## Before Coding

1. Clarify requirements if ambiguous
2. Check existing code for patterns
3. Read relevant service/model files first
4. Consider edge cases

## Don'ts

- ❌ Enable TypeScript strict mode in backend without discussion (currently loose)
- ❌ Remove debug logging without approval (extensive auth/CORS debugging in production)
- ❌ Modify "shadow fields" in models during migration (featuredImage vs featuredImageAsset)
- ❌ Change JWT clock tolerance (60s handles time sync issues)
- ❌ Modify rate limiting without understanding KVM1 (single-core) constraints
- ❌ Delete tests without replacement
- ❌ Change public APIs without discussion
- ❌ Add dependencies without justification
- ❌ Ignore existing abstractions

## Project-Specific Notes

**Authentication:**
- Dual system: JWT (httpOnly cookies preferred) + Firebase Admin SDK fallback
- Token in cookies (secure) with Authorization header fallback
- Cache-aside pattern in auth middleware (Redis user lookup after JWT verify)
- Clock tolerance: 60 seconds for token verification
- Extensive debug logging for CORS/auth issues

**Background Jobs:**
- BullMQ with Redis backend
- Separate worker process: **MUST run `npm run dev:worker`** in parallel with main server
- Queues: email, QR, tickets, analytics, notifications
- Graceful shutdown with queue draining

**File Storage:**
- Cloudinary for all media (production)
- Migration scripts in `/backend/src/scripts/` for legacy data
- CloudinaryUrl class for URL generation with transformations
- MediaService layer for abstraction

**Data Migration Pattern:**
- "Shadow fields" for backward compatibility during migrations
- Example: Blog model has both `featuredImage` (old) and `featuredImageAsset` (new)
- Don't remove old fields until migration complete

**Rate Limiting:**
- Optimized for KVM1 (single-core VPS)
- General: 100 req/min
- Heavy endpoints (dashboard, analytics): 20 req/min
- Auth: 10 attempts/15 min
- Skip successful auth requests to prevent user blocking

**Commission System:**
- Vendor payouts via Stripe Connect
- ConfigurableCommission model with rates per vendor
- PayoutService handles vendor payments
- Transaction logs for revenue tracking

**CORS:**
- Dynamic origin checking via env vars
- Vercel domain regex matching
- Localhost allowed in dev
- No-origin requests allowed for GET/HEAD/OPTIONS
- Debug logging in production (don't remove!)

**Email:**
- EmailService (~60+ KB) with 10+ templates
- Queue-based sending via BullMQ
- Templates: orders, tickets, vendor notifications, etc.

**Frontend PWA:**
- Service worker with offline support
- Network-first for API (5-min cache)
- Cache-first for images (30-day cache)
- Workbox integration

**Known Issues:**
- ~60 TypeScript errors documented (mostly unused imports)
- Backend strict mode disabled
- Type mismatches in forms (BlogForm, CouponForm)
- Badge variant type issues

**Testing:**
- Backend coverage thresholds: 70-80%
- Frontend: Jest + RTL + MSW for API mocking
- 10-second timeout per test

## AI Delegation Strategy

**When to use Ollama (qwen2.5-coder:7b)**:
- Simple validator generation (CRUD models)
- Code reviews for repetitive patterns
- Boilerplate generation (similar to existing)
- Commission calculator functions
- Service layer pattern validation

**When to use Claude**:
- Architectural decisions
- Complex business logic (auth, transactions)
- Security-critical code (JWT, Stripe webhooks)
- Cross-cutting changes
- Production debugging

**Custom MCP Tools**:
1. `generate_event_validator` - Creates validators from models (saves 60-80 lines)
2. `review_payment_logic` - Analyzes payment/commission bugs
3. `generate_commission_calculator` - Creates tiered calculators (saves 80-120 lines)
4. `validate_service_layer` - Checks pattern compliance

**Token Savings**: 30-40% reduction for repetitive tasks
