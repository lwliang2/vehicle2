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
import { ChartTooltip } from "./ChartTooltips";

interface GapPoint {
  month: string;
  ts: number;
  "Cat A": number;
  "Cat E": number;
}

export const GapChart = memo(function GapChart({ data }: { data: GapPoint[] }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Cat A vs Cat E — Premium Gap</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Cat E (Open) is bid up by dealers and tends to trail the highest COE across categories.
      </p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              minTickGap={40}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              width={60}
            />
            <Tooltip content={<ChartTooltip metric="premium" />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="Cat A" stroke="#60a5fa" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Cat E" stroke="#f87171" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
});
