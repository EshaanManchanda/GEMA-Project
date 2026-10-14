#!/usr/bin/env bash
# Everything CI checks, locally, in one command. Run before every deploy
# (DEPLOY_RUNBOOK.md); stops at the first failure.
#
#   ./scripts/verify.sh            full run (needs Docker for the browser tests)
#   ./scripts/verify.sh --no-e2e   skip the Docker stack + Playwright
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)
step() { printf '\n\033[1;34m== %s\033[0m\n' "$1"; }

step "Backend: typecheck"
(cd backend && node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc -p tsconfig.build.json --noEmit)

step "Backend: lint"
(cd backend && npm run lint)

step "Backend: tests + coverage gate"
(cd backend && npm run test:coverage)

step "Frontend: type-check"
(cd frontend && npm run type-check)

step "Frontend: lint"
(cd frontend && npm run lint)

step "Frontend: unit tests"
(cd frontend && npm run test:ci)

step "Dependency audit (production deps, high+)"
node scripts/audit-deps.js backend
node scripts/audit-deps.js frontend

if [[ "${1:-}" == "--no-e2e" ]]; then
  echo "Skipping browser tests (--no-e2e)."
  exit 0
fi

step "Docker stack: backend, Mongo replica set, Redis, Mailpit"
grep -q '^E2E_RELAX_RATE_LIMITS=true' docker/backend.local.env 2>/dev/null \
  || echo "E2E_RELAX_RATE_LIMITS=true" >> docker/backend.local.env
docker compose up -d --wait mongo redis mailpit
docker compose up -d backend worker
for _ in $(seq 1 120); do
  curl -sf "http://localhost:5001/api/events?limit=1" > /dev/null && break
  sleep 5
done
curl -sf "http://localhost:5001/api/events?limit=1" > /dev/null

step "Seed local test data"
docker compose exec -T backend npx ts-node src/scripts/seed.ts
docker compose exec -T backend npm run db:seed-blogs

step "Browser tests (Playwright, production build)"
(cd frontend && E2E_EXTERNAL_API=1 npx playwright test)

printf '\n\033[1;32mAll checks passed.\033[0m Report: frontend/playwright-report (npx playwright show-report)\n'
