# Release runbook: putting `backend_auth` on kidrove.com

Goal: replace the code on the server with a release that was built and tested **off** the server,
switch to it in one atomic step, and be able to go back in seconds. Nothing here builds on the server.

**How it works.** A release lives in its own folder (`/var/www/kidrove-releases/<id>`). Four links under
`/var/www/GEMA-Project` (`backend/dist`, `backend/node_modules`, `frontend/dist`, `ecosystem.config.js`)
point at it. `backend/.env`, `backend/uploads` and the log folders stay where they are and are shared by
every release. nginx and pm2 keep their old paths, so **neither config changes**.

**Rules for this runbook**
- Do the steps in order. Each has an *Expected* line. If the result differs, stop and send me the output.
- Never paste secrets into a chat. Where a command reads a secret it reads it from `.env` and prints nothing.
- Steps 1-3 and 7-8 change nothing that is live. The only moment with downtime is step 10 (about 1-2 minutes).
- Do steps 1-3 first even if you are in a hurry: they are what lets us find out why the disk filled and the CPU hit 94 %.

Commands marked **PC** run on your computer (Git Bash), **SRV** on the server.
`APP=/var/www/GEMA-Project`, `REL=/var/www/kidrove-releases`. Run SRV commands as the user that owns the pm2 processes
(`pm2 list` must show `gema-backend` and `gema-worker`; use `sudo -iu <user>` if you log in as someone else).

---

## 0. PC: the frontend's production settings (once)

The frontend bakes its `VITE_*` values in at build time; they live only in the server's `frontend/.env`.
Copy those lines into a file **outside the repository**, for example `C:\kidrove-secrets\frontend-production.env`.
They are public keys and URLs, but they are not in git and must not be committed.
Check: `VITE_API_URL` is the live API, `VITE_STRIPE_PUBLISHABLE_KEY` starts with `pk_live_`, the `VITE_FIREBASE_*` lines are present.

## 1. SRV: save the evidence (read-only, 10 minutes)

```sh
cd $APP && git log -1 --format='%h %ci %an %s' && git status --short | head
node -v; lsb_release -ds; df -h /; free -m
du -sh $APP/backend/logs /var/log/GEMA-Project ~/.pm2/logs /var/log/nginx 2>/dev/null
ls -la $APP/frontend/dist/index.html
(cd $APP/backend && for p in bullmq ioredis; do printf '%s ' $p; node -p "require('./node_modules/$p/package.json').version"; done)
ls -la $APP/backend/uploads; for d in $APP/backend/uploads/*/; do echo "$d $(find "$d" -type f | wc -l) files"; done
sudo bash server-audit.sh        # copy deployment/audit/server-audit.sh to the server first; it watches log growth for 30 s
```
Copy the **whole** report file (`kidrove-audit-*.txt`) to your PC and send it to me, plus the output above.
Then save the logs *before* anything is deleted:
```sh
mkdir -p ~/evidence && cd ~/evidence
for f in $APP/backend/logs/*.log /var/log/GEMA-Project/backend/*.log; do [ -f "$f" ] && tail -n 200000 "$f" | gzip > "$(basename "$f").tail.gz"; done
pm2 jlist > pm2-jlist.json; crontab -l > crontab-$(whoami).txt 2>&1; sudo last -a | head -50 > last.txt
sudo cp /var/log/auth.log* . 2>/dev/null; ls -la
```
*Expected:* a folder of `.gz` files. The disk may be too full to write them: if so, stream them to your PC instead
(`tail -n 200000 FILE | gzip | ssh you@pc 'cat > FILE.tail.gz'`) or tell me.

## 2. SRV: free the disk (only after step 1)

