import { createHybridMarketProvider } from "./hybrid-market-provider.js";
import { createMockProvider } from "./mock-provider.js";
import { createTaiwanProvider } from "./taiwan-provider.js";
import { createTpexProvider } from "./tpex-provider.js";
import { createTwseProvider } from "./twse-provider.js";
import { createYahooIndicesProvider } from "./yahoo-indices-provider.js";

export function createProvider({ providerName }) {
  switch (providerName) {
    case "hybrid":
      return createHybridMarketProvider();
    case "taiwan":
      return createTaiwanProvider();
    case "us-indices":
      return createYahooIndicesProvider();
    case "tpex":
      return createTpexProvider();
    case "twse":
      return createTwseProvider();
    case "mock":
    default:
      return createMockProvider();
  }
}
