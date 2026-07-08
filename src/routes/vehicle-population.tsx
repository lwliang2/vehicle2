import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardTabs } from "@/components/DashboardTabs";
import { DEFAULT_VEHICLE_POPULATION_CSV } from "@/data/vehicle-population-csv";

import { parseCsv, type YearRow } from "@/features/vehicle-population/csv";
import { GROUPS, ALL_SUB_KEYS, subColor } from "@/features/vehicle-population/taxonomy";
import { Sidebar, type ChartType } from "@/features/vehicle-population/components/Sidebar";
import { PopulationChart } from "@/features/vehicle-population/components/PopulationChart";
import { GrowthTable, type GrowthRow } from "@/features/vehicle-population/components/GrowthTable";
import { CsvLoader } from "@/features/vehicle-population/components/CsvLoader";

export const Route = createFileRoute("/vehicle-population")({
  head: () => ({
    meta: [
      { title: "Singapore Vehicle Population Trend" },
      {
        name: "description",
        content:
          "Explore Singapore's motor-vehicle population by category and sub-category, filter by year range, and inspect growth rates. Data sourced from LTA Datamall.",
      },
      { property: "og:title", content: "Singapore Vehicle Population Trend" },
      {
        property: "og:description",
        content:
          "Motor-vehicle population by category and sub-category with year range, chart type, and growth analysis.",
      },
    ],
  }),
  component: VehiclePopulationPage,
});

const STORAGE_KEY = "vehicle-population-csv-v2";
const DEFAULT_ROWS: YearRow[] = parseCsv(DEFAULT_VEHICLE_POPULATION_CSV).rows;

