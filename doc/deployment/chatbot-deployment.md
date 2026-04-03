# AI Doc Chatbot — Deployment Guide
> `ai-doc-chatbot/` · FastAPI + Ollama + ChromaDB + Redis
> Last updated: 2026-03-16

---

## Overview

The chatbot runs as a **separate Python service** (FastAPI on port 8000) alongside the Node.js backend. It uses:

| Component | Role | Where it runs |
|---|---|---|
| `server.py` (FastAPI/uvicorn) | HTTP API + SSE streaming | Port 8000 on the VPS |
| Ollama | LLM inference | Local daemon on the VPS |
| ChromaDB | Vector store (RAG retrieval) | File-based — `chroma_db/` directory |
| Redis | Session history (24h TTL) | Shared with backend Redis |
| MongoDB | Live data enrichment | Shared with backend (Atlas) |

The frontend widget calls `/api/chat/public/stream` (no auth). Admin users call `/api/chat/stream` with a JWT token.

---

## Prerequisites

### On the VPS

| Requirement | Min version | Notes |
|---|---|---|
| Python | 3.11+ | 3.11 strongly recommended |
| Ollama | latest | Must be running as a daemon |
| Redis | 6+ | Already running for backend |
| Git | any | Already installed |
| RAM | 6 GB free | For LLM inference |
| Disk | 10 GB free | For models + ChromaDB |

### Ollama models (must be pulled before starting)

```bash
ollama pull kidrove-coder:7b      # custom fine-tuned model (primary)
ollama pull nomic-embed-text      # embeddings — REQUIRED for RAG
ollama pull llama3.2:3b           # fallback if custom model unavailable
```

If the custom model is not yet available on the server, run the model registration step below first.

---

## First-Time Setup

### 1. Clone / copy the directory

The chatbot lives inside the main repo at `ai-doc-chatbot/`. On the VPS, ensure the full repo is checked out at `/var/www/gema` (or wherever the project root is).

```bash
cd /var/www/gema/ai-doc-chatbot
```

### 2. Create Python virtual environment

```bash
python3.11 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt

# Also install FastAPI + uvicorn (not in requirements.txt yet)
pip install fastapi uvicorn[standard] redis
```

> `redis` is the Python client needed for session history (P4.5). `uvicorn[standard]` includes the uvloop + httptools extras for production speed.

### 4. Configure environment

```bash
cp .env .env.production   # keep a backup
nano .env
```

Set these values for production:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.x0iqu.mongodb.net/kidrove
BACKEND_URL=https://your-backend.onrender.com
FRONTEND_URL=https://kidrove.com
OLLAMA_BASE_URL=http://127.0.0.1:11434
DEFAULT_MODEL=kidrove-coder:7b
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

> `OLLAMA_BASE_URL` stays localhost — Ollama runs on the same machine. Never expose Ollama directly to the internet.

### 5. Verify ChromaDB is built

The `chroma_db/` directory must exist and contain data before the server starts. Check:

```bash
ls -lh chroma_db/
# Should show chroma.sqlite3 and subdirectories totalling ~77 MB
```

If missing or stale, rebuild it (see **Rebuilding the Knowledge Base** section below).

### 6. Register the custom Ollama model

If deploying the fine-tuned model for the first time:

```bash
# Ensure gguf_output/model-Q4_K_M.gguf exists (4.5 GB)
ollama create kidrove-coder:7b -f Modelfile

# Verify
ollama run kidrove-coder:7b "What is the Kidrove platform?"
```

If the GGUF file is not on the server, copy it from the dev machine first:

```bash
scp gguf_output/model-Q4_K_M.gguf user@your-vps:/var/www/gema/ai-doc-chatbot/gguf_output/
```

---

## Running the Server

### Development (local)

```bash
cd ai-doc-chatbot
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### Production (VPS — systemd service)

Create `/etc/systemd/system/kidrove-chatbot.service`:

```ini
[Unit]
Description=Kidrove AI Chatbot (FastAPI)
After=network.target ollama.service redis.service
Wants=ollama.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/gema/ai-doc-chatbot
Environment="PATH=/var/www/gema/ai-doc-chatbot/venv/bin"
EnvironmentFile=/var/www/gema/ai-doc-chatbot/.env
ExecStart=/var/www/gema/ai-doc-chatbot/venv/bin/uvicorn server:app \
    --host 127.0.0.1 \
    --port 8000 \
    --workers 1 \
    --timeout-keep-alive 60
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable kidrove-chatbot
sudo systemctl start kidrove-chatbot
sudo systemctl status kidrove-chatbot
```

> **Why `--workers 1`?** Ollama inference is the bottleneck — multiple workers would queue requests to the same Ollama daemon anyway. ChromaDB file locks also conflict with multiple workers.

---

## Nginx Reverse Proxy

Add a location block inside the existing Nginx site config (the same vhost that proxies the Node.js backend):

```nginx
# Chatbot — SSE requires proxy_buffering off
location /chatbot/ {
    proxy_pass         http://127.0.0.1:8000/;
    proxy_http_version 1.1;

    # SSE requires these
    proxy_set_header   Connection "";
    proxy_buffering    off;
    proxy_cache        off;
    chunked_transfer_encoding on;

    # Standard proxy headers
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;

    # Longer timeout for LLM streaming responses
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
}
```

After editing:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

The chatbot will then be reachable at `https://kidrove.com/chatbot/api/chat/public/stream`.

