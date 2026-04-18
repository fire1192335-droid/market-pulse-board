import type { ChartRange, Freshness } from "../../shared/types.js";
import { createMarketService } from "../../server/providers/index.js";
import { createErrorResponse, createSuccessResponse } from "../../server/routes/response.js";

const marketService = createMarketService();
const VALID_RANGES: ChartRange[] = ["1D", "5D", "1M", "3M", "1Y"];

export function parseWatchlistSymbols(value: unknown) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseRange(value: unknown): ChartRange {
  return VALID_RANGES.includes(value as ChartRange) ? (value as ChartRange) : "1M";
}

export function getSummaryFreshness(data: Array<{ freshness: Freshness }>): Freshness {
  return data.some((item) => item.freshness === "demo") ? "mixed" : "delayed";
}

export { createErrorResponse, createSuccessResponse, marketService };
