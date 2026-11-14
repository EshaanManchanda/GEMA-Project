#!/usr/bin/env bash
#
# Kidrove VPS audit: find out WHY the disk is full / CPU is high, and look for signs of abuse.
#
#   sudo bash server-audit.sh              # writes ~/kidrove-audit-<timestamp>.txt
#   QUICK=1 sudo bash server-audit.sh      # skips the whole-disk `find` scans
#
# READ-ONLY: it changes nothing on the server. It only writes the report file (mode 600).
# It runs at low CPU/IO priority so it does not make a busy server worse.
#
# Privacy: secrets, connection-string passwords, e-mail addresses and long tokens are masked,
# and IPv4 addresses lose their last octet (MASK_IPS=0 keeps them). IPv6 is not masked (rare).
# Read the report before you share it. It never prints .env values: only set/unset for a fixed
# list of names, plus the values of a few non-secret settings (LOG_LEVEL etc.).
#
# Settings (environment variables):
#   APP_DIR    /var/www/GEMA-Project        checkout that contains backend/
#   NGINX_LOG_DIR  /var/log/nginx           where nginx access logs live
#   LOG_LINES  300000                       how many recent lines of each access log to analyse
#   MASK_IPS   1
#   QUICK      0
#   SAMPLE_SECONDS 30                       how long the baseline watches log files grow
#   OUT        $HOME/kidrove-audit-<timestamp>.txt

set -u
export LC_ALL=C
umask 077

APP_DIR="${APP_DIR:-/var/www/GEMA-Project}"
NGINX_LOG_DIR="${NGINX_LOG_DIR:-/var/log/nginx}"
LOG_LINES="${LOG_LINES:-300000}"
MASK_IPS="${MASK_IPS:-1}"
QUICK="${QUICK:-0}"
SAMPLE_SECONDS="${SAMPLE_SECONDS:-30}"
OUT="${OUT:-${HOME:-/tmp}/kidrove-audit-$(date +%Y%m%d-%H%M%S).txt}"

have() { command -v "$1" >/dev/null 2>&1; }
t() { if have timeout; then timeout "${CMD_TIMEOUT:-90}" "$@"; else "$@"; fi; }
# Lowest CPU and disk priority for this whole script, so it cannot slow a busy server further.
have renice && renice -n 19 -p $$ >/dev/null 2>&1
have ionice && ionice -c3 -p $$ >/dev/null 2>&1
# as_owner <dir> <command...>: when running as root, run the command as the owner of <dir>.
# The checkout and ~/.pm2 belong to another user; git config (core.fsmonitor) or a pm2 daemon in
# a directory that user controls must never execute with root privileges.
as_owner() {
  local dir="$1" owner home; shift
  owner=$(stat -c %U "$dir" 2>/dev/null)
  if [ "$(id -u)" = "0" ] && [ -n "$owner" ] && [ "$owner" != "root" ] && have runuser; then
    home=$(getent passwd "$owner" | cut -d: -f6)
    runuser -u "$owner" -- env HOME="${home:-/nonexistent}" "$@"
  elif [ "$(id -u)" = "0" ] && [ -n "$owner" ] && [ "$owner" != "root" ]; then
    echo "(skipped: no runuser to drop privileges to $owner)"
  else
    "$@"
  fi
}
# True only if a pm2 daemon already runs for this user: pm2 commands would otherwise START one.
pm2_running() { have pm2 && [ -S "${PM2_HOME:-${HOME:-/root}/.pm2}/rpc.sock" ]; }
section() { printf '\n==================== %s ====================\n' "$1"; }
sub() { printf '\n--- %s ---\n' "$1"; }
note() { printf '(%s)\n' "$1"; }

# Everything printed passes through this, so a secret cannot reach the report by accident.
redact() {
  sed -E \
    -e 's#(mongodb(\+srv)?|rediss?|postgres(ql)?|amqp)://[^@/ ]+@#\1://***@#g' \
    -e 's#(--?[A-Za-z_-]*(pass(word|wd)?|token|secret|api-?key|key)[A-Za-z_-]*)([= ]+)[^ ]+#\1\4***#Ig' \
    -e 's#[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}#<email>#g' \
    -e 's#[A-Za-z0-9+_=-]{48,}#<long-token>#g' \
    | if [ "$MASK_IPS" = "1" ]; then
        sed -E 's#\b([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\.[0-9]{1,3}\b#\1.x#g'
      else
        cat
      fi
}