> Update `VITE_CHATBOT_URL=https://kidrove.com/chatbot` in the frontend `.env` on Vercel.

---

## API Endpoints Reference

All endpoints are relative to the server root (e.g., `http://localhost:8000`).

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Returns server status + available models |
| `POST` | `/api/chat/stream` | JWT token in body | SSE streaming — admin/vendor/teacher users |
| `POST` | `/api/chat` | JWT token in body | Non-streaming fallback |
| `POST` | `/api/chat/public/stream` | None | SSE streaming — customer chatbot widget |
| `POST` | `/api/chat/public` | None | Non-streaming fallback — public |
| `POST` | `/api/reload-kb` | None | Reload ChromaDB after re-ingestion |

### Request body (`/api/chat/public/stream`)

```json
{
  "question": "How do I book an event?",
  "history": [],
  "model": "kidrove-coder:7b",
  "memory_turns": 6,
  "session_id": "uuid-from-previous-response"
}
```

### SSE event format

```
data: {"type": "meta", "api_label": "...", "source_type": "rag", "session_id": "abc-123"}
data: {"type": "chunk", "text": "The booking flow..."}
data: {"type": "chunk", "text": " starts by selecting..."}
data: {"type": "done"}
```

The client must persist `session_id` from the `meta` event and include it in subsequent requests to maintain conversation history via Redis.

---

## Rebuilding the Knowledge Base

Run this whenever source code changes significantly (new routes, models, docs):

```bash
cd /var/www/gema/ai-doc-chatbot
source venv/bin/activate

# Rebuild main code + docs index
python scripts/ingest.py

# Rebuild the Q&A knowledge base (platform_knowledge.json)
python scripts/ingest_qna.py

# Reload the server without restart
curl -X POST http://localhost:8000/api/reload-kb
```

Or just restart the systemd service:

```bash
sudo systemctl restart kidrove-chatbot
```

> Ingestion takes 3–8 minutes depending on codebase size. The server can still serve requests from the old ChromaDB while ingestion writes to it, but a restart after ingestion is recommended.

---

## Redis Session History

Sessions are stored as `chat:session:<uuid>` keys with a 24-hour TTL.

Verify sessions are being written:

```bash
redis-cli keys "chat:session:*"
redis-cli get "chat:session:<some-uuid>"
```

If Redis is unavailable, the chatbot degrades gracefully — session history is lost but requests still succeed.

---

## Health Check

```bash
curl http://localhost:8000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "mongodb": true,
  "backend": "https://your-backend.onrender.com",
  "available_models": ["kidrove-coder:7b", "nomic-embed-text"]
}
```

If `available_models` is empty, Ollama is not running:

```bash
sudo systemctl status ollama
sudo systemctl start ollama
```

---

## Monitoring & Logs

```bash
# Live logs
sudo journalctl -u kidrove-chatbot -f

# Last 100 lines
sudo journalctl -u kidrove-chatbot -n 100

# Check for errors
sudo journalctl -u kidrove-chatbot --since "1 hour ago" | grep -i error
```

---

## Updating

```bash
cd /var/www/gema
git pull origin main

cd ai-doc-chatbot
source venv/bin/activate
pip install -r requirements.txt   # pick up any new deps

# If server.py changed, restart the service
sudo systemctl restart kidrove-chatbot

# If source code changed significantly, rebuild ChromaDB
python scripts/ingest.py
curl -X POST http://localhost:8000/api/reload-kb
```

---

## Troubleshooting

### Server won't start — `ModuleNotFoundError: No module named 'fastapi'`

```bash
source venv/bin/activate
pip install fastapi uvicorn[standard] redis
```

### `Model 'kidrove-coder:7b' not available` — falls back to itself

Ollama doesn't have the model. Either pull a fallback or register the custom model:

```bash
ollama pull llama3.2:3b
# or
ollama create kidrove-coder:7b -f Modelfile
```

### SSE stream cuts off immediately

Check Nginx `proxy_buffering off` is set. Buffering is the most common cause of SSE failures behind a proxy.

### Redis connection refused

```bash
sudo systemctl start redis
# or if using a different port, check REDIS_PORT in .env
```

### ChromaDB empty / returns no results

```bash
ls -lh chroma_db/
# If missing or tiny, re-ingest:
python scripts/ingest.py
```

### `TSError` on backend startup (unrelated to chatbot)

This is a backend TypeScript error — the chatbot is a separate Python process and is not affected.

---

## Port Summary

| Service | Port | Exposed externally |
|---|---|---|
| Node.js backend | 5001 | Via Nginx `/api/` |
| FastAPI chatbot | 8000 | Via Nginx `/chatbot/` |
| Ollama | 11434 | No — localhost only |
| Redis | 6379 | No — localhost only |
| MongoDB | N/A | Atlas cloud |
