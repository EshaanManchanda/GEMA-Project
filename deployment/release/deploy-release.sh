#!/bin/sh
# Atomic release switch for kidrove. Runs ON THE SERVER, as the user that owns the pm2 processes.
# Plain POSIX sh (Ubuntu's dash). Never builds anything: the release tarball is built off the server
# by build-release.sh. See deployment/RUNBOOK.md for the order of steps and the maintenance window.
#
#   deploy-release.sh prepare <release.tar.gz>   unpack + npm ci --omit=dev (slow, no downtime)
#   deploy-release.sh activate <release-id>      switch the live links, reload pm2, health-check,
#                                                roll back by itself if the check fails
#   deploy-release.sh rollback                   go back to what was live before the last activate
#   deploy-release.sh status                     what is live, what is kept, pm2 state
#   deploy-release.sh prune                      delete old releases (keeps KEEP, current, previous)
#
# What changes on the server: four symlinks under APP_DIR (backend/dist, backend/node_modules,
# frontend/dist, ecosystem.config.js). nginx and pm2 keep their old paths. backend/.env, backend/uploads
# and the log folders stay where they are (shared by every release, never inside one).
set -eu

APP_DIR=${APP_DIR:-/var/www/GEMA-Project}
RELEASES_DIR=${RELEASES_DIR:-/var/www/kidrove-releases}
PM2=${PM2:-pm2}
NPM=${NPM:-npm}
CURL=${CURL:-curl}
HEALTH_URL=${HEALTH_URL:-http://127.0.0.1:5000/health/basic}
HEALTH_TRIES=${HEALTH_TRIES:-30}          # x SLEEP seconds
SLEEP=${SLEEP:-2}
STABLE_SECONDS=${STABLE_SECONDS:-15}      # health must still pass this long after the first success
APPS=${APPS:-"gema-backend gema-worker"}
KEEP=${KEEP:-3}
MIN_FREE_MB=${MIN_FREE_MB:-2048}

# link (relative to APP_DIR) -> path inside a release
LINKS="backend/dist backend/node_modules frontend/dist ecosystem.config.js"
PREVIOUS_FILE="$RELEASES_DIR/.previous"
LOG_FILE="$RELEASES_DIR/deploy.log"
STAMP=$(date +%Y%m%d-%H%M%S)

log() {
  line="$(date '+%Y-%m-%d %H:%M:%S') $*"
  echo "$line"
  [ -d "$RELEASES_DIR" ] && echo "$line" >>"$LOG_FILE" 2>/dev/null || true
}
die() { log "ERROR: $*"; exit 1; }

target_of() { readlink "$1" 2>/dev/null || true; }

# Atomic: build the new link next to the old one, then rename(2) it over. `mv -T` never moves INTO a directory.
swap_link() { # swap_link <link> <target>
  tmp="$1.new.$$"
  rm -f "$tmp"
  ln -s "$2" "$tmp"
  mv -Tf "$tmp" "$1"
}

pm2_reload_all() {
  for app in $APPS; do
    log "pm2 reload $app"
    "$PM2" startOrReload "$APP_DIR/ecosystem.config.js" --env production --only "$app" >/dev/null \
      || return 1
  done
  "$PM2" save >/dev/null 2>&1 || true
}

health_ok() { "$CURL" -fsS -o /dev/null --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; }

wait_healthy() {
  i=0
  while [ "$i" -lt "$HEALTH_TRIES" ]; do
    if health_ok; then
      log "health ok ($HEALTH_URL); watching for ${STABLE_SECONDS}s to catch a crash loop"
      [ "$STABLE_SECONDS" -gt 0 ] && sleep "$STABLE_SECONDS"
      health_ok && return 0
      log "health failed after the first success (restarting?)"
      return 1
    fi
    i=$((i + 1))
    sleep "$SLEEP"
  done
  return 1
}

preflight() {
  [ -d "$APP_DIR/backend" ] || die "APP_DIR $APP_DIR has no backend folder"
  [ -f "$APP_DIR/backend/.env" ] || die "$APP_DIR/backend/.env is missing (the shared environment file)"
  mkdir -p "$RELEASES_DIR"
  "$PM2" jlist >/dev/null 2>&1 || die "'$PM2 jlist' failed: run this as the user that owns the pm2 processes"
}

# ----------------------------------------------------------------------------------------------
cmd_prepare() {
  tarball=${1:-}
  [ -n "$tarball" ] && [ -f "$tarball" ] || die "usage: $0 prepare <release.tar.gz>"
  preflight

  free_mb=$(df -Pm "$RELEASES_DIR" | awk 'NR==2 {print $4}')
  [ "${free_mb:-0}" -ge "$MIN_FREE_MB" ] || die "only ${free_mb:-0} MB free on $RELEASES_DIR (need $MIN_FREE_MB MB). Free disk first (see RUNBOOK step 2)."

  if [ -f "$tarball.sha256" ]; then
    (cd "$(dirname "$tarball")" && sha256sum -c "$(basename "$tarball").sha256" >/dev/null) \
      || die "sha256 mismatch for $tarball: do not use this file"
    log "sha256 ok"
  else
    log "WARNING: no $tarball.sha256 next to the tarball, integrity not checked"
  fi

  id=$(tar -tzf "$tarball" | head -1 | cut -d/ -f1)
  [ -n "$id" ] || die "cannot read the release id from $tarball"
  [ ! -e "$RELEASES_DIR/$id" ] || die "release $id already exists in $RELEASES_DIR"

  incoming="$RELEASES_DIR/.incoming.$$"
  mkdir -p "$incoming"
  trap 'rm -rf "$incoming"' EXIT
  tar -xzf "$tarball" -C "$incoming"
  [ -f "$incoming/$id/backend/dist/server.js" ] || die "release has no backend/dist/server.js"
  [ -f "$incoming/$id/frontend/dist/index.html" ] || die "release has no frontend/dist/index.html"
  [ -f "$incoming/$id/ecosystem.config.js" ] || die "release has no ecosystem.config.js"
  mv "$incoming/$id" "$RELEASES_DIR/$id"
  rm -rf "$incoming"; trap - EXIT

  rel="$RELEASES_DIR/$id"
  ln -s "$APP_DIR/backend/.env" "$rel/backend/.env"      # scripts and the app read .env next to dist
  log "installing production dependencies in $rel/backend (npm ci --omit=dev)"
  (cd "$rel/backend" && "$NPM" ci --omit=dev --no-audit --no-fund) || { rm -rf "$rel"; die "npm ci failed; release removed, nothing was changed"; }
  [ -d "$rel/backend/node_modules" ] || { rm -rf "$rel"; die "npm ci produced no node_modules"; }

  log "release $id is prepared. Nothing live has changed."
  log "next: run the migrations from $rel/backend (RUNBOOK), then: $0 activate $id"
  echo "$id"
}

# ----------------------------------------------------------------------------------------------
record_previous() { # record_previous: what each link points at right now (a real dir counts as "legacy")
  : >"$PREVIOUS_FILE.tmp"
  for rel_link in $LINKS; do
    link="$APP_DIR/$rel_link"
    if [ -L "$link" ]; then
      echo "$rel_link=$(target_of "$link")" >>"$PREVIOUS_FILE.tmp"
    elif [ -e "$link" ]; then
      legacy="$link.pre-release-$STAMP"
      mv "$link" "$legacy"
      log "first release: moved the old $rel_link aside to $legacy"
      echo "$rel_link=$legacy" >>"$PREVIOUS_FILE.tmp"
    else
      echo "$rel_link=" >>"$PREVIOUS_FILE.tmp"
    fi
  done
  mv "$PREVIOUS_FILE.tmp" "$PREVIOUS_FILE"
}

switch_to() { # switch_to <release-dir>
  for rel_link in $LINKS; do
    case "$rel_link" in
      backend/dist) t="$1/backend/dist" ;;
      backend/node_modules) t="$1/backend/node_modules" ;;
      frontend/dist) t="$1/frontend/dist" ;;
      ecosystem.config.js) t="$1/ecosystem.config.js" ;;
    esac
    swap_link "$APP_DIR/$rel_link" "$t"
  done
}

