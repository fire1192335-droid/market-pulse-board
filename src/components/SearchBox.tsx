import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import type { StockSearchResult } from "../types/market";
import { api } from "../services/api";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

interface SearchBoxProps {
  recent: StockSearchResult[];
  onRecentClear: () => void;
  onSelect: (stock: StockSearchResult) => void;
  onAddWatchlist: (symbol: string) => void;
  watchlistSymbols: string[];
}

export function SearchBox({
  recent,
  onRecentClear,
  onSelect,
  onAddWatchlist,
  watchlistSymbols,
}: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const debouncedQuery = useDebouncedValue(deferredQuery, 220);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    api
      .searchTwStocks(debouncedQuery)
      .then((response) => {
        if (!active) {
          return;
        }

        startTransition(() => {
          setResults(response.data ?? []);
          setLoading(false);
        });
      })
      .catch((requestError: Error) => {
        if (!active) {
          return;
        }

        setLoading(false);
        setResults([]);
        setError(requestError.message);
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  const visibleResults = query.trim() ? results : recent;

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-market-muted">Search</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">台股個股查詢</h2>
          <p className="mt-2 text-sm text-market-muted">支援股票代號與名稱關鍵字，最近查詢會保存在本機。</p>
        </div>
        {recent.length > 0 && (
          <button className="text-sm text-market-accent" onClick={onRecentClear} type="button">
            清除最近查詢
          </button>
        )}
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/60 p-3">
        <input
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-market-muted focus:border-market-accent/60"
          placeholder="輸入 2330、2454、台積電、聯發科"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="mt-4 space-y-3">
          {loading && <p className="rounded-2xl bg-white/5 px-4 py-5 text-sm text-market-muted">搜尋中...</p>}

          {!loading && error && (
            <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{error}</p>
          )}

          {!loading && !error && visibleResults.length === 0 && query.trim() && (
            <p className="rounded-2xl bg-white/5 px-4 py-5 text-sm text-market-muted">找不到符合的股票。</p>
          )}

          {!loading &&
            !error &&
            visibleResults.map((result) => {
              const isSaved = watchlistSymbols.includes(result.symbol);

              return (
                <div
                  key={`${result.exchange}-${result.symbol}`}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm text-market-muted">{query.trim() ? "搜尋結果" : "最近查詢"}</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {result.symbol} · {result.name}
                    </p>
                    <p className="text-sm text-market-muted">{result.exchange}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="rounded-full border border-market-accent/40 px-4 py-2 text-sm font-medium text-sky-100"
                      onClick={() => onSelect(result)}
                      to={`/stock/${result.symbol}`}
                    >
                      查看詳情
                    </Link>
                    <button
                      className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white"
                      onClick={() => onAddWatchlist(result.symbol)}
                      type="button"
                    >
                      {isSaved ? "已在自選" : "加入自選"}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
}
