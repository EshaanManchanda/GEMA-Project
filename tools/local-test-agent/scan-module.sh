#!/bin/bash
# Local Ollama test-generation agent for the Kidrove backend.
#
# Feeds one backend module (grouped source files) into a local Ollama model to get a test plan
# or a draft Jest/Supertest test file. Never writes into backend/src/tests — output is saved
# under tools/local-test-agent/output/ for manual review.
#
# Usage:
#   [LINES=N] ./tools/local-test-agent/scan-module.sh <module> [plan|generate] [model]
#
#   module  e.g. auth, events, admin, vendor, booking, payment, stripe, coupon
#           (see module-files.json for the explicit list, or any grep-matchable name)
#   mode    plan (default) | generate
#   model   qwen2.5-coder:7b (default) | deepseek-coder-v2:16b-lite-instruct-q4_K_M | ...
#
# Recommended model by risk: auth/events -> qwen2.5-coder:7b;
#                            admin/vendor/booking/payment/stripe -> deepseek-coder-v2:16b-lite-instruct-q4_K_M

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/output"
PROMPTS_DIR="$SCRIPT_DIR/prompts"
MODULE_MAP="$SCRIPT_DIR/module-files.json"
STYLE_REF="$REPO_ROOT/backend/src/tests/integration/auth/auth.test.ts"

MODULE="${1:-}"
MODE="${2:-plan}"
MODEL="${3:-qwen2.5-coder:7b}"
LINES="${LINES:-220}"

if [ -z "$MODULE" ]; then
  echo "Usage: [LINES=N] $0 <module> [plan|generate] [model]"
  echo "  module: e.g. auth, events, admin, vendor, booking, payment, stripe, coupon"
  echo "  mode:   plan (default) | generate"
  echo "  model:  qwen2.5-coder:7b (default) | deepseek-coder-v2:16b-lite-instruct-q4_K_M"
  exit 1
fi

if [ "$MODE" != "plan" ] && [ "$MODE" != "generate" ]; then
  echo "Invalid mode '$MODE'. Use 'plan' or 'generate'." >&2
  exit 1
fi

if ! command -v ollama >/dev/null 2>&1; then
  echo "ollama not found on PATH. Install/start Ollama first." >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Never send secrets, credentials, or build/binary noise to the model.
EXCLUDE_REGEX='(^|/)\.env(\..*)?$|\.pem$|\.key$|\.crt$|(^|/)node_modules/|(^|/)dist/|(^|/)build/|(^|/)coverage/|(^|/)uploads/|(^|/)backups/'

# --- Source file selection -------------------------------------------------
FILES=()

if command -v node >/dev/null 2>&1 && [ -f "$MODULE_MAP" ]; then
  MAPPED="$(node -e '
    const fs = require("fs");
    const map = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const list = map[process.argv[2]];
    if (list) console.log(list.join("\n"));
  ' "$MODULE_MAP" "$MODULE" 2>/dev/null || true)"
  if [ -n "$MAPPED" ]; then
    while IFS= read -r f; do
      [ -n "$f" ] && FILES+=("$REPO_ROOT/$f")
    done <<< "$MAPPED"
  fi
fi

if [ "${#FILES[@]}" -eq 0 ]; then
  while IFS= read -r f; do
    [ -n "$f" ] && FILES+=("$f")
  done < <(find "$REPO_ROOT/backend/src" -type f -name '*.ts' 2>/dev/null \
      | grep -viE "$EXCLUDE_REGEX" \
      | grep -viE '\.test\.ts$' \
      | grep -iE '/(controllers|routes|services|validators|models|middleware)/' \
      | grep -iE "$MODULE" || true)
fi

# Defensive re-filter, even for explicit manifest entries.
FILTERED=()
for f in "${FILES[@]:-}"; do
  if [ -n "$f" ] && [ -f "$f" ] && ! echo "$f" | grep -qiE "$EXCLUDE_REGEX"; then
    FILTERED+=("$f")
  fi
done
FILES=("${FILTERED[@]:-}")

if [ "${#FILES[@]}" -eq 0 ] || [ -z "${FILES[0]:-}" ]; then
  echo "No source files found for module '$MODULE'. Use module-files.json or a more specific module name." >&2
  exit 2
