import { getSymbolMeta } from "./catalog.js";

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function buildQuote(symbol, previousQuote) {
  const meta = getSymbolMeta(symbol);
  const previousLast = previousQuote?.last ?? meta.last;
  const move = previousLast * randomBetween(-0.0035, 0.0035);
  const nextLast = Math.max(0.01, previousLast + move);
  const previousClose = previousQuote?.previousClose ?? meta.last;
  const bid = nextLast - randomBetween(0.01, 0.18);
  const ask = nextLast + randomBetween(0.01, 0.18);
  const change = nextLast - previousClose;
  const changePct = previousClose === 0 ? 0 : (change / previousClose) * 100;
  const volume = Math.max(meta.volume, Math.floor((previousQuote?.volume ?? meta.volume) + randomBetween(50, 5000)));

  return {
    symbol,
    name: meta.name,
    market: meta.market,
    decimals: meta.decimals,
    previousClose: Number(previousClose.toFixed(meta.decimals)),
    last: Number(nextLast.toFixed(meta.decimals)),
    bid: Number(bid.toFixed(meta.decimals)),
    ask: Number(ask.toFixed(meta.decimals)),
    change: Number(change.toFixed(meta.decimals)),
    changePct: Number(changePct.toFixed(2)),
    volume,
    updatedAt: new Date().toISOString(),
  };
}

export function createMockProvider() {
  const cache = new Map();

  function ensureQuote(symbol) {
    const quote = buildQuote(symbol, cache.get(symbol));
    cache.set(symbol, quote);
    return quote;
  }

  return {
    getPublicConfig() {
      return {
        provider: "mock",
        providerLabel: "Mock Feed",
        mode: "sandbox",
        modeLabel: "本地模擬",
        scopeLabel: "UI / 資料流驗證",
        latencyTarget: "< 1s 本地模擬",
        disclaimer: "這是本地模擬報價，用來驗證正式 feed 接入前的畫面與資料流，不能作為下單依據。",
      };
    },

    async getSnapshot(symbols) {
      return symbols.map(ensureQuote);
    },

    subscribe(symbols, onUpdate) {
      const timer = setInterval(() => {
        const quotes = symbols.map(ensureQuote);
        onUpdate(quotes);
      }, 1000);

      return () => clearInterval(timer);
    },
  };
}
