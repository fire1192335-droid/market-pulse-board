import type { StockQuote } from "../types/market";
import { formatMarketTime, formatNumber, formatPercent, formatSignedNumber, getToneClass } from "../services/format";
import { StatusBadge } from "./StatusBadge";

interface PriceSummaryProps {
  quote: StockQuote;
  onToggleWatchlist: () => void;
  isSaved: boolean;
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-market-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

export function PriceSummary({ quote, onToggleWatchlist, isSaved }: PriceSummaryProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-market-muted">{quote.exchange}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            {quote.name} <span className="text-market-muted">{quote.symbol}</span>
          </h1>
          <p className="mt-2 text-sm text-market-muted">
            最後更新 {formatMarketTime(quote.updatedAt, "TW")} · {quote.source}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge freshness={quote.freshness} label={quote.statusLabel} />
          <button
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white"
            onClick={onToggleWatchlist}
            type="button"
          >
            {isSaved ? "移除自選" : "加入自選"}
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="font-display text-5xl font-bold text-white">{formatNumber(quote.price)}</p>
          <p className={`mt-3 text-lg font-semibold ${getToneClass(quote.change)}`}>
            {formatSignedNumber(quote.change)} · {formatPercent(quote.changePercent)}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatItem label="開盤" value={formatNumber(quote.open)} />
          <StatItem label="最高" value={formatNumber(quote.high)} />
          <StatItem label="最低" value={formatNumber(quote.low)} />
          <StatItem label="昨收" value={formatNumber(quote.previousClose)} />
          <StatItem label="成交量" value={formatNumber(quote.volume, { maximumFractionDigits: 0 })} />
        </div>
      </div>
    </section>
  );
}
