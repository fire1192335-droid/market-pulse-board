import { Router } from "express";

import { createSuccessResponse, createErrorResponse } from "./response.js";
import type { Freshness } from "../../shared/types.js";
import { createMarketService } from "../providers/index.js";

const router = Router();
const marketService = createMarketService();

router.get("/summary", async (request, response) => {
  try {
    const symbols = String(request.query.symbols ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const data = await marketService.getMarketSummary(symbols);
    const combined = [...data.usIndices, ...data.twIndices, ...data.watchlist];
    const freshness: Freshness = combined.some((item) => item.freshness === "demo")
      ? "mixed"
      : "delayed";

    response.json(
      createSuccessResponse({
        data,
        source: "Yahoo public US market data + TWSE official Taiwan daily data (preferred)",
        freshness,
        updatedAt: marketService.getLatestUpdatedAt(combined),
      }),
    );
  } catch (error) {
    response.status(500).json(createErrorResponse(error instanceof Error ? error.message : "market summary failed"));
  }
});

router.get("/us/index/:id", async (request, response) => {
  try {
    const data = await marketService.getUsIndex(request.params.id);

    response.json(
      createSuccessResponse({
        data,
        source: data.source,
        freshness: data.freshness,
        updatedAt: data.updatedAt,
      }),
    );
  } catch (error) {
    response.status(404).json(createErrorResponse(error instanceof Error ? error.message : "us index not found"));
  }
});

router.get("/tw/index/:id", async (request, response) => {
  try {
    const data = await marketService.getTwIndex(request.params.id);

    response.json(
      createSuccessResponse({
        data,
        source: data.source,
        freshness: data.freshness,
        updatedAt: data.updatedAt,
      }),
    );
  } catch (error) {
    response.status(404).json(createErrorResponse(error instanceof Error ? error.message : "tw index not found"));
  }
});

export default router;
