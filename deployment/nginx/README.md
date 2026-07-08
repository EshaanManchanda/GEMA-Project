# Nginx Setup

Two site configs live here, one per domain. Each is fully self-contained (frontend +
API server blocks). `snippets/*.conf` are shared includes referenced by both.

| File | Domain(s) | Backend port |
|---|---|---|
| `kidrove.conf` | `kidrove.com`, `kidrove.in`, `kidrove.ae` (+ `api.*` subdomains) | `127.0.0.1:5000` |
| `bulk-intlspellbee.conf` | `bulk.intlspellbee.com`, `api.intlspellbee.com` | `localhost:5050` |

Root-level `/nginx.conf` is the base `/etc/nginx/nginx.conf` (global `http {}` wrapper —
gzip, worker settings, `include sites-enabled/*`). It is not domain-specific and is not
installed via the steps below.

## Install (either config)

```bash
sudo cp deployment/nginx/kidrove.conf /etc/nginx/sites-available/kidrove.conf
sudo ln -s /etc/nginx/sites-available/kidrove.conf /etc/nginx/sites-enabled/
sudo cp -r deployment/nginx/snippets /etc/nginx/snippets   # first time only, or keep in sync
sudo nginx -t
sudo systemctl reload nginx
```

Same pattern for `bulk-intlspellbee.conf`.

**Certs:** each `server_name` needs its own Let's Encrypt cert before first reload —
`sudo certbot --nginx -d kidrove.com -d www.kidrove.com` (repeat per domain/subdomain).
`kidrove.conf` expects certs at `/etc/letsencrypt/live/kidrove.com/`, `/kidrove.in/`,
`/kidrove.ae-0002/` (note the `-0002` suffix — a certbot renewal artifact, keep as-is
unless the cert is reissued clean).

## kidrove.conf structure

- `upstream backend_api` → Node backend, `127.0.0.1:5000`.
- `map $http_user_agent $is_bot` → crawler/bot detection, used to skip service-worker
  caching for bots and to route bot HTML requests to the backend's prerender middleware.
- 12 server blocks (4 per domain × 3 domains): HTTP→HTTPS redirect, HTTPS frontend
  (static SPA + backend proxy for SEO paths), HTTP→HTTPS redirect for `api.*`, HTTPS API
  proxy (`api.*` → `backend_api`, full pass-through via `snippets/api-proxy.conf`).
- Per frontend block, these paths proxy to the backend instead of serving the static
  SPA shell — required for the DB-driven SEO infra in `backend/src/services/seo.service.ts`,
  `backend/src/routes/og.routes.ts`, `backend/src/middleware/crawlerPrerender.ts` to work:
  - `robots.txt`, `sitemap*.xml`, `llms.txt`, `llms-full.txt`
  - `/og/*` (social preview cards)
  - any request with a bot User-Agent (via `$is_bot`), so crawlers get prerendered HTML
    instead of the raw `index.html` shell.

## Snippets

- `ssl-params.conf` — shared TLS protocol/cipher config.
- `security-headers.conf` — X-Frame-Options, X-Content-Type-Options, etc.
- `api-proxy.conf` — standard `proxy_pass http://backend_api` + headers, included by API
  server blocks.
- `api-proxy-cached.conf` — same, plus `proxy_cache` for cacheable read-only endpoints
  (categories, collections).
- `kvm1-performance.conf` — single-core VPS tuning (worker settings), include in the
  `http {}` block of the base `/etc/nginx/nginx.conf`, not in a site config.

## Verifying live vs repo

The live server may drift from this repo if someone edits `/etc/nginx/sites-enabled/`
directly. To check:

```bash
ssh <server> 'cat /etc/nginx/sites-enabled/kidrove.conf' > /tmp/live-kidrove.conf
diff /tmp/live-kidrove.conf deployment/nginx/kidrove.conf
```

If they differ, reconcile by hand — pull manual prod tweaks back into the repo file,
or push the repo file up and reload. Don't `cp` blindly in either direction without
diffing first.

## History note (2026-07-08)

This directory used to hold `gema.conf` (older single-region config) alongside
`nginx-multi-region.conf`; the repo root also had `nginx-subdomain.conf`,
`nginx.conf.template`, and a corrupted `nginx-multi-region.conf` (an accidental paste
mixing the intlspellbee config, a terminal transcript, and the real kidrove config).
All consolidated into the two files above. If you're looking for the old files, they're
still in git history (`git log --all -- deployment/nginx/gema.conf` etc.) but are not
used anywhere.
