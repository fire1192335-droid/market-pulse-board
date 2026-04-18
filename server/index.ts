import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

import { createApp } from "./app";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT ?? 8787);
const app = createApp();

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(__dirname, "../dist");

  app.use(express.static(distPath));
  app.use((request, response, next) => {
    if (request.path.startsWith("/api/")) {
      next();
      return;
    }

    response.sendFile(path.join(distPath, "index.html"));
  });
} else {
  app.get("/", (_request, response) => {
    response.json({
      success: true,
      data: { status: "api-ready" },
      source: "express-dev-server",
      freshness: "delayed",
      updatedAt: new Date().toISOString(),
      error: null,
    });
  });
}

app.listen(PORT, () => {
  console.log(`Market Pulse Board API running on http://localhost:${PORT}`);
});
