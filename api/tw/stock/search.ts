import type { IncomingMessage, ServerResponse } from "node:http";

import { createErrorResponse, createSuccessResponse, marketService } from "../../_lib/market-service.js";

export default async function handler(request: IncomingMessage & { query?: Record<string, string | string[]> }, response: ServerResponse & { status: (code: number) => { json: (body: unknown) => void }; json: (body: unknown) => void }) {
  try {
    const query = String(request.query?.q ?? "");
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
}
