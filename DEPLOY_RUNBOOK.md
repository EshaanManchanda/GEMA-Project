# Deploy runbook: `backend_auth` → production

For whoever has server access. `backend_auth` is a **fast-forward** of the live `aditya` branch
(0 commits behind), with **no schema changes, no data migrations and no new required env vars**.

## 1. Before deploying (server, read-only)

```bash
cd <project>/backend            # confirm the real path: deploy.sh says /var/www/gema,
                                # ecosystem.config.js says /var/www/GEMA-Project
git fetch origin backend_auth
git stash list                  # make sure there are no local server edits to lose

# Read-only checks, against the production DB (writes nothing):
git show origin/backend_auth:backend/src/scripts/preDeployCheck.ts > /tmp/preDeployCheck.ts
cp /tmp/preDeployCheck.ts src/scripts/ && npx ts-node src/scripts/preDeployCheck.ts; rm src/scripts/preDeployCheck.ts
```

What the check prints, and what to do about it:

| Check | If non-zero |
|---|---|
| **[1] Staff accounts using a seed password** (incl. the old admin-UI default `TempPass123!`) | Change those passwords **before** launch. |
| **[2] vendorId not pointing at a Vendor profile** | Take a `mongodump`, then run `npx ts-node src/scripts/migrateEventVendorIds.ts` and re-run the check. Otherwise the new ownership checks lock those vendors out of their legacy events (cancel, galleries, certificates). Employees with a bad vendorId already can't scan tickets today; this deploy doesn't change that. |
| **[4] Custom-Stripe accounts using a pasted secret key** | Their payments can't be confirmed. Before launch, move each one to Stripe Connect or platform mode (Admin → Vendors/Teachers → payment mode). Saving new manual keys is now blocked. |
| **[3] Orders paid in Stripe but not marked paid** | **Customers were charged without a booking.** For each one, refund it in the Stripe dashboard or reinstate the order. After the deploy, the seat-expiry sweep reconciles these automatically for new orders. |

Also look at the "Orders by status" summary. Production showed 53 orders and 0 paid.

### Production `.env` (`backend/.env`)
- `RATE_LIMIT_MAX`: unset (default 600) or ≥ 600. **If it's `100` (copied from the old `.env.example`), remove it.**
- `QUEUE_PREFIX`: leave unset. Production keeps BullMQ's default `bull:` keys.
- `STRIPE_WEBHOOK_SECRET`: must be the signing secret of the **live** webhook endpoint `https://api.kidrove.com/api/payments/webhook` (Stripe dashboard → Developers → Webhooks, live mode). Make sure the endpoint sends at least `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded` and `checkout.session.completed`, and that its recent deliveries show `200`, not `400`.
- `EMAIL_*` SMTP settings work. The production email queue had 1 failed job: check `pm2 logs gema-worker --lines 200 | grep -i email`.
- `SENTRY_DSN` is set, so errors are reported.

## 2. Deploy

1. Back up first. `deploy.sh` now does a `mongodump` automatically; it needs `mongodb-database-tools`. If that's not installed, run a manual dump.
2. Fast-forward the deployed branch (only the deployer does this): `git merge --ff-only origin/backend_auth`.
3. `./deploy.sh`. It builds both apps and now reloads **both** `gema-backend` and `gema-worker`. The old script reloaded only the API.
4. `pm2 status`: both apps `online`.

**Rollback:** `./deploy.sh --rollback` restores the previous `dist/`. No database rollback is needed because there's no migration. A database dump from the deploy is in `backups/<name>-db` if it's ever needed: `mongorestore --gzip --drop <dir>`.

## 3. After deploying (smoke test, ~10 min)

- `deploy.sh` runs `scripts/smoke.sh` automatically and fails the deploy if it fails. It checks health (no public metrics), `/health/redis` returns 401, the events API, the home page and `/events`. Rerun it anytime with `./scripts/smoke.sh`.
- An event page and login both load.
- nginx (with the security-headers change): copy **both** `security-headers.conf` and the new `csp-report.conf` into `/etc/nginx/snippets/`, plus `kidrove.conf`, then run `nginx -t && systemctl reload nginx`. Check that `curl -sI https://kidrove.com | grep -i content-security-policy-report-only` prints the header. Reports collect in `/var/log/nginx/csp-reports.log`; see `deployment/nginx/README.md` → CSP rollout.
- **One real booking** with your own card on a cheap event. Check that:
  - Stripe shows `payment_intent.succeeded` delivered with `200`;
  - the order becomes `confirmed/paid` and appears under My Bookings with a ticket and QR;
  - the confirmation email arrives.

  Then refund it in Stripe and check the order goes to refunded.
- **One real signup** with a fresh email: the verification email arrives.
- As a vendor: open your events, cancel-flow screen, galleries. Nothing returns "not found" for your own events.

## What changes for users in this release
- Security: vendors, employees and customers can only see and change their own tickets, orders, events, galleries, certificates and student records (fixes cross-account access).
- Payments: a paid order can no longer be auto-cancelled after 15 minutes if the confirmation was missed.
- The API rate limit rises from 100 to 600 requests/min per IP; Stripe webhooks and health checks are exempt.
- Payments: the Stripe webhook now processes the event before answering. If processing fails it answers `500` and Stripe retries (with backoff, for up to 3 days), so an occasional `500` in the endpoint's delivery log is a retry in progress, not data loss. A run of `500`s means something is broken: check `pm2 logs gema-backend` for `[WEBHOOK] Processing failed`.
- Event cards are real links (open in new tab works); the home page has an `<h1>`.
- Currency is detected from the visitor's IP, not the server's.
- Vendors can create online events without a location (previously a 500 error).
- Only events explicitly open for claiming can be claimed. Inviting an employee with an email that belongs to a customer, vendor or admin account is now refused (409).

## Known issues (not blockers)
- Manual Stripe secret keys (custom-Stripe mode without Connect) are disabled (409) until confirmation retrieves the PaymentIntent with the key that created it. Stripe Connect is unaffected.
- Admin-created accounts now require an explicit password; the old `TempPass123!` default is rejected.
- 38 frontend TypeScript errors; `vendor.employee.controller` unit tests are skipped until they're rewritten against `vendor.service`.