```sh
du -ah $APP/backend/logs /var/log ~/.pm2/logs 2>/dev/null | sort -rh | head -15

# a) Big application / pm2 logs that are already saved in step 1: truncate (do NOT rm: pm2 and winston keep the file open)
: > /path/to/the/big.log

# b) System logs nobody needs. None of this is read by the website; rotated copies and the journal only.
sudo journalctl --vacuum-size=200M
sudo find /var/log -type f \( -name '*.gz' -o -name '*.[0-9]' -o -name '*.old' \) -mtime +7 -print   # look at the list first,
#   then run it again with -delete instead of -print
sudo find /var/log -xdev -type f -size +100M -not -path '/var/log/GEMA-Project/*' -exec ls -lh {} +  # any other huge file: save it, then : > file

# c) From now on every log lives in ONE folder, /var/log/GEMA-Project/backend, and rotates by itself.
#    (ecosystem.config.js sets LOG_FILE_PATH, so the application's own logs go there instead of $APP/backend/logs.)
sudo mkdir -p /var/log/GEMA-Project/backend && sudo chown $(stat -c %U:%G $APP) /var/log/GEMA-Project/backend && sudo chmod 750 /var/log/GEMA-Project/backend
scp deployment/logrotate/kidrove deployment/logrotate/kidrove.cron you@server:/tmp/        # from the PC's copy of this repository
sudo install -m 644 /tmp/kidrove /etc/logrotate.d/kidrove
sudo install -m 644 /tmp/kidrove.cron /etc/cron.d/kidrove-logrotate                      # same rule every 15 minutes: the system runs logrotate only daily, too slow for a log storm
sudo logrotate -d /etc/logrotate.d/kidrove                      # dry run: must print no errors
pm2 ls | grep -i logrotate && pm2 uninstall pm2-logrotate       # two rotators on the same files would fight
df -h /
```
*Expected:* at least 5 GB free. The release needs about 2 GB (the script refuses to start with less).
After the release, `ls -t /var/log/GEMA-Project/backend` shows `gema-backend-combined-*.log` growing and `$APP/backend/logs` no longer changing;
once you have checked that, the old `$APP/backend/logs` folder is dead weight and can be removed.
(The release's `pm2 startOrReload ecosystem.config.js --env production` hands the new `LOG_FILE_PATH` to the already-running apps: tested on pm2 7.0.1, the version on this server, with and without `--update-env`, so the script does not use that flag.)
**In production the application refuses to start if `LOG_FILE_PATH` is not an absolute, writable folder** (it never falls back to `$APP/backend/logs`):
`pm2 logs gema-backend --err` then shows `[logger] LOG_FILE_PATH=... cannot be used in production: <reason>`, and the release's health check fails and rolls back by itself.
So the `chown`/`chmod` above must be done before step 10, and step 3 puts the same path in `backend/.env`.

## 2b. SRV: Redis (this is the root cause of the CPU and disk problem: do it before anything is started)

On 14 Nov the server logs showed `OOM command not allowed when used memory > 'maxmemory'`: **Redis was full**, so every queue write was refused,
and the old code retried that error in a tight loop (the CPU) while logging it each time (the disk). Nothing may be started until Redis has room.
```sh
redis-cli INFO memory | grep -E "^(used_memory_human|used_memory_peak_human|maxmemory_human|maxmemory_policy)"
redis-cli CONFIG GET maxmemory; redis-cli DBSIZE; free -m
# what is using it (how many keys per family, then the biggest keys):
redis-cli --scan --count 1000 | awk -F: '{k=($1=="bull")?$1":"$2":"$3:$1":"$2; print k}' | sort | uniq -c | sort -rn | head -20
redis-cli --memkeys 2>/dev/null | tail -15
# the dead-letter queue (it has no consumer; old code never trimmed it):
redis-cli LLEN bull:failed-jobs:wait; for q in email qr-generation seat-expiry automation payout analytics communication certificate-generation collection-sync search-console-sync; do echo "$q failed: $(redis-cli ZCARD bull:$q:failed)"; done
```
Send me this output. Then, in this order:
1. **Give Redis room now**: `redis-cli CONFIG SET maxmemory 512mb` (only if `free -m` has the RAM; runtime only). Make it permanent in `/etc/redis/redis.conf`:
   `maxmemory 512mb` and `maxmemory-policy noeviction` (**keep `noeviction`**: BullMQ breaks on any eviction policy), then `sudo systemctl restart redis-server` in a quiet moment.
   Do not leave `maxmemory` at `0` (no limit) either: on this 4 GB server shared with four other sites a runaway queue could take all the RAM. On 14 Nov, after Redis was emptied it showed `maxmemory_human:0B`.
   A restart or flush also drops every queued job (emails, QR codes, payouts); repeating jobs re-register when the worker starts.
2. If `bull:failed-jobs:*` is most of the memory: it is only a diagnostic list (nothing reads it), so it is safe to empty:
   `redis-cli --scan --pattern 'bull:failed-jobs:*' | xargs -r redis-cli DEL`. Do **not** delete other `bull:*` keys by hand: queued emails, QR codes and payouts live there.
   (The new worker trims this queue by itself after the release, but it cannot while Redis is full: every Lua script is refused at `maxmemory`.)
3. Only then start the API and the worker.

## 3. SRV: the settings the new code needs (`backend/.env`)

List which of these are missing (names only, no values printed):
```sh
cd $APP/backend
for v in STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET FIELD_ENCRYPTION_KEY FIREBASE_PROJECT_ID FIREBASE_PRIVATE_KEY FIREBASE_CLIENT_EMAIL REPORT_INTEGRITY_SECRET ANALYTICS_IP_SALT SENTRY_DSN JWT_SECRET JWT_REFRESH_SECRET SESSION_SECRET MONGODB_URI; do
  grep -qE "^$v=.+" .env && echo "set      $v" || echo "MISSING  $v"; done
grep -E '^(RATE_LIMIT_MAX|RATE_LIMIT_WINDOW_MS|UPLOAD_PROVIDER|REDIS_HOST|REDIS_PORT|REDIS_URL|PORT|ENABLE_REQUEST_LOGGING|LOG_[A-Z_]*)=' .env
```
- `LOG_FILE_PATH`: set it to `/var/log/GEMA-Project/backend` (the folder from step 2c). pm2 already sets it for the two apps, but the data-migration scripts in steps 8-9
  (`NODE_ENV=production node dist/scripts/...`, run from `backend/`) run outside pm2 and read only this file. Some of them load the application's logger (through the models or
  config they import); with the old default `logs/` those now stop with `[logger] LOG_FILE_PATH=logs/ cannot be used in production`, instead of logging into the app folder. Setting it here covers all of them.
