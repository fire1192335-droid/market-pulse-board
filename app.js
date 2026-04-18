const DEFAULT_TW_SYMBOL = "TWSE:2330";
const US_INDEX_SYMBOLS = ["DJ:DJI", "NASDAQ:IXIC", "SP:SPX", "NASDAQ:SOX"];
const BASE_SYMBOLS = [
  ...US_INDEX_SYMBOLS,
  "INDEX:TAIEX",
  "TWSE:2330",
  "TWSE:2317",
  "TWSE:2454",
  "TWSE:0050",
  "TPEX:8069",
  "TPEX:6488",
  "TPEX:5274",
];

const state = {
  selectedSymbol: DEFAULT_TW_SYMBOL,
  marketFilter: "all",
  quotes: new Map(),
  eventSource: null,
  config: null,
};

function normalizeSymbol(value) {
  const trimmed = value.trim().toUpperCase();

  if (!trimmed) {
    return DEFAULT_TW_SYMBOL;
  }

  if (trimmed.includes(":")) {
    return trimmed;
  }

  if (/^\d+[A-Z]?$/.test(trimmed)) {
    return `TWSE:${trimmed}`;
  }

  return trimmed;
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value));
}

function formatInteger(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatSigned(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  const number = Number(value);
  const sign = number > 0 ? "+" : "";
  return `${sign}${formatNumber(number, digits)}`;
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  const number = Number(value);
  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toFixed(2)}%`;
}

function formatSourceDate(value) {
  return value && value !== "--" ? value : "--";
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function setMetricValue(id, value, tone) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.textContent = value;
  element.dataset.tone = tone ?? "flat";
}

function getTone(change) {
  const number = Number(change);

  if (Number.isNaN(number) || number === 0) {
    return "flat";
  }

  return number > 0 ? "up" : "down";
}

function getMarketGroup(symbol) {
  if (US_INDEX_SYMBOLS.includes(symbol)) {
    return "us";
  }

  if (symbol.startsWith("TWSE:") || symbol.startsWith("INDEX:")) {
    return "twse";
  }

  if (symbol.startsWith("TPEX:")) {
    return "tpex";
  }

  return "other";
}

function getFilteredSymbols() {
  if (state.marketFilter === "all") {
    return BASE_SYMBOLS;
  }

  return BASE_SYMBOLS.filter((symbol) => getMarketGroup(symbol) === state.marketFilter);
}

function buildRequestedSymbols() {
  const symbols = new Set([...BASE_SYMBOLS, state.selectedSymbol]);
  const match = state.selectedSymbol.match(/^(TWSE|TPEX):(.+)$/);

  if (match) {
    const [, market, code] = match;
    if (market === "TWSE" || market === "TPEX") {
      symbols.add(`${market === "TWSE" ? "TPEX" : "TWSE"}:${code}`);
    }
  }

  return Array.from(symbols);
}

function renderUsIndicesSpotlight() {
  const container = document.getElementById("us-index-grid");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  US_INDEX_SYMBOLS.forEach((symbol) => {
    const quote = state.quotes.get(symbol);
    const tone = getTone(quote?.change);
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "us-index-card";
    tile.dataset.symbol = symbol;

    if (symbol === state.selectedSymbol) {
      tile.classList.add("is-active");
    }

    tile.innerHTML = `
      <span class="us-index-card__eyebrow">${quote?.market ?? "U.S. Index"}</span>
      <strong class="us-index-card__name">${quote?.name ?? symbol}</strong>
      <span class="us-index-card__price">${formatNumber(quote?.last, quote?.decimals ?? 2)}</span>
      <span class="us-index-card__change" data-tone="${tone}">
        ${formatSigned(quote?.change, quote?.decimals ?? 2)} / ${formatPercent(quote?.changePct)}
      </span>
      <span class="us-index-card__meta">${symbol} · ${formatSourceDate(quote?.sourceDate)}</span>
    `;

    tile.addEventListener("click", () => {
      state.selectedSymbol = symbol;
      connectStream();
      render();
    });

    container.appendChild(tile);
  });
}

function renderTickerStrip() {
  const container = document.getElementById("ticker-strip-items");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  BASE_SYMBOLS.filter((symbol) => !US_INDEX_SYMBOLS.includes(symbol)).forEach((symbol) => {
    const quote = state.quotes.get(symbol);
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "ticker-tile";
    tile.dataset.symbol = symbol;

    if (symbol === state.selectedSymbol) {
      tile.classList.add("is-active");
    }

    tile.innerHTML = `
      <span class="ticker-tile__market">${quote?.market ?? symbol.split(":")[0]}</span>
      <strong class="ticker-tile__label">${quote?.name ?? symbol}</strong>
      <span class="ticker-tile__price">${formatNumber(quote?.last, quote?.decimals ?? 2)}</span>
      <span class="ticker-tile__change" data-tone="${getTone(quote?.change)}">${formatPercent(quote?.changePct)}</span>
    `;

    tile.addEventListener("click", () => {
      state.selectedSymbol = symbol;
      connectStream();
      render();
    });

    container.appendChild(tile);
  });
}

function renderWatchlist() {
  const body = document.getElementById("watchlist-body");

  if (!body) {
    return;
  }

  body.innerHTML = "";

  getFilteredSymbols().forEach((symbol) => {
    const quote = state.quotes.get(symbol);
    const tone = getTone(quote?.change);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <button class="watchlist-symbol ${symbol === state.selectedSymbol ? "is-active" : ""}" type="button" data-symbol="${symbol}">
          <span>${quote?.name ?? symbol}</span>
          <small>${symbol}</small>
        </button>
      </td>
      <td>${formatNumber(quote?.last, quote?.decimals ?? 2)}</td>
      <td data-tone="${tone}">${formatSigned(quote?.change, quote?.decimals ?? 2)}</td>
      <td data-tone="${tone}">${formatPercent(quote?.changePct)}</td>
      <td>${formatNumber(quote?.bid, quote?.decimals ?? 2)}</td>
      <td>${formatNumber(quote?.ask, quote?.decimals ?? 2)}</td>
      <td>${formatInteger(quote?.volume)}</td>
      <td>${formatSourceDate(quote?.sourceDate)}</td>
    `;

    row.querySelector("button")?.addEventListener("click", () => {
      state.selectedSymbol = symbol;
      connectStream();
      render();
    });

    body.appendChild(row);
  });
}

