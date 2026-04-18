import type { ChartRange, HistoricalPoint, MarketQuote, StockQuote } from "../../shared/types.js";
import { toDisplayStatus } from "../utils/http.js";

function hashSeed(input: string) {
  return input.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

function makePrice(seed: number, base: number) {
  return Number((base + (seed % 37) * 1.9).toFixed(2));
}

export function createDemoMarketQuote(input: {
  id: string;
  symbol: string;
  name: string;
  market: string;
  currency?: string;
}): MarketQuote {
  const seed = hashSeed(input.symbol);
  const price = makePrice(seed, input.market === "TW" ? 17000 : 4200);
  const change = Number((((seed % 15) - 7) * 12.4).toFixed(2));
  const previousClose = price - change;
  const changePercent = Number(((change / previousClose) * 100).toFixed(2));
  const updatedAt = new Date().toISOString();

  return {
    id: input.id,
    symbol: input.symbol,
    name: input.name,
    market: input.market,
    price,
    change,
    changePercent,
    currency: input.currency ?? "TWD",
    source: "Demo fallback provider",
    freshness: "demo",
    updatedAt,
    statusLabel: toDisplayStatus("demo"),
  };
}

export function createDemoStockQuote(input: {
  symbol: string;
  name: string;
  exchange: string;
  currency?: string;
}): StockQuote {
  const seed = hashSeed(input.symbol);
  const price = makePrice(seed, input.exchange === "TPEX" ? 120 : 560);
  const change = Number((((seed % 9) - 4) * 1.8).toFixed(2));
  const previousClose = Number((price - change).toFixed(2));
  const updatedAt = new Date().toISOString();

  return {
    symbol: input.symbol,
    name: input.name,
    exchange: input.exchange,
    price,
    change,
    changePercent: Number(((change / previousClose) * 100).toFixed(2)),
    open: Number((price - 1.2).toFixed(2)),
    high: Number((price + 2.4).toFixed(2)),
    low: Number((price - 2.1).toFixed(2)),
    previousClose,
    volume: 1000000 + seed * 100,
    currency: input.currency ?? "TWD",
    source: "Demo fallback provider",
    freshness: "demo",
    updatedAt,
    statusLabel: toDisplayStatus("demo"),
  };
}

export function createDemoHistory(symbol: string, range: ChartRange): HistoricalPoint[] {
  const seed = hashSeed(symbol);
  const lengthMap: Record<ChartRange, number> = {
    "1D": 24,
    "5D": 40,
    "1M": 30,
    "3M": 45,
    "1Y": 52,
  };
  const length = lengthMap[range];
  const now = Date.now();
  const step = range === "1D" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  return Array.from({ length }, (_, index) => {
    const offset = length - index;
    const base = 480 + (seed % 40);
    const close = Number((base + Math.sin(index / 3) * 7 + offset * -0.3).toFixed(2));
    const open = Number((close - 1.1).toFixed(2));
    const high = Number((close + 2.5).toFixed(2));
    const low = Number((close - 2.2).toFixed(2));

    return {
      time: new Date(now - offset * step).toISOString(),
      value: close,
      open,
      high,
      low,
      close,
      volume: 1200000 + index * 3400,
    };
  });
}
