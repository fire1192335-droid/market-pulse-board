import type { Freshness } from "../types/market";
import { freshnessTone } from "../services/format";

interface StatusBadgeProps {
  freshness: Freshness;
  label: string;
}

export function StatusBadge({ freshness, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] ${freshnessTone(
        freshness,
      )}`}
    >
      {label}
    </span>
  );
}
