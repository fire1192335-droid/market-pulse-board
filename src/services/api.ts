import type {
  ApiResponse,
  ChartRange,
  HistoricalPoint,
  MarketQuote,
  MarketSummaryData,
  StockQuote,
  StockSearchResult,
} from "../types/market";

async function fetchApi<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url);
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }

  return payload;
}

export const api = {
  async getMarketSummary(symbols: string[]) {
    const query = new URLSearchParams();

    if (symbols.length > 0) {
      query.set("symbols", symbols.join(","));
    }

    return fetchApi<MarketSummaryData>(`/api/market/summary?${query.toString()}`);
  },

  async getUsIndex(id: string) {
    return fetchApi<MarketQuote>(`/api/market/us/index/${id}`);
  },

  async getTwIndex(id: string) {
    return fetchApi<MarketQuote>(`/api/market/tw/index/${id}`);
  },

  async searchTwStocks(query: string) {
    return fetchApi<StockSearchResult[]>(`/api/tw/stock/search?q=${encodeURIComponent(query)}`);
  },

  async getTwStock(symbol: string) {
    return fetchApi<StockQuote>(`/api/tw/stock/${encodeURIComponent(symbol)}`);
  },

  async getTwStockHistory(symbol: string, range: ChartRange) {
    return fetchApi<HistoricalPoint[]>(
      `/api/tw/stock/${encodeURIComponent(symbol)}/history?range=${encodeURIComponent(range)}`,
    );
  },
};
