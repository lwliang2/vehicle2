import { memo } from "react";
import { formatCurrency } from "../format";
import { CATEGORY_META, type MetricSel } from "../types";

export interface StatRow {
  cat: string;
  latestVal: number;
  change: number;
}

interface Props {
  stats: StatRow[];
  metric: MetricSel;
  enabled: Record<string, boolean>;
  onToggle: (cat: string) => void;
}

export const StatsBar = memo(function StatsBar({ stats, metric, enabled, onToggle }: Props) {
  return (
    <div className="grid grid-cols-2 divide-x divide-border border-b border-border md:grid-cols-5">
      {stats.map(({ cat, latestVal, change }) => {
        const meta = CATEGORY_META[cat];
        const isEnabled = enabled[cat];
        return (
          <button
            key={cat}
            onClick={() => onToggle(cat)}
            className={
              "group relative overflow-hidden bg-card px-5 py-3.5 text-left transition-colors hover:bg-accent " +
              (isEnabled ? "" : "opacity-50")
            }
          >
            <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              {meta.label}
            </div>
            <div className="text-xs font-semibold">{meta.description}</div>
            <div className="mt-1 text-xl font-bold">
              {metric === "premium" ? formatCurrency(latestVal) : latestVal.toLocaleString()}
            </div>
            <div
              className={
                "text-xs " +
                (change === 0
                  ? "text-muted-foreground"
                  : change > 0
                    ? "text-emerald-400"
                    : "text-rose-400")
              }
            >
              {change === 0 ? "—" : (change > 0 ? "▲ " : "▼ ") + Math.abs(change).toFixed(1) + "%"}
            </div>
            <span
              className="absolute inset-x-0 bottom-0 h-0.5"
              style={{ background: meta.color, opacity: isEnabled ? 1 : 0 }}
            />
          </button>
        );
      })}
    </div>
  );
});