function renderSelectedSymbol() {
  const quote = state.quotes.get(state.selectedSymbol);
  const tone = getTone(quote?.change);
  const input = document.getElementById("symbol-input");

  setText("selected-symbol-label", `焦點標的：${state.selectedSymbol}`);
  if (input) {
    input.value = state.selectedSymbol;
  }

  setText("focus-name", quote?.name ?? state.selectedSymbol);
  setText("focus-symbol", state.selectedSymbol);
  setMetricValue("focus-last", formatNumber(quote?.last, quote?.decimals ?? 2), tone);
  setMetricValue(
    "focus-change",
    `${formatSigned(quote?.change, quote?.decimals ?? 2)} (${formatPercent(quote?.changePct)})`,
    tone,
  );
  setText("focus-market", quote?.market ?? "--");
  setText("focus-bid", formatNumber(quote?.bid, quote?.decimals ?? 2));
  setText("focus-ask", formatNumber(quote?.ask, quote?.decimals ?? 2));
  setText("focus-volume", formatInteger(quote?.volume));
  setText("focus-updated", formatSourceDate(quote?.sourceDate));
  setText("focus-provider", state.config?.providerLabel ?? "--");
  setText("focus-mode", state.config?.modeLabel ?? "--");
  setText("focus-latency", state.config?.latencyTarget ?? "--");

  const spread =
    quote?.ask !== undefined && quote?.bid !== undefined && quote?.ask !== null && quote?.bid !== null
      ? Number(quote.ask) - Number(quote.bid)
      : undefined;

  setMetricValue("focus-spread", formatNumber(spread, quote?.decimals ?? 2), spread > 0 ? "warm" : "flat");
}

function renderProviderStatus() {
  setText("provider-name", state.config?.providerLabel ?? "--");
  setText("provider-mode", state.config?.modeLabel ?? "--");
  setText("provider-scope", state.config?.scopeLabel ?? "--");
  setText("provider-latency", state.config?.latencyTarget ?? "--");
  setText("provider-disclaimer", state.config?.disclaimer ?? "--");
  setText("source-date-hero", state.config?.latestSourceDate ?? "--");
  setText("us-feed-label", state.config?.providerLabel ?? "--");
  setText("us-feed-latency", state.config?.latencyTarget ?? "--");
}

function renderFilterBar() {
  document.querySelectorAll(".filter-chip").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === state.marketFilter);
  });
}

function renderQuickSymbols() {
  document.querySelectorAll(".quick-symbol").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.symbol === state.selectedSymbol);
  });
}

