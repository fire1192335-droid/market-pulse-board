import { startTransition, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import type { ChartRange, HistoricalPoint, StockQuote } from "../types/market";
import { api } from "../services/api";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { PriceSummary } from "../components/PriceSummary";
import { PriceChart } from "../components/PriceChart";

const WATCHLIST_KEY = "market-pulse:watchlist";

export function StockDetail() {
  const { symbol = "" } = useParams();
  const [watchlistSymbols, setWatchlistSymbols] = useLocalStorage<string[]>(WATCHLIST_KEY, []);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<HistoricalPoint[]>([]);
  const [range, setRange] = useState<ChartRange>("1M");
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingQuote(true);
    setError(null);

    api
      .getTwStock(symbol)
      .then((response) => {
        if (!active) {
          return;
        }

        setQuote(response.data);
        setLoadingQuote(false);
      })
      .catch((requestError: Error) => {
        if (!active) {
          return;
        }

        setError(requestError.message);
        setLoadingQuote(false);
      });

    return () => {
      active = false;
    };
  }, [symbol]);

  useEffect(() => {
    let active = true;
    setLoadingChart(true);

    api
      .getTwStockHistory(symbol, range)
      .then((response) => {
        if (!active) {
          return;
        }

        startTransition(() => {
          setHistory(response.data ?? []);
          setLoadingChart(false);
        });
      })
      .catch((requestError: Error) => {
        if (!active) {
          return;
        }

        setError(requestError.message);
        setLoadingChart(false);
      });

    return () => {
      active = false;
    };
  }, [symbol, range]);

  const isSaved = watchlistSymbols.includes(symbol);

  function toggleWatchlist() {
    setWatchlistSymbols((current) =>
      current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol],
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_22%),linear-gradient(180deg,#020617_0%,#08111f_100%)]">
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link className="text-sm text-sky-100" to="/">
            ← 回到 Dashboard
          </Link>
          <p className="text-sm text-market-muted">個股詳細頁 /stock/{symbol}</p>
        </div>

        {error && (
          <section className="rounded-[2rem] border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-100">
            載入個股資料失敗：{error}
          </section>
        )}

        {loadingQuote && (
          <section className="h-64 animate-pulse rounded-[2rem] border border-white/10 bg-white/5" />
        )}

        {quote && (
          <>
            <PriceSummary isSaved={isSaved} onToggleWatchlist={toggleWatchlist} quote={quote} />
            <PriceChart loading={loadingChart} onRangeChange={setRange} points={history} range={range} />
          </>
        )}
      </main>
    </div>
  );
}
