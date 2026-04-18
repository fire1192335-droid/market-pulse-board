import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createProvider } from "./src/providers/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = Number(process.env.PORT ?? 3000);
const provider = createProvider({
  providerName: process.env.MARKET_PROVIDER ?? "hybrid",
});

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function serveStatic(response, pathname) {
  const safePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const resolvedPath = resolve(__dirname, safePath);

  if (!resolvedPath.startsWith(__dirname)) {
    sendJson(response, 403, { error: "forbidden" });
    return;
  }

  try {
    const file = await readFile(resolvedPath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(resolvedPath)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(file);
  } catch {
    sendJson(response, 404, { error: "not_found" });
  }
}

function sendSseHeaders(response) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
}

function parseSymbols(url) {
  const symbolsParam = url.searchParams.get("symbols") ?? "";
  return symbolsParam
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  try {
    if (request.method === "GET" && url.pathname === "/api/config") {
      await provider.getSnapshot([]);
      sendJson(response, 200, provider.getPublicConfig());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/snapshot") {
      const symbols = parseSymbols(url);
      const quotes = await provider.getSnapshot(symbols);
      sendJson(response, 200, { quotes });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/stream") {
      const symbols = parseSymbols(url);
      sendSseHeaders(response);

      const snapshot = await provider.getSnapshot(symbols);
      response.write(`event: snapshot\n`);
      response.write(`data: ${JSON.stringify({ quotes: snapshot })}\n\n`);

      const unsubscribe = provider.subscribe(symbols, (quotes) => {
        response.write(`event: quote\n`);
        response.write(`data: ${JSON.stringify({ quotes })}\n\n`);
      });

      const heartbeat = setInterval(() => {
        response.write(`event: ping\n`);
        response.write(`data: {"ok":true}\n\n`);
      }, 15000);

      request.on("close", () => {
        clearInterval(heartbeat);
        unsubscribe();
        response.end();
      });

      return;
    }

    await serveStatic(response, url.pathname);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    if (url.pathname === "/api/stream") {
      response.write(`event: error\n`);
      response.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      response.end();
      return;
    }

    sendJson(response, 500, { error: message });
  }
});

server.listen(PORT, () => {
  console.log(`PulseBoard Pro running on http://localhost:${PORT}`);
});
