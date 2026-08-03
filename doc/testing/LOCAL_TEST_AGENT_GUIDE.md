# Local Test-Generation Agent (Ollama)

Local-only shell + Ollama pipeline that drafts backend Jest/Supertest tests for review, so test
authoring stays on a local model instead of Claude tokens. Lives entirely under
`tools/local-test-agent/` — it never writes into `backend/src/tests/`, calls no cloud/GitHub
service, and touches no production code.

Source of truth for the design decisions is the repo's `plan.md`. This doc covers day-to-day use
and current status.

## Workflow

```
plan → review plan → generate → check-output.sh → (optional) review-generated-test.txt pass
     → human review → manual copy into backend/src/tests/integration/ → typecheck + jest
```

```bash
# 1. Get a test plan for a module (no code)
./tools/local-test-agent/scan-module.sh auth plan

# 2. Get a draft test file
./tools/local-test-agent/scan-module.sh auth generate

# 3. Sanity-check the draft before touching it
./tools/local-test-agent/check-output.sh tools/local-test-agent/output/auth.generate.latest.md

# 4. If satisfied, copy it manually
cp tools/local-test-agent/output/auth.generate.latest.md \
   backend/src/tests/integration/auth/auth.newmodule.test.ts
# (strip any leading/trailing markdown fences first)

# 5. Verify it actually runs against the real harness
cd backend && npm run typecheck && npx jest src/tests/integration/auth/auth.newmodule.test.ts --runInBand
```

Prerequisites: `ollama serve` running locally, `qwen2.5-coder:7b` pulled (and
`deepseek-coder-v2:16b-lite-instruct-q4_K_M` for higher-risk modules), `jq` on PATH.

## Modules & model selection

`module-files.json` seeds explicit file lists for the security-critical modules: `auth`,
`events`, `admin`, `vendor`, `booking`, `payment`, `stripe`, `coupon`. Any other module name
falls back to a `grep` over `backend/src` — less precise, always sanity-check the "Source files"
list the script prints before trusting the output.

| Module class | Model |
|---|---|
| auth, events | `qwen2.5-coder:7b` (fast) |
| admin, vendor, booking, payment, stripe | `deepseek-coder-v2:16b-lite-instruct-q4_K_M` (stronger reasoning, much slower — several minutes per call on CPU) |

## What `check-output.sh` actually catches

Hard fails (block copying): `server.ts` import, a token read from the JSON response body
(`res.body.token`/`access_token`/etc. — this codebase uses httpOnly cookies), a real `Stripe(`
client, connecting to a real Mongo/env DB, real Nodemailer/Cloudinary calls.

**Warn-only, not blocking** — these still require a human eyeball: missing
`createTestApp`/`connectTestDB`/`clearTestDB`/`closeTestDB` calls, leftover markdown fences. A
`PASS (hard checks)` result is not equivalent to "correct" — in practice `qwen2.5-coder:7b` has
produced drafts that pass the hard-fail grep but still: import the Express app directly instead
of `createTestApp()`, skip the DB lifecycle hooks entirely, and assert `409` on duplicate-email
registration instead of the real `200` (the app intentionally returns 200 for enumeration
protection). Always diff the draft's shape against
`backend/src/tests/integration/auth/auth.test.ts` before copying anything.

For a stubborn draft, `prompts/review-generated-test.txt` is a self-review pass you can feed back
into a model (draft + conventions + style reference) to get a corrected version — not wired into
`scan-module.sh` as a third mode, run it manually via the same prompt-assembly pattern the script
uses. Worth trying with the stronger deepseek model even for auth-class modules if qwen keeps
missing the DB lifecycle / duplicate-email shape.

## Status

Tool is built and functional (see `plan.md` for the full spec). Draft quality from
`qwen2.5-coder:7b` on `auth` has been inconsistent across runs — treat every generated file as a
first draft requiring correction, not a ready-to-merge test.
