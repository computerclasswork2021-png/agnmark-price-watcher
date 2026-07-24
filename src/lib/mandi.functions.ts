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
  min_price: z.string().optional(),
  max_price: z.string().optional(),
  modal_price: z.string().optional(),
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

const BASE = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

const cap = (s: string) =>
  s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

function parseRecords(raw: unknown[]): MandiRecord[] {
  return raw
    .map((r) => RecordSchema.safeParse(r))
    .filter((r): r is { success: true; data: z.infer<typeof RecordSchema> } => r.success)
    .map((r) => ({
      state: r.data.state ?? "",
      district: r.data.district ?? "",
      market: r.data.market ?? "",
      commodity: r.data.commodity ?? "",
      variety: r.data.variety ?? "",
      grade: r.data.grade ?? "",
      arrivalDate: r.data.arrival_date ?? "",
      minPrice: Number(r.data.min_price ?? 0) || 0,
      maxPrice: Number(r.data.max_price ?? 0) || 0,
      modalPrice: Number(r.data.modal_price ?? 0) || 0,
    }))
    .filter((r) => r.modalPrice > 0);
}

async function tryFetch(key: string, filters: Record<string, string>, limit: number): Promise<MandiRecord[]> {
  const params = new URLSearchParams({ "api-key": key, format: "json", limit: String(limit) });
  for (const [k, v] of Object.entries(filters)) params.set(`filters[${k}]`, v);
  const res = await fetch(`${BASE}?${params.toString()}`);
  if (!res.ok) return [];
  const payload = await res.json().catch(() => null);
  const raw = Array.isArray(payload?.records) ? payload.records : [];
  return parseRecords(raw);
}

export const fetchMandiPrices = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }): Promise<{
    records: MandiRecord[];
    source: string;
    fetchedAt: string;
    fallbackUsed: "none" | "district-dropped" | "state-dropped";
  }> => {
    const key = process.env.DATA_GOV_IN_API_KEY;
    if (!key) throw new Error("DATA_GOV_IN_API_KEY not configured");

    const crop = cap(data.crop);
    const state = cap(data.state);

    // Tier 1: crop + state + district
    if (data.district) {
      const r1 = await tryFetch(
        key,
        { commodity: crop, "state.keyword": state, district: cap(data.district) },
        data.limit,
      );
      if (r1.length) return { records: r1, source: "AGMARKNET (state+district)", fetchedAt: new Date().toISOString(), fallbackUsed: "none" };
    }

    // Tier 2: crop + state
    const r2 = await tryFetch(key, { commodity: crop, "state.keyword": state }, data.limit);
    if (r2.length) return { records: r2, source: "AGMARKNET (state, most recent)", fetchedAt: new Date().toISOString(), fallbackUsed: data.district ? "district-dropped" : "none" };

    // Tier 3: crop only (nationwide most recent)
    const r3 = await tryFetch(key, { commodity: crop }, data.limit);
    return {
      records: r3,
      source: "AGMARKNET (nationwide, most recent)",
      fetchedAt: new Date().toISOString(),
      fallbackUsed: "state-dropped",
    };
  });
