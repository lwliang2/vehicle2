import { memo } from "react";
import { GROUPS, subColor } from "../taxonomy";

export type ChartType = "line" | "bar" | "area";

interface Props {
  enabledGroups: Record<string, boolean>;
  enabledSubs: Record<string, boolean>;
  openGroups: Record<string, boolean>;
  showTotal: boolean;
  showCap: boolean;
  onToggleGroup: (key: string) => void;
  onToggleSub: (key: string) => void;
  onToggleOpen: (key: string) => void;
  onSetAllGroups: (v: boolean) => void;
  onExpandAll: (v: boolean) => void;
  onShowTotalChange: (v: boolean) => void;
  onShowCapChange: (v: boolean) => void;
  rowsAvailable: boolean;
  minYear: number;
  maxYear: number;
  fromYear: number;
  toYear: number;
  onFromYearChange: (v: number) => void;
  onToYearChange: (v: number) => void;
  chartType: ChartType;
  onChartTypeChange: (t: ChartType) => void;
}

export const Sidebar = memo(function Sidebar({
  enabledGroups,
  enabledSubs,
  openGroups,
  showTotal,
  showCap,
  onToggleGroup,
  onToggleSub,
  onToggleOpen,
  onSetAllGroups,
  onExpandAll,
  onShowTotalChange,
  onShowCapChange,
  rowsAvailable,
  minYear,
  maxYear,
  fromYear,
  toYear,
  onFromYearChange,
  onToYearChange,
  chartType,
  onChartTypeChange,
}: Props) {
  return (
    <aside className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Categories
          </h2>
          <div className="flex gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => onSetAllGroups(true)}
              className="text-primary hover:underline"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onSetAllGroups(false)}
              className="text-primary hover:underline"
            >
              None
            </button>
            <button
              type="button"
              onClick={() => onExpandAll(true)}
              className="text-primary hover:underline"
            >
              Expand
            </button>
            <button
              type="button"
              onClick={() => onExpandAll(false)}
              className="text-primary hover:underline"
            >
              Collapse
            </button>
          </div>
        </div>
        <div className="space-y-1">
          {GROUPS.map((g) => (
            <div key={g.key}>
              <div className="flex items-center justify-between gap-2 py-1">
                <label className="flex flex-1 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!enabledGroups[g.key]}
                    onChange={() => onToggleGroup(g.key)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: g.color }}
                  />
                  <span>{g.label}</span>
                </label>
                {g.subs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onToggleOpen(g.key)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {openGroups[g.key] ? "−" : "+"}
                  </button>
                )}
              </div>
              {openGroups[g.key] && g.subs.length > 1 && (
                <div className="ml-6 border-l border-border pl-3">
                  {g.subs.map((s, i) => (
                    <label
                      key={s.key}
                      className="flex cursor-pointer items-center gap-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={!!enabledSubs[s.key]}
                        onChange={() => onToggleSub(s.key)}
                        className="h-3 w-3 accent-primary"
                      />
                      <span
                        className="inline-block h-2 w-2 rounded-sm"
                        style={{ background: subColor(g.key, i, g.subs.length) }}
                      />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-border pt-2">
          <label className="flex items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={showTotal}
              onChange={(e) => onShowTotalChange(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            Total (All Vehicle Types)
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={showCap}
              onChange={(e) => onShowCapChange(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            LTA Allowable Cap
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Year Range
        </h2>
        {rowsAvailable ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={minYear}
              max={maxYear}
              value={fromYear || ""}
              onChange={(e) => onFromYearChange(Number(e.target.value) || minYear)}
              className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="number"
              min={minYear}
              max={maxYear}
              value={toYear || ""}
              onChange={(e) => onToYearChange(Number(e.target.value) || maxYear)}
              className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm"
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Load a CSV to enable the filter.</p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Chart Type
        </h2>
        <div className="flex gap-1">
          {(["line", "bar", "area"] as ChartType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChartTypeChange(t)}
              className={
                "flex-1 rounded-md border px-2 py-1 text-xs capitalize transition-colors " +
                (chartType === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-muted-foreground")
              }
            >
              {t === "area" ? "Stacked Area" : t}
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
});
