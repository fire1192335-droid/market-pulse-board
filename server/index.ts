import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import indexRoutes from "./routes/indexes";
import marketRoutes from "./routes/market";
import stockRoutes from "./routes/stock";
import { createErrorResponse } from "./routes/response";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT ?? 8787);

app.use(express.json());

app.use("/api", indexRoutes);
app.use("/api/market", marketRoutes);
app.use("/api", stockRoutes);

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

app.use((_request, response) => {
  response.status(404).json(createErrorResponse("route not found"));
});

app.listen(PORT, () => {
  console.log(`Market Pulse Board API running on http://localhost:${PORT}`);
});
