import express from "express";

import indexRoutes from "./routes/indexes.js";
import marketRoutes from "./routes/market.js";
import stockRoutes from "./routes/stock.js";
import { createErrorResponse } from "./routes/response.js";

export function createApiApp() {
  const app = express();

  app.use(express.json());

  app.use(indexRoutes);
  app.use("/market", marketRoutes);
  app.use(stockRoutes);

  app.use((_request, response) => {
    response.status(404).json(createErrorResponse("route not found"));
  });

  return app;
}
