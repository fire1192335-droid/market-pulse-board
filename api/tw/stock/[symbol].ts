import type { IncomingMessage, ServerResponse } from "node:http";

import { createErrorResponse, createSuccessResponse, marketService } from "../../_lib/market-service.js";

export default async function handler(request: IncomingMessage & { query?: Record<string, string | string[]> }, response: ServerResponse & { status: (code: number) => { json: (body: unknown) => void }; json: (body: unknown) => void }) {
  try {
    const symbol = String(request.query?.symbol ?? "");
    const data = await marketService.getTwStock(symbol);

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
}
