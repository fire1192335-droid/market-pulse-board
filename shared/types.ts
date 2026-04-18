export type Freshness = "realtime" | "delayed" | "after-market" | "end-of-day" | "demo" | "mixed";

export interface QuoteMeta {
  source: string;
  freshness: Freshness;
  updatedAt: string;
  statusLabel: string;
}

export interface MarketQuote extends QuoteMeta {
  id: string;
  symbol: string;
  name: string;
  market: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

export interface StockQuote extends QuoteMeta {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  volume: number | null;
  currency: string;
}

export interface HistoricalPoint {
  time: string;
  value: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: "TWSE" | "TPEX";
  yahooSymbol: string;
}

export interface MarketSummaryData {
  usIndices: MarketQuote[];
  twIndices: MarketQuote[];
  watchlist: StockQuote[];
}

export interface StockDetailData {
  quote: StockQuote;
  history: HistoricalPoint[];
  supportedRanges: ChartRange[];
}

export type ChartRange = "1D" | "5D" | "1M" | "3M" | "1Y";

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  source: string;
  freshness: Freshness;
  updatedAt: string | null;
  error: string | null;
}