# ---------------------------------------------------------------------------------------------
disk() {
  section "DISK: what is using the space"
  sub "filesystems"
  df -hT -x tmpfs -x devtmpfs -x squashfs -x overlay 2>/dev/null || df -h
  sub "inodes (a full inode table also reports 'disk full')"
  df -i / 2>/dev/null

  sub "largest top-level directories (one filesystem)"
  du -xh --max-depth=1 / 2>/dev/null | sort -rh | head -15
  for d in /var /var/lib /var/log /home /root /opt /srv "$APP_DIR" "$APP_DIR/backend"; do
    [ -d "$d" ] || continue
    sub "inside $d"
    du -xh --max-depth=1 "$d" 2>/dev/null | sort -rh | head -10
  done

  if [ "$QUICK" != "1" ]; then
    sub "10 biggest files on the system"
    find / -xdev -type f -size +100M -printf '%s\t%TY-%Tm-%Td\t%p\n' 2>/dev/null | sort -rn | head -10 \
      | awk -F'\t' '{printf "%8.1f MB  modified %s  %s\n", $1/1048576, $2, $3}'
    sub "files over 20 MB that changed in the last 3 days (what grew recently)"
    find / -xdev -type f -mtime -3 -size +20M -printf '%s\t%TY-%Tm-%Td %TH:%TM\t%p\n' 2>/dev/null | sort -rn | head -20 \
      | awk -F'\t' '{printf "%8.1f MB  %s  %s\n", $1/1048576, $2, $3}'
  else
    note "QUICK=1: skipped the whole-disk find scans"
  fi

  sub "deleted files still held open by a process (space is NOT freed until it exits)"
  if have lsof; then
    t lsof -nP +L1 2>/dev/null | awk 'NR==1 || $7+0 > 50000000' | head -15
  else
    ls -l /proc/[0-9]*/fd 2>/dev/null | grep '(deleted)' | head -15
  fi

  sub "logs"
  ls -lhS "$NGINX_LOG_DIR" 2>/dev/null | head -12
  for h in /root /home/*; do
    [ -d "$h/.pm2/logs" ] && { echo "$h/.pm2/logs:"; ls -lhS "$h/.pm2/logs" | head -8; }
  done
  [ -d /var/log/GEMA-Project ] && { echo "/var/log/GEMA-Project:"; ls -lhS /var/log/GEMA-Project/* 2>/dev/null | head -10; }
  [ -d "$APP_DIR/backend/logs" ] && { echo "$APP_DIR/backend/logs:"; ls -lhS "$APP_DIR/backend/logs" | head -10; }
  have journalctl && journalctl --disk-usage 2>/dev/null
  pm2_running && { echo; echo "pm2-logrotate installed?"; pm2 ls 2>/dev/null | grep -i logrotate || echo "NO: pm2 logs are never rotated"; }

  sub "uploads (user files stored on this disk)"
  U="$APP_DIR/backend/uploads"
  if [ -d "$U" ]; then
    du -sh "$U" 2>/dev/null
    du -xh --max-depth=2 "$U" 2>/dev/null | sort -rh | head -12
    echo "files total:            $(find "$U" -type f 2>/dev/null | wc -l)"
    echo "files created last 2d:  $(find "$U" -type f -mtime -2 2>/dev/null | wc -l)"
    echo "MB created last 2d:     $(find "$U" -type f -mtime -2 -printf '%s\n' 2>/dev/null | awk '{s+=$1} END{printf "%.1f", s/1048576}')"
    sub "uploads: script or executable files (should be none)"
    find "$U" -type f \( -name '*.php' -o -name '*.sh' -o -name '*.js' -o -name '*.jsp' -o -name '*.py' -o -name '*.pl' -o -perm -u+x \) 2>/dev/null | head -20
  else
    note "no $U"
  fi

  sub "databases, caches, backups, temp"
  du -sh /var/lib/mongodb /var/lib/redis /var/lib/docker /var/backups /var/backups/kidrove /tmp /var/tmp 2>/dev/null
  ls -lh /var/backups/kidrove 2>/dev/null | head -10
  echo "leftover chromium profiles in /tmp: $(ls -d /tmp/puppeteer_dev_chrome_profile-* /tmp/.org.chromium.* 2>/dev/null | wc -l)"
  have docker && { sub "docker"; t docker system df 2>/dev/null; }
}

# ---------------------------------------------------------------------------------------------
# log_growth <seconds> <file...>: bytes per minute each file grew over the window, largest first.
log_growth() {
  local secs="$1" f after; shift
  declare -A before=()
  for f in "$@"; do [ -f "$f" ] && before["$f"]=$(stat -c %s "$f" 2>/dev/null); done
  sleep "$secs"
  for f in "$@"; do
    [ -n "${before[$f]:-}" ] || continue
    after=$(stat -c %s "$f" 2>/dev/null) || continue
    printf '%12d B/min  %s\n' $(( (after - ${before[$f]}) * 60 / secs )) "$f"
  done | sort -rn
}

# The "before" numbers every later fix is compared with: who burns CPU, what grows and how fast,
# which code is deployed, what the queues look like, and why nginx answers 500/502.
baseline() {
  section "BASELINE: CPU per process, growth per minute, deployed code, queues, nginx errors"
  sub "deployed code ($APP_DIR)"
  if [ -d "$APP_DIR/.git" ]; then
    as_owner "$APP_DIR" git -C "$APP_DIR" log -1 --format='commit %h  %ci  %an  %s' 2>/dev/null
    echo "branch: $(as_owner "$APP_DIR" git -C "$APP_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null)"
    as_owner "$APP_DIR" git -C "$APP_DIR" status -sb 2>/dev/null | head -8
  else
    note "no git checkout at $APP_DIR"
  fi
  sub "frontend build in place? (a missing index.html makes nginx answer 500)"
  ls -l --time-style=long-iso "$APP_DIR/frontend/dist/index.html" 2>/dev/null || echo "MISSING: $APP_DIR/frontend/dist/index.html"
  echo "leftover dist.backup.* directories: $(ls -d "$APP_DIR"/frontend/dist.backup.* "$APP_DIR"/backend/dist.backup.* 2>/dev/null | wc -l)"

  sub "CPU: third of 3 samples, 2 s apart (busiest processes)"
  have top && top -b -n 3 -d 2 -o %CPU 2>/dev/null | awk '/^top -/{n++} n==3' | head -16 | cut -c1-160
  sub "memory pressure and swap (vmstat, 3 samples)"
  have vmstat && vmstat 2 3

  sub "pm2 processes for every user (restart count and uptime reveal crash loops)"
  local h
  for h in /root /home/*; do
    [ -d "$h/.pm2" ] || continue
    echo "[$h/.pm2]"
    # only talk to a daemon that already runs: never start one (and never as root for another user)
    [ -S "$h/.pm2/rpc.sock" ] || { echo "(no running pm2 daemon)"; continue; }
    have node && have pm2 && as_owner "$h/.pm2" env PM2_HOME="$h/.pm2" pm2 jlist 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{for(const p of JSON.parse(s.slice(s.indexOf("[")))){const e=p.pm2_env||{},m=p.monit||{};console.log([p.name,"pid="+p.pid,e.status,"restarts="+e.restart_time,"unstable="+e.unstable_restarts,"up_min="+(e.pm_uptime?Math.round((Date.now()-e.pm_uptime)/6e4):0),"cpu="+m.cpu+"%","mem_mb="+Math.round((m.memory||0)/1048576)].join("  "))}}catch(x){console.log("cannot parse pm2 jlist: "+x.message)}})'
  done

  sub "growth: bytes per minute over ${SAMPLE_SECONDS}s (application, pm2 and nginx logs)"
  local logs used1 used2
  mapfile -t logs < <(printf '%s\n' "$APP_DIR"/backend/logs/*.log /var/log/GEMA-Project/backend/*.log /root/.pm2/logs/*.log /home/*/.pm2/logs/*.log "$NGINX_LOG_DIR"/*.log | sort -u)
  used1=$(df -B1 --output=used / 2>/dev/null | tail -1 | tr -d ' ')
  log_growth "$SAMPLE_SECONDS" "${logs[@]}" | head -15
  used2=$(df -B1 --output=used / 2>/dev/null | tail -1 | tr -d ' ')
  [ -n "$used1" ] && [ -n "$used2" ] && printf 'whole disk (everything, not just logs): %d B/min\n' $(( (used2 - used1) * 60 / SAMPLE_SECONDS ))

  sub "Redis memory, clients, busiest commands, slow log, queue lengths"
  if have redis-cli; then
    redis-cli INFO memory 2>/dev/null | grep -E '^(used_memory_human|maxmemory_human|maxmemory_policy|mem_fragmentation_ratio):'
    redis-cli INFO clients 2>/dev/null | grep -E '^(connected_clients|blocked_clients):'
    redis-cli INFO stats 2>/dev/null | grep -E '^(instantaneous_ops_per_sec|total_commands_processed):'
    echo "most used commands (calls  name):"
    redis-cli INFO commandstats 2>/dev/null | sed -nE 's/^cmdstat_([^:]+):calls=([0-9]+),.*/\2 \1/p' | sort -rn | head -8
    echo "SLOWLOG GET 10:"
    redis-cli SLOWLOG GET 10 2>/dev/null | head -40
    echo "DBSIZE: $(redis-cli DBSIZE 2>/dev/null)"
    local k kind
    for kind in wait active delayed failed; do
      redis-cli --scan --pattern "*:$kind" 2>/dev/null | head -20 | while read -r k; do
        case "$(redis-cli TYPE "$k" 2>/dev/null)" in
          list) echo "$kind  $(redis-cli LLEN "$k")  $k" ;;
          zset) echo "$kind  $(redis-cli ZCARD "$k")  $k" ;;
        esac
      done
    done
  else
    note "redis-cli not installed"
  fi
  sub "MongoDB"
  note "the database is remote (MONGODB_URI): read connections, CPU and slow operations in the provider console; nothing is queried from here"

  sub "nginx error logs: signatures of the 500 / 502 responses"
  local f p
  for f in "$NGINX_LOG_DIR"/error.log "$NGINX_LOG_DIR"/*-error.log; do
    [ -r "$f" ] || continue
    echo "$f  $(du -h "$f" | cut -f1)  last 50000 lines:"
    for p in 'index\.html.*(failed|not found)|directory index .* is forbidden|No such file or directory' 'connect\(\) failed|upstream prematurely closed|Connection refused' 'redirection cycle' 'limiting requests' 'worker_connections' 'upstream timed out'; do
      printf '%8s  %s\n' "$(tail -n 50000 "$f" | grep -ciE "$p")" "$p"
    done
    echo "most recent 3 lines:"
    tail -n 3 "$f" | cut -c1-240
  done
}

# ---------------------------------------------------------------------------------------------
cpu() {
  section "CPU, MEMORY AND PROCESSES"
  have uptime && uptime; echo "cores: $(nproc 2>/dev/null)"; have free && free -m
  sub "top 15 processes by CPU (args masked)"
  ps -eo pid,user,pcpu,pmem,etime,args --sort=-pcpu 2>/dev/null | head -16 | cut -c1-200
  sub "top 8 by memory"
  ps -eo pid,user,pcpu,pmem,rss,args --sort=-rss 2>/dev/null | head -9 | cut -c1-200
  sub "chromium/chrome processes (leaked headless browsers burn CPU and RAM)"
  echo "count: $(pgrep -fc 'chrom' 2>/dev/null)"
  sub "known miner / malware process names"
  pgrep -fal 'xmrig|kdevtmpfsi|kinsing|minerd|cpuminer|cryptonight|stratum|\.systemd-private|/tmp/\.' 2>/dev/null | head || true
  sub "processes running from /tmp, /dev/shm, /var/tmp, or from a deleted binary"
  ls -l /proc/[0-9]*/exe 2>/dev/null | grep -E ' /tmp/| /dev/shm/| /var/tmp/|\(deleted\)' | head -15
  pm2_running && { sub "pm2 (note the restart count and uptime columns)"; pm2 list 2>/dev/null; }
  have sar && { sub "CPU history (sar)"; sar -u 2>/dev/null | tail -15; }
}

