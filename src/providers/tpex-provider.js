const TPEX_DAILY_QUOTES_URL = "https://www.tpex.org.tw/www/zh-tw/afterTrading/dailyQuotes";
const REFRESH_MS = 60_000;

function parseNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).replace(/,/g, "").replace(/\s+/g, "").trim();

  if (!normalized || normalized === "--") {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function rocSlashDateToDisplay(value) {
  const text = String(value ?? "");
  const match = text.match(/^(\d{2,3})\/(\d{2})\/(\d{2})$/);

  if (!match) {
    return "--";
  }

  const year = Number(match[1]) + 1911;
  return `${year}-${match[2]}-${match[3]}`;
}

function rocSlashDateToIso(value) {
  const display = rocSlashDateToDisplay(value);
  return display === "--" ? new Date().toISOString() : `${display}T13:30:00+08:00`;
}

function buildQuote(row, sourceDate) {
  const last = parseNumber(row[2]);
  const change = parseNumber(row[3]) ?? 0;
  const previousClose = last === null ? null : Number((last - change).toFixed(2));
  const changePct =
    last === null || previousClose === null || previousClose === 0
      ? 0
      : Number((((last - previousClose) / previousClose) * 100).toFixed(2));

  return {
    symbol: `TPEX:${row[0]}`,
    name: row[1],
    market: "TPEx 官方",
    decimals: 2,
    previousClose,
    last,
    bid: parseNumber(row[11]),
    ask: parseNumber(row[13]),
    change: Number(change.toFixed(2)),
    changePct,
    volume: parseNumber(row[8]),
    updatedAt: rocSlashDateToIso(sourceDate),
    sourceDate: rocSlashDateToDisplay(sourceDate),
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`TPEx request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function createTpexProvider() {
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

    const payload = await fetchJson(TPEX_DAILY_QUOTES_URL);
    const table = payload.tables?.[0];
    const sourceDate = table?.date ?? "";
    const nextQuotes = new Map();

    (table?.data ?? []).forEach((row) => {
      nextQuotes.set(`TPEX:${row[0]}`, buildQuote(row, sourceDate));
    });

    cache.quotes = nextQuotes;
    cache.fetchedAt = now;
    cache.latestSourceDate = rocSlashDateToDisplay(sourceDate);
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
        provider: "tpex",
        providerLabel: "TPEx OTC API",
        mode: "official-daily",
        modeLabel: "官方日資料",
        scopeLabel: "TPEx 上櫃股票",
        latencyTarget: "盤後資料",
        disclaimer:
          "目前接的是 TPEx 官方 `afterTrading/dailyQuotes` 日行情資料，不是逐筆或零延遲報價。",
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
