import { memo, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  annualCoeRevalidations,
  annualDeregistrations,
  annualNewRegistrations,
} from "@/data/coe-annual";

const ANNUAL_CATS = [
  { key: "Category A", color: "#60a5fa" },
  { key: "Category B", color: "#34d399" },
  { key: "Category C", color: "#fbbf24" },
  { key: "Category C-ETS", color: "#f59e0b" },
  { key: "Category D", color: "#a78bfa" },
  { key: "Taxis", color: "#f87171" },
  { key: "Vehicles Exempted From VQS", color: "#94a3b8" },
] as const;

type AnnualView = "new" | "dereg" | "net" | "reval";

function pivotAnnual(
  rows: { year: number; category: string; number: number }[],
): { year: number; [k: string]: number }[] {
  const byYear = new Map<number, { year: number; [k: string]: number }>();
  for (const r of rows) {
    let e = byYear.get(r.year);
    if (!e) {
      e = { year: r.year };
      byYear.set(r.year, e);
    }
    e[r.category] = (e[r.category] ?? 0) + r.number;
  }
  return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
}

export const AnnualPanel = memo(function AnnualPanel() {
  const [view, setView] = useState<AnnualView>("new");

  const fullData = useMemo(() => {
    if (view === "new") return pivotAnnual(annualNewRegistrations);
    if (view === "dereg") return pivotAnnual(annualDeregistrations);
    if (view === "net") {
      const regs = pivotAnnual(annualNewRegistrations);
      const dereg = new Map(pivotAnnual(annualDeregistrations).map((r) => [r.year, r]));
      return regs.map((r) => {
        const d = dereg.get(r.year) ?? { year: r.year };
        const out: { year: number; [k: string]: number } = { year: r.year };
        for (const { key } of ANNUAL_CATS)
          out[key] = (r[key] ?? 0) - ((d as { [k: string]: number })[key] ?? 0);
        return out;
      });
    }
    // reval: sum both 5yr + 10yr per category
    return pivotAnnual(
      annualCoeRevalidations.map((r) => ({ year: r.year, category: r.category, number: r.number })),
    );
  }, [view]);

  const minYear = fullData.length ? fullData[0].year : 0;
  const maxYear = fullData.length ? fullData[fullData.length - 1].year : 0;
  const [fromYear, setFromYear] = useState<number>(minYear);
  const [toYear, setToYear] = useState<number>(maxYear);

  // reset range when view changes and range falls outside available years
  const clampedFrom = Math.max(minYear, Math.min(fromYear || minYear, maxYear));
  const clampedTo = Math.max(minYear, Math.min(toYear || maxYear, maxYear));
  const lo = Math.min(clampedFrom, clampedTo);
  const hi = Math.max(clampedFrom, clampedTo);

  const data = useMemo(
    () => fullData.filter((d) => d.year >= lo && d.year <= hi),
    [fullData, lo, hi],
  );

  const cats =
    view === "reval"
      ? ANNUAL_CATS.filter((c) => c.key !== "Taxis" && c.key !== "Vehicles Exempted From VQS")
      : ANNUAL_CATS;

  const yearsRange = data.length ? `${data[0].year}–${data[data.length - 1].year}` : "";

  const views: { id: AnnualView; label: string }[] = [
    { id: "new", label: "New registrations" },
    { id: "dereg", label: "De-registrations" },
    { id: "net", label: "Net change" },
    { id: "reval", label: "COE revalidations" },
  ];

  const yearOptions: number[] = [];
  for (let y = minYear; y <= maxYear; y++) yearOptions.push(y);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Annual Vehicle Registration Context</h2>
          <p className="text-xs text-muted-foreground">
            Long-run supply/demand backdrop for COE bidding. LTA Datamall · {yearsRange}.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={
                "rounded-md border px-3 py-1 text-xs font-medium transition-colors " +
                (view === v.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-muted-foreground")
              }
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium">Year range:</span>
        <select
          value={lo}
          onChange={(e) => setFromYear(Number(e.target.value))}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
          aria-label="From year"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <span>to</span>
        <select
          value={hi}
          onChange={(e) => setToYear(Number(e.target.value))}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
          aria-label="To year"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {(lo !== minYear || hi !== maxYear) && (
          <button
            type="button"
            onClick={() => {
              setFromYear(minYear);
              setToYear(maxYear);
            }}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs hover:border-muted-foreground"
          >
            Reset
          </button>
        )}
        {[5, 10, 20].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setFromYear(Math.max(minYear, maxYear - n + 1));
              setToYear(maxYear);
            }}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs hover:border-muted-foreground"
          >
            Last {n}y
          </button>
        ))}
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
            <YAxis
              tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(value: number) => value.toLocaleString()}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {cats.map((c) => (
              <Bar
                key={c.key}
                dataKey={c.key}
                stackId={view === "net" ? undefined : "s"}
                fill={c.color}
                name={c.key}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
});
