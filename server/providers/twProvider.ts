import { CHART_RANGES, TW_INDEX_CONFIG } from "../../shared/markets.js";
import type { ChartRange, HistoricalPoint, MarketQuote, StockQuote, StockSearchResult } from "../../shared/types.js";
import { createDemoHistory, createDemoMarketQuote, createDemoStockQuote } from "./demoProvider.js";
import { TimedCache } from "../utils/cache.js";
import { fetchJson, toDisplayStatus, toIsoFromUnix } from "../utils/http.js";

const TWSE_STOCK_LIST_URL = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL";
const TPEX_QUOTES_URL = "https://www.tpex.org.tw/www/zh-tw/afterTrading/dailyQuotes";

interface TwseStockListRow {
  Code: string;
  Name: string;
}

interface TpexQuotesPayload {
  tables?: Array<{
    data?: string[][];
  }>;
}

interface YahooMeta {
  regularMarketPrice?: number;
  regularMarketTime?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  currency?: string;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
}

interface YahooQuoteSeries {
  close?: Array<number | null>;
  open?: Array<number | null>;
  high?: Array<number | null>;
  low?: Array<number | null>;
  volume?: Array<number | null>;
}

interface YahooChartResult {
  meta?: YahooMeta;
  timestamp?: number[];
  indicators?: {
    quote?: YahooQuoteSeries[];
  };
}

interface YahooChartResponse {
  chart?: {
    result?: YahooChartResult[];
  };
}

const searchCache = new TimedCache<StockSearchResult[]>(
  Number(process.env.CACHE_TTL_SECONDS ?? 600) * 1000,
);

function normalizeSymbol(input: string) {
  return input.trim().toUpperCase().replace(/^TWSE:/, "").replace(/^TPEX:/, "");
}

function buildYahooTicker(result: Pick<StockSearchResult, "symbol" | "exchange">) {
  return result.exchange === "TPEX" ? `${result.symbol}.TWO` : `${result.symbol}.TW`;
}

function mapRange(range: ChartRange) {
  switch (range) {
    case "1D":
      return { range: "1d", interval: "5m" };
    case "5D":
      return { range: "5d", interval: "30m" };
    case "1M":
      return { range: "1mo", interval: "1d" };
    case "3M":
      return { range: "3mo", interval: "1d" };
    case "1Y":
    default:
      return { range: "1y", interval: "1wk" };
  }
}

async function loadSearchCatalog(): Promise<StockSearchResult[]> {
  const cached = searchCache.get();

  if (cached) {
    return cached;
  }

  try {
    const [twseRows, tpexPayload] = await Promise.all([
      fetchJson<TwseStockListRow[]>(TWSE_STOCK_LIST_URL),
      fetchJson<TpexQuotesPayload>(TPEX_QUOTES_URL),
    ]);

    const merged: StockSearchResult[] = [
      ...twseRows.map((row: TwseStockListRow) => ({
        symbol: row.Code,
        name: row.Name,
        exchange: "TWSE" as const,
        yahooSymbol: `${row.Code}.TW`,
      })),
      ...(tpexPayload.tables?.[0]?.data ?? []).map((row: string[]) => ({
        symbol: row[0],
        name: row[1],
        exchange: "TPEX" as const,
        yahooSymbol: `${row[0]}.TWO`,
      })),
    ];

    searchCache.set(merged);
    return merged;
  } catch {
    const fallback: StockSearchResult[] = [
      { symbol: "2330", name: "TSMC", exchange: "TWSE", yahooSymbol: "2330.TW" },
      { symbol: "2454", name: "MediaTek", exchange: "TWSE", yahooSymbol: "2454.TW" },
      { symbol: "2317", name: "Hon Hai", exchange: "TWSE", yahooSymbol: "2317.TW" },
      { symbol: "8069", name: "E Ink", exchange: "TPEX", yahooSymbol: "8069.TWO" },
      { symbol: "6488", name: "GlobalWafers", exchange: "TPEX", yahooSymbol: "6488.TWO" },
    ];

    searchCache.set(fallback);
    return fallback;
  }
}

function buildIndexQuote(meta: YahooMeta, context: { symbol: string; name: string; market: string }): MarketQuote {
  const price = Number(meta.regularMarketPrice ?? 0);
  const previousClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
  const change = Number((price - previousClose).toFixed(2));
  const changePercent = previousClose === 0 ? 0 : Number((((price - previousClose) / previousClose) * 100).toFixed(2));

  return {
    id: context.symbol.toLowerCase(),
    symbol: context.symbol,
    name: context.name,
    market: context.market,
    price,
    change,
    changePercent,
    currency: meta.currency ?? "TWD",
    source: "Yahoo Finance public chart endpoint",
    freshness: "delayed",
    updatedAt: toIsoFromUnix(meta.regularMarketTime),
    statusLabel: toDisplayStatus("delayed"),
  };
}

