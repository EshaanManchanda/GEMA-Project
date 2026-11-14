#!/bin/sh
# Tests for deploy-release.sh. Needs a real Linux/macOS shell (real symlinks); run it with:
#   sh deployment/release/test-deploy-release.sh
# On Windows run it in a container, e.g.:
#   docker run --rm -v "$PWD/deployment/release:/t:ro" alpine sh /t/test-deploy-release.sh
# pm2, npm and curl are stubs in a temp dir; nothing outside the temp dir is touched.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
SCRIPT="$HERE/deploy-release.sh"
SB=$(mktemp -d)
trap 'rm -rf "$SB"' EXIT
PASS=0; FAIL=0
ok()   { PASS=$((PASS + 1)); echo "  ok   $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL $1"; }
check() { if eval "$2"; then ok "$1"; else fail "$1   [$2]"; fi; }

mkdir -p "$SB/bin"
cat >"$SB/bin/pm2" <<'EOF'
#!/bin/sh
echo "pm2 $*" >>"$SB/pm2.log"
[ "$1" = "jlist" ] && { echo "[]"; exit 0; }
[ -f "$SB/pm2.fail" ] && [ "$1" = "startOrReload" ] && exit 1
exit 0
EOF
cat >"$SB/bin/npm" <<'EOF'
#!/bin/sh
echo "npm $* (in $(pwd))" >>"$SB/npm.log"
[ -f "$SB/npm.fail" ] && exit 1
mkdir -p node_modules/.bin && echo "installed" >node_modules/marker
EOF
cat >"$SB/bin/curl" <<'EOF'
#!/bin/sh
# healthy unless the live backend/dist points into a release whose id contains BAD
case "$(readlink "$APP/backend/dist" 2>/dev/null)" in *BAD*) exit 22 ;; esac
[ -f "$SB/health.down" ] && exit 7
exit 0
EOF
chmod +x "$SB/bin/pm2" "$SB/bin/npm" "$SB/bin/curl"

export SB APP="$SB/app" RELEASES_DIR="$SB/rels" APP_DIR="$SB/app"
export PATH="$SB/bin:$PATH" SLEEP=0 STABLE_SECONDS=0 HEALTH_TRIES=3 MIN_FREE_MB=1 KEEP=2
export PM2=pm2 NPM=npm CURL=curl

reset_app() {
  rm -rf "$APP" "$RELEASES_DIR" "$SB/build" "$SB/pm2.log" "$SB/npm.log" "$SB/pm2.fail" "$SB/npm.fail" "$SB/health.down"
  mkdir -p "$APP/backend/dist" "$APP/backend/node_modules" "$APP/backend/uploads" "$APP/frontend/dist" "$SB/build"
  echo old >"$APP/backend/dist/old.txt"; echo old-nm >"$APP/backend/node_modules/old.txt"
  echo old-fe >"$APP/frontend/dist/index.html"; echo old-eco >"$APP/ecosystem.config.js"
  echo "SECRET=1" >"$APP/backend/.env"; echo upload >"$APP/backend/uploads/keep.pdf"
}

# mk_release <id> -> $SB/build/<id>.tar.gz (+ .sha256)
mk_release() {
  d="$SB/build/$1"
  mkdir -p "$d/backend/dist" "$d/frontend/dist"
  echo "// $1" >"$d/backend/dist/server.js"; echo "<html>$1</html>" >"$d/frontend/dist/index.html"
  echo "// eco $1" >"$d/ecosystem.config.js"; echo "{\"id\":\"$1\"}" >"$d/RELEASE.json"
  echo '{"name":"x"}' >"$d/backend/package.json"
  (cd "$SB/build" && tar -czf "$1.tar.gz" "$1" && sha256sum "$1.tar.gz" >"$1.tar.gz.sha256")
}
run() { sh "$SCRIPT" "$@" >"$SB/out.log" 2>&1; echo $?; }
link() { readlink "$APP/$1"; }

echo "prepare"
reset_app; mk_release rel-good-1
check "refuses a tarball whose sha256 does not match" '
  echo tampered >>"$SB/build/rel-good-1.tar.gz"; [ "$(run prepare "$SB/build/rel-good-1.tar.gz")" != 0 ] && [ ! -d "$RELEASES_DIR/rel-good-1" ]'
reset_app; mk_release rel-good-1
check "refuses when there is too little free disk" '
  [ "$(MIN_FREE_MB=999999999 run prepare "$SB/build/rel-good-1.tar.gz")" != 0 ] && [ ! -d "$RELEASES_DIR/rel-good-1" ]'
check "unpacks, links the shared .env and runs npm ci --omit=dev in the release" '
  [ "$(run prepare "$SB/build/rel-good-1.tar.gz")" = 0 ] && [ "$(readlink "$RELEASES_DIR/rel-good-1/backend/.env")" = "$APP/backend/.env" ] \
  && [ -f "$RELEASES_DIR/rel-good-1/backend/node_modules/marker" ] && grep -q "npm ci --omit=dev" "$SB/npm.log"'
check "changes nothing that is live (old dirs are still real directories, pm2 not touched)" '
  [ -d "$APP/backend/dist" ] && [ ! -L "$APP/backend/dist" ] && [ ! -L "$APP/frontend/dist" ] && ! grep -q startOrReload "$SB/pm2.log"'
check "refuses to prepare the same release twice" '[ "$(run prepare "$SB/build/rel-good-1.tar.gz")" != 0 ]'
reset_app; mk_release rel-good-1; : >"$SB/npm.fail"
check "a failed npm ci removes the release and changes nothing" '
  [ "$(run prepare "$SB/build/rel-good-1.tar.gz")" != 0 ] && [ ! -d "$RELEASES_DIR/rel-good-1" ] && [ ! -L "$APP/backend/dist" ]'