# ---------------------------------------------------------------------------------------------
net() {
  section "NETWORK EXPOSURE AND CONNECTIONS"
  sub "listening sockets (only nginx 80/443 and sshd should face the internet)"
  have ss && ss -tulpen 2>/dev/null | cut -c1-170
  sub "firewall"
  have ufw && ufw status verbose 2>/dev/null
  have fail2ban-client && fail2ban-client status 2>/dev/null
  sub "established connections by remote address (top 15)"
  have ss && ss -tn state established 2>/dev/null | awk 'NR>1{split($4,a,":"); print a[1]}' | sort | uniq -c | sort -rn | head -15
  sub "outbound connections to common mining-pool ports"
  have ss && ss -tn state established 2>/dev/null | grep -E ':(3333|4444|5555|7777|14444|45700)\b' | head
  have ss && ss -s 2>/dev/null
}

# ---------------------------------------------------------------------------------------------
analyse_log() {
  local f="$1"
  [ -r "$f" ] || { note "cannot read $f (run with sudo)"; return; }
  lines() { if [[ "$f" == *.gz ]]; then zcat "$f" | tail -n "$LOG_LINES"; else tail -n "$LOG_LINES" "$f"; fi; }
  sub "$f"
  ls -lh "$f"
  echo "format sample (query string removed): $(lines | head -1 | sed -E 's/\?[^ "]*//' | cut -c1-200)"
  echo "assumes nginx 'combined' format: \$1 ip, \$7 path, \$9 status, \$10 bytes, 6th quoted field = user agent"
  lines | awk 'NR==1{a=$4} {b=$4;n++} END{printf "%d lines, from %s to %s\n", n, a, b}'

  sub "status codes"
  lines | awk '{print $9}' | sort | uniq -c | sort -rn | head -8
  sub "requests per hour (chronological, last 48 buckets)"
  lines | awk '{print substr($4,2,14)}' | uniq -c | tail -48
  sub "top 15 client addresses by request count"
  lines | awk '{print $1}' | sort | uniq -c | sort -rn | head -15
  sub "top 10 client addresses by bytes sent to them"
  lines | awk '{b[$1]+=$10} END{for(i in b) printf "%10.1f MB  %s\n", b[i]/1048576, i}' | sort -rn | head -10
  sub "top 12 user agents"
  lines | awk -F'"' '{print $6}' | sort | uniq -c | sort -rn | head -12 | cut -c1-150
  sub "top 15 paths by hits (query removed, ids folded)"
  lines | awk '{p=$7; sub(/\?.*/,"",p); gsub(/[0-9a-fA-F]{24}/,":id",p); c[p]++} END{for(p in c) print c[p], p}' | sort -rn | head -15
  sub "top 15 paths by bytes sent"
  lines | awk '{p=$7; sub(/\?.*/,"",p); gsub(/[0-9a-fA-F]{24}/,":id",p); b[p]+=$10; c[p]++} END{for(p in b) printf "%10.1f MB  %7d hits  %s\n", b[p]/1048576, c[p], p}' | sort -rn | head -15
  sub "responses over 5 MB (address, bytes, path)"
  lines | awk '$10>5000000{p=$7; sub(/\?.*/,"",p); print $1, $10, p}' | sort | uniq -c | sort -rn | head -10
  sub "top POST endpoints (what visitors submit)"
  lines | awk '$6=="\"POST"{p=$7; sub(/\?.*/,"",p); gsub(/[0-9a-fA-F]{24}/,":id",p); print p, $9}' | sort | uniq -c | sort -rn | head -15
  sub "login / signup / reset attempts per address (top 10)"
  lines | awk '$6=="\"POST" && $7 ~ /^\/api\/auth\/(login|register|forgot-password|firebase|reset-password)/{print $1, $9}' | sort | uniq -c | sort -rn | head -10
  sub "attack-pattern hit counts"
  local p
  for p in '\.env' '\.git/' 'wp-login|wp-admin|xmlrpc' 'phpmyadmin|/pma' '/etc/passwd|\.\./' 'union.{0,20}select|sleep\(|benchmark\(' '<script|javascript:' 'jndi:|\$\{' 'cgi-bin|/actuator|/vendor/phpunit|/boaform|/HNAP1' 'eval\(|base64_decode|wget |curl '; do
    printf '%8s  %s\n' "$(lines | grep -ciE "$p")" "$p"
  done
}