restore_previous() {
  [ -f "$PREVIOUS_FILE" ] || die "no previous release recorded in $PREVIOUS_FILE; nothing to roll back to"
  while IFS='=' read -r rel_link target; do
    [ -n "$target" ] || { log "no previous target for $rel_link, left as is"; continue; }
    swap_link "$APP_DIR/$rel_link" "$target"
  done <"$PREVIOUS_FILE"
}

cmd_activate() {
  id=${1:-}
  [ -n "$id" ] || die "usage: $0 activate <release-id>"
  rel="$RELEASES_DIR/$id"
  preflight
  [ -d "$rel/backend/node_modules" ] || die "release $id is not prepared (no node_modules). Run: $0 prepare <tarball>"
  [ -f "$rel/backend/dist/server.js" ] && [ -f "$rel/frontend/dist/index.html" ] || die "release $id is incomplete"

  log "activating $id"
  record_previous
  switch_to "$rel"
  log "links switched; reloading pm2"

  if pm2_reload_all && wait_healthy; then
    swap_link "$RELEASES_DIR/current" "$rel"
    log "release $id is live and healthy. Roll back with: $0 rollback"
    cmd_prune
    return 0
  fi

  log "NEW RELEASE FAILED its health check: rolling back automatically"
  restore_previous
  pm2_reload_all || log "WARNING: pm2 reload after rollback reported an error, check 'pm2 status'"
  if wait_healthy; then
    log "rolled back; the previous release is serving again. Release $id is kept for inspection."
  else
    log "CRITICAL: rolled back but the health check still fails. Check: pm2 logs gema-backend --lines 100 --nostream"
  fi
  exit 1
}

