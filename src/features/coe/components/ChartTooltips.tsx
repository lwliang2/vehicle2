import { memo } from "react";
import { formatMonth } from "../format";
import type { MetricSel } from "../types";

interface TooltipPayloadItem {
  color?: string;
  name?: string;
  value?: number;
  dataKey?: string;
}
interface RCTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

export const ChartTooltip = memo(function ChartTooltip({
  active,
  payload,
  label,
  metric,
}: RCTooltipProps & { metric: MetricSel }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <div className="mb-1 font-semibold">{label ? formatMonth(label) : ""}</div>
      {payload.map((row, i) => {
        const key = String(row.dataKey ?? "");
        const isPremium = metric === "premium" || (metric === "both" && key.endsWith("__premium"));
        return (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: row.color }}
              />
              {row.name}
            </span>
            <span className="font-mono">
              {isPremium
                ? "$" + (row.value ?? 0).toLocaleString()
                : (row.value ?? 0).toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
});

export const RatioTooltip = memo(function RatioTooltip({ active, payload, label }: RCTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const v = payload[0]?.value ?? 0;
  return (
    <div className="rounded-md border border-border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <div className="mb-0.5 font-semibold">{label ? formatMonth(label) : ""}</div>
      <div className="font-mono">{v.toFixed(2)}× oversubscribed</div>
    </div>
  );
});