weblogs() {
  section "WEB SERVER ACCESS LOGS (last $LOG_LINES lines of each)"
  local f found=0
  for f in "$NGINX_LOG_DIR"/*access*.log "$NGINX_LOG_DIR"/*access*.log.1; do
    [ -e "$f" ] || continue
    found=1
    analyse_log "$f"
  done
  [ "$found" = 0 ] && note "no access logs found in $NGINX_LOG_DIR (set NGINX_LOG_DIR)"
}

# ---------------------------------------------------------------------------------------------
compromise() {
  section "SIGNS OF COMPROMISE"
  sub "accounts with a login shell, and any uid 0 besides root"
  awk -F: '$7 !~ /(nologin|false)$/ {print $1, "uid="$3, $6, $7}' /etc/passwd
  awk -F: '$3==0 && $1!="root"{print "EXTRA UID 0 ACCOUNT: "$1}' /etc/passwd
  sub "sudo group"
  getent group sudo 2>/dev/null
  sub "ssh authorized_keys (fingerprints only, with file age)"
  for f in /root/.ssh/authorized_keys /home/*/.ssh/authorized_keys; do
    [ -f "$f" ] || continue
    echo "$f  modified $(date -r "$f" +%F)  keys: $(grep -cE '^(ssh|ecdsa)' "$f")"
    have ssh-keygen && ssh-keygen -lf "$f" 2>/dev/null
  done
  sub "recent logins"
  last -n 15 -a 2>/dev/null
  echo "failed login attempts on record (lastb): $(lastb 2>/dev/null | grep -vc '^$')"
  if [ -r /var/log/auth.log ]; then
    echo "failed ssh passwords in auth.log: $(grep -c 'Failed password' /var/log/auth.log)"
    echo "accepted ssh logins by user and address:"
    grep 'Accepted' /var/log/auth.log | awk '{print $9, $11}' | sort | uniq -c | sort -rn | head -10
  elif have journalctl; then
    echo "failed ssh passwords (2 days): $(journalctl -u ssh -u sshd --since '2 days ago' 2>/dev/null | grep -c 'Failed password')"
  fi
  sub "ssh server settings"
  have sshd && sshd -T 2>/dev/null | grep -E '^(port|permitrootlogin|passwordauthentication|pubkeyauthentication|permitemptypasswords|maxauthtries) '
  sub "scheduled jobs for every user, /etc/cron.d, systemd timers"
  for u in $(cut -d: -f1 /etc/passwd); do
    c=$(crontab -u "$u" -l 2>/dev/null | grep -vE '^\s*(#|$)')
    [ -n "$c" ] && { echo "[$u]"; echo "$c"; }
  done
  ls -la /etc/cron.d 2>/dev/null
  have systemctl && systemctl list-timers --all 2>/dev/null | head -15
  sub "files changed in the last 14 days in system locations"
  find /etc /usr/bin /usr/local/bin /usr/sbin /etc/systemd/system -xdev -type f -mtime -14 2>/dev/null | head -25
  if [ -d "$APP_DIR" ]; then
    sub "app files changed in the last 14 days (excluding node_modules, .git, uploads, logs)"
    find "$APP_DIR" -xdev -type f -mtime -14 -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/uploads/*' -not -path '*/logs/*' 2>/dev/null | head -25
  fi
  sub "hidden or odd files in world-writable temp dirs"
  ls -la /tmp /dev/shm /var/tmp 2>/dev/null | grep -E '^\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\.' | head -20
  [ -s /etc/ld.so.preload ] && { echo "ALERT /etc/ld.so.preload is not empty:"; cat /etc/ld.so.preload; }
}

# ---------------------------------------------------------------------------------------------
apps() {
  section "APPLICATION AND DATA STORES"
  have node && echo "node $(node -v)"; have pm2 && echo "pm2 $(pm2 -v 2>/dev/null)"
  have nginx && nginx -v 2>&1; have mongod && mongod --version 2>/dev/null | head -1
  have redis-server && redis-server --version 2>/dev/null
  sub "MongoDB / Redis: binding and authentication (values never printed)"
  grep -E '^\s*(bindIp|port|authorization):' /etc/mongod.conf 2>/dev/null
  awk '/^bind /||/^protected-mode /||/^appendonly /||/^dir /{print} /^requirepass /{print "requirepass: SET"}' /etc/redis/redis.conf 2>/dev/null
  have docker && docker ps --format '{{.Names}}  {{.Ports}}' 2>/dev/null
  E="$APP_DIR/backend/.env"
  sub "backend .env (non-secret settings shown; secrets only as set/unset)"
  if [ -r "$E" ]; then
    grep -E '^(NODE_ENV|LOG_LEVEL|ENABLE_REQUEST_LOGGING|UPLOAD_PROVIDER|LOG_RETENTION_DAYS|ERROR_LOG_RETENTION_DAYS|ENABLE_ADMIN_REGISTRATION)=' "$E"
    local k v
    for k in JWT_SECRET JWT_REFRESH_SECRET SESSION_SECRET ADMIN_SECRET_KEY FIELD_ENCRYPTION_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET MONGODB_URI REDIS_URL SENTRY_DSN CLOUDINARY_API_SECRET; do
      v=$(grep -E "^$k=" "$E" | head -1 | cut -d= -f2-)
      [ -n "$v" ] && echo "$k: set" || echo "$k: UNSET"
    done
  else
    note "cannot read $E"
  fi
  sub "TLS certificates and renewal"
  have certbot && certbot certificates 2>/dev/null | grep -E 'Certificate Name|Domains|Expiry'
  have systemctl && systemctl list-timers 2>/dev/null | grep -i certbot
  sub "updates"
  have apt && echo "upgradable packages: $(apt list --upgradable 2>/dev/null | grep -vc '^Listing')"
  have systemctl && systemctl is-enabled unattended-upgrades 2>/dev/null
}

# ---------------------------------------------------------------------------------------------
applogs() {
  section "APPLICATION LOGS: what is filling backend/logs"
  local d="$APP_DIR/backend/logs" f
  [ -d "$d" ] || { note "no $d"; return; }
  ls -lhS --time-style=long-iso "$d" 2>/dev/null | head -15
  # The old unrotated files, plus the newest dated file of each kind from the rotating logger.
  for f in "$d/error.log" "$d/combined.log" $(ls -t "$d"/*error-*.log 2>/dev/null | head -1) $(ls -t "$d"/*combined-*.log 2>/dev/null | head -1); do
    [ -r "$f" ] || continue
    sub "$f"
    ls -l --time-style=long-iso "$f" | awk '{printf "%.2f GB, last written %s %s\n", $5/1073741824, $6, $7}'
    echo "first entry: $(head -n 1 "$f" | grep -oE '"timestamp": ?"[^"]*"' | head -1)"
    echo "last entry:  $(tail -n 1 "$f" | grep -oE '"timestamp": ?"[^"]*"' | head -1)"
    echo "level mix, last 200000 lines:"
    tail -n 200000 "$f" | grep -oE '"level": ?"[a-z]*"' | sort | uniq -c | sort -rn
    echo "most repeated messages, last 200000 lines:"
    tail -n 200000 "$f" | grep -oE '"message": ?"[^"]{0,140}' | sed -E 's/[0-9a-fA-F]{24}/<id>/g; s/[0-9]+/N/g' | sort | uniq -c | sort -rn | head -15
    echo "BullMQ auto-pipelining signature 'pipeline[functionName]' in last 200000 lines: $(tail -n 200000 "$f" | grep -c 'pipeline\[functionName\]')"
  done
  if pm2_running; then
    sub "pm2: last error lines of the worker and the API"
    pm2 logs gema-worker --lines 20 --nostream --err 2>/dev/null | cut -c1-220
    pm2 logs gema-backend --lines 20 --nostream --err 2>/dev/null | cut -c1-220
  fi
}

main() {
  echo "Kidrove server audit  $(date -u +%FT%TZ)  host: $(hostname)  user: $(id -un)"
  [ "$(id -u)" != "0" ] && echo "NOTE: not running as root. Many checks will be empty. Re-run with sudo."
  echo "settings: APP_DIR=$APP_DIR NGINX_LOG_DIR=$NGINX_LOG_DIR LOG_LINES=$LOG_LINES MASK_IPS=$MASK_IPS QUICK=$QUICK"
  disk
  baseline
  applogs
  cpu
  net
  weblogs
  compromise
  apps
  printf '\n==================== END ====================\n'
}

# Run only when executed, not when sourced (the test sources this file to check redact()).
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main 2>&1 | redact > "$OUT"
  echo "Report written to $OUT ($(wc -c < "$OUT") bytes). Read it, then paste it back."
fi
