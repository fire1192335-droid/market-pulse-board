import type { IncomingMessage, ServerResponse } from "node:http";

import { createErrorResponse, createSuccessResponse, getSummaryFreshness, marketService, parseWatchlistSymbols } from "../_lib/market-service.js";

export default async function handler(request: IncomingMessage & { query?: Record<string, string | string[]> }, response: ServerResponse & { status: (code: number) => { json: (body: unknown) => void }; json: (body: unknown) => void }) {
  try {
    const symbols = parseWatchlistSymbols(request.query?.symbols);
    const data = await marketService.getMarketSummary(symbols);
    const combined = [...data.usIndices, ...data.twIndices, ...data.watchlist];

    response.json(
      createSuccessResponse({
        data,
        source: "Yahoo public market data + official TW stock catalog",
        freshness: getSummaryFreshness(combined),
        updatedAt: marketService.getLatestUpdatedAt(combined),
      }),
    );
  } catch (error) {
    response.status(500).json(createErrorResponse(error instanceof Error ? error.message : "market summary failed"));
  }
}
