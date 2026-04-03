# GEMA — Event Management Platform (MERN)

## Purpose
Central full-stack MERN application for the GEMA ecosystem. Manages events, students, certificates, and authentication. Firebase-based auth. This is the data backbone that all WP plugins call.

## Stack
- **Backend:** Node.js + Express, Firebase Authentication, REST API
- **Frontend:** React (standalone admin dashboard or embedded)
- **Entry:** `backend/dist/server.js` (compiled), source in `backend/src/`
- **Auth:** Firebase (not WP users — separate auth system)

## Key Directories
```
gema/
├── backend/
│   ├── src/           # TypeScript/JS source
│   └── dist/          # Compiled output (server.js entry)
├── frontend/          # React app
└── .claude/
    └── mcp/gema-mcp-server/   # Custom MCP server (needs build — source missing on this machine)
```

## Integration Dependencies
- **Called by:** chatbot-by-eshaan WP plugin (class-chatbot-mern-api.php)
- **Called by:** Certificate-Generator-v7 WP plugin
- **Called by:** participant-portal WP plugin
- **Calls:** none (it is the data layer)
- **Auth:** Firebase — WP plugins must pass Firebase tokens in API requests

## API Base URL
Set in WP plugin configs — typically `http://localhost:PORT` in dev.

## Sub-Brain Tasks (use Ollama, not Claude tokens)
- Explain any Express controller or route → `qwen2.5-coder:7b`
- Generate new Express route + controller → `qwen2.5-coder:7b`
- Write JSDoc → `qwen2.5-coder:7b`
- Analyze API response structure → `deepseek-coder-v2:16b-lite-instruct-q4_K_M`
- Summarize backend architecture → `llama3.1:8b`

## How to Run
```bash
cd backend && npm install && npm run dev   # or npm start for dist
cd frontend && npm install && npm start
```

## Notes
- The `gema-mcp-server` in `.claude/mcp/` was originally developed on Windows — build is missing. Needs `npm run build` once source is ported to Linux.
- `.mcp.json` paths have been fixed to Linux paths.
