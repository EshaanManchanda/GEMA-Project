import { Router, Request, Response } from "express";
import http from "http";
import https from "https";

const router = Router();

const CHATBOT_URL = process.env.CHATBOT_URL ?? "http://localhost:8000";

function proxyRequest(
  req: Request,
  res: Response,
  targetPath: string,
  isSSE = false,
): void {
  const parsed = new URL(CHATBOT_URL);
  const isHttps = parsed.protocol === "https:";
  const transport = isHttps ? https : http;

  const body = JSON.stringify(req.body);

  const options: http.RequestOptions = {
    hostname: parsed.hostname,
    port: parsed.port || (isHttps ? 443 : 80),
    path: targetPath,
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  };

  const proxyReq = transport.request(options, (proxyRes) => {
    if (isSSE) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      proxyRes.pipe(res);
    } else {
      res.status(proxyRes.statusCode ?? 200);
      res.setHeader("Content-Type", "application/json");
      proxyRes.pipe(res);
    }
  });

  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.status(502).json({ error: "Chatbot service unavailable", details: err.message });
    }
  });

  proxyReq.write(body);
  proxyReq.end();
}

// GET /api/chatbot/health → http://localhost:8000/api/health
router.get("/health", (req, res) => {
  const parsed = new URL(CHATBOT_URL);
  const isHttps = parsed.protocol === "https:";
  const transport = isHttps ? https : http;

  const options: http.RequestOptions = {
    hostname: parsed.hostname,
    port: parsed.port || (isHttps ? 443 : 80),
    path: "/api/health",
    method: "GET",
  };

  const proxyReq = transport.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode ?? 200);
    res.setHeader("Content-Type", "application/json");
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.status(502).json({ error: "Chatbot service unavailable", details: err.message });
    }
  });

  proxyReq.end();
});

// POST /api/chatbot/chat → http://localhost:8000/api/chat
router.post("/chat", (req, res) => {
  proxyRequest(req, res, "/api/chat");
});

// POST /api/chatbot/stream → http://localhost:8000/api/chat/stream  (SSE)
router.post("/stream", (req, res) => {
  proxyRequest(req, res, "/api/chat/stream", true);
});

// POST /api/chatbot/reload → http://localhost:8000/api/reload-kb
router.post("/reload", (req, res) => {
  proxyRequest(req, res, "/api/reload-kb");
});

export default router;
