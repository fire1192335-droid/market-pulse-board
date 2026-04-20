import {
  CandlestickSeries,
  createChart,
  type BusinessDay,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

import { CHART_RANGES } from "../config/markets";
import { formatDateTime, formatNumber } from "../services/format";
import type { ChartRange, HistoricalPoint } from "../types/market";

interface PriceChartProps {
  points: HistoricalPoint[];
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
  loading: boolean;
}

interface HoveredCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

function crosshairTimeToString(time: MouseEventParams["time"]) {
  if (!time) {
    return "";
  }

  if (typeof time === "number") {
    return new Date(time * 1000).toISOString();
  }

  const businessDay = time as BusinessDay;
  return `${businessDay.year}-${String(businessDay.month).padStart(2, "0")}-${String(businessDay.day).padStart(2, "0")}`;
}

export function PriceChart({ points, range, onRangeChange, loading }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [hovered, setHovered] = useState<HoveredCandle | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: "#dbeafe",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.08)" },
        horzLines: { color: "rgba(255,255,255,0.08)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.12)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.12)",
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#ef4444",
      downColor: "#22c55e",
      borderVisible: true,
      wickUpColor: "#ef4444",
      wickDownColor: "#22c55e",
      borderUpColor: "#ef4444",
      borderDownColor: "#22c55e",
      priceLineVisible: false,
    });

    chart.subscribeCrosshairMove((param) => {
      const point = param.seriesData.get(candlestickSeries) as
        | { open?: number; high?: number; low?: number; close?: number }
        | undefined;

      if (
        point?.open === undefined ||
        point.high === undefined ||
        point.low === undefined ||
        point.close === undefined ||
        !param.time
      ) {
        setHovered(null);
        return;
      }

      setHovered({
        time: crosshairTimeToString(param.time),
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
      });
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) {
      return;
    }

    const data = points.map((point) => ({
      time: Math.floor(new Date(point.time).getTime() / 1000) as UTCTimestamp,
      open: point.open ?? point.close ?? point.value,
      high: point.high ?? point.close ?? point.value,
      low: point.low ?? point.close ?? point.value,
      close: point.close ?? point.value,
    }));

    seriesRef.current.setData(data);
    chartRef.current.timeScale().fitContent();
  }, [points]);

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-market-muted">Chart</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">K 線圖</h2>
          <p className="mt-2 text-sm text-market-muted">
            使用 lightweight-charts 顯示 K 線。若資料源不支援更細的盤中資料，會自動退回日線資料。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CHART_RANGES.map((item) => (
            <button
              key={item}
              className={`rounded-full border px-4 py-2 text-sm ${
                item === range ? "border-sky-400/40 bg-sky-500/15 text-sky-50" : "border-white/10 text-white"
              }`}
              onClick={() => onRangeChange(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/50 p-4">
        <div className="mb-4 flex min-h-12 items-center justify-between gap-4">
          <div>
            <p className="text-sm text-market-muted">十字線資訊</p>
            <p className="mt-1 text-base font-semibold text-white">
              {hovered
                ? `O ${formatNumber(hovered.open)} / H ${formatNumber(hovered.high)} / L ${formatNumber(
                    hovered.low,
                  )} / C ${formatNumber(hovered.close)} · ${formatDateTime(hovered.time)}`
                : "移動游標查看 K 線資訊"}
            </p>
          </div>
          {loading && <p className="text-sm text-market-muted">圖表更新中...</p>}
        </div>
        <div className="h-[320px] w-full" ref={containerRef} />
      </div>
    </section>
  );
}
