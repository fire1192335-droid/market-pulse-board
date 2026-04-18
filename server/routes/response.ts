import type { ApiResponse, Freshness } from "../../shared/types.js";

export function createSuccessResponse<T>(input: {
  data: T;
  source: string;
  freshness: Freshness;
  updatedAt: string | null;
}): ApiResponse<T> {
  return {
    success: true,
    data: input.data,
    source: input.source,
    freshness: input.freshness,
    updatedAt: input.updatedAt,
    error: null,
  };
}

export function createErrorResponse(error: string): ApiResponse<null> {
  return {
    success: false,
    data: null,
    source: "unavailable",
    freshness: "demo",
    updatedAt: null,
    error,
  };
}
