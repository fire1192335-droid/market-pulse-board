import type { IncomingMessage, ServerResponse } from "node:http";

import { createErrorResponse, createSuccessResponse, marketService } from "../../_lib/market-service.js";

export default async function handler(request: IncomingMessage & { query?: Record<string, string | string[]> }, response: ServerResponse & { status: (code: number) => { json: (body: unknown) => void }; json: (body: unknown) => void }) {
  try {
    const id = String(request.query?.id ?? "");
    const data = await marketService.getTwIndex(id);

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
}
