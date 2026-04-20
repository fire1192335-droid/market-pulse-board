import { CHART_RANGES, TW_INDEX_CONFIG } from "../../shared/markets.js";
import type { ChartRange, HistoricalPoint, MarketQuote, StockQuote, StockSearchResult } from "../../shared/types.js";
import { createDemoHistory, createDemoMarketQuote, createDemoStockQuote } from "./demoProvider.js";
import { TimedCache } from "../utils/cache.js";
import { fetchJson, toDisplayStatus, toIsoFromUnix } from "../utils/http.js";

const TWSE_STOCK_LIST_URL = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL";
const TPEX_QUOTES_URL = "https://www.tpex.org.tw/www/zh-tw/afterTrading/dailyQuotes";
const TWSE_INDEX_HISTORY_URL = "https://www.twse.com.tw/indicesReport/MI_5MINS_HIST";
const TWSE_STOCK_DAY_URL = "https://www.twse.com.tw/exchangeReport/STOCK_DAY";

interface TwseStockListRow {
  Code: string;
  Name: string;
}

interface TwseIndexHistoryPayload {
  stat?: string;
  data?: string[][];
}

interface TwseStockDayPayload {
  stat?: string;
  data?: string[][];
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
const twseIndexCache = new TimedCache<TwseIndexHistoryPayload>(
  Number(process.env.CACHE_TTL_SECONDS ?? 600) * 1000,
);
const twseStockDayCache = new Map<string, TimedCache<TwseStockDayPayload>>();

function getTaipeiDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: lookup.year,
    month: lookup.month,
    day: lookup.day,
  };
}

function getCurrentMonthQuery() {
  const { year, month } = getTaipeiDateParts();
  return `${year}${month}01`;
}

function getCurrentTaipeiDateKey() {
  const { year, month, day } = getTaipeiDateParts();
  return `${year}-${month}-${day}`;
}

function getPreviousMonthQuery() {
  const { year, month } = getTaipeiDateParts();
  const currentMonth = Number(month);
  const currentYear = Number(year);
  const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;

  return `${previousYear}${String(previousMonth).padStart(2, "0")}01`;
}

function getMonthQueryOffset(offset: number) {
  const { year, month } = getTaipeiDateParts();
  const baseMonthIndex = Number(month) - 1 - offset;
  const date = new Date(Date.UTC(Number(year), baseMonthIndex, 1));

  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}01`;
}

function parseLocalizedNumber(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, "").trim();

  if (!normalized || normalized === "--") {
    return null;
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseTaiwanDate(value: string) {
  const [rocYear, month, day] = value.split("/").map((item) => Number(item));

  return {
    year: rocYear + 1911,
    month,
    day,
  };
}

function toTaipeiIso(value: string, hour = 13, minute = 30) {
  const { year, month, day } = parseTaiwanDate(value);
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute, 0)).toISOString();
}

function toDateKey(value: string) {
  const { year, month, day } = parseTaiwanDate(value);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseSignedChange(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, "").trim();

  if (!normalized || normalized === "--") {
    return null;
  }

  const sign = normalized[0];
  const amount = Number(normalized.slice(1));

  if (!Number.isFinite(amount)) {
    return null;
  }

  if (sign === "-") {
    return Number((-amount).toFixed(2));
  }

  return Number(amount.toFixed(2));
}

function getHistoryPointLimit(range: ChartRange) {
  switch (range) {
    case "1D":
      return 1;
    case "5D":
      return 5;
    case "1M":
      return 22;
    case "3M":
      return 66;
    case "1Y":
    default:
      return 260;
  }
}

function getMonthSpanForRange(range: ChartRange) {
  switch (range) {
    case "1D":
    case "5D":
    case "1M":
      return 2;
    case "3M":
      return 4;
    case "1Y":
    default:
      return 14;
  }
}

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

function getStockDayCache(key: string) {
  const existing = twseStockDayCache.get(key);

  if (existing) {
    return existing;
  }

  const cache = new TimedCache<TwseStockDayPayload>(Number(process.env.CACHE_TTL_SECONDS ?? 600) * 1000);
  twseStockDayCache.set(key, cache);
  return cache;
}

async function fetchYahooChart(symbol: string, range: ChartRange): Promise<YahooChartResponse> {
  const config = mapRange(range);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${config.range}&interval=${config.interval}`;
  return fetchJson<YahooChartResponse>(url);
}

async function fetchTwseIndexHistory(monthQuery: string) {
  const cached = twseIndexCache.get();

  if (cached && monthQuery === getCurrentMonthQuery()) {
    return cached;
  }

  const url = `${TWSE_INDEX_HISTORY_URL}?response=json&date=${monthQuery}`;
  const payload = await fetchJson<TwseIndexHistoryPayload>(url);

  if (monthQuery === getCurrentMonthQuery()) {
    twseIndexCache.set(payload);
  }

  return payload;
}

async function fetchTwseStockMonth(symbol: string, monthQuery: string) {
  const cacheKey = `${symbol}:${monthQuery}`;
  const cache = getStockDayCache(cacheKey);
  const cached = cache.get();

  if (cached) {
    return cached;
  }

  const url = `${TWSE_STOCK_DAY_URL}?response=json&date=${monthQuery}&stockNo=${encodeURIComponent(symbol)}`;
  const payload = await fetchJson<TwseStockDayPayload>(url);
  cache.set(payload);
  return payload;
}

