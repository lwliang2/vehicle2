import type { CoeRecord } from "@/lib/coe.functions";
import type { ParseResult } from "./types";

const REQUIRED_COLS = ["month", "vehicle_class", "quota", "premium"] as const;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseCoeCsv(text: string): ParseResult {
  const errors: string[] = [];
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { records: [], errors: ["CSV needs a header row and at least one data row."] };
  }
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx: Record<string, number> = {};
  for (const col of [
    "month",
    "bidding_no",
    "vehicle_class",
    "quota",
    "bids_success",
    "bids_received",
    "premium",
  ]) {
    idx[col] = header.indexOf(col);
  }
  for (const req of REQUIRED_COLS) {
    if (idx[req] < 0) errors.push(`Missing required column: ${req}`);
  }
  if (errors.length) return { records: [], errors };

  const records: CoeRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const month = cells[idx.month] ?? "";
    if (!/^\d{4}-\d{2}$/.test(month)) {
      errors.push(`Row ${i + 1}: invalid month "${month}" (expected YYYY-MM)`);
      continue;
    }
    const num = (s: string | undefined): number => {
      if (!s) return 0;
      const n = Number(s.replace(/[$,]/g, ""));
      return Number.isFinite(n) ? n : 0;
    };
    records.push({
      month,
      bidding_no: num(cells[idx.bidding_no]),
      vehicle_class: cells[idx.vehicle_class] ?? "",
      quota: num(cells[idx.quota]),
      bids_success: num(cells[idx.bids_success]),
      bids_received: num(cells[idx.bids_received]),
      premium: num(cells[idx.premium]),
    });
  }
  if (records.length === 0 && errors.length === 0) {
    errors.push("No valid data rows found.");
  }
  return { records, errors };
}

export function mergeRecords(base: CoeRecord[], override: CoeRecord[]): CoeRecord[] {
  const key = (r: CoeRecord) => `${r.month}|${r.bidding_no}|${r.vehicle_class}`;
  const map = new Map<string, CoeRecord>();
  for (const r of base) map.set(key(r), r);
  for (const r of override) map.set(key(r), r);
  return [...map.values()];
}
