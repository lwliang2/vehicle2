import { createServerFn } from "@tanstack/react-start";
import { LIVE_COE_CSV_TEXT, LIVE_COE_UPDATED_AT } from "@/data/coe-live";
import { HISTORICAL_COE_CSV_TEXT } from "@/data/coe-historical";
import { mergeRecords, parseCoeCsv } from "@/features/coe/csv";

export interface CoeRecord {
  month: string;
  bidding_no: number;
  vehicle_class: string;
  quota: number;
  bids_success: number;
  bids_received: number;
  premium: number;
}

interface DatastoreResponse {
  success: boolean;
  result?: {
    records: Array<Record<string, string | number>>;
    total: number;
  };
}

const DEFAULT_RESOURCE_ID = "d_69b3380ad7e51aff3a7dcc84eba52b8a";

// Parsed once — this file is static and doesn't change between requests.
const { records: historicalRecords, errors: historicalErrors } =
  parseCoeCsv(HISTORICAL_COE_CSV_TEXT);
if (historicalErrors.length) {
  console.error("HISTORICAL_COE_CSV_TEXT failed to parse:", historicalErrors);
}

function toNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function fetchFromDataGovSg(): Promise<{ records: CoeRecord[]; source: string }> {
  const resourceId = process.env.COE_RESOURCE_ID ?? DEFAULT_RESOURCE_ID;
  const base = "https://data.gov.sg/api/action/datastore_search";
  const limit = 5000;
  let offset = 0;
  const all: Array<Record<string, string | number>> = [];

  while (true) {
    const url = `${base}?resource_id=${resourceId}&limit=${limit}&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`data.gov.sg responded ${res.status}`);
    }
    const json = (await res.json()) as DatastoreResponse;
    if (!json.success || !json.result) {
      throw new Error("data.gov.sg returned an unexpected payload");
    }
    const batch = json.result.records;
    all.push(...batch);
    if (batch.length < limit || all.length >= json.result.total) break;
    offset += limit;
    if (offset > 50000) break;
  }

  const records: CoeRecord[] = all.map((raw) => ({
    month: String(raw.month ?? ""),
    bidding_no: toNumber(raw.bidding_no),
    vehicle_class: String(raw.vehicle_class ?? ""),
    quota: toNumber(raw.quota),
    bids_success: toNumber(raw.bids_success),
    bids_received: toNumber(raw.bids_received),
    premium: toNumber(raw.premium ?? raw.premium_ ?? raw.premium_amt),
  }));

  return { records, source: `data.gov.sg resource ${resourceId}` };
}

export const fetchCoeResults = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ records: CoeRecord[]; source: string; fetchedAt: string }> => {
    // Primary source: the monthly-synced LTA Datamall CSV, committed into the
    // repo by .github/workflows/sync-lta-data.yml and parsed here with the
    // same parser used for manual "Upload CSV" overrides.
    if (LIVE_COE_CSV_TEXT) {
      const { records, errors } = parseCoeCsv(LIVE_COE_CSV_TEXT);
      if (records.length > 0) {
        return {
          records: mergeRecords(historicalRecords, records),
          source: "LTA Datamall — COE Bidding Results (monthly auto-sync + 1990-2009 historical)",
          fetchedAt: LIVE_COE_UPDATED_AT ?? new Date().toISOString(),
        };
      }
      console.error("LIVE_COE_CSV_TEXT failed to parse, falling back to data.gov.sg:", errors);
    }

    // Fallback: live fetch from data.gov.sg — used before the first sync
    // run, or if the synced CSV fails to parse (e.g. LTA changed the format).
    const { records, source } = await fetchFromDataGovSg();
    return {
      records: mergeRecords(historicalRecords, records),
      source: `${source} + 1990-2009 historical`,
      fetchedAt: new Date().toISOString(),
    };
  },
);
