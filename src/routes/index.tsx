import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCoeResults } from "@/lib/coe.functions";
import { DashboardTabs } from "@/components/DashboardTabs";
import { AnalyzeTrendButton } from "@/components/AnalyzeTrendButton";
import type { AnalyzeInput } from "@/lib/analyze.functions";

import { ControlGroup } from "@/features/coe/components/ControlGroup";
import { StatsBar, type StatRow } from "@/features/coe/components/StatsBar";
import { TrendChart } from "@/features/coe/components/TrendChart";
import { OversubChart } from "@/features/coe/components/OversubChart";
import { GapChart } from "@/features/coe/components/GapChart";
import { UploadPanel } from "@/features/coe/components/UploadPanel";
import { AnnualPanel } from "@/features/coe/components/AnnualPanel";
import { formatMonth } from "@/features/coe/format";
import { mergeRecords } from "@/features/coe/csv";
import {
  buildMonthly,
  buildOversubscription,
  filterByCustom,
  filterByRange,
} from "@/features/coe/transforms";
import {
  CATEGORY_META,
  type Metric,
  type MetricSel,
  type MonthlyPoint,
  type RangeKey,
  type UploadState,
} from "@/features/coe/types";

const coeQuery = queryOptions({
  queryKey: ["coe-results"],
  queryFn: () => fetchCoeResults(),
  staleTime: 1000 * 60 * 60,
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(coeQuery),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useSuspenseQuery(coeQuery);
  const [upload, setUpload] = useState<UploadState | null>(null);
  const records = useMemo(() => {
    if (!upload) return data.records;
    return upload.mode === "replace" ? upload.records : mergeRecords(data.records, upload.records);
  }, [data.records, upload]);

  const [metric, setMetric] = useState<MetricSel>("premium");
  const [range, setRange] = useState<RangeKey>("5Y");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    "Category A": true,
    "Category B": true,
    "Category C": true,
    "Category D": true,
    "Category E": true,
  });

  const primaryMetric: Metric = metric === "quota" ? "quota" : "premium";
  const monthly = useMemo(() => buildMonthly(records, primaryMetric), [records, primaryMetric]);
  const monthlyFiltered = useMemo(
    () =>
      range === "CUSTOM"
        ? filterByCustom(monthly, customFrom, customTo)
        : filterByRange(monthly, range),
    [monthly, range, customFrom, customTo],
  );

  const monthlySecondary = useMemo(
    () => (metric === "both" ? buildMonthly(records, "quota") : []),
    [records, metric],
  );
  const monthlyDual = useMemo(() => {
    if (metric !== "both") return monthlyFiltered;
    const secByMonth = new Map(monthlySecondary.map((p) => [p.month, p]));
    return monthlyFiltered.map((p) => {
      const out: MonthlyPoint = { month: p.month, ts: p.ts };
      const sec = secByMonth.get(p.month);
      for (const cat of Object.keys(CATEGORY_META)) {
        if (p[cat] != null) out[`${cat}__premium`] = p[cat] as number;
        const q = sec?.[cat];
        if (q != null) out[`${cat}__quota`] = q as number;
      }
      return out;
    });
  }, [metric, monthlyFiltered, monthlySecondary]);

  const oversub = useMemo(() => buildOversubscription(records, "Category A"), [records]);
  const oversubFiltered = useMemo(
    () =>
      range === "CUSTOM"
        ? filterByCustom(oversub, customFrom, customTo)
        : filterByRange(oversub, range),
    [oversub, range, customFrom, customTo],
  );

  const monthBounds = useMemo(() => {
    if (monthly.length === 0) return { min: "", max: "" };
    return { min: monthly[0].month, max: monthly[monthly.length - 1].month };
  }, [monthly]);

  const gap = useMemo(() => {
    return monthlyFiltered.map((p) => {
      const a = (p["Category A"] as number) ?? 0;
      const e = (p["Category E"] as number) ?? 0;
      return { month: p.month, ts: p.ts, "Cat A": a, "Cat E": e };
    });
  }, [monthlyFiltered]);

  const stats: StatRow[] = useMemo(() => {
    const latest = monthly[monthly.length - 1];
    const prev = monthly[monthly.length - 2];
    return Object.keys(CATEGORY_META).map((cat) => {
      const latestVal = (latest?.[cat] as number | undefined) ?? 0;
      const prevVal = (prev?.[cat] as number | undefined) ?? 0;
      const change = prevVal ? ((latestVal - prevVal) / prevVal) * 100 : 0;
      return { cat, latestVal, change };
    });
  }, [monthly]);

  const latestMonthLabel = monthly.length ? formatMonth(monthly[monthly.length - 1].month) : "—";

  const toggleCategory = useCallback((cat: string) => {
    setEnabled((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);
  const setAllCategories = useCallback((v: boolean) => {
    setEnabled(Object.fromEntries(Object.keys(CATEGORY_META).map((c) => [c, v])));
  }, []);

  const [fetchedLabel, setFetchedLabel] = useState<string>("");
  useEffect(() => {
    setFetchedLabel(new Date(data.fetchedAt).toLocaleString("en-SG"));
  }, [data.fetchedAt]);

  const buildAnalyzePayload = useCallback((): AnalyzeInput => {
    const rangeLabel =
      range === "CUSTOM"
        ? `${customFrom || monthBounds.min} to ${customTo || monthBounds.max}`
        : range;
    const activeCats = Object.keys(CATEGORY_META).filter((c) => enabled[c]);
    const buildFor = (m: Metric) => {
      const rows =
        m === primaryMetric
          ? monthlyFiltered
          : range === "CUSTOM"
            ? filterByCustom(monthlySecondary, customFrom, customTo)
            : filterByRange(monthlySecondary, range);
      return activeCats.map((cat) => ({
        name: `${CATEGORY_META[cat].label} (${m})`,
        points: rows
          .filter((p) => p[cat] != null)
          .map((p) => ({ x: p.month, y: p[cat] as number })),
      }));
    };
    const series =
      metric === "both" ? [...buildFor("premium"), ...buildFor("quota")] : buildFor(primaryMetric);
    return {
      title: `COE ${metric === "both" ? "premium & quota" : primaryMetric} · ${rangeLabel}`,
      context: `Singapore Certificate of Entitlement monthly averages. Active categories: ${activeCats.join(", ") || "(none)"}. Range: ${rangeLabel}.`,
      series,
    };
  }, [
    range,
    customFrom,
    customTo,
    monthBounds,
    enabled,
    primaryMetric,
    monthlyFiltered,
    monthlySecondary,
    metric,
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardTabs />
      <header className="border-b border-border bg-gradient-to-br from-card to-background px-6 py-5 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">
              🚗 Singapore COE Bidding Dashboard
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Certificate of Entitlement — live from data.gov.sg · latest exercise{" "}
              {latestMonthLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <ControlGroup label="Metric">
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value as MetricSel)}
                className="rounded-md border border-border bg-card px-2.5 py-1.5 text-sm outline-none hover:border-muted-foreground"
              >
                <option value="premium">Quota Premium ($)</option>
                <option value="quota">Quota Allocation</option>
                <option value="both">Both (dual axis)</option>
              </select>
            </ControlGroup>
            <ControlGroup label="Time Range">
              <div className="flex flex-wrap items-center gap-1">
                {(["2Y", "5Y", "10Y", "ALL", "CUSTOM"] as RangeKey[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={
                      "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors " +
                      (range === r
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-muted-foreground")
                    }
                  >
                    {r === "ALL" ? "All" : r === "CUSTOM" ? "Custom" : r}
                  </button>
                ))}
                {range === "CUSTOM" && (
                  <div className="ml-1 flex items-center gap-1">
                    <input
                      type="month"
                      value={customFrom || monthBounds.min}
                      min={monthBounds.min}
                      max={monthBounds.max}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="rounded-md border border-border bg-card px-2 py-1 text-xs outline-none hover:border-muted-foreground"
                      aria-label="From month"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="month"
                      value={customTo || monthBounds.max}
                      min={monthBounds.min}
                      max={monthBounds.max}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="rounded-md border border-border bg-card px-2 py-1 text-xs outline-none hover:border-muted-foreground"
                      aria-label="To month"
                    />
                  </div>
                )}
              </div>
            </ControlGroup>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <AnalyzeTrendButton buildPayload={buildAnalyzePayload} />
        </div>
      </header>

      <StatsBar stats={stats} metric={metric} enabled={enabled} onToggle={toggleCategory} />

      <main className="grid gap-5 p-5 md:p-6">
        <TrendChart
          metric={metric}
          data={metric === "both" ? monthlyDual : monthlyFiltered}
          enabled={enabled}
          onToggle={toggleCategory}
          onSetAll={setAllCategories}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <OversubChart data={oversubFiltered} />
          <GapChart data={gap} />
        </div>

        <UploadPanel upload={upload} onChange={setUpload} baseCount={data.records.length} />

        <AnnualPanel />
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        Data: {upload ? `local upload (${upload.filename}, ${upload.mode})` : data.source} · annual
        context from LTA Datamall (MVP02-1, MVP05-1, MVP10) · fetched{" "}
        <span suppressHydrationWarning>{fetchedLabel || "…"}</span> · Values in SGD. April–June 2020
        gap: no bidding during COVID-19 circuit breaker.
      </footer>
    </div>
  );
}