- `ENABLE_REQUEST_LOGGING`: set it to `false` (or delete the line). nginx already logs every request, and this setting writes the same line again from the app into a log file.
- `STRIPE_WEBHOOK_SECRET`: Stripe Dashboard > Developers > Webhooks > your endpoint > *Signing secret* (`whsec_...`). Without it payment confirmations are rejected.
- `FIELD_ENCRYPTION_KEY`: `openssl rand -hex 32`. **Back it up in your password manager now.** If it is lost, the data encrypted with it is unreadable.
- `REPORT_INTEGRITY_SECRET`: `openssl rand -hex 32`. The app warns at boot that business-report checksums cannot be computed without it.
- `FIELD_ENCRYPTION_KEY` matters more than it looks: the boot log says that without it vendor and teacher **Stripe secret keys are stored in plaintext**. Setting the key encrypts them on their next save; keys already saved stay plaintext until then (we will migrate them after the release).
- `ANALYTICS_IP_SALT`: `openssl rand -hex 32`.
- `RATE_LIMIT_MAX` now means *requests per minute* (it used to be per 15 minutes). If it is set to a small number such as `100`, raise it (e.g. `300`) or remove the line.
- **The new backend refuses to start** in production unless `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FIELD_ENCRYPTION_KEY` (32+ characters)
  and the three `FIREBASE_*` lines are all set; the error names every missing one. Every line above marked `MISSING` among those must be filled
  before step 10, otherwise the health check fails and `deploy-release.sh` rolls back to the old release.
- `ADMIN_SECRET_KEY` is no longer used in production: `/api/auth/register-admin` answers 404 there. To make someone an admin, an existing admin
  changes their role under Admin > Users.
- `SENTRY_DSN`: optional, gives you error tracking.
- Email digest / campaigns (new in this release, all optional): `SENDER_FROM_EMAIL` / `MAILCHIMP_FROM_EMAIL` set the reply-to address
  (default `newsletter@kidrove.com`, which must be a verified sender in Sender/Mailchimp or the send is refused). `SENDER_WEBHOOK_SECRET` /
  `MAILCHIMP_WEBHOOK_SECRET` are needed only if you point the provider's unsubscribe webhook at the site. The scheduled digest is OFF until
  an admin sets a campaign Active with auto-send on; every send goes to the whole marketing list.
- Never set `ALLOW_TEST_PAYMENT_SKIP` or `E2E_RELAX_RATE_LIMITS` here (the code ignores both when `NODE_ENV=production`, so check that
  `NODE_ENV=production` is set).

Edit with `nano .env` (`chmod 600 .env` stays). Nothing reads the new values until step 10.

## 4. PC: build the release

```sh
cd /d/coding/GEMA/kidrove && git status --short | grep -v '^??' ; git log -1 --oneline     # the commit being released
sh deployment/release/build-release.sh --frontend-env /c/kidrove-secrets/frontend-production.env
```
Takes 5-10 minutes (it builds in a Linux container). *Expected:* `Release built: release-out/kidrove-<id>.tar.gz`.
It is built from the committed code only. If you need something in the release, it has to be committed first.

