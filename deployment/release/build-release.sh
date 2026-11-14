#!/bin/sh
# Builds a release tarball OFF the server (the 1 vCPU / 4 GB box never runs tsc or vite).
# Runs on your PC (Git Bash, WSL or Linux) and needs git, docker and tar.
#
#   deployment/release/build-release.sh --frontend-env /path/to/frontend-production.env [--commit <sha>] [--out <dir>]
#
# - Builds from `git archive <commit>`: only committed files, so a local .env, uncommitted edits or a
#   dev machine's node_modules can never end up in the release.
# - The frontend bakes its VITE_* values in at build time. --frontend-env is a file with the PRODUCTION
#   values (copy them from the server's frontend/.env; they are public keys and URLs, but they are not in git).
# - --ca-cert <file.pem> (optional): an extra root certificate for the build container. Needed when an
#   antivirus or proxy re-signs HTTPS traffic (Norton "Web/Mail Shield"): Windows trusts its root, the
#   container does not, and npm fails with UNABLE_TO_VERIFY_LEAF_SIGNATURE. TLS verification stays ON.
#   Export it from the Windows store, see deployment/RUNBOOK.md step 4.
# - Output: <out>/kidrove-<id>.tar.gz + .sha256 + a copy of deploy-release.sh, ready for scp.
set -eu

COMMIT=HEAD
OUT=./release-out
FRONTEND_ENV=
CA_CERT=
NODE_IMAGE=${NODE_IMAGE:-node:22-bookworm}

while [ $# -gt 0 ]; do
  case "$1" in
    --commit) COMMIT=$2; shift 2 ;;
    --out) OUT=$2; shift 2 ;;
    --frontend-env) FRONTEND_ENV=$2; shift 2 ;;
    --ca-cert) CA_CERT=$2; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

die() { echo "ERROR: $*" >&2; exit 1; }
[ -n "$FRONTEND_ENV" ] && [ -f "$FRONTEND_ENV" ] || die "--frontend-env <file> is required (production VITE_* values)"
command -v git >/dev/null || die "git not found"
command -v docker >/dev/null || die "docker not found"
docker info >/dev/null 2>&1 || die "docker is not running"

SHA=$(git rev-parse --verify --short "$COMMIT^{commit}") || die "unknown commit $COMMIT"
FULL=$(git rev-parse --verify "$COMMIT^{commit}")
ID="$(date -u +%Y%m%d-%H%M%S)-$SHA"
HERE=$(cd "$(dirname "$0")" && pwd)

if ! git diff --quiet HEAD 2>/dev/null; then
  echo "NOTE: you have uncommitted changes. They are NOT in this release (it is built from commit $SHA)."
fi
for needle in VITE_API_URL VITE_STRIPE_PUBLISHABLE_KEY VITE_FIREBASE_API_KEY; do
  grep -q "^$needle=" "$FRONTEND_ENV" || echo "WARNING: $needle is not in $FRONTEND_ENV (is that intended?)"
done

# Docker for Windows needs a Windows path for a bind mount and must not rewrite /t paths.
ENV_PATH=$(cd "$(dirname "$FRONTEND_ENV")" && { pwd -W 2>/dev/null || pwd; })/$(basename "$FRONTEND_ENV")
export MSYS_NO_PATHCONV=1

CA_ARGS=""
if [ -n "$CA_CERT" ]; then
  [ -f "$CA_CERT" ] || die "--ca-cert file not found: $CA_CERT"
  grep -q "BEGIN CERTIFICATE" "$CA_CERT" || die "--ca-cert must be a PEM file"
  CA_PATH=$(cd "$(dirname "$CA_CERT")" && { pwd -W 2>/dev/null || pwd; })/$(basename "$CA_CERT")
  CA_ARGS="-v $CA_PATH:/extra-ca.pem:ro -e NODE_EXTRA_CA_CERTS=/extra-ca.pem"
fi

