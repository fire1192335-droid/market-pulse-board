const STOCK_DAY_ALL_URL = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL";
const MI_INDEX_URL = "https://openapi.twse.com.tw/v1/exchangeReport/MI_INDEX";
const REFRESH_MS = 60_000;

function parseNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).replace(/,/g, "").trim();

  if (!normalized || normalized === "--") {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSignedNumber(signToken, value) {
  const amount = parseNumber(value);

  if (amount === null) {
    return null;
  }

  if (signToken === "-") {
    return -Math.abs(amount);
  }

  return Math.abs(amount);
}

function rocDateToDisplay(value) {
  const text = String(value ?? "");

  if (!/^\d{7,8}$/.test(text)) {
    return "--";
  }

  const padded = text.padStart(7, "0");
  const year = Number(padded.slice(0, 3)) + 1911;
  const month = padded.slice(3, 5);
  const day = padded.slice(5, 7);
  return `${year}-${month}-${day}`;
}

function rocDateToIso(value) {
  const display = rocDateToDisplay(value);
  return display === "--" ? new Date().toISOString() : `${display}T13:30:00+08:00`;
}

function buildStockQuote(row) {
  const last = parseNumber(row.ClosingPrice);
  const change = parseNumber(row.Change) ?? 0;
  const previousClose = last === null ? null : Number((last - change).toFixed(2));
  const changePct =
    last === null || previousClose === null || previousClose === 0
      ? 0
      : Number((((last - previousClose) / previousClose) * 100).toFixed(2));

  return {
    symbol: `TWSE:${row.Code}`,
    name: row.Name,
    market: "TWSE 官方",
    decimals: 2,
    previousClose,
    last,
    bid: null,
    ask: null,
    change: Number(change.toFixed(2)),
    changePct,
    volume: parseNumber(row.TradeVolume),
    updatedAt: rocDateToIso(row.Date),
    sourceDate: rocDateToDisplay(row.Date),
  };
}

function buildIndexQuote(row) {
  const last = parseNumber(row["收盤指數"]);
  const change = parseSignedNumber(row["漲跌"], row["漲跌點數"]) ?? 0;
  const previousClose = last === null ? null : Number((last - change).toFixed(2));
  const changePct = parseSignedNumber(row["漲跌"], row["漲跌百分比"]) ?? 0;

  return {
    symbol: "INDEX:TAIEX",
    name: "加權指數",
    market: "TWSE 官方",
    decimals: 2,
    previousClose,
    last,
    bid: null,
    ask: null,
    change: Number(change.toFixed(2)),
    changePct: Number(changePct.toFixed(2)),
    volume: null,
    updatedAt: rocDateToIso(row["日期"]),
    sourceDate: rocDateToDisplay(row["日期"]),
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`TWSE request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function createTwseProvider() {
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

    const [stockRows, indexRows] = await Promise.all([
      fetchJson(STOCK_DAY_ALL_URL),
      fetchJson(MI_INDEX_URL),
    ]);

    const nextQuotes = new Map();

    stockRows.forEach((row) => {
      nextQuotes.set(`TWSE:${row.Code}`, buildStockQuote(row));
    });

    const taiexRow = indexRows.find((row) => row["指數"] === "發行量加權股價指數");
    if (taiexRow) {
      nextQuotes.set("INDEX:TAIEX", buildIndexQuote(taiexRow));
      cache.latestSourceDate = rocDateToDisplay(taiexRow["日期"]);
    }

    cache.quotes = nextQuotes;
    cache.fetchedAt = now;
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
        provider: "twse",
        providerLabel: "TWSE OpenAPI",
        mode: "official-daily",
        modeLabel: "官方日資料",
        scopeLabel: "TWSE 上市股票 / 加權指數",
        latencyTarget: "盤後資料",
        disclaimer:
          "目前接的是 TWSE 官方 OpenAPI `/exchangeReport/STOCK_DAY_ALL` 與 `/exchangeReport/MI_INDEX`。這是官方日資料，不是逐筆或零延遲報價。",
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