function VehiclePopulationPage() {
  const [rows, setRows] = useState<YearRow[]>(DEFAULT_ROWS);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as YearRow[];
      if (Array.isArray(parsed) && parsed.length > 0) setRows(parsed);
    } catch {
      // ignore
    }
  }, []);

  const yearsAvailable = useMemo(() => rows.map((r) => r.year), [rows]);
  const minYear = yearsAvailable[0] ?? 0;
  const maxYear = yearsAvailable[yearsAvailable.length - 1] ?? 0;

  const [fromYear, setFromYear] = useState<number>(0);
  const [toYear, setToYear] = useState<number>(0);
  useEffect(() => {
    setFromYear(minYear);
    setToYear(maxYear);
  }, [minYear, maxYear]);

  const [chartType, setChartType] = useState<ChartType>("line");
  const [enabledGroups, setEnabledGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(GROUPS.map((g) => [g.key, true])),
  );
  const [enabledSubs, setEnabledSubs] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_SUB_KEYS.map((k) => [k, false])),
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(GROUPS.map((g) => [g.key, false])),
  );
  const [showTotal, setShowTotal] = useState<boolean>(false);
  const [showCap, setShowCap] = useState<boolean>(false);

  const lo = Math.min(fromYear || minYear, toYear || maxYear);
  const hi = Math.max(fromYear || minYear, toYear || maxYear);

  // Was recomputed on every render in the original (missing useMemo), which
  // also broke memoization of everything downstream (chartData, growthRows).
  const filtered = useMemo(() => rows.filter((r) => r.year >= lo && r.year <= hi), [rows, lo, hi]);

  // Active series: sub-cats when their group is expanded and toggled on;
  // otherwise the group aggregate
  const activeSeries = useMemo(() => {
    const out: { key: string; label: string; color: string }[] = [];
    GROUPS.forEach((g) => {
      const hasActiveSub = g.subs.some((s) => enabledSubs[s.key]);
      if (hasActiveSub) {
        g.subs.forEach((s, i) => {
          if (enabledSubs[s.key]) {
            out.push({ key: s.key, label: s.label, color: subColor(g.key, i, g.subs.length) });
          }
        });
      } else if (enabledGroups[g.key]) {
        out.push({ key: g.key, label: g.label, color: g.color });
      }
    });
    if (showTotal) out.push({ key: "__TOTAL__", label: "Total", color: "#f97316" });
    if (showCap) out.push({ key: "__CAP__", label: "LTA Allowable Cap", color: "#ffffff" });
    return out;
  }, [enabledGroups, enabledSubs, showTotal, showCap]);

  const chartData = useMemo(() => {
    // Build LTA allowable cap from 1990 baseline using stepped growth rates:
    // 3% pre-2009, 1.5% 2009-2011, 0.5% 2012-2014, 0.25% 2015-2017, 0% from 2018.
    const capByYear = new Map<number, number>();
    const baseline = rows.find((r) => r.year === 1990);
    if (baseline) {
      let cur = GROUPS.reduce((acc, g) => acc + (baseline.values[g.key] ?? 0), 0);
      const endYear = Math.max(hi, 2025);
      for (let y = 1990; y <= endYear; y++) {
        capByYear.set(y, Math.round(cur));
        const rate = y < 2009 ? 0.03 : y < 2012 ? 0.015 : y < 2015 ? 0.005 : y < 2018 ? 0.0025 : 0;
        cur *= 1 + rate;
      }
    }
    return filtered.map((r) => {
      const point: Record<string, number | string> = { year: r.year };
      let total = 0;
      for (const g of GROUPS) {
        const gVal = r.values[g.key] ?? 0;
        total += gVal;
        point[g.key] = gVal;
        for (const s of g.subs) {
          if (r.values[s.key] != null) point[s.key] = r.values[s.key];
        }
      }
      point["__TOTAL__"] = total;
      const cap = capByYear.get(r.year);
      if (cap != null) point["__CAP__"] = cap;
      return point;
    });
  }, [filtered, rows, hi]);

  const growthRows: GrowthRow[] = useMemo(() => {
    if (filtered.length < 2) return [];
    const first = filtered[0];
    const last = filtered[filtered.length - 1];
    const years = last.year - first.year;
    return activeSeries
      .filter((s) => s.key !== "__CAP__")
      .map((s) => {
        const a =
          s.key === "__TOTAL__"
            ? GROUPS.reduce((acc, g) => acc + (first.values[g.key] ?? 0), 0)
            : (first.values[s.key] ?? 0);
        const b =
          s.key === "__TOTAL__"
            ? GROUPS.reduce((acc, g) => acc + (last.values[g.key] ?? 0), 0)
            : (last.values[s.key] ?? 0);
        const totalPct = a > 0 ? ((b - a) / a) * 100 : null;
        const cagr = a > 0 && years > 0 ? (Math.pow(b / a, 1 / years) - 1) * 100 : null;
        return { key: s.key, label: s.label, color: s.color, a, b, totalPct, cagr };
      });
  }, [filtered, activeSeries]);

  const applyCsv = useCallback((csvText: string): string => {
    const res = parseCsv(csvText);
    if (res.rows.length === 0) {
      return res.errors[0] ?? "No rows parsed";
    }
    setRows(res.rows);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(res.rows));
    }
    const skippedMsg = res.skipped.length
      ? ` · skipped: ${res.skipped.slice(0, 5).join(", ")}${res.skipped.length > 5 ? "…" : ""}`
      : "";
    return `Loaded ${res.rows.length} year(s)${skippedMsg}`;
  }, []);

  const clearData = useCallback((): string => {
    setRows(DEFAULT_ROWS);
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    return "Reverted to embedded LTA dataset";
  }, []);

  const toggleGroup = useCallback(
    (key: string): void => setEnabledGroups((g) => ({ ...g, [key]: !g[key] })),
    [],
  );
  const toggleSub = useCallback(
    (key: string): void => setEnabledSubs((s) => ({ ...s, [key]: !s[key] })),
    [],
  );
  const toggleOpen = useCallback(
    (key: string): void => setOpenGroups((o) => ({ ...o, [key]: !o[key] })),
    [],
  );
  const setAllGroups = useCallback(
    (v: boolean): void => setEnabledGroups(Object.fromEntries(GROUPS.map((g) => [g.key, v]))),
    [],
  );
  const expandAll = useCallback(
    (v: boolean): void => setOpenGroups(Object.fromEntries(GROUPS.map((g) => [g.key, v]))),
    [],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardTabs />
      <header className="border-b border-border bg-gradient-to-br from-card to-background px-6 py-5 md:px-8">
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          🚙 Vehicle Population Trend
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Toggle categories, expand sub-categories, and filter by year range to explore Singapore's
          motor-vehicle population.
        </p>
      </header>

      <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[280px_1fr]">
        <Sidebar
          enabledGroups={enabledGroups}
          enabledSubs={enabledSubs}
          openGroups={openGroups}
          showTotal={showTotal}
          showCap={showCap}
          onToggleGroup={toggleGroup}
          onToggleSub={toggleSub}
          onToggleOpen={toggleOpen}
          onSetAllGroups={setAllGroups}
          onExpandAll={expandAll}
          onShowTotalChange={setShowTotal}
          onShowCapChange={setShowCap}
          rowsAvailable={rows.length > 0}
          minYear={minYear}
          maxYear={maxYear}
          fromYear={fromYear}
          toYear={toYear}
          onFromYearChange={setFromYear}
          onToYearChange={setToYear}
          chartType={chartType}
          onChartTypeChange={setChartType}
        />

        <main className="space-y-4">
          <PopulationChart
            chartType={chartType}
            chartData={chartData}
            activeSeries={activeSeries}
            hasRows={rows.length > 0}
            yearRangeLabel={`${lo}-${hi}`}
          />

          <GrowthTable rows={growthRows} lo={lo} hi={hi} />

          <CsvLoader rowsCount={rows.length} onApply={applyCsv} onClear={clearData} />
        </main>
      </div>
    </div>
  );
}
