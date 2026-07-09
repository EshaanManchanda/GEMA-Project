#!/bin/bash
# Static sanity checker for local-test-agent output drafts.
# Cheap grep gate to catch obvious hallucinations/real-service calls before a human copies a
# generated draft into backend/src/tests/. This does NOT replace review — it only catches the
# common, mechanical mistakes.
#
# Usage: ./tools/local-test-agent/check-output.sh <output-file>

set -uo pipefail

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: $0 <output-file>"
  exit 1
fi

FAIL=0

echo "Checking $FILE ..."
echo ""

# --- Hard failures: forbidden imports / hallucinated shapes / real services ---
FAIL_PATTERNS=(
  "from '../../server'"
  'from "../../server"'
  "res.body.token"
  "Stripe("
  "mongoose.connect(process.env"
  "process.env.MONGODB_URI"
  "nodemailer.createTransport"
  "cloudinary.uploader.upload"
)

for pat in "${FAIL_PATTERNS[@]}"; do
  if grep -qF -- "$pat" "$FILE" 2>/dev/null; then
    echo "FAIL: found forbidden pattern: $pat"
    FAIL=1
  fi
done

# Tokens are never in the JSON body (httpOnly cookies only) — catch the common hallucinated
# variants a small local model tends to invent (access_token/refresh_token/token in .body).
if grep -qE '\.body\.(access_token|refresh_token|accessToken|refreshToken|token)\b' "$FILE" 2>/dev/null; then
  echo "FAIL: found response body token field (e.g. .body.access_token) — tokens are httpOnly cookies in this codebase, never in the JSON body."
  FAIL=1
fi

# 'name:' as a register field is the wrong shape (real API uses firstName/lastName).
if grep -qE "^[[:space:]]*name:[[:space:]]*[\"']" "$FILE" 2>/dev/null; then
  echo "WARN: found a 'name:' field — register uses firstName/lastName, not name. Verify this isn't a false positive (e.g. event/category name)."
fi

# --- Warn if expected scaffolding is missing -----------------------------------
WARN_MISSING=(
  "createTestApp"
  "connectTestDB"
  "clearTestDB"
  "closeTestDB"
  "supertest"
  "describe("
)

for pat in "${WARN_MISSING[@]}"; do
  if ! grep -qF -- "$pat" "$FILE" 2>/dev/null; then
    echo "WARN: missing expected pattern: $pat"
  fi
done

# --- Warn on prose / fences / placeholder text ---------------------------------
WARN_CONTAINS=(
  '```'
  "TODO"
  "replace with actual"
  "adjust this import"
  "mock as needed"
)

for pat in "${WARN_CONTAINS[@]}"; do
  if grep -qF -- "$pat" "$FILE" 2>/dev/null; then
    echo "WARN: found placeholder/prose marker: $pat"
  fi
done

echo ""
if [ "$FAIL" -eq 1 ]; then
  echo "RESULT: FAIL - do not copy this draft as-is. Fix the flagged issues first (or re-run with review-generated-test.txt / a stronger model)."
  exit 1
else
  echo "RESULT: PASS (hard checks) - review the WARN lines above, then copy manually if satisfied."
  exit 0
fi
