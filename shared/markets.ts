import type { ChartRange } from "./types";

export interface MarketConfigItem {
  id: string;
  name: string;
  symbol: string;
  market: string;
  providerSymbol: string;
}

export const US_INDEX_CONFIG: MarketConfigItem[] = [
  {
    id: "dji",
    name: "Dow Jones Industrial Average",
    symbol: "DJI",
    market: "US",
    providerSymbol: "^DJI",
  },
  {
    id: "spx",
    name: "S&P 500",
    symbol: "SPX",
    market: "US",
    providerSymbol: "^GSPC",
  },
  {
    id: "ixic",
    name: "Nasdaq Composite",
    symbol: "IXIC",
    market: "US",
    providerSymbol: "^IXIC",
  },
  {
    id: "sox",
    name: "Philadelphia Semiconductor Index",
    symbol: "SOX",
    market: "US",
    providerSymbol: "^SOX",
  },
];

export const TW_INDEX_CONFIG: MarketConfigItem[] = [
  {
    id: "taiex",
    name: "加權指數",
    symbol: "TAIEX",
    market: "TW",
    providerSymbol: "^TWII",
  },
];

export const CHART_RANGES: ChartRange[] = ["1D", "5D", "1M", "3M", "1Y"];
