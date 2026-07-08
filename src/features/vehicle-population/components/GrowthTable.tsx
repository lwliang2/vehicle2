import { memo } from "react";

export interface GrowthRow {
  key: string;
  label: string;
  color: string;
  a: number;
  b: number;
  totalPct: number | null;
  cagr: number | null;
}

interface Props {
  rows: GrowthRow[];
  lo: number;
  hi: number;
}

export const GrowthTable = memo(function GrowthTable({ rows, lo, hi }: Props) {
  if (rows.length === 0) return null;
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Growth Rate ({lo}–{hi})
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Series</th>
              <th className="py-2 pr-3 text-right font-medium">{lo}</th>
              <th className="py-2 pr-3 text-right font-medium">{hi}</th>
              <th className="py-2 pr-3 text-right font-medium">Total %</th>
              <th className="py-2 text-right font-medium">CAGR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-border">
                <td className="py-2 pr-3">
                  <span
                    className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle"
                    style={{ background: r.color }}
                  />
                  {r.label}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.a.toLocaleString()}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.b.toLocaleString()}</td>
                <td
                  className={
                    "py-2 pr-3 text-right tabular-nums " +
                    (r.totalPct == null
                      ? "text-muted-foreground"
                      : r.totalPct >= 0
                        ? "text-emerald-400"
                        : "text-red-400")
                  }
                >
                  {r.totalPct == null ? "—" : `${r.totalPct.toFixed(1)}%`}
                </td>
                <td
                  className={
                    "py-2 text-right tabular-nums " +
                    (r.cagr == null
                      ? "text-muted-foreground"
                      : r.cagr >= 0
                        ? "text-emerald-400"
                        : "text-red-400")
                  }
                >
                  {r.cagr == null ? "—" : `${r.cagr.toFixed(2)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
});
