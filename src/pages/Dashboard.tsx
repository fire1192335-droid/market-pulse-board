import { useEffect, useMemo, useState } from "react";

import type { MarketSummaryData, StockSearchResult } from "../types/market";
import { api } from "../services/api";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { formatDateTime } from "../services/format";
import { MarketSection } from "../components/MarketSection";
import { SearchBox } from "../components/SearchBox";
import { Watchlist } from "../components/Watchlist";

const WATCHLIST_KEY = "market-pulse:watchlist";
const RECENT_KEY = "market-pulse:recent-searches";

export function Dashboard() {
  const [watchlistSymbols, setWatchlistSymbols] = useLocalStorage<string[]>(WATCHLIST_KEY, ["2330", "2454"]);
  const [recentSearches, setRecentSearches] = useLocalStorage<StockSearchResult[]>(RECENT_KEY, []);
  const [summary, setSummary] = useState<MarketSummaryData | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api
      .getMarketSummary(watchlistSymbols)
      .then((response) => {
        if (!active) {
          return;
        }

        setSummary(response.data);
        setUpdatedAt(response.updatedAt);
        setSource(response.source);
        setLoading(false);
      })
      .catch((requestError: Error) => {
        if (!active) {
          return;
        }

        setLoading(false);
        setError(requestError.message);
      });

    return () => {
      active = false;
    };
  }, [watchlistSymbols, refreshToken]);

  const mergedQuotes = useMemo(() => summary?.watchlist ?? [], [summary]);

  function addWatchlist(symbol: string) {
    setWatchlistSymbols((current) => (current.includes(symbol) ? current : [...current, symbol]));
  }

  function removeWatchlist(symbol: string) {
    setWatchlistSymbols((current) => current.filter((item) => item !== symbol));
  }

  function rememberSearch(stock: StockSearchResult) {
    setRecentSearches((current) => {
      const next = [stock, ...current.filter((item) => item.symbol !== stock.symbol)];
      return next.slice(0, 6);
    });
  }

  return (
    <div className="min-h-screen grid-surface bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_22%),linear-gradient(180deg,#020617_0%,#08111f_100%)]">
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <header className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.35em] text-market-accent">Market Pulse Board</p>
              <h1 className="mt-3 font-display text-4xl font-bold text-white md:text-5xl">
                美股四大指數、台股指數與個股，一頁掌握。
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-market-muted md:text-base">
                這個版本預設使用公開可取得的延遲資料來源，後端統一做代理與快取。若上游資料失敗，畫面會清楚標示 demo 或 delayed，不會假裝成官方即時盤中資料。
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3 xl:min-w-[560px]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-market-muted">最後更新</p>
                <p className="mt-2 text-lg font-semibold text-white">{formatDateTime(updatedAt)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-market-muted">資料來源狀態</p>
                <p className="mt-2 text-sm font-semibold text-white">{source || "尚未載入"}</p>
              </div>
              <button
                className="rounded-2xl border border-sky-400/30 bg-sky-500/15 p-4 text-left text-white transition hover:border-sky-300/50"
                onClick={() => setRefreshToken((value) => value + 1)}
                type="button"
              >
                <p className="text-sm text-sky-100">手動刷新</p>
                <p className="mt-2 text-lg font-semibold">重新抓取資料</p>
              </button>
            </div>
          </div>
        </header>

        {error && (
          <section className="rounded-[2rem] border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-100">
            載入首頁摘要失敗：{error}
          </section>
        )}

        {loading && (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-44 animate-pulse rounded-[2rem] border border-white/10 bg-white/5"
              />
            ))}
          </section>
        )}

        {!loading && summary && (
          <>
            <MarketSection title="美股四大指數" subtitle="U.S. Indices" quotes={summary.usIndices} />
            <MarketSection title="台股主要指數" subtitle="Taiwan Indices" quotes={summary.twIndices} />
          </>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <SearchBox
            onAddWatchlist={addWatchlist}
            onRecentClear={() => setRecentSearches([])}
            onSelect={rememberSearch}
            recent={recentSearches}
            watchlistSymbols={watchlistSymbols}
          />
          <Watchlist quotes={mergedQuotes} onRemove={removeWatchlist} />
        </div>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 text-sm leading-7 text-market-muted backdrop-blur md:p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-market-accent">Data Notes</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">資料來源與限制</h2>
          <div className="mt-4 space-y-3">
            <p>美股與台股行情預設採用公開延遲資料來源，並透過 backend proxy 轉發；搜尋用的台股代號與名稱會優先使用官方公開清單。</p>
            <p>若上游資料來源失敗或限制存取，後端會退到 demo fallback，並在狀態 badge 明確顯示 DEMO DATA。</p>
            <p>個股走勢圖在資料源不支援完整日內資料時，會自動退回日線或週線，以確保畫面仍可用。</p>
          </div>
        </section>
      </main>
    </div>
  );
}
