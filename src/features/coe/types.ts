import type { CoeRecord } from "@/lib/coe.functions";

export type UploadMode = "replace" | "merge";

export interface UploadState {
  records: CoeRecord[];
  mode: UploadMode;
  filename: string;
  uploadedAt: number;
}

export interface ParseResult {
  records: CoeRecord[];
  errors: string[];
}

export type Metric = "premium" | "quota";
export type MetricSel = Metric | "both";
export type RangeKey = "2Y" | "5Y" | "10Y" | "ALL" | "CUSTOM";

export interface MonthlyPoint {
  month: string;
  ts: number;
  [key: string]: number | string;
}

export const CATEGORY_META: Record<string, { label: string; color: string; description: string }> =
  {
    "Category A": { label: "Cat A", color: "#60a5fa", description: "Cars ≤1600cc & ≤130bhp" },
    "Category B": { label: "Cat B", color: "#34d399", description: "Cars >1600cc or >130bhp" },
    "Category C": { label: "Cat C", color: "#fbbf24", description: "Goods vehicles & buses" },
    "Category D": { label: "Cat D", color: "#f472b6", description: "Motorcycles" },
    "Category E": { label: "Cat E", color: "#f87171", description: "Open category" },
  };
