import express from "express";

import indexRoutes from "./routes/indexes";
import marketRoutes from "./routes/market";
import stockRoutes from "./routes/stock";
import { createErrorResponse } from "./routes/response";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.use("/api", indexRoutes);
  app.use("/api/market", marketRoutes);
  app.use("/api", stockRoutes);

  app.use("/api", (_request, response) => {
    response.status(404).json(createErrorResponse("route not found"));
  });

  return app;
}
