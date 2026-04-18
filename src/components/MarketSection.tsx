import type { MarketQuote } from "../types/market";
import { IndexCard } from "./IndexCard";

interface MarketSectionProps {
  title: string;
  subtitle: string;
  quotes: MarketQuote[];
}

export function MarketSection({ title, subtitle, quotes }: MarketSectionProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-market-muted">{subtitle}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
        </div>
        <p className="hidden text-sm text-market-muted md:block">延遲或盤後資料會直接標示在卡片上</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quotes.map((quote) => (
          <IndexCard key={`${quote.market}-${quote.symbol}`} quote={quote} />
        ))}
      </div>
    </section>
  );
}