fi

# --- Prompt assembly --------------------------------------------------------
TIMESTAMP="$(date +%Y-%m-%d_%H%M)"
OUT_FILE="$OUTPUT_DIR/${MODULE}.${MODE}.${TIMESTAMP}.md"
LATEST_FILE="$OUTPUT_DIR/${MODULE}.${MODE}.latest.md"

MODE_PROMPT="$PROMPTS_DIR/test-plan.txt"
[ "$MODE" = "generate" ] && MODE_PROMPT="$PROMPTS_DIR/generate-tests.txt"

echo "Module: $MODULE | Mode: $MODE | Model: $MODEL | Lines/file: $LINES"
echo "Source files:"
for f in "${FILES[@]}"; do
  echo "  - ${f#$REPO_ROOT/}"
done
echo ""

PROMPT_FILE="$(mktemp)"

{
  cat "$PROMPTS_DIR/conventions.txt"
  echo ""
  if [ -f "$STYLE_REF" ]; then
    echo "===== STYLE REFERENCE (copy import paths / lifecycle / mock style from this existing passing test) ====="
    echo "FILE: backend/src/tests/integration/auth/auth.test.ts"
    sed -n '1,200p' "$STYLE_REF"
    echo ""
  fi
  cat "$MODE_PROMPT"
  echo ""
  echo "===== MODULE: $MODULE - SOURCE FILES ====="
  for f in "${FILES[@]}"; do
    REL="${f#$REPO_ROOT/}"
    echo ""
    echo "===== FILE: $REL ====="
    sed -n "1,${LINES}p" "$f"
  done
  echo ""
  echo "===== END OF SOURCE FILES ====="
  echo ""
  # Recency reminder: without this, small models tend to just continue the last source file
  # they saw instead of switching to the requested task. Re-state the task explicitly here.
  if [ "$MODE" = "generate" ]; then
    echo "Do NOT repeat, quote, or continue any of the source files above. Now output ONLY the complete Jest + Supertest test file described earlier — start immediately with the import statements."
  else
    echo "Do NOT repeat, quote, or continue any of the source files above. Now output ONLY the 5-section test plan described earlier."
  fi
} > "$PROMPT_FILE"

# ollama run's default context window (2048 tokens on most models unless overridden) silently
# truncates large prompts, which can produce garbage or a canned refusal instead of an error.
# Call the HTTP API directly so we can set num_ctx explicitly, sized to the actual prompt.
WORD_COUNT="$(wc -w < "$PROMPT_FILE")"
NUM_CTX=$(( (WORD_COUNT * 3 / 2) + 2048 ))   # rough tokens ~= 1.3x words, plus headroom for output
# Round up to the nearest power-of-2-ish step Ollama expects reasonably well.
if [ "$NUM_CTX" -lt 8192 ]; then NUM_CTX=8192; fi
if [ "$NUM_CTX" -gt 32768 ]; then NUM_CTX=32768; fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq not found on PATH — required to call the Ollama API safely." >&2
  exit 1
fi

echo "Prompt size: ~$WORD_COUNT words | num_ctx: $NUM_CTX"
echo ""

REQUEST_FILE="$(mktemp)"
trap 'rm -f "$PROMPT_FILE" "$REQUEST_FILE"' EXIT

jq -n --rawfile prompt "$PROMPT_FILE" --arg model "$MODEL" --argjson num_ctx "$NUM_CTX" \
  '{model: $model, prompt: $prompt, stream: false, options: {num_ctx: $num_ctx, temperature: 0.2}}' \
  > "$REQUEST_FILE"

HTTP_RESPONSE="$(curl -s -X POST http://localhost:11434/api/generate --data-binary "@$REQUEST_FILE")"

if [ -z "$HTTP_RESPONSE" ]; then
  echo "Empty response from Ollama API — is 'ollama serve' running?" >&2
  exit 1
fi

echo "$HTTP_RESPONSE" | jq -r '.response // ("ERROR: " + (.error // "unknown API error"))' | tee "$OUT_FILE"

cp "$OUT_FILE" "$LATEST_FILE"
echo ""
echo "Saved:  $OUT_FILE"
echo "Latest: $LATEST_FILE"
