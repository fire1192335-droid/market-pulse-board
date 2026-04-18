const YAHOO_SYMBOLS = {
  "DJ:DJI": "^DJI",
  "NASDAQ:IXIC": "^IXIC",
  "SP:SPX": "^GSPC",
  "NASDAQ:SOX": "^SOX",
};

const YAHOO_NAMES = {
  "DJ:DJI": "道瓊工業",
  "NASDAQ:IXIC": "Nasdaq 綜合",
  "SP:SPX": "S&P 500",
  "NASDAQ:SOX": "費城半導體",
};

const REFRESH_MS = 60_000;

function formatSourceDate(timestamp) {
  if (!timestamp) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(timestamp * 1000));
}

function buildQuote(appSymbol, meta) {
  const last = Number(meta.regularMarketPrice);
  const previousClose = Number(meta.chartPreviousClose ?? meta.previousClose);
  const change = last - previousClose;
  const changePct = previousClose === 0 ? 0 : (change / previousClose) * 100;

  return {
    symbol: appSymbol,
    name: YAHOO_NAMES[appSymbol],
    market: "US Index",
    decimals: 2,
    previousClose: Number(previousClose.toFixed(2)),
    last: Number(last.toFixed(2)),
    bid: null,
    ask: null,
    change: Number(change.toFixed(2)),
    changePct: Number(changePct.toFixed(2)),
    volume: meta.regularMarketVolume ?? null,
    updatedAt: new Date(meta.regularMarketTime * 1000).toISOString(),
    sourceDate: formatSourceDate(meta.regularMarketTime),
  };
}

async function fetchQuote(appSymbol) {
  const yahooSymbol = YAHOO_SYMBOLS[appSymbol];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo index request failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const meta = json.chart?.result?.[0]?.meta;

  if (!meta) {
    throw new Error(`Yahoo index payload missing meta for ${appSymbol}`);
  }

  return buildQuote(appSymbol, meta);
}

export function createYahooIndicesProvider() {
  const cache = {
    fetchedAt: 0,
    quotes: new Map(),
    latestSourceDate: "--",
  };

  async function refreshIfNeeded() {
    const now = Date.now();

    if (now - cache.fetchedAt < REFRESH_MS && cache.quotes.size > 0) {
      return;
    }

    const appSymbols = Object.keys(YAHOO_SYMBOLS);
    const quotes = await Promise.all(appSymbols.map(fetchQuote));
    const nextQuotes = new Map();

    quotes.forEach((quote) => {
      nextQuotes.set(quote.symbol, quote);
    });

    cache.quotes = nextQuotes;
    cache.fetchedAt = now;
    cache.latestSourceDate = quotes[0]?.sourceDate ?? "--";
  }

  async function getQuotes(symbols) {
    await refreshIfNeeded();

    return symbols
      .map((symbol) => cache.quotes.get(symbol))
      .filter(Boolean);
  }

  return {
    getPublicConfig() {
      return {
        provider: "yahoo-indices",
        providerLabel: "Yahoo Finance Indices",
        mode: "third-party-index-feed",
        modeLabel: "第三方指數資料",
        scopeLabel: "美股四大指數",
        latencyTarget: "依來源可能延遲",
        disclaimer:
          "美股四大指數目前來自 Yahoo Finance chart endpoint，屬第三方資料來源，時效與授權條件需以來源規則為準。",
        latestSourceDate: cache.latestSourceDate,
      };
    },

    async getSnapshot(symbols) {
      return getQuotes(symbols);
    },

    subscribe(symbols, onUpdate) {
      const timer = setInterval(async () => {
        try {
          cache.fetchedAt = 0;
          const quotes = await getQuotes(symbols);
          onUpdate(quotes);
        } catch (error) {
          console.error(error);
        }
      }, REFRESH_MS);

      return () => clearInterval(timer);
    },
  };
}