mkdir -p "$OUT"
TMP_TAR="$OUT/.kidrove-$ID.tar.gz.partial"
trap 'rm -f "$TMP_TAR"' EXIT

echo "Building $ID from $SHA in $NODE_IMAGE (backend + frontend, a few minutes)..." >&2
# stdin = the committed tree; stdout = the finished tarball; everything else goes to stderr.
# PUPPETEER_SKIP_DOWNLOAD: the build only compiles; the 170 MB browser is fetched on the server by npm ci.
# CA_ARGS is deliberately unquoted: it expands to separate docker arguments.
# shellcheck disable=SC2086
git archive --format=tar "$COMMIT" | docker run --rm -i \
  -e "RELEASE_ID=$ID" -e "RELEASE_COMMIT=$FULL" -e NODE_OPTIONS=--max-old-space-size=4096 \
  -e PUPPETEER_SKIP_DOWNLOAD=true $CA_ARGS \
  -v "$ENV_PATH:/frontend-production.env:ro" \
  "$NODE_IMAGE" sh -c '
    set -eu
    exec 3>&1 1>&2
    mkdir /src && cd /src && tar -x
    cp /frontend-production.env frontend/.env.production

    echo "== backend: npm ci, build, migration scripts"
    cd /src/backend
    npm ci --no-audit --no-fund
    npm run build
    npx tsc -p tsconfig.release-scripts.json
    test -f dist/server.js && test -f dist/workers/index.js && test -f dist/scripts/migrateTaxToVat.js

    echo "== frontend: npm ci, build"
    cd /src/frontend
    npm ci --no-audit --no-fund
    npm run build
    test -f dist/index.html

    echo "== assembling $RELEASE_ID"
    R=/out/$RELEASE_ID
    mkdir -p $R/backend $R/frontend
    cp -r /src/backend/dist $R/backend/dist
    cp /src/backend/package.json /src/backend/package-lock.json $R/backend/
    cp -r /src/frontend/dist $R/frontend/dist
    cp /src/ecosystem.config.js $R/ecosystem.config.js
    printf "{\"id\":\"%s\",\"commit\":\"%s\",\"builtAt\":\"%s\",\"node\":\"%s\"}\n" \
      "$RELEASE_ID" "$RELEASE_COMMIT" "$(date -u +%FT%TZ)" "$(node -v)" > $R/RELEASE.json
    tar -czf - -C /out "$RELEASE_ID" >&3
  ' >"$TMP_TAR"

FINAL="$OUT/kidrove-$ID.tar.gz"
mv "$TMP_TAR" "$FINAL"; trap - EXIT

# the release must contain what deploy-release.sh checks for, and no secrets or dev files
# (relative path: GNU tar on Windows reads "C:/..." as a remote host)
LIST=$(cd "$OUT" && tar -tzf "kidrove-$ID.tar.gz")
for must in "$ID/backend/dist/server.js" "$ID/backend/dist/workers/index.js" "$ID/backend/package-lock.json" \
            "$ID/frontend/dist/index.html" "$ID/ecosystem.config.js" "$ID/RELEASE.json"; do
  echo "$LIST" | grep -qx "$must" || die "release is missing $must"
done
if echo "$LIST" | grep -E '(^|/)\.env($|\.)|node_modules/|\.git/' | grep -v '\.env\.example' | head -3 | grep -q .; then
  die "release contains an .env, node_modules or .git entry; refusing to ship it"
fi

(cd "$OUT" && sha256sum "kidrove-$ID.tar.gz" > "kidrove-$ID.tar.gz.sha256")
cp "$HERE/deploy-release.sh" "$OUT/deploy-release.sh"

echo
echo "Release built: $FINAL ($(du -h "$FINAL" | cut -f1))"
echo "  id:      $ID   (commit $FULL)"
echo "  upload:  $FINAL, $FINAL.sha256 and $OUT/deploy-release.sh   (see deployment/RUNBOOK.md)"
