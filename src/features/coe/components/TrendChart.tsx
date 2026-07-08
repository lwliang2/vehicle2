import { memo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatMonth } from "../format";
import { CATEGORY_META, type MetricSel, type MonthlyPoint } from "../types";
import { ChartTooltip } from "./ChartTooltips";

interface Props {
  metric: MetricSel;
  data: MonthlyPoint[];
  enabled: Record<string, boolean>;
  onToggle: (cat: string) => void;
  onSetAll: (v: boolean) => void;
}

export const TrendChart = memo(function TrendChart({
  metric,
  data,
  enabled,
  onToggle,
  onSetAll,
}: Props) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">
        COE{" "}
        {metric === "premium"
          ? "Quota Premium"
          : metric === "quota"
            ? "Quota Allocation"
            : "Premium (solid) & Quota (dashed)"}{" "}
        — All Categories
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Average across bidding exercises per month · click a chip to toggle a category.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => onSetAll(true)}
          className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:border-muted-foreground"
        >
          All
        </button>
        <button
          onClick={() => onSetAll(false)}
          className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:border-muted-foreground"
        >
          None
        </button>
        {Object.entries(CATEGORY_META).map(([cat, meta]) => {
          const on = enabled[cat];
          return (
            <button
              key={cat}
              onClick={() => onToggle(cat)}
              aria-pressed={on}
              className={
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors " +
                (on
                  ? "border-transparent text-foreground"
                  : "border-border bg-card text-muted-foreground line-through opacity-60 hover:border-muted-foreground")
              }
              style={on ? { background: meta.color + "22", borderColor: meta.color } : undefined}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: on ? meta.color : "var(--muted-foreground)" }}
              />
              {meta.label}
            </button>
          );
        })}
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              minTickGap={40}
            />
            {metric === "both" && (
              <YAxis
                yAxisId="L"
                orientation="left"
                tickFormatter={formatCurrency}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                width={60}
              />
            )}
            {metric === "both" && (
              <YAxis
                yAxisId="R"
                orientation="right"
                tickFormatter={(v) => v.toLocaleString()}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                width={60}
              />
            )}
            {metric !== "both" && (
              <YAxis
                tickFormatter={metric === "premium" ? formatCurrency : (v) => v.toLocaleString()}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                width={60}
              />
            )}
            <Tooltip content={<ChartTooltip metric={metric} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {Object.entries(CATEGORY_META).flatMap(([cat, meta]) => {
              if (!enabled[cat]) return [];
              if (metric === "both") {
                return [
                  <Line
                    key={`${cat}-p`}
                    yAxisId="L"
                    type="monotone"
                    dataKey={`${cat}__premium`}
                    name={`${meta.label} $`}
                    stroke={meta.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />,
                  <Line
                    key={`${cat}-q`}
                    yAxisId="R"
                    type="monotone"
                    dataKey={`${cat}__quota`}
                    name={`${meta.label} qty`}
                    stroke={meta.color}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                    activeDot={{ r: 3 }}
                  />,
                ];
              }
              return [
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  name={meta.label}
                  stroke={meta.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />,
              ];
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
});
