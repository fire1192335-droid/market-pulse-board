import type { IncomingMessage, ServerResponse } from "node:http";

import { createErrorResponse, createSuccessResponse, marketService, parseRange } from "../../../_lib/market-service.js";

export default async function handler(request: IncomingMessage & { query?: Record<string, string | string[]> }, response: ServerResponse & { status: (code: number) => { json: (body: unknown) => void }; json: (body: unknown) => void }) {
  try {
    const symbol = String(request.query?.symbol ?? "");
    const range = parseRange(request.query?.range);
    const detail = await marketService.getTwStockDetail(symbol, range);

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
}
