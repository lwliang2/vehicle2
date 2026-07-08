import { memo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMonth } from "../format";
import type { OversubPoint } from "../transforms";
import { RatioTooltip } from "./ChartTooltips";

interface Props {
  data: OversubPoint[];
}

export const OversubChart = memo(function OversubChart({ data }: Props) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Oversubscription Trend — Cat A</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Bids received ÷ quota. Values above 1× mean more bidders than certificates.
      </p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ratioFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              minTickGap={40}
            />
            <YAxis
              tickFormatter={(v) => v + "×"}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              width={40}
            />
            <Tooltip content={<RatioTooltip />} />
            <Area
              type="monotone"
              dataKey="ratio"
              stroke="#60a5fa"
              strokeWidth={2}
              fill="url(#ratioFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
});