function renderConnectionStatus(status) {
  const indicator = document.getElementById("connection-indicator");
  const text = document.getElementById("connection-text");

  if (indicator) {
    indicator.dataset.status = status;
  }

  if (text) {
    const labels = {
      connecting: "資料流連線中",
      live: "資料流已連線",
      retrying: "資料流重試中",
      error: "資料流異常",
    };

    text.textContent = labels[status] ?? "資料流狀態未知";
  }
}

function render() {
  renderUsIndicesSpotlight();
  renderTickerStrip();
  renderWatchlist();
  renderSelectedSymbol();
  renderProviderStatus();
  renderFilterBar();
  renderQuickSymbols();
}

function handleQuotes(quotes) {
  quotes.forEach((quote) => {
    state.quotes.set(quote.symbol, quote);
  });

  if (!state.quotes.has(state.selectedSymbol)) {
    const match = state.selectedSymbol.match(/^(TWSE|TPEX):(.+)$/);
    if (match) {
      const [, market, code] = match;
      const alternate = `${market === "TWSE" ? "TPEX" : "TWSE"}:${code}`;
      if (state.quotes.has(alternate)) {
        state.selectedSymbol = alternate;
      }
    }
  }

  const latestSourceDate = quotes.map((quote) => quote.sourceDate).find((value) => value && value !== "--");
  if (state.config && latestSourceDate) {
    state.config.latestSourceDate = latestSourceDate;
  }

  render();
}

function connectStream() {
  if (state.eventSource) {
    state.eventSource.close();
  }

  const url = `/api/stream?symbols=${encodeURIComponent(buildRequestedSymbols().join(","))}`;
  const source = new EventSource(url);
  state.eventSource = source;

  renderConnectionStatus("connecting");

  source.addEventListener("snapshot", (event) => {
    const payload = JSON.parse(event.data);
    handleQuotes(payload.quotes ?? []);
    renderConnectionStatus("live");
  });

  source.addEventListener("quote", (event) => {
    const payload = JSON.parse(event.data);
    handleQuotes(payload.quotes ?? []);
    renderConnectionStatus("live");
  });

  source.addEventListener("error", (event) => {
    try {
      const payload = JSON.parse(event.data);
      console.error(payload.error);
    } catch {
      console.error("stream error");
    }
    renderConnectionStatus("error");
  });

  source.onerror = () => {
    renderConnectionStatus("retrying");
  };
}

async function loadConfig() {
  const response = await fetch("/api/config");
  state.config = await response.json();
  renderProviderStatus();
}

function getSessionLabel(timeZone, startHour, startMinute, endHour, endMinute) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "00";
  const weekday = get("weekday");
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const currentMinutes = hour * 60 + minute;
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  const isWeekday = !["Sat", "Sun"].includes(weekday);

  return isWeekday && currentMinutes >= start && currentMinutes < end ? "開盤中" : "休市 / 收盤後";
}

function updateClocks() {
  const now = new Date();
  const twFormat = new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  });
  const nyFormat = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/New_York",
  });

  setText("tw-time", twFormat.format(now));
  setText("ny-time", nyFormat.format(now));
  setText("tw-market-status", `台股 ${getSessionLabel("Asia/Taipei", 9, 0, 13, 30)}`);
  setText("us-market-status", getSessionLabel("America/New_York", 9, 30, 16, 0));
}

function bindSymbolForm() {
  const form = document.getElementById("symbol-form");
  const input = document.getElementById("symbol-input");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.selectedSymbol = normalizeSymbol(input?.value ?? "");
    connectStream();
    render();
  });
}

function bindFilterBar() {
  document.querySelectorAll(".filter-chip").forEach((button) => {
    button.addEventListener("click", () => {
      state.marketFilter = button.dataset.filter ?? "all";
      render();
    });
  });
}

function bindQuickSymbols() {
  document.querySelectorAll(".quick-symbol").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSymbol = button.dataset.symbol ?? DEFAULT_TW_SYMBOL;
      connectStream();
      render();
    });
  });
}

async function init() {
  await loadConfig();
  bindSymbolForm();
  bindFilterBar();
  bindQuickSymbols();
  updateClocks();
  window.setInterval(updateClocks, 1000);
  connectStream();
}

window.addEventListener("DOMContentLoaded", () => {
  init().catch((error) => {
    console.error(error);
    renderConnectionStatus("error");
  });
});
