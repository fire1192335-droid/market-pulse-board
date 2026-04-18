import type { MarketQuote } from "../types/market";
import { formatMarketTime, formatNumber, formatPercent, formatSignedNumber, getToneClass } from "../services/format";
import { StatusBadge } from "./StatusBadge";

interface IndexCardProps {
  quote: MarketQuote;
}

export function IndexCard({ quote }: IndexCardProps) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-soft backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-market-muted">{quote.symbol}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{quote.name}</h3>
        </div>
        <StatusBadge freshness={quote.freshness} label={quote.statusLabel} />
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-3xl font-bold text-white">{formatNumber(quote.price)}</p>
          <p className={`mt-2 text-sm font-medium ${getToneClass(quote.change)}`}>
            {formatSignedNumber(quote.change)} · {formatPercent(quote.changePercent)}
          </p>
        </div>
        <div className="text-right text-xs text-market-muted">
          <p>{quote.source}</p>
          <p className="mt-1">{formatMarketTime(quote.updatedAt, quote.market === "US" ? "US" : "TW")}</p>
        </div>
      </div>
    </article>
  );
}