function buildStockQuote(meta: YahooMeta, context: { symbol: string; name: string; exchange: string }): StockQuote {
  const price = Number(meta.regularMarketPrice ?? 0);
  const previousClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
  const change = Number((price - previousClose).toFixed(2));
  const changePercent = previousClose === 0 ? 0 : Number((((price - previousClose) / previousClose) * 100).toFixed(2));

  return {
    symbol: context.symbol,
    name: context.name,
    exchange: context.exchange,
    price,
    change,
    changePercent,
    open: meta.regularMarketOpen ?? null,
    high: meta.regularMarketDayHigh ?? null,
    low: meta.regularMarketDayLow ?? null,
    previousClose,
    volume: meta.regularMarketVolume ?? null,
    currency: meta.currency ?? "TWD",
    source: "Yahoo Finance public chart endpoint",
    freshness: "delayed",
    updatedAt: toIsoFromUnix(meta.regularMarketTime),
    statusLabel: toDisplayStatus("delayed"),
  };
}

function buildHistoryPoints(result: YahooChartResult): HistoricalPoint[] {
  const quote = result.indicators?.quote?.[0];
  const timestamps = result.timestamp ?? [];
  const points: HistoricalPoint[] = [];

  timestamps.forEach((timestamp: number, index: number) => {
    const close = quote?.close?.[index] ?? null;

    if (close === null) {
      return;
    }

    points.push({
      time: toIsoFromUnix(timestamp),
      value: Number(close.toFixed(2)),
      open: quote?.open?.[index] ?? null,
      high: quote?.high?.[index] ?? null,
      low: quote?.low?.[index] ?? null,
      close: Number(close.toFixed(2)),
      volume: quote?.volume?.[index] ?? null,
    });
  });

  return points;
}

async function fetchYahooChart(symbol: string, range: ChartRange): Promise<YahooChartResponse> {
  const config = mapRange(range);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${config.range}&interval=${config.interval}`;
  return fetchJson<YahooChartResponse>(url);
}

export function createTwProvider() {
  return {
    async getIndex(id: string): Promise<MarketQuote> {
      const item = TW_INDEX_CONFIG.find((entry) => entry.id === id);

      if (!item) {
        throw new Error(`Unsupported TW index: ${id}`);
      }

      try {
        const response = await fetchYahooChart(item.providerSymbol, "5D");
        const meta = response.chart?.result?.[0]?.meta;

        if (!meta || !meta.regularMarketPrice) {
          throw new Error("Missing TW index meta");
        }

        return buildIndexQuote(meta, {
          symbol: item.symbol,
          name: item.name,
          market: "TW",
        });
      } catch {
        return createDemoMarketQuote({
          id: item.id,
          symbol: item.symbol,
          name: item.name,
          market: "TW",
          currency: "TWD",
        });
      }
    },

    async getIndicesSummary(ids = TW_INDEX_CONFIG.map((item) => item.id)) {
      return Promise.all(ids.map((id: string) => this.getIndex(id)));
    },

    async searchStocks(query: string) {
      const normalized = query.trim().toLowerCase();

      if (!normalized) {
        return [];
      }

      const catalog = await loadSearchCatalog();

      return catalog
        .filter((entry: StockSearchResult) => entry.symbol.includes(normalized) || entry.name.toLowerCase().includes(normalized))
        .slice(0, 12);
    },

    async getStock(symbol: string): Promise<StockQuote> {
      const normalized = normalizeSymbol(symbol);
      const catalog = await loadSearchCatalog();
      const match =
        catalog.find((entry: StockSearchResult) => entry.symbol === normalized) ??
        catalog.find((entry: StockSearchResult) => entry.symbol.startsWith(normalized));

      if (!match) {
        return createDemoStockQuote({
          symbol: normalized,
          name: `DEMO ${normalized}`,
          exchange: "TWSE",
        });
      }

      try {
        const response = await fetchYahooChart(match.yahooSymbol, "5D");
        const meta = response.chart?.result?.[0]?.meta;

        if (!meta || !meta.regularMarketPrice) {
          throw new Error("Missing stock meta");
        }

        return buildStockQuote(meta, {
          symbol: match.symbol,
          name: match.name,
          exchange: match.exchange,
        });
      } catch {
        return createDemoStockQuote({
          symbol: match.symbol,
          name: match.name,
          exchange: match.exchange,
        });
      }
    },

    async getStockHistory(symbol: string, range: ChartRange) {
      const normalized = normalizeSymbol(symbol);
      const catalog = await loadSearchCatalog();
      const match =
        catalog.find((entry: StockSearchResult) => entry.symbol === normalized) ??
        catalog.find((entry: StockSearchResult) => entry.symbol.startsWith(normalized));

      if (!match) {
        return createDemoHistory(normalized, range);
      }

      try {
        const response = await fetchYahooChart(buildYahooTicker(match), range);
        const result = response.chart?.result?.[0];
        const points = result ? buildHistoryPoints(result) : [];

        if (points.length === 0) {
          throw new Error("Empty history");
        }

        return points;
      } catch {
        return createDemoHistory(match.symbol, range);
      }
    },

    getSupportedRanges() {
      return CHART_RANGES;
    },
  };
}
