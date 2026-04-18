import { Router } from "express";

import { createSuccessResponse, createErrorResponse } from "./response.js";
import { createMarketService } from "../providers/index.js";
import type { ChartRange } from "../../shared/types.js";

const router = Router();
const marketService = createMarketService();
const VALID_RANGES: ChartRange[] = ["1D", "5D", "1M", "3M", "1Y"];

router.get("/tw/stock/search", async (request, response) => {
  try {
    const query = String(request.query.q ?? "");
    const data = await marketService.searchTwStocks(query);

    response.json(
      createSuccessResponse({
        data,
        source: "TWSE OpenAPI + TPEx daily quotes catalog",
        freshness: "end-of-day",
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    response.status(500).json(createErrorResponse(error instanceof Error ? error.message : "search failed"));
  }
});

router.get("/tw/stock/:symbol/history", async (request, response) => {
  try {
    const range = VALID_RANGES.includes(request.query.range as ChartRange)
      ? (request.query.range as ChartRange)
      : "1M";
    const detail = await marketService.getTwStockDetail(request.params.symbol, range);

    response.json(
      createSuccessResponse({
        data: detail.history,
        source: detail.quote.source,
        freshness: detail.quote.freshness,
        updatedAt: detail.quote.updatedAt,
      }),
    );
  } catch (error) {
    response.status(500).json(createErrorResponse(error instanceof Error ? error.message : "history failed"));
  }
});

router.get("/tw/stock/:symbol", async (request, response) => {
  try {
    const data = await marketService.getTwStock(request.params.symbol);

    response.json(
      createSuccessResponse({
        data,
        source: data.source,
        freshness: data.freshness,
        updatedAt: data.updatedAt,
      }),
    );
  } catch (error) {
    response.status(500).json(createErrorResponse(error instanceof Error ? error.message : "stock failed"));
  }
});

export default router;
