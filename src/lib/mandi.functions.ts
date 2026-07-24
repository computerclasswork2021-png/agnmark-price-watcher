import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  crop: z.string().min(1),
  state: z.string().min(1),
  district: z.string().optional().default(""),
  limit: z.number().int().min(1).max(500).default(100),
});

const RecordSchema = z.object({
  state: z.string().optional(),
  district: z.string().optional(),
  market: z.string().optional(),
  commodity: z.string().optional(),
  variety: z.string().optional(),
  grade: z.string().optional(),
  arrival_date: z.string().optional(),
  min_price: z.union([z.string(), z.number()]).optional(),
  max_price: z.union([z.string(), z.number()]).optional(),
  modal_price: z.union([z.string(), z.number()]).optional(),
});

export type MandiRecord = {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  arrivalDate: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
};

// AGMARKNET daily mandi prices (data.gov.in)
const BASE = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

const cap = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

// AGMARKNET stores arrival_date as "DD/MM/YYYY". Parse into a Date for sorting.
function parseArrivalDate(s: string): number {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return 0;
  return new Date(`${m[3]}-${m[2]}-${m[1]}`).getTime();
}

function parseRecords(raw: unknown[]): MandiRecord[] {
  return raw
    .map((r) => RecordSchema.safeParse(r))
    .filter((r): r is { success: true; data: z.infer<typeof RecordSchema> } => r.success)
    .map((r) => ({
      state: String(r.data.state ?? ""),
      district: String(r.data.district ?? ""),
      market: String(r.data.market ?? ""),
      commodity: String(r.data.commodity ?? ""),
      variety: String(r.data.variety ?? ""),
      grade: String(r.data.grade ?? ""),
      arrivalDate: String(r.data.arrival_date ?? ""),
      minPrice: Number(r.data.min_price ?? 0) || 0,
      maxPrice: Number(r.data.max_price ?? 0) || 0,
      modalPrice: Number(r.data.modal_price ?? 0) || 0,
    }))
    .filter((r) => r.modalPrice > 0)
    .sort((a, b) => parseArrivalDate(b.arrivalDate) - parseArrivalDate(a.arrivalDate));
}

async function tryFetch(
  key: string,
  filters: Record<string, string>,
  limit: number,
): Promise<MandiRecord[]> {
  const params = new URLSearchParams({
    "api-key": key,
    format: "json",
    limit: String(limit),
    offset: "0",
  });
  for (const [k, v] of Object.entries(filters)) {
    if (v) params.set(`filters[${k}]`, v);
  }
  const url = `${BASE}?${params.toString()}`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) {
      console.error("[mandi] agmarknet non-ok", res.status, await res.text().catch(() => ""));
      return [];
    }
    const payload = (await res.json().catch(() => null)) as { records?: unknown[] } | null;
    const raw = Array.isArray(payload?.records) ? payload!.records! : [];
    return parseRecords(raw);
  } catch (err) {
    console.error("[mandi] agmarknet fetch failed", err);
    return [];
  }
}

// Commodity aliases → AGMARKNET's canonical spelling.
const COMMODITY_ALIASES: Record<string, string> = {
  paddy: "Paddy(Dhan)(Common)",
  "paddy(dhan)": "Paddy(Dhan)(Common)",
  rice: "Rice",
  wheat: "Wheat",
  maize: "Maize",
  corn: "Maize",
  bajra: "Bajra(Pearl Millet/Cumbu)",
  jowar: "Jowar(Sorghum)",
  ragi: "Ragi (Finger Millet)",
  soybean: "Soyabean",
  soyabean: "Soyabean",
  groundnut: "Groundnut",
  mustard: "Mustard",
  cotton: "Cotton",
  sugarcane: "Sugarcane",
  onion: "Onion",
  potato: "Potato",
  tomato: "Tomato",
  turmeric: "Turmeric",
  chilli: "Green Chilli",
  "green chilli": "Green Chilli",
  "red chilli": "Dry Chillies",
  gram: "Bengal Gram(Gram)(Whole)",
  chana: "Bengal Gram(Gram)(Whole)",
  arhar: "Arhar (Tur/Red Gram)(Whole)",
  tur: "Arhar (Tur/Red Gram)(Whole)",
  moong: "Green Gram (Moong)(Whole)",
  urad: "Black Gram (Urd Beans)(Whole)",
  banana: "Banana",
  apple: "Apple",
  mango: "Mango",
  garlic: "Garlic",
  ginger: "Ginger(Green)",
};

function normalizeCommodity(input: string): string {
  const k = input.trim().toLowerCase();
  return COMMODITY_ALIASES[k] ?? cap(input);
}

export const fetchMandiPrices = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }): Promise<{
    records: MandiRecord[];
    source: string;
    fetchedAt: string;
    fallbackUsed: "none" | "district-dropped" | "state-dropped" | "commodity-broadened";
  }> => {
    const key = process.env.DATA_GOV_IN_API_KEY;
    if (!key) {
      throw new Error(
        "AGMARKNET API key not configured. Add DATA_GOV_IN_API_KEY in project secrets (get one at data.gov.in).",
      );
    }

    const commodity = normalizeCommodity(data.crop);
    const state = cap(data.state);
    const district = data.district ? cap(data.district) : "";
    const now = new Date().toISOString();

    // Tier 1: commodity + state + district
    if (district) {
      const r1 = await tryFetch(key, { commodity, state, district }, data.limit);
      if (r1.length)
        return {
          records: r1,
          source: `AGMARKNET · ${commodity} · ${district}, ${state}`,
          fetchedAt: now,
          fallbackUsed: "none",
        };
    }

    // Tier 2: commodity + state
    const r2 = await tryFetch(key, { commodity, state }, data.limit);
    if (r2.length)
      return {
        records: r2,
        source: `AGMARKNET · ${commodity} · ${state} (most recent)`,
        fetchedAt: now,
        fallbackUsed: district ? "district-dropped" : "none",
      };

    // Tier 3: commodity only (nationwide most recent)
    const r3 = await tryFetch(key, { commodity }, data.limit);
    if (r3.length)
      return {
        records: r3,
        source: `AGMARKNET · ${commodity} · nationwide (most recent)`,
        fetchedAt: now,
        fallbackUsed: "state-dropped",
      };

    // Tier 4: try the raw user string (in case alias mapping was wrong)
    const fallbackCommodity = cap(data.crop);
    if (fallbackCommodity !== commodity) {
      const r4 = await tryFetch(key, { commodity: fallbackCommodity }, data.limit);
      if (r4.length)
        return {
          records: r4,
          source: `AGMARKNET · ${fallbackCommodity} · nationwide`,
          fetchedAt: now,
          fallbackUsed: "commodity-broadened",
        };
    }

    return {
      records: [],
      source: `AGMARKNET · ${commodity}`,
      fetchedAt: now,
      fallbackUsed: "state-dropped",
    };
  });
