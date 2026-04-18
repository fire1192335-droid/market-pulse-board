import { US_INDEX_CONFIG } from "../../shared/markets.js";
import type { MarketConfigItem } from "../../shared/markets.js";
import type { MarketQuote } from "../../shared/types.js";
import { createDemoMarketQuote } from "./demoProvider.js";
import { fetchJson, toDisplayStatus, toIsoFromUnix } from "../utils/http.js";

interface YahooMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketTime?: number;
  currency?: string;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: YahooMeta;
    }>;
  };
}

function buildYahooQuote(item: MarketConfigItem, meta: YahooMeta): MarketQuote {
  const price = Number(meta.regularMarketPrice ?? 0);
  const previousClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
  const change = Number((price - previousClose).toFixed(2));
  const changePercent = previousClose === 0 ? 0 : Number((((price - previousClose) / previousClose) * 100).toFixed(2));

  return {
    id: item.id,
    symbol: item.symbol,
    name: item.name,
    market: item.market,
    price,
    change,
    changePercent,
    currency: meta.currency ?? "USD",
    source: "Yahoo Finance public chart endpoint",
    freshness: "delayed",
    updatedAt: toIsoFromUnix(meta.regularMarketTime),
    statusLabel: toDisplayStatus("delayed"),
  };
}

async function fetchIndexQuote(item: MarketConfigItem): Promise<MarketQuote> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.providerSymbol)}?range=5d&interval=1d`;
  const response = await fetchJson<YahooChartResponse>(url);
  const meta = response.chart?.result?.[0]?.meta;

  if (!meta || !meta.regularMarketPrice) {
    throw new Error(`Missing market meta for ${item.id}`);
  }

  return buildYahooQuote(item, meta);
}

export function createUsProvider() {
  return {
    async getIndex(id: string) {
      const item = US_INDEX_CONFIG.find((entry) => entry.id === id);

      if (!item) {
        throw new Error(`Unsupported US index: ${id}`);
      }

      try {
        return await fetchIndexQuote(item);
      } catch {
        return createDemoMarketQuote({
          id: item.id,
          symbol: item.symbol,
          name: item.name,
          market: "US",
          currency: "USD",
        });
      }
    },

    async getSummary(ids = US_INDEX_CONFIG.map((item) => item.id)) {
      return Promise.all(ids.map((id) => this.getIndex(id)));
    },
  };
}
