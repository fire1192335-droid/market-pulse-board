import { createTaiwanProvider } from "./taiwan-provider.js";
import { createYahooIndicesProvider } from "./yahoo-indices-provider.js";

function pickLatestDate(...values) {
  return values.filter(Boolean).sort().at(-1) ?? "--";
}

export function createHybridMarketProvider() {
  const taiwan = createTaiwanProvider();
  const us = createYahooIndicesProvider();
  const quoteCache = new Map();

  function logPartialFailure(sourceName, result) {
    if (result.status === "rejected") {
      console.error(`[hybrid-provider] ${sourceName} snapshot failed`, result.reason);
    }
  }

  function buildConfig() {
    const twConfig = taiwan.getPublicConfig();
    const usConfig = us.getPublicConfig();

    return {
      provider: "hybrid",
      providerLabel: "台股官方 + 美股指數",
      mode: "mixed-sources",
      modeLabel: "雙資料源",
      scopeLabel: "TWSE / TPEx / U.S. Indices",
      latencyTarget: "台股盤後 + 美股依來源",
      disclaimer:
        "台股使用 TWSE / TPEx 官方日資料；美股四大指數使用第三方指數資料來源。不同區塊的更新時效與授權條件不同。",
      latestSourceDate: pickLatestDate(twConfig.latestSourceDate, usConfig.latestSourceDate),
    };
  }

  async function getSnapshot(symbols) {
    const [twResult, usResult] = await Promise.allSettled([
      taiwan.getSnapshot(symbols),
      us.getSnapshot(symbols),
    ]);

    logPartialFailure("taiwan", twResult);
    logPartialFailure("us-indices", usResult);

    return [
      ...(twResult.status === "fulfilled" ? twResult.value : []),
      ...(usResult.status === "fulfilled" ? usResult.value : []),
    ];
  }

  return {
    getPublicConfig() {
      return buildConfig();
    },

    async getSnapshot(symbols) {
      return getSnapshot(symbols);
    },

    subscribe(symbols, onUpdate) {
      const emit = (quotes) => {
        quotes.forEach((quote) => {
          quoteCache.set(quote.symbol, quote);
        });

        onUpdate(Array.from(quoteCache.values()));
      };

      const unsubscribers = [taiwan.subscribe(symbols, emit), us.subscribe(symbols, emit)];

      return () => {
        unsubscribers.forEach((unsubscribe) => unsubscribe());
      };
    },
  };
}
