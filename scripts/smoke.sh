#!/bin/bash
# Post-deploy smoke test. Read-only GETs, safe to run against production anytime.
# Usage: scripts/smoke.sh [FRONTEND_URL] [API_URL]
FRONTEND="${1:-https://kidrove.com}"
API="${2:-https://api.kidrove.com}"
FAILS=0

# check <name> <expected_code> <url> [body_must_match] [body_must_not_match]
check() {
    local body code
    body=$(curl -s -m 15 -w '\n%{http_code}' "$3")
    code=${body##*$'\n'}; body=${body%$'\n'*}
    if [ "$code" != "$2" ]; then
        echo "✗ $1: HTTP $code (want $2)"; FAILS=$((FAILS + 1))
    elif [ -n "$4" ] && ! grep -q -- "$4" <<< "$body"; then
        echo "✗ $1: body missing '$4'"; FAILS=$((FAILS + 1))
    elif [ -n "$5" ] && grep -q -- "$5" <<< "$body"; then
        echo "✗ $1: body contains '$5'"; FAILS=$((FAILS + 1))
    else
        echo "✓ $1"
    fi
}

# Wait for the API to come back after a PM2 reload (up to ~30s).
for _ in $(seq 15); do
    [ "$(curl -s -m 5 -o /dev/null -w '%{http_code}' "$API/health/basic")" = 200 ] && break
    sleep 2
done

check "API up, DB connected"      200 "$API/health/basic"
check "API health not down"       200 "$API/api/health" '"status"' '"metrics"'
check "Redis stats admin-only"    401 "$API/health/redis"
check "Events list"               200 "$API/api/events?limit=1"
check "Frontend home"             200 "$FRONTEND/" 'id="root"'
check "Frontend /events (SPA)"    200 "$FRONTEND/events"

# Warn only: nginx headers are applied by hand on the server.
curl -sI -m 15 "$FRONTEND/" | grep -qi '^x-frame-options' \
    && echo "✓ Frontend security headers" \
    || echo "! Frontend missing X-Frame-Options (nginx security-headers snippet not applied?)"

if [ "$FAILS" -gt 0 ]; then
    echo "$FAILS smoke check(s) failed. Rollback: ./deploy.sh --rollback"
    exit 1
fi
echo "All smoke checks passed"
