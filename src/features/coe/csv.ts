import type { CoeRecord } from "@/lib/coe.functions";
import type { ParseResult } from "./types";

const REQUIRED_COLS = ["month", "vehicle_class", "quota", "premium"] as const;

// LTA's raw Datamall CSV and data.gov.sg's mirrored copy don't always use the
// same header text (e.g. "Bidding No." vs "bidding_no", "Premium ($)" vs
// "premium"). Normalise to a-z0-9 only and match against known aliases per
// field so either source parses correctly.
const HEADER_ALIASES: Record<
  (typeof REQUIRED_COLS)[number] | "bidding_no" | "bids_success" | "bids_received",
  string[]
> = {
  month: ["month"],
  bidding_no: ["biddingno", "biddingexerciseno", "exerciseno", "bidno"],
  vehicle_class: ["vehicleclass", "category", "coecategory", "vehiclecategory"],
  quota: ["quota", "coequota"],
  bids_success: ["bidssuccess", "successfulbids", "noofbidssuccess", "bidssuccessful"],
  bids_received: ["bidsreceived", "noofbidsreceived", "biddersreceived"],
  premium: ["premium", "premiumamt", "premiumsgd", "coepremium", "qp"],
};

function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveColumns(header: string[]): Partial<Record<keyof typeof HEADER_ALIASES, number>> {
  const normalised = header.map(normaliseHeader);
  const idx: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {};
  for (const field of Object.keys(HEADER_ALIASES) as (keyof typeof HEADER_ALIASES)[]) {
    const aliases = HEADER_ALIASES[field];
    const pos = normalised.findIndex((h) => aliases.includes(h));
    if (pos >= 0) idx[field] = pos;
  }
  return idx;
}

// Accepts "YYYY-MM", "YYYY-M", "YYYY/MM", or "Mon-YY" / "Mon-YYYY" (e.g. "Jun-26",
// "Jun-2026") and normalises to "YYYY-MM".
function normaliseMonth(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;

  const MONTHS: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  m = s.match(/^([a-zA-Z]{3,})[-\s](\d{2,4})$/);
  if (m) {
    const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (!mon) return null;
    const yearRaw = m[2];
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    return `${year}-${mon}`;
  }
  return null;
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
  const header = parseCsvLine(lines[0]);
  const idx = resolveColumns(header);
  for (const req of REQUIRED_COLS) {
    if (idx[req] === undefined) {
      errors.push(`Missing required column matching "${req}" (saw headers: ${header.join(", ")})`);
    }
  }
  if (errors.length) return { records: [], errors };

  const records: CoeRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const rawMonth = cells[idx.month!] ?? "";
    const month = normaliseMonth(rawMonth);
    if (!month) {
      errors.push(`Row ${i + 1}: invalid month "${rawMonth}" (expected YYYY-MM or Mon-YY)`);
      continue;
    }
    const num = (s: string | undefined): number => {
      if (!s) return 0;
      const n = Number(s.replace(/[$,]/g, ""));
      return Number.isFinite(n) ? n : 0;
    };
    records.push({
      month,
      bidding_no: idx.bidding_no !== undefined ? num(cells[idx.bidding_no]) : 0,
      vehicle_class: cells[idx.vehicle_class!] ?? "",
      quota: num(cells[idx.quota!]),
      bids_success: idx.bids_success !== undefined ? num(cells[idx.bids_success]) : 0,
      bids_received: idx.bids_received !== undefined ? num(cells[idx.bids_received]) : 0,
      premium: num(cells[idx.premium!]),
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
