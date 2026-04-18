const knownSymbols = {
  "DJ:DJI": { name: "道瓊工業", market: "US Index", decimals: 2, last: 39485.72, volume: 0 },
  "NASDAQ:IXIC": { name: "Nasdaq 綜合", market: "US Index", decimals: 2, last: 16428.31, volume: 0 },
  "SP:SPX": { name: "S&P 500", market: "US Index", decimals: 2, last: 5213.64, volume: 0 },
  "NASDAQ:SOX": { name: "費城半導體", market: "US Index", decimals: 2, last: 4512.17, volume: 0 },
  "INDEX:TAIEX": { name: "加權指數", market: "TW Index", decimals: 2, last: 20784.31, volume: 0 },
  "TWSE:2330": { name: "台積電", market: "TWSE", decimals: 2, last: 812, volume: 24581731 },
  "TWSE:2317": { name: "鴻海", market: "TWSE", decimals: 2, last: 151, volume: 18724003 },
  "TWSE:2454": { name: "聯發科", market: "TWSE", decimals: 2, last: 1180, volume: 5023187 },
  "TWSE:0050": { name: "元大台灣50", market: "TWSE ETF", decimals: 2, last: 183.45, volume: 14003876 },
};

function createFallbackMeta(symbol) {
  const isTaiwan = symbol.startsWith("TWSE:") || symbol.startsWith("TPEX:");
  const code = symbol.split(":").at(-1) ?? symbol;

  return {
    name: code,
    market: isTaiwan ? symbol.split(":")[0] : "Custom",
    decimals: 2,
    last: isTaiwan ? 100 + Math.random() * 900 : 1000 + Math.random() * 9000,
    volume: Math.floor(1000 + Math.random() * 500000),
  };
}

export function getSymbolMeta(symbol) {
  return knownSymbols[symbol] ?? createFallbackMeta(symbol);
}
