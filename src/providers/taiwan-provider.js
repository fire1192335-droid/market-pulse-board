import { createTpexProvider } from "./tpex-provider.js";
import { createTwseProvider } from "./twse-provider.js";

function pickLatestDate(...values) {
  return values.filter(Boolean).sort().at(-1) ?? "--";
}

export function createTaiwanProvider() {
  const twse = createTwseProvider();
  const tpex = createTpexProvider();
  const quoteCache = new Map();

  function logPartialFailure(sourceName, result) {
    if (result.status === "rejected") {
      console.error(`[taiwan-provider] ${sourceName} snapshot failed`, result.reason);
    }
  }

  function buildConfig() {
    const twseConfig = twse.getPublicConfig();
    const tpexConfig = tpex.getPublicConfig();

    return {
      provider: "taiwan",
      providerLabel: "TWSE + TPEx 官方資料",
      mode: "official-daily",
      modeLabel: "官方日資料",
      scopeLabel: "TWSE 上市 + TPEx 上櫃",
      latencyTarget: "盤後資料",
      disclaimer:
        "目前整合 TWSE 官方 OpenAPI 與 TPEx 官方 `afterTrading/dailyQuotes`。這是官方日資料，不是逐筆或零延遲報價。",
      latestSourceDate: pickLatestDate(twseConfig.latestSourceDate, tpexConfig.latestSourceDate),
    };
  }

  async function getSnapshot(symbols) {
    const [twseResult, tpexResult] = await Promise.allSettled([
      twse.getSnapshot(symbols),
      tpex.getSnapshot(symbols),
    ]);

    logPartialFailure("twse", twseResult);
    logPartialFailure("tpex", tpexResult);

    return [
      ...(twseResult.status === "fulfilled" ? twseResult.value : []),
      ...(tpexResult.status === "fulfilled" ? tpexResult.value : []),
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

      const unsubscribers = [twse.subscribe(symbols, emit), tpex.subscribe(symbols, emit)];

      return () => {
        unsubscribers.forEach((unsubscribe) => unsubscribe());
      };
    },
  };
}