**If the build stops with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`** (npm "Exit handler never called"): your antivirus is re-signing HTTPS traffic.
On this PC it is Norton "Web/Mail Shield": Windows trusts its root certificate, the Linux container does not. Export that public certificate once
(PowerShell, no secrets involved; keep the file outside the repo and the path free of spaces) and pass it with `--ca-cert`. TLS verification stays on.
```powershell
$c = Get-ChildItem Cert:\LocalMachine\Root | Where-Object Subject -like "*Norton Web/Mail Shield Root*" | Select-Object -First 1
"-----BEGIN CERTIFICATE-----`n" + [Convert]::ToBase64String($c.RawData,'InsertLineBreaks') + "`n-----END CERTIFICATE-----" | Set-Content -Encoding ascii C:\kidrove-secrets\norton-root-ca.pem
```
```sh
sh deployment/release/build-release.sh --frontend-env /c/kidrove-secrets/frontend-production.env --ca-cert /c/kidrove-secrets/norton-root-ca.pem
```

## 5. PC to SRV: upload

```sh
cd release-out
scp kidrove-*.tar.gz kidrove-*.tar.gz.sha256 deploy-release.sh <user>@<server>:~/
```

## 6. SRV: backup the database and prove it restores (before any write)

```sh
STAMP=$(date +%Y%m%d_%H%M%S); sudo mkdir -p /var/backups/kidrove && sudo chmod 700 /var/backups/kidrove
URI=$(grep '^MONGODB_URI=' $APP/backend/.env | cut -d= -f2- | tr -d '"'"'")
mongodump --uri="$URI" --archive=/tmp/pre-release-$STAMP.gz --gzip && sudo mv /tmp/pre-release-$STAMP.gz /var/backups/kidrove/ && ls -lh /var/backups/kidrove | tail -3
```
Restore test into a scratch database (replace `<db>` with the database name in the URI):
```sh
mongorestore --uri="$URI" --archive=/var/backups/kidrove/pre-release-$STAMP.gz --gzip --nsFrom='<db>.*' --nsTo='kidrove_restore_test.*'
# compare counts for the main collections, then drop the scratch database
mongosh "$URI" --quiet --eval 'for (const c of ["users","orders","events","bookings","vendors","revenuetransactions"]) print(c, db.getSiblingDB("<db>")[c].countDocuments(), db.getSiblingDB("kidrove_restore_test")[c].countDocuments())'
mongosh "$URI" --quiet --eval 'db.getSiblingDB("kidrove_restore_test").dropDatabase()'
```
*Expected:* each pair of counts is equal. If the database is a small hosted plan (e.g. Atlas 512 MB) and the scratch copy does not fit,
restore into a throwaway local `mongod` instead, or tell me. **Do not continue without a restore that worked.**
Also copy the dump off the server (`scp`), because the only other copies are on the same disk.

## 7. SRV: prepare the release (no downtime)

```sh
cd ~ && sh deploy-release.sh prepare kidrove-<id>.tar.gz
```
Checks the sha256, unpacks, links `.env`, runs `npm ci --omit=dev` (3-6 minutes on this server). *Expected:* last line is the release id.
Nothing live has changed: `pm2 status` and the site are as before.

## 8. SRV: dry-run the data migrations (read-only)

```sh
R=/var/www/kidrove-releases/<id>/backend; cd $R
NODE_ENV=production node dist/scripts/migrateTaxToVat.js --dry-run
NODE_ENV=production node dist/scripts/migrations/auditDuplicateRevenueTransactions.js          # dry run is the default
NODE_ENV=production node dist/scripts/migrations/migrateSmsToWhatsappSetting.js                 # dry run is the default
```
Send me the output. *Expected:* it prints counts and "no data was modified". Duplicate revenue records found are listed, not changed.

## 9. The maintenance window (5-10 minutes; say so on your site if you like)

Only start when steps 6-8 are done and I have seen the dry-run output.
```sh
pm2 stop gema-worker                       # no background jobs while the data is changed
cd $R
NODE_ENV=production node dist/scripts/migrations/auditDuplicateRevenueTransactions.js --apply
NODE_ENV=production node dist/scripts/migrations/leadPagePartialIndexes.js
NODE_ENV=production node dist/scripts/migrateTaxToVat.js
```

## 10. SRV: switch (about 1-2 minutes of restart)

```sh
cd ~ && sh deploy-release.sh activate <id>
```
It switches the four links, reloads `gema-backend` and `gema-worker`, then waits for `http://127.0.0.1:5000/health/basic` and keeps watching for 15 seconds.
**If the health check fails it rolls back by itself** (data migrations are not undone; see Rollback).
*Expected:* `release <id> is live and healthy`.

