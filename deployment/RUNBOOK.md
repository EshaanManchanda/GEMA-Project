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
du -ah $APP/backend/logs /var/log/GEMA-Project ~/.pm2/logs 2>/dev/null | sort -rh | head -15
# for each big log that is already saved in step 1:
: > /path/to/the/big.log          # truncate (do NOT rm: pm2 and winston keep the file open)
pm2 install pm2-logrotate && pm2 set pm2-logrotate:max_size 50M && pm2 set pm2-logrotate:retain 5 && pm2 set pm2-logrotate:compress true
df -h /
```
*Expected:* at least 5 GB free. The release needs about 2 GB (the script refuses to start with less).

## 3. SRV: the settings the new code needs (`backend/.env`)

List which of these are missing (names only, no values printed):
```sh
cd $APP/backend
for v in STRIPE_WEBHOOK_SECRET FIELD_ENCRYPTION_KEY ANALYTICS_IP_SALT ADMIN_SECRET_KEY SENTRY_DSN JWT_SECRET SESSION_SECRET MONGODB_URI; do
  grep -qE "^$v=.+" .env && echo "set      $v" || echo "MISSING  $v"; done
grep -E '^(RATE_LIMIT_MAX|RATE_LIMIT_WINDOW_MS|UPLOAD_PROVIDER|REDIS_HOST|REDIS_PORT|REDIS_URL|PORT|ENABLE_REQUEST_LOGGING|LOG_[A-Z_]*)=' .env
```
- `ENABLE_REQUEST_LOGGING`: set it to `false` (or delete the line). nginx already logs every request, and this setting writes the same line again from the app into a log file.
- `STRIPE_WEBHOOK_SECRET`: Stripe Dashboard > Developers > Webhooks > your endpoint > *Signing secret* (`whsec_...`). Without it payment confirmations are rejected.
- `FIELD_ENCRYPTION_KEY`: `openssl rand -hex 32`. **Back it up in your password manager now.** If it is lost, the data encrypted with it is unreadable.
- `ANALYTICS_IP_SALT`: `openssl rand -hex 32`.
- `ADMIN_SECRET_KEY`: the only thing protecting the `register-admin` route, so it must be long and random (`openssl rand -hex 32`), never a word or a default. If you never create admins that way, say so and we will switch the route off in the next release.
- `RATE_LIMIT_MAX` now means *requests per minute* (it used to be per 15 minutes). If it is set to a small number such as `100`, raise it (e.g. `300`) or remove the line.
- `SENTRY_DSN`: optional, gives you error tracking.

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
