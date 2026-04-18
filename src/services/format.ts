import type { Freshness } from "../types/market";

export function formatNumber(value: number | null | undefined, options?: Intl.NumberFormatOptions) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatSignedNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${value > 0 ? "+" : ""}${formatNumber(value)}`;
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatDateTime(value: string | null | undefined, timeZone = "Asia/Taipei") {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function formatMarketTime(value: string | null | undefined, market: "US" | "TW") {
  return formatDateTime(value, market === "US" ? "America/New_York" : "Asia/Taipei");
}

export function getToneClass(value: number) {
  if (value > 0) {
    return "text-market-up";
  }

  if (value < 0) {
    return "text-market-down";
  }

  return "text-white";
}

export function freshnessTone(freshness: Freshness) {
  switch (freshness) {
    case "realtime":
      return "bg-emerald-500/20 text-emerald-200 border-emerald-400/30";
    case "after-market":
      return "bg-amber-500/20 text-amber-100 border-amber-400/30";
    case "end-of-day":
      return "bg-slate-500/20 text-slate-100 border-slate-300/20";
    case "demo":
      return "bg-fuchsia-500/20 text-fuchsia-100 border-fuchsia-400/30";
    case "mixed":
      return "bg-sky-500/20 text-sky-100 border-sky-400/30";
    case "delayed":
    default:
      return "bg-sky-500/20 text-sky-100 border-sky-400/30";
  }
}
