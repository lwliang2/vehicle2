import type { CoeRecord } from "@/lib/coe.functions";
import type { Metric, MonthlyPoint, RangeKey } from "./types";

export interface OversubPoint {
  month: string;
  ts: number;
  ratio: number;
}

function normaliseCategory(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^Category\s+[A-E]$/i.test(v)) {
    return "Category " + v.slice(-1).toUpperCase();
  }
  const m = v.match(/^([A-E])$/i);
  if (m) return "Category " + m[1].toUpperCase();
  return null;
}

export function buildMonthly(records: CoeRecord[], metric: Metric): MonthlyPoint[] {
  const byMonth = new Map<string, MonthlyPoint>();
  const bucket = new Map<string, Map<string, { sum: number; n: number }>>();

  for (const r of records) {
    const cat = normaliseCategory(r.vehicle_class);
    if (!cat) continue;
    if (!r.month) continue;
    const ts = Date.parse(r.month + "-01");
    if (!Number.isFinite(ts)) continue;

    let point = byMonth.get(r.month);
    if (!point) {
      point = { month: r.month, ts };
      byMonth.set(r.month, point);
      bucket.set(r.month, new Map());
    }
    const perCat = bucket.get(r.month)!;
    const cur = perCat.get(cat) ?? { sum: 0, n: 0 };
    const value = metric === "premium" ? r.premium : r.quota;
    cur.sum += value;
    cur.n += 1;
    perCat.set(cat, cur);
  }

  for (const [month, point] of byMonth) {
    const perCat = bucket.get(month)!;
    for (const [cat, { sum, n }] of perCat) {
      point[cat] = metric === "premium" ? Math.round(sum / n) : Math.round(sum / n);
    }
  }

  return [...byMonth.values()].sort((a, b) => a.ts - b.ts);
}

export function buildOversubscription(records: CoeRecord[], category: string): OversubPoint[] {
  const byMonth = new Map<string, { ratio: number; n: number; ts: number; month: string }>();
  for (const r of records) {
    const cat = normaliseCategory(r.vehicle_class);
    if (cat !== category) continue;
    if (!r.quota || !r.bids_received) continue;
    const ts = Date.parse(r.month + "-01");
    if (!Number.isFinite(ts)) continue;
    const cur = byMonth.get(r.month) ?? { ratio: 0, n: 0, ts, month: r.month };
    cur.ratio += r.bids_received / r.quota;
    cur.n += 1;
    byMonth.set(r.month, cur);
  }
  return [...byMonth.values()]
    .map((v) => ({ month: v.month, ts: v.ts, ratio: +(v.ratio / v.n).toFixed(2) }))
    .sort((a, b) => a.ts - b.ts);
}

export function filterByRange<T extends { ts: number }>(rows: T[], range: RangeKey): T[] {
  if (range === "ALL" || rows.length === 0) return rows;
  const years = range === "2Y" ? 2 : range === "5Y" ? 5 : 10;
  const cutoff = rows[rows.length - 1].ts - years * 365.25 * 24 * 3600 * 1000;
  return rows.filter((r) => r.ts >= cutoff);
}

export function filterByCustom<T extends { ts: number; month: string }>(
  rows: T[],
  from: string,
  to: string,
): T[] {
  if (rows.length === 0) return rows;
  const fromTs = from ? Date.parse(from + "-01") : -Infinity;
  const toRaw = to ? Date.parse(to + "-01") : Infinity;
  // include the selected "to" month entirely
  const toTs = Number.isFinite(toRaw) ? toRaw + 32 * 24 * 3600 * 1000 : toRaw;
  return rows.filter((r) => r.ts >= fromTs && r.ts <= toTs);
}
