 Kidrove — Local Ollama Test-Generation Agent

 Context

 Kidrove (repo "GEMA-Project", live backend at backend/) has high-risk flows — auth, RBAC,
 bookings, payments, Stripe webhooks — that need automated test coverage. Rather than have
 Claude write every test (expensive, and per the repo's sub-brain routing rules test generation
 belongs on a local model), the goal is a local-only, shell-script test-generation agent: it
 feeds one backend module at a time into Ollama, which returns a test plan or a ready-to-review
 test file. Human reviews and saves — the agent never auto-writes into the test tree. No
 GitHub, cloud, or MCP.

 Grounded facts (verified):
 - Ollama models present: qwen2.5-coder:7b (4.7GB — primary for small modules) and
 deepseek-coder-v2:16b-lite-instruct-q4_K_M (heavier reasoning for payment/webhook logic).
 - tools/ does not exist yet — clean addition, no code touched under backend/.
 - A working test harness already exists; generated tests must match it or Qwen hallucinates
 wrong shapes. The agent bakes these into a conventions file + always includes one canonical
 existing test as a style reference:
   - backend/jest.config.js (ts-jest, node, setupFilesAfterEnv: src/tests/setup.ts); run with
 --runInBand for mongodb-memory-server stability.
   - createTestApp() — backend/src/tests/integration/setup/testApp.ts.
   - connectTestDB/clearTestDB/closeTestDB — backend/src/tests/integration/setup/testDB.ts.
   - Per-file jest.mock of config/redis, config/firebase, services/email.service,
 services/queue.service, config/stripe (shapes from auth.test.ts).
   - Real API shapes (anti-drift): register uses firstName/lastName (not name); tokens
 are httpOnly cookies, not res.body.token; duplicate email → 200 (enumeration
 protection); bookings POST /api/bookings/initiate compute amount server-side; payments
 use Stripe PaymentIntents (/api/payments/create-intent), webhook needs express.raw;
 RBAC is authorize([roles]) (no permission enum); server.ts is NOT import-safe — always
 use createTestApp().

 Decisions locked: local shell + Ollama, not Claude-authored tests; suggest → human review
 → save (no auto-write, no production edits, no real external-service calls, no full-backend
 scan on the 7B). Feedback folded in: explicit module manifest, canonical test as style ref,
 output sanity checker, secret exclusions, fail-fast, LINES override, timestamped output,
 model-by-risk guidance.

 Changes — all new files under tools/local-test-agent/

 1. scan-module.sh (executable)

 Usage: [LINES=N] ./tools/local-test-agent/scan-module.sh <module> [plan|generate] [model].
 - Mode default plan; model default qwen2.5-coder:7b.
 - Source selection: if module-files.json has an entry for <module>, use that explicit
 list (deterministic); otherwise fall back to find backend/src -type f -name '*.ts' filtered
 to controllers|routes|services|validators|models|middleware matching <module> (grep -iE),
 excluding *.test.ts.
 - Hard exclusions (always, both paths): .env, .env.*, *.pem, *.key, *.crt,
 node_modules, dist, build, coverage, uploads, backups.
 - Fail-fast: if zero source files resolve → exit 2 with
 "No source files found for module. Use module-files.json or a more specific module name."
 - Context cap: first ${LINES:-220} lines per file (sed); LINES=400 ...  override for
 large controllers.
 - Prompt assembly: prompts/conventions.txt (always) + the canonical style reference
 backend/src/tests/integration/auth/auth.test.ts (first ~200 lines, labelled "STYLE
 REFERENCE — copy import paths / lifecycle / mock style") + prompts/test-plan.txt OR
 prompts/generate-tests.txt (by mode) + the matched source files.
 - Output: pipe to ollama run "$MODEL", tee to a timestamped file
 output/<module>.<mode>.$(date +%Y-%m-%d_%H%M).md and also refresh output/<module>.<mode>.latest.md
 (lets you diff qwen vs deepseek runs without clobbering).

 2. module-files.json

 Explicit module→file mapping (overrides grep discovery for accuracy). Seed with the security-
 critical modules, e.g. auth → [auth.routes.ts, auth.controller.ts, User.ts, middleware/auth.ts, auth.validator.ts]; booking → [booking.routes.ts,
 booking.controller.ts, Booking.ts, Event.ts, booking pricing]; payment → [payment.routes.ts, payment.controller.ts, payment.service.ts, config/stripe.ts]. Paths are
 repo-relative under backend/src.

 3. prompts/conventions.txt

 Grounding file: stack, test stack, harness files/helpers, mock blocks to reuse, the real API
 shapes/gotchas from Context, and hard rules — no production DB; mock Redis/Stripe/Firebase/
 Cloudinary/email; never weaken security; don't rewrite production logic; integration-first; use
 createTestApp(), never import server.ts; tokens are cookies; all generated tests live under
 backend/src/tests/integration/ unless told otherwise (no duplicate test tree); run with
 --runInBand.

 4. prompts/test-plan.txt

 Plan mode: review only the module; output (1) important routes/functions, (2) test cases
 (success + failure/security), (3) required mocks, (4) suggested file paths under
 backend/src/tests/integration/, (5) risk areas. Plan only, no code.

 5. prompts/generate-tests.txt

 Generate mode: produce ONE complete Jest + Supertest integration test file, imports included,
 following conventions + the style reference exactly (harness helpers, mock blocks, DB lifecycle,
 cookie auth). Cover success + failure + security. Output only the test file — no prose, no
 markdown fences.

 6. prompts/review-generated-test.txt

 Optional second-pass self-review prompt: feed a generated draft back to the model to check it
 against conventions (correct imports, no server.ts, cookie auth, no real external calls) and
 return a corrected file. Used before the human copy step for higher-risk modules.

 7. check-output.sh (executable) — static sanity checker

 ./tools/local-test-agent/check-output.sh <output-file>. Cheap grep gate to catch obvious bad
 drafts before manual copy:
 - Fail (exit 1) if contains: from '../../server' / from "../../server", res.body.token,
 name: (register shape), Stripe(, mongoose.connect(process.env, process.env.MONGODB_URI,
 nodemailer.createTransport, cloudinary.uploader.upload.
 - Warn if missing: createTestApp, connectTestDB, clearTestDB, closeTestDB,
 supertest, describe(.
 - Warn if contains: ``` fences, TODO, replace with actual, adjust this import,
 mock as needed.

 8. output/.gitignore

 Scratch review area — * + !.gitignore. Drafts (incl. timestamped archives) live here; the
 human copies the vetted file into backend/src/tests/integration/... manually. If auto-write is
 ever added later, it must target output/generated-files/ only — never backend/src/tests.

 9. README.md

 Documents prerequisites (ollama running, qwen2.5-coder:7b pulled), the loop (plan → review
 → generate → check-output.sh → manual copy → run), and:
 - Model-by-risk: auth/events → qwen2.5-coder:7b; admin/booking/payment/stripe
 → deepseek-coder-v2:16b-lite-instruct-q4_K_M.
 - Recommended module order (events before bookings — bookings depend on event visibility/
 ownership/seat logic): auth → RBAC admin/vendor → events visibility+ownership → booking →
 payment intents → Stripe webhooks → coupons → SEO/sitemap → certificates.
 - Red-flag checklist before copying any draft: no prod DB URI; no real Stripe/Firebase/
 Cloudinary; no server.ts import; uses createTestApp; firstName/lastName register; cookie
 auth; duplicate email expects 200 (not 409); no app-code weakening.
 - Local run loop: cd backend && npm run lint && npm run typecheck && npx jest src/tests/integration/<file>.test.ts --runInBand.

 Files touched

 - New (all additive, no production code changed): tools/local-test-agent/scan-module.sh,
 module-files.json, check-output.sh, prompts/conventions.txt, prompts/test-plan.txt,
 prompts/generate-tests.txt, prompts/review-generated-test.txt, output/.gitignore,
 README.md.
 - Untouched: entire backend/ tree (harness, existing tests, package.json). Shared mock
 extraction to setup/mockExternalServices.ts is a deliberate future follow-up, not this pass.

 Verification

 1. chmod +x tools/local-test-agent/scan-module.sh tools/local-test-agent/check-output.sh.
 2. ./tools/local-test-agent/scan-module.sh auth plan → output references firstName/lastName,
 cookie auth, createTestApp, duplicate-email enumeration (200); saved to a timestamped file
   - output/auth.plan.latest.md.
 3. ./tools/local-test-agent/scan-module.sh auth generate → single test-file draft, not prose.
 4. ./tools/local-test-agent/check-output.sh output/auth.generate.latest.md → no hard failures
 (no server.ts import, no res.body.token, no name: register shape, no real service calls).
 5. Fail-fast check: ./tools/local-test-agent/scan-module.sh zzznotamodule plan → exit 2.
 6. Manual copy a reviewed draft into backend/src/tests/integration/<file>.test.ts, then
 cd backend && npm run typecheck && npx jest src/tests/integration/<file>.test.ts --runInBand
 → file loads the real harness and runs.
 7. git diff -- backend/src/tests → only manually-copied reviewed tests appear (agent wrote
 nothing there itself). Model-swap sanity: re-run step 2 with
 deepseek-coder-v2:16b-lite-instruct-q4_K_M as the 3rd arg to confirm the model param works.