import { Link } from "react-router-dom";

import type { StockQuote } from "../types/market";
import { formatMarketTime, formatNumber, formatPercent, formatSignedNumber, getToneClass } from "../services/format";
import { StatusBadge } from "./StatusBadge";

interface WatchlistProps {
  quotes: StockQuote[];
  onRemove: (symbol: string) => void;
}

export function Watchlist({ quotes, onRemove }: WatchlistProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-market-muted">Watchlist</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">自選股</h2>
        </div>
        <p className="text-sm text-market-muted">localStorage 保存</p>
      </div>

      <div className="mt-6 space-y-3">
        {quotes.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-market-muted">
            目前還沒有自選股。從搜尋結果或個股頁加入後，首頁會直接顯示摘要。
          </div>
        )}

        {quotes.map((quote) => (
          <div
            key={quote.symbol}
            className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/40 p-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-market-muted">{quote.exchange}</p>
              <Link className="mt-1 block text-lg font-semibold text-white" to={`/stock/${quote.symbol}`}>
                {quote.symbol} · {quote.name}
              </Link>
              <p className="mt-1 text-sm text-market-muted">{formatMarketTime(quote.updatedAt, "TW")}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-[auto_auto_auto] md:items-center">
              <div>
                <p className="text-sm text-market-muted">最新價</p>
                <p className="font-display text-2xl font-bold text-white">{formatNumber(quote.price)}</p>
              </div>
              <div>
                <p className={`text-sm font-semibold ${getToneClass(quote.change)}`}>
                  {formatSignedNumber(quote.change)} · {formatPercent(quote.changePercent)}
                </p>
                <div className="mt-2">
                  <StatusBadge freshness={quote.freshness} label={quote.statusLabel} />
                </div>
              </div>
              <button
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white"
                onClick={() => onRemove(quote.symbol)}
                type="button"
              >
                移除
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