echo "activate (first release: the old real folders are moved aside)"
reset_app; mk_release rel-good-1; run prepare "$SB/build/rel-good-1.tar.gz" >/dev/null
check "refuses a release that was not prepared" '[ "$(run activate nope)" != 0 ] && [ ! -L "$APP/backend/dist" ]'
check "activates: four links point into the release" '
  [ "$(run activate rel-good-1)" = 0 ] && [ "$(link backend/dist)" = "$RELEASES_DIR/rel-good-1/backend/dist" ] \
  && [ "$(link backend/node_modules)" = "$RELEASES_DIR/rel-good-1/backend/node_modules" ] \
  && [ "$(link frontend/dist)" = "$RELEASES_DIR/rel-good-1/frontend/dist" ] && [ "$(link ecosystem.config.js)" = "$RELEASES_DIR/rel-good-1/ecosystem.config.js" ]'
check "the old folders were kept (moved aside), not deleted" '
  cat "$APP"/backend/dist.pre-release-*/old.txt | grep -q old && cat "$APP"/frontend/dist.pre-release-*/index.html | grep -q old-fe && grep -q old-eco "$APP"/ecosystem.config.js.pre-release-*'
check "pm2 reloaded the API and the worker and saved" 'grep -q "startOrReload .*--only gema-backend" "$SB/pm2.log" && grep -q "startOrReload .*--only gema-worker" "$SB/pm2.log" && grep -q "pm2 save" "$SB/pm2.log"'
check ".env and uploads are untouched and still where the app expects them" '
  [ "$(cat "$APP/backend/.env")" = "SECRET=1" ] && [ -f "$APP/backend/uploads/keep.pdf" ]'
check "current points at the release" '[ "$(readlink "$RELEASES_DIR/current")" = "$RELEASES_DIR/rel-good-1" ]'

echo "activate a second, good release"
mk_release rel-good-2; run prepare "$SB/build/rel-good-2.tar.gz" >/dev/null
check "switches to it and remembers the first as previous" '
  [ "$(run activate rel-good-2)" = 0 ] && [ "$(link backend/dist)" = "$RELEASES_DIR/rel-good-2/backend/dist" ] && grep -q "rel-good-1" "$RELEASES_DIR/.previous"'

echo "activate a release that fails its health check"
mk_release rel-BAD-3; run prepare "$SB/build/rel-BAD-3.tar.gz" >/dev/null; : >"$SB/pm2.log"
check "rolls back by itself, exits non-zero, serves the previous release again" '
  [ "$(run activate rel-BAD-3)" != 0 ] && [ "$(link backend/dist)" = "$RELEASES_DIR/rel-good-2/backend/dist" ] \
  && [ "$(link frontend/dist)" = "$RELEASES_DIR/rel-good-2/frontend/dist" ] && grep -q "rolling back automatically" "$SB/out.log"'
check "reloaded pm2 again after rolling back" '[ "$(grep -c startOrReload "$SB/pm2.log")" -ge 4 ]'
check "current still points at the last good release" '[ "$(readlink "$RELEASES_DIR/current")" = "$RELEASES_DIR/rel-good-2" ]'
check "the failed release is kept for inspection" '[ -d "$RELEASES_DIR/rel-BAD-3" ]'

echo "pm2 reload failure"
mk_release rel-good-4; run prepare "$SB/build/rel-good-4.tar.gz" >/dev/null; : >"$SB/pm2.fail"
check "a pm2 reload error also rolls back" '
  [ "$(run activate rel-good-4)" != 0 ] && [ "$(link backend/dist)" = "$RELEASES_DIR/rel-good-2/backend/dist" ]'
rm -f "$SB/pm2.fail"

echo "rollback command"
run activate rel-good-4 >/dev/null
check "goes back to the release that was live before" '
  [ "$(run rollback)" = 0 ] && [ "$(link backend/dist)" = "$RELEASES_DIR/rel-good-2/backend/dist" ]'
reset_app
check "rollback with nothing recorded fails and changes nothing" '[ "$(run rollback)" != 0 ] && [ ! -L "$APP/backend/dist" ]'
reset_app; mk_release rel-good-1; run prepare "$SB/build/rel-good-1.tar.gz" >/dev/null; run activate rel-good-1 >/dev/null
check "rollback after the FIRST release returns to the original folders" '
  [ "$(run rollback)" = 0 ] && cat "$APP/backend/dist/old.txt" | grep -q old && cat "$APP/frontend/dist/index.html" | grep -q old-fe'

echo "prune"
reset_app
for n in 1 2 3 4 5; do mk_release "rel-good-$n"; run prepare "$SB/build/rel-good-$n.tar.gz" >/dev/null; sleep 1; done
run activate rel-good-5 >/dev/null
check "keeps KEEP newest releases and the live one, deletes older ones, never the current symlink" '
  [ -d "$RELEASES_DIR/rel-good-5" ] && [ -d "$RELEASES_DIR/rel-good-4" ] && [ ! -d "$RELEASES_DIR/rel-good-1" ] && [ -L "$RELEASES_DIR/current" ]'
check "old pre-release folders are not deleted automatically" 'ls "$APP"/backend/dist.pre-release-* >/dev/null 2>&1'

echo "status / usage"
check "status runs and shows the live links" '[ "$(run status)" = 0 ] && grep -q "backend/dist" "$SB/out.log"'
check "no arguments prints usage and exits 2" '[ "$(run)" = 2 ]'
check "refuses to run without the shared .env" 'rm -f "$APP/backend/.env"; [ "$(run activate rel-good-5)" != 0 ]'

echo
echo "passed: $PASS   failed: $FAIL"
[ "$FAIL" -eq 0 ]