cmd_rollback() {
  preflight
  log "rolling back to the release recorded in $PREVIOUS_FILE"
  cp "$PREVIOUS_FILE" "$PREVIOUS_FILE.before-rollback" 2>/dev/null || true
  restore_previous
  pm2_reload_all || die "pm2 reload failed after switching the links back"
  wait_healthy || die "rolled back, but the health check still fails: pm2 logs gema-backend --lines 100 --nostream"
  [ -L "$RELEASES_DIR/current" ] && rm -f "$RELEASES_DIR/current"
  log "rolled back and healthy"
}

cmd_status() {
  echo "APP_DIR=$APP_DIR  RELEASES_DIR=$RELEASES_DIR"
  for rel_link in $LINKS; do
    printf '%-24s -> %s\n' "$rel_link" "$(target_of "$APP_DIR/$rel_link")"
  done
  echo "current: $(target_of "$RELEASES_DIR/current")"
  [ -f "$PREVIOUS_FILE" ] && { echo "previous:"; sed 's/^/  /' "$PREVIOUS_FILE"; }
  echo "releases:"; ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null | sed 's/^/  /' || true
  "$PM2" list 2>/dev/null || true
}

cmd_prune() {
  cur=$(target_of "$RELEASES_DIR/current")
  prev=""
  [ -f "$PREVIOUS_FILE" ] && prev=$(cat "$PREVIOUS_FILE")
  n=0
  for dir in $(ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null); do
    dir=${dir%/}
    [ -L "$dir" ] && continue            # the `current` symlink is not a release
    n=$((n + 1))
    [ "$n" -le "$KEEP" ] && continue
    [ "$dir" = "$cur" ] && continue
    case "$prev" in *"$dir"*) continue ;; esac
    log "pruning old release $dir"
    rm -rf "$dir"
  done
  legacy=$(ls -1d "$APP_DIR"/backend/*.pre-release-* "$APP_DIR"/frontend/*.pre-release-* "$APP_DIR"/*.pre-release-* 2>/dev/null || true)
  [ -n "$legacy" ] && log "old pre-release folders are kept until you delete them by hand (disk): $(echo "$legacy" | tr '\n' ' ')"
  return 0
}

case "${1:-}" in
  prepare)  shift; cmd_prepare "$@" ;;
  activate) shift; cmd_activate "$@" ;;
  rollback) cmd_rollback ;;
  status)   cmd_status ;;
  prune)    preflight; cmd_prune ;;
  *) echo "usage: $0 prepare <release.tar.gz> | activate <release-id> | rollback | status | prune" >&2; exit 2 ;;
esac
