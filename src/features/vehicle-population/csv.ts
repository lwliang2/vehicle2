import { ALL_SUB_KEYS, GROUP_KEYS, GROUPS } from "./taxonomy";

export interface YearRow {
  year: number;
  values: Record<string, number>; // key -> value (sub keys and group keys)
}

export interface CsvParseResult {
  rows: YearRow[];
  errors: string[];
  skipped: string[];
}

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
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else {
      if (ch === '"') quoted = true;
      else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toNum(s: string): number | null {
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseCsv(text: string): CsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: ["Empty CSV"], skipped: [] };

  const first = parseCsvLine(lines[0]);
  const isWide = first.some((c) => /year/i.test(c)) && first.length > 4;
  if (isWide) return parseWide(lines);
  return parseLong(lines);
}

function parseWide(lines: string[]): CsvParseResult {
  const header = parseCsvLine(lines[0]);
  const yearIdx = header.findIndex((h) => /^year$/i.test(h));
  if (yearIdx < 0) return { rows: [], errors: ["Missing Year column"], skipped: [] };
  const errors: string[] = [];
  const skipped: string[] = [];
  const byYear = new Map<number, YearRow>();
  const knownKeys = new Set([...ALL_SUB_KEYS, ...GROUP_KEYS]);
  const colMap: (string | null)[] = header.map((h) => {
    if (!h || /^year$/i.test(h)) return null;
    const match = [...knownKeys].find((k) => k.toLowerCase() === h.toLowerCase());
    if (!match) {
      if (!skipped.includes(h)) skipped.push(h);
      return null;
    }
    return match;
  });
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const year = toNum(cols[yearIdx]);
    if (year == null) {
      errors.push(`Row ${i + 1}: invalid year "${cols[yearIdx]}"`);
      continue;
    }
    let row = byYear.get(year);
    if (!row) {
      row = { year, values: {} };
      byYear.set(year, row);
    }
    for (let c = 0; c < cols.length; c++) {
      const key = colMap[c];
      if (!key) continue;
      const v = toNum(cols[c]);
      if (v != null) row.values[key] = v;
    }
  }
  const rows = [...byYear.values()].sort((a, b) => a.year - b.year);
  for (const r of rows) fillGroupTotals(r);
  return { rows, errors, skipped };
}

function parseLong(lines: string[]): CsvParseResult {
  const errors: string[] = [];
  const skipped: string[] = [];
  const knownKeys = new Set([...ALL_SUB_KEYS, ...GROUP_KEYS]);
  const byYear = new Map<number, YearRow>();
  const first = parseCsvLine(lines[0]);
  const hasHeader =
    first.some((c) => /year/i.test(c)) && first.some((c) => /category|type|number/i.test(c));
  const start = hasHeader ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 4) continue;
    const year = toNum(cols[0]);
    const cat = cols[1];
    const type = cols[2];
    const num = toNum(cols[3]);
    if (year == null || num == null) continue;
    // choose most specific match — prefer type, fall back to category
    const candidates = [type, cat].filter(Boolean);
    let matched: string | null = null;
    for (const c of candidates) {
      const m = [...knownKeys].find((k) => k.toLowerCase() === c.toLowerCase());
      if (m) {
        matched = m;
        break;
      }
    }
    if (!matched) {
      const tag = `${cat} / ${type}`;
      if (!skipped.includes(tag)) skipped.push(tag);
      continue;
    }
    let row = byYear.get(year);
    if (!row) {
      row = { year, values: {} };
      byYear.set(year, row);
    }
    row.values[matched] = (row.values[matched] ?? 0) + num;
  }
  const rows = [...byYear.values()].sort((a, b) => a.year - b.year);
  for (const r of rows) fillGroupTotals(r);
  if (rows.length === 0) errors.push("No matching rows found");
  return { rows, errors, skipped };
}

function fillGroupTotals(row: YearRow): void {
  for (const g of GROUPS) {
    if (row.values[g.key] != null) continue;
    let sum = 0;
    let any = false;
    for (const s of g.subs) {
      if (row.values[s.key] != null) {
        sum += row.values[s.key];
        any = true;
      }
    }
    if (any) row.values[g.key] = sum;
  }
}
