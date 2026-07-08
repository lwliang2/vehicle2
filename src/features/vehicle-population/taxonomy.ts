export interface SubCat {
  key: string;
  label: string;
}
export interface Group {
  key: string;
  label: string;
  color: string;
  subs: SubCat[];
}

export const GROUPS: Group[] = [
  {
    key: "Cars & Station-wagons",
    label: "Cars & Station-wagons",
    color: "#5b8cff",
    subs: [
      { key: "Private Cars", label: "Private Cars" },
      { key: "Company Cars", label: "Company Cars" },
      { key: "Tuition Cars", label: "Tuition Cars" },
      { key: "Private Hire (Self-Drive) Cars", label: "Private Hire (Self-Drive)" },
      { key: "Private Hire (Chauffeur) cars", label: "Private Hire (Chauffeur)" },
      { key: "Weekend/ Off peak cars", label: "Weekend / Off-peak" },
      { key: "Cars & Station-wagons (Tax)", label: "Tax-Exempt Cars" },
    ],
  },
  {
    key: "Taxis",
    label: "Taxis",
    color: "#f5a524",
    subs: [
      { key: "Public Taxis", label: "Public Taxis" },
      { key: "School Taxis", label: "School Taxis" },
    ],
  },
  {
    key: "Motorcycles and scooters",
    label: "Motorcycles & Scooters",
    color: "#28c79a",
    subs: [
      { key: "MOTORCYCLES & SCOOTERS", label: "Motorcycles & Scooters" },
      { key: "Motorcycles and scooters (Tax)", label: "Tax-Exempt Motorcycles" },
    ],
  },
  {
    key: "Goods and other vehicles",
    label: "Goods & Other Vehicles",
    color: "#a78bfa",
    subs: [
      { key: "Goods-cum-passenger Vehicles (GPVs)", label: "GPVs" },
      { key: "Light Goods Vehicles (LGVs)", label: "LGVs" },
      { key: "Heavy Goods Vehicles (HGVs)", label: "HGVs" },
      { key: "Very Heavy Goods Vehicles (VHGVs)", label: "VHGVs" },
      { key: "Others", label: "Others" },
      { key: "Goods and other vehicles (Tax)", label: "Tax-Exempt Goods" },
    ],
  },
  {
    key: "Buses",
    label: "Buses",
    color: "#ff6b6b",
    subs: [
      { key: "Omnibuses", label: "Omnibuses" },
      { key: "School Buses", label: "School Buses" },
      { key: "Private Buses", label: "Private Buses" },
      { key: "Private Hire Buses", label: "Private Hire Buses" },
      { key: "Excursion Buses", label: "Excursion Buses" },
      { key: "Buses (Tax)", label: "Tax-Exempt Buses" },
    ],
  },
];

export const ALL_SUB_KEYS = GROUPS.flatMap((g) => g.subs.map((s) => s.key));
export const GROUP_KEYS = GROUPS.map((g) => g.key);
export const SUB_TO_GROUP: Record<string, string> = {};
for (const g of GROUPS) for (const s of g.subs) SUB_TO_GROUP[s.key] = g.key;

function shadeColor(hex: string, pct: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const adj = (v: number) => Math.max(0, Math.min(255, Math.round(v + (pct / 100) * 255)));
  return `#${adj(r).toString(16).padStart(2, "0")}${adj(g).toString(16).padStart(2, "0")}${adj(b).toString(16).padStart(2, "0")}`;
}

export function subColor(groupKey: string, i: number, total: number): string {
  const base = GROUPS.find((g) => g.key === groupKey)?.color ?? "#5b8cff";
  // lighten stepping so subs share the group hue
  const shift = total <= 1 ? 0 : (i / (total - 1)) * 30 - 15;
  return shadeColor(base, shift);
}
