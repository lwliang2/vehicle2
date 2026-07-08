import { memo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnalyzeTrendButton } from "@/components/AnalyzeTrendButton";
import type { AnalyzeInput } from "@/lib/analyze.functions";
import type { ChartType } from "./Sidebar";

interface Series {
  key: string;
  label: string;
  color: string;
}

interface Props {
  chartType: ChartType;
  chartData: Record<string, number | string>[];
  activeSeries: Series[];
  hasRows: boolean;
  yearRangeLabel: string;
}

const yAxisTickFormatter = (v: number) =>
  Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v);
const tooltipContentStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 12,
};
const tooltipFormatter = (v: number) => v.toLocaleString();

export const PopulationChart = memo(function PopulationChart({
  chartType,
  chartData,
  activeSeries,
  hasRows,
  yearRangeLabel,
}: Props) {
  const buildAnalyzePayload = (): AnalyzeInput => {
    const series = activeSeries.map((s) => ({
      name: s.label,
      points: chartData
        .filter((p) => p[s.key] != null)
        .map((p) => ({ x: p.year as number, y: p[s.key] as number })),
    }));
    return {
      title: `Vehicle population · ${yearRangeLabel}`,
      context: `Singapore motor-vehicle population by category. Active series: ${activeSeries.map((s) => s.label).join(", ") || "(none)"}. Years ${yearRangeLabel}.`,
      series,
    };
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex justify-end">
        <AnalyzeTrendButton buildPayload={buildAnalyzePayload} />
      </div>
      <div className="h-[420px]">
        {!hasRows ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Load a CSV below to render the chart.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "line" ? (
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="year" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis
                  tickFormatter={yAxisTickFormatter}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  width={55}
                />
                <Tooltip contentStyle={tooltipContentStyle} formatter={tooltipFormatter} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {activeSeries.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    strokeDasharray={s.key === "__CAP__" ? "2 4" : undefined}
                    dot={false}
                  />
                ))}
              </LineChart>
            ) : chartType === "bar" ? (
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="year" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis
                  tickFormatter={yAxisTickFormatter}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  width={55}
                />
                <Tooltip contentStyle={tooltipContentStyle} formatter={tooltipFormatter} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {activeSeries.map((s) => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} />
                ))}
              </BarChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="year" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis
                  tickFormatter={yAxisTickFormatter}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  width={55}
                />
                <Tooltip contentStyle={tooltipContentStyle} formatter={tooltipFormatter} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {activeSeries.map((s) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    fill={s.color}
                    fillOpacity={0.35}
                    stackId={s.key === "__TOTAL__" || s.key === "__CAP__" ? undefined : "s"}
                  />
                ))}
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
});
