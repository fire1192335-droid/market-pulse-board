import { TW_INDEX_CONFIG, US_INDEX_CONFIG } from "../../shared/markets.js";
import type { ChartRange, MarketSummaryData, StockDetailData, StockSearchResult } from "../../shared/types.js";
import { maxUpdatedAt } from "../utils/http.js";
import { createDemoHistory, createDemoMarketQuote, createDemoStockQuote } from "./demoProvider.js";
import { createTwProvider } from "./twProvider.js";
import { createUsProvider } from "./usProvider.js";

function createDemoUsProvider() {
  return {
    async getIndex(id: string) {
      const item = US_INDEX_CONFIG.find((entry) => entry.id === id);

      if (!item) {
        throw new Error(`Unsupported US index: ${id}`);
      }

      return createDemoMarketQuote({
        id: item.id,
        symbol: item.symbol,
        name: item.name,
        market: "US",
        currency: "USD",
      });
    },

    async getSummary(ids = US_INDEX_CONFIG.map((item) => item.id)) {
      return Promise.all(ids.map((id: string) => this.getIndex(id)));
    },
  };
}

function createDemoTwProvider() {
  const searchCatalog: StockSearchResult[] = [
    { symbol: "2330", name: "TSMC", exchange: "TWSE", yahooSymbol: "2330.TW" },
    { symbol: "2454", name: "MediaTek", exchange: "TWSE", yahooSymbol: "2454.TW" },
    { symbol: "2317", name: "Hon Hai", exchange: "TWSE", yahooSymbol: "2317.TW" },
    { symbol: "8069", name: "E Ink", exchange: "TPEX", yahooSymbol: "8069.TWO" },
  ];

  return {
    async getIndex(id: string) {
      const item = TW_INDEX_CONFIG.find((entry) => entry.id === id);

      if (!item) {
        throw new Error(`Unsupported TW index: ${id}`);
      }

      return createDemoMarketQuote({
        id: item.id,
        symbol: item.symbol,
        name: item.name,
        market: "TW",
        currency: "TWD",
      });
    },

    async getIndicesSummary(ids = TW_INDEX_CONFIG.map((item) => item.id)) {
      return Promise.all(ids.map((id: string) => this.getIndex(id)));
    },

    async searchStocks(query: string) {
      const normalized = query.trim().toLowerCase();

      if (!normalized) {
        return [];
      }

      return searchCatalog.filter(
        (entry) => entry.symbol.includes(normalized) || entry.name.toLowerCase().includes(normalized),
      );
    },

    async getStock(symbol: string) {
      const match =
        searchCatalog.find((entry) => entry.symbol === symbol) ??
        searchCatalog.find((entry) => entry.symbol.startsWith(symbol));

      return createDemoStockQuote({
        symbol,
        name: match?.name ?? `DEMO ${symbol}`,
        exchange: match?.exchange ?? "TWSE",
      });
    },

    async getStockHistory(symbol: string, range: ChartRange) {
      return createDemoHistory(symbol, range);
    },

    getSupportedRanges() {
      return ["1D", "5D", "1M", "3M", "1Y"] as ChartRange[];
    },
  };
}

export function createMarketService() {
  const usProviderName = process.env.US_MARKET_PROVIDER ?? "public";
  const twProviderName = process.env.TW_MARKET_PROVIDER ?? "public";
  const usProvider = usProviderName === "demo" ? createDemoUsProvider() : createUsProvider();
  const twProvider = twProviderName === "demo" ? createDemoTwProvider() : createTwProvider();

  return {
    async getMarketSummary(watchlistSymbols: string[]): Promise<MarketSummaryData> {
      const [usIndices, twIndices, watchlist] = await Promise.all([
        usProvider.getSummary(),
        twProvider.getIndicesSummary(),
        Promise.all(watchlistSymbols.map((symbol) => twProvider.getStock(symbol))),
      ]);

      return {
        usIndices,
        twIndices,
        watchlist,
      };
    },

    async getUsIndex(id: string) {
      return usProvider.getIndex(id);
    },

    async getTwIndex(id: string) {
      return twProvider.getIndex(id);
    },

    async searchTwStocks(query: string) {
      return twProvider.searchStocks(query);
    },

    async getTwStock(symbol: string) {
      return twProvider.getStock(symbol);
    },

    async getTwStockDetail(symbol: string, range: ChartRange): Promise<StockDetailData> {
      const [quote, history] = await Promise.all([
        twProvider.getStock(symbol),
        twProvider.getStockHistory(symbol, range),
      ]);

      return {
        quote,
        history,
        supportedRanges: twProvider.getSupportedRanges(),
      };
    },

    getLatestUpdatedAt(data: Array<{ updatedAt: string }>) {
      return maxUpdatedAt(data.map((item) => item.updatedAt));
    },
  };
}