async function getOfficialTwseIndexQuote(item: { id: string; symbol: string; name: string }): Promise<MarketQuote | null> {
  const payload = await fetchTwseIndexHistory(getCurrentMonthQuery());
  const rows = payload.data ?? [];

  if (rows.length === 0) {
    return null;
  }

  const latestIndex = rows.length - 1;
  const latestRow = rows[latestIndex];
  const latestDateKey = toDateKey(latestRow[0]);

  if (latestDateKey !== getCurrentTaipeiDateKey()) {
    return null;
  }

  const close = parseLocalizedNumber(latestRow[4]);
  const open = parseLocalizedNumber(latestRow[1]);
  const high = parseLocalizedNumber(latestRow[2]);
  const low = parseLocalizedNumber(latestRow[3]);

  let previousClose = latestIndex > 0 ? parseLocalizedNumber(rows[latestIndex - 1][4]) : null;

  if (previousClose === null) {
    const previousMonth = await fetchTwseIndexHistory(getPreviousMonthQuery());
    const previousRows = previousMonth.data ?? [];
    previousClose = previousRows.length > 0 ? parseLocalizedNumber(previousRows.at(-1)?.[4]) : null;
  }

  if (close === null) {
    return null;
  }

  const resolvedPreviousClose = previousClose ?? close;
  const change = Number((close - resolvedPreviousClose).toFixed(2));
  const changePercent =
    resolvedPreviousClose === 0 ? 0 : Number((((close - resolvedPreviousClose) / resolvedPreviousClose) * 100).toFixed(2));

  return {
    id: item.id,
    symbol: item.symbol,
    name: item.name,
    market: "TW",
    price: close,
    change,
    changePercent,
    currency: "TWD",
    source: "TWSE official daily index data",
    freshness: "end-of-day",
    updatedAt: toTaipeiIso(latestRow[0]),
    statusLabel: toDisplayStatus("end-of-day"),
  };
}

async function getOfficialTwseStockQuote(match: StockSearchResult): Promise<StockQuote | null> {
  const payload = await fetchTwseStockMonth(match.symbol, getCurrentMonthQuery());
  const rows = payload.data ?? [];

  if (rows.length === 0) {
    return null;
  }

  const latestIndex = rows.length - 1;
  const latestRow = rows[latestIndex];
  const latestDateKey = toDateKey(latestRow[0]);

  if (latestDateKey !== getCurrentTaipeiDateKey()) {
    return null;
  }

  const close = parseLocalizedNumber(latestRow[6]);
  const open = parseLocalizedNumber(latestRow[3]);
  const high = parseLocalizedNumber(latestRow[4]);
  const low = parseLocalizedNumber(latestRow[5]);
  const volume = parseLocalizedNumber(latestRow[1]);

  let previousClose = latestIndex > 0 ? parseLocalizedNumber(rows[latestIndex - 1][6]) : null;

  if (previousClose === null && close !== null) {
    const parsedChange = parseSignedChange(latestRow[7]);
    previousClose = parsedChange === null ? null : Number((close - parsedChange).toFixed(2));
  }

  if (close === null) {
    return null;
  }

  const resolvedPreviousClose = previousClose ?? close;
  const change = Number((close - resolvedPreviousClose).toFixed(2));
  const changePercent =
    resolvedPreviousClose === 0 ? 0 : Number((((close - resolvedPreviousClose) / resolvedPreviousClose) * 100).toFixed(2));

  return {
    symbol: match.symbol,
    name: match.name,
    exchange: match.exchange,
    price: close,
    change,
    changePercent,
    open,
    high,
    low,
    previousClose: resolvedPreviousClose,
    volume,
    currency: "TWD",
    source: "TWSE official daily stock data",
    freshness: "end-of-day",
    updatedAt: toTaipeiIso(latestRow[0]),
    statusLabel: toDisplayStatus("end-of-day"),
  };
}

async function getOfficialTwseStockHistory(match: StockSearchResult, range: ChartRange): Promise<HistoricalPoint[]> {
  const monthSpan = getMonthSpanForRange(range);
  const monthQueries = Array.from({ length: monthSpan }, (_, index) => getMonthQueryOffset(index));
  const payloads = await Promise.all(monthQueries.map((monthQuery) => fetchTwseStockMonth(match.symbol, monthQuery)));
  const rows = payloads
    .flatMap((payload) => payload.data ?? [])
    .sort((left, right) => toDateKey(left[0]).localeCompare(toDateKey(right[0])));

  const points: HistoricalPoint[] = [];

  for (const row of rows) {
    const close = parseLocalizedNumber(row[6]);
    const open = parseLocalizedNumber(row[3]);
    const high = parseLocalizedNumber(row[4]);
    const low = parseLocalizedNumber(row[5]);

    if (close === null) {
      continue;
    }

    points.push({
      time: toTaipeiIso(row[0]),
      value: close,
      open,
      high,
      low,
      close,
      volume: parseLocalizedNumber(row[1]),
    });
  }

  if (points.length === 0) {
    return [];
  }

  return points.slice(-getHistoryPointLimit(range));
}

export function createTwProvider() {
  return {
    async getIndex(id: string): Promise<MarketQuote> {
      const item = TW_INDEX_CONFIG.find((entry) => entry.id === id);

      if (!item) {
        throw new Error(`Unsupported TW index: ${id}`);
      }

      try {
        if (item.symbol === "TAIEX") {
          const officialQuote = await getOfficialTwseIndexQuote(item);

          if (officialQuote) {
            return officialQuote;
          }
        }

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
        if (match.exchange === "TWSE") {
          const officialQuote = await getOfficialTwseStockQuote(match);

          if (officialQuote) {
            return officialQuote;
          }
        }

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
        if (match.exchange === "TWSE") {
          const officialHistory = await getOfficialTwseStockHistory(match, range);

          if (officialHistory.length > 0) {
            return officialHistory;
          }
        }

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
