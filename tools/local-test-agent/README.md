# Local Ollama Test-Generation Agent

Local-only, shell + Ollama tool that generates backend test **plans** and **draft test files**
for the Kidrove backend, module by module. No GitHub, no cloud, no MCP. It never writes into
`backend/src/tests/` — you review a draft, then copy it in yourself.

```
repo scan (one module)
  -> conventions.txt + style-reference test + module source files
  -> Ollama (qwen2.5-coder:7b or deepseek-coder-v2:16b)
  -> plan or draft test file (saved under output/)
  -> you review (+ optional check-output.sh gate)
  -> you copy into backend/src/tests/integration/...
  -> you run it
```

## Prerequisites

- `ollama` installed and running locally.
- At least `qwen2.5-coder:7b` pulled: `ollama pull qwen2.5-coder:7b`.
- For heavier modules, `deepseek-coder-v2:16b-lite-instruct-q4_K_M` pulled too.

## Usage

```bash
chmod +x tools/local-test-agent/scan-module.sh tools/local-test-agent/check-output.sh

# 1. Get a test plan for a module (no code yet)
./tools/local-test-agent/scan-module.sh auth plan

# 2. Once the plan looks right, generate a draft test file
./tools/local-test-agent/scan-module.sh auth generate

# 3. Run the cheap static sanity check on the draft
./tools/local-test-agent/check-output.sh tools/local-test-agent/output/auth.generate.latest.md

# 4. Review manually, then copy the reviewed code into the real test tree, e.g.:
#    backend/src/tests/integration/auth/auth.newFlow.test.ts

# 5. Run it against the real harness
cd backend
npm run lint
npm run typecheck
npx jest src/tests/integration/auth/auth.newFlow.test.ts --runInBand
```

Optional overrides:

```bash
LINES=400 ./tools/local-test-agent/scan-module.sh admin plan     # more context per file
./tools/local-test-agent/scan-module.sh payment generate deepseek-coder-v2:16b-lite-instruct-q4_K_M
```

### Optional second pass: self-review

For higher-risk modules, feed a generated draft back through `prompts/review-generated-test.txt`
manually (pipe the draft + that prompt file into `ollama run <model>`) before copying — it
checks the draft against the same conventions and returns a corrected version.

## Module → file selection

Source files come from `module-files.json` when a module has an explicit entry there (accurate,
deterministic). Modules not listed fall back to a `grep`-based scan of
`backend/src/{controllers,routes,services,validators,models,middleware}/` matching the module
name. Secrets/build artifacts (`.env*`, `*.pem`, `*.key`, `*.crt`, `node_modules`, `dist`,
`build`, `coverage`, `uploads`, `backups`) are always excluded. If zero files match, the script
exits 2 — add an entry to `module-files.json` or use a more specific module name.

## Model by risk

| Module(s)                              | Model                                          |
|-----------------------------------------|-------------------------------------------------|
| `auth`, `events`                        | `qwen2.5-coder:7b`                               |
| `admin`, `vendor`, `booking`, `payment`, `stripe` | `deepseek-coder-v2:16b-lite-instruct-q4_K_M` |

**Note on speed:** on CPU-only / modest hardware, `deepseek-coder-v2:16b` can take well over
10 minutes for a single `generate` run — much slower than `qwen2.5-coder:7b` (usually under a
minute). Run it in a background shell or a long-lived terminal, not inline while waiting. If
it's consistently too slow to be usable, fall back to `qwen2.5-coder:7b` for everything and rely
more on the self-review pass (`prompts/review-generated-test.txt`) and `check-output.sh` to
catch quality gaps.

**Reality check on 7B output quality:** even for `auth`, `qwen2.5-coder:7b` reliably drifts from
the real API shapes (e.g. writing `response.body.token` instead of using cookies, or skipping
`createTestApp`/`connectTestDB`) despite the conventions file and style reference. This is
expected — `check-output.sh` exists specifically to catch this. Treat every draft as a starting
point that needs editing, not a finished test.

## Recommended module order

1. `auth`
2. RBAC — `admin` / `vendor` (customer/vendor must not reach admin routes)
3. `events` — public/private visibility, ownership
4. `booking` — server-side price/amount calculation
5. `payment` — PaymentIntents, IDOR on order ownership
6. `stripe` — webhook signature verification, dedup
7. `coupon`
8. SEO/sitemap, certificates (as needed)

Events before booking: booking tests depend on event visibility/ownership/seat fixtures, so
getting event tests solid first reduces fixture churn later.

## Red-flag checklist before copying any generated draft

- [ ] No production DB URI / real Mongo connection
- [ ] No real Stripe / Firebase / Cloudinary / SMTP calls
- [ ] No `import ... from "../../server"` (or any path into `backend/src/server.ts`)
- [ ] Uses `createTestApp()` (or mounts the router locally the same way)
- [ ] Register body uses `firstName`/`lastName`, not `name`
- [ ] Auth uses cookies (or a minted JWT with a `tv` claim), never `res.body.token`
- [ ] Duplicate-email register expects **200**, not 409
- [ ] Does not modify or weaken any file under `backend/src/` outside `tests/`

## Safety rules

- The agent **suggests only** — it never writes into `backend/src/tests/`. All output lands in
  `tools/local-test-agent/output/` (gitignored) and must be manually reviewed and copied.
- Do not scan the whole backend at once — always target one module. The 7B model performs much
  worse with large, unfocused context.
- If auto-write is ever added later, it must write to `output/generated-files/` only — never
  directly into `backend/src/tests/`.