## 10b. SRV: security headers for kidrove.com (5 minutes, can be undone)

kidrove.com sends no security headers today (no HSTS, clickjacking or MIME-sniffing protection). Install ONLY the headers snippet
from the repo into the live kidrove.com server block; the rest of the live nginx config stays as it is. The CSP in it is
report-only (it blocks nothing).
```sh
SITE=$(sudo grep -lE 'server_name[^;]*kidrove\.com' /etc/nginx/sites-enabled/* | head -1); echo "$SITE"   # one file
sudo grep -n 'security-headers.conf' "$SITE" || echo "not included yet"
sudo cp "$SITE" /root/nginx-kidrove.before-headers.conf                     # backup
sudo cp $APP/deployment/nginx/snippets/security-headers.conf /etc/nginx/snippets/security-headers.conf
```
Edit `$SITE` (`sudo nano "$SITE"`): in the `server { ... }` block that has `listen 443` and `server_name kidrove.com`, add the line
`include snippets/security-headers.conf;` next to the other server-level lines (not inside a `location`). If a `location` in that block
has its own `add_header` lines, nginx drops the server-level headers there: add the same include inside that location too.
```sh
sudo nginx -t && sudo systemctl reload nginx || { sudo cp /root/nginx-kidrove.before-headers.conf "$SITE"; sudo nginx -t && sudo systemctl reload nginx; echo REVERTED; }
curl -sI https://kidrove.com/ | grep -iE 'strict-transport|x-frame|x-content-type|referrer-policy|content-security'   # 5 lines, each once
curl -sI https://kidrove.com/assets/ 2>/dev/null | grep -ic 'x-content-type'                                          # 1
```
Undo: `sudo cp /root/nginx-kidrove.before-headers.conf "$SITE" && sudo nginx -t && sudo systemctl reload nginx`.

## 11. Verify (from any computer)

```sh
curl -sI https://kidrove.com/ | head -3                                      # 200
curl -s --compressed -o /dev/null -w '%{http_code} %{size_download} bytes\n' https://api.kidrove.com/api/homepage   # 200, well under 300000
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://api.kidrove.com/api/payments/webhook    # 400 (signature missing), NOT 403
curl -s -o /dev/null -w '%{http_code}\n' https://api.kidrove.com/api/uploads/files/certificates/x.pdf   # 401
```
In a browser (phone-size window too): home page, an event page, log in and out, a test booking. On the server:
```sh
pm2 status                                                    # both online, restart counter not climbing
pm2 logs gema-worker --lines 60 --nostream | grep -iE 'mongodb connected|starting background workers|buffering timed out'
```
*Expected:* `MongoDB Connected` comes **before** `Starting background workers`, and there is no `buffering timed out`.
Stripe Dashboard > Webhooks > your endpoint > Event deliveries: **resend the failed deliveries** (they failed while the old code blocked Stripe), then tell me so we can reconcile orders.

## 12. Watch for one hour

Every 10 minutes: `top -bn1 | head -15`, `pm2 status`, `du -sh /var/log/GEMA-Project $APP/backend/logs`, `sudo tail -n 200 /var/log/nginx/access.log | awk '{print $9}' | sort | uniq -c`.
Healthy: CPU well under 50 %, logs growing by kilobytes (not hundreds of MB), restart counter unchanged, no 500s. Send me anything that looks off.

## Rollback

Code and frontend (seconds): `cd ~ && sh deploy-release.sh rollback`. It switches the links back to what was live before and reloads pm2.

Data: the migrations are **not** undone by that. `migrateTaxToVat` renames `tax` to `vat` on orders, cancellation logs and teacher bookings;
the old code reads `tax`, so after a code rollback those documents need the rename reversed or the backup restored (step 6). Decide together with me
before restoring anything: a restore also drops every order made after the backup.

## After 48 hours

`sh deploy-release.sh status`, then delete the old pre-release folders it lists (`*.pre-release-*`; they are the previous dist, node_modules and frontend, several GB),
and remove old release tarballs from your home folder. `sh deploy-release.sh prune` keeps the newest 3 releases.

## Later (not part of this release)

SSH hardening and checking the unexplained logins, expired certificates, the other four websites on this server, nginx header and caching changes,
off-server backups on a schedule, moving certificate and ticket PDFs to private storage (Cloudinary links are public by link today).
