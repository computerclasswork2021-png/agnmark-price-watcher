// Persistence layer for soil records.
// Deliberately behind a repository interface: swapping localStorage for a
// Lovable Cloud table means re-implementing these five functions only.
import { useCallback, useEffect, useState } from "react";
import type { SoilMeasurements, SoilRecord } from "./types";

const KEY = "predi-farm-x:soil-records";
const EVENT = "predi-farm-x:soil-change";

export const DEFAULT_MEASUREMENTS: SoilMeasurements = {
  ph: 6.5,
  nitrogen: 260,
  phosphorus: 14,
  potassium: 180,
  organicCarbon: 0.52,
  moisture: 22,
  temperature: 26,
  ec: 0.65,
  texture: "loam",
  waterHoldingCapacity: 38,
  color: "brown",
  soilType: "alluvial",
};

export const FIELD_META: Record<
  keyof Pick<
    SoilMeasurements,
    | "ph"
    | "nitrogen"
    | "phosphorus"
    | "potassium"
    | "organicCarbon"
    | "moisture"
    | "temperature"
    | "ec"
    | "waterHoldingCapacity"
  >,
  {
    label: string;
    unit: string;
    min: number;
    max: number;
    step: number;
    typical: string;
    help: string;
  }
> = {
  ph: {
    label: "pH",
    unit: "",
    min: 3,
    max: 10,
    step: 0.1,
    typical: "6.0 – 7.5",
    help: "Acidity or alkalinity of the soil solution. Read straight from the pH row of your soil health card.",
  },
  nitrogen: {
    label: "Nitrogen (N)",
    unit: "kg/ha",
    min: 0,
    max: 900,
    step: 1,
    typical: "280 – 560",
    help: "Available nitrogen. Soil health cards print this as 'Available N' in kg/ha.",
  },
  phosphorus: {
    label: "Phosphorus (P)",
    unit: "kg/ha",
    min: 0,
    max: 120,
    step: 0.5,
    typical: "11 – 25",
    help: "Available (Olsen) phosphorus in kg/ha.",
  },
  potassium: {
    label: "Potassium (K)",
    unit: "kg/ha",
    min: 0,
    max: 900,
    step: 1,
    typical: "120 – 280",
    help: "Available potassium in kg/ha.",
  },
  organicCarbon: {
    label: "Organic carbon",
    unit: "%",
    min: 0,
    max: 4,
    step: 0.01,
    typical: "0.75 – 1.50",
    help: "Percentage organic carbon. Multiply organic matter % by 0.58 if only OM is given.",
  },
  moisture: {
    label: "Moisture",
    unit: "%",
    min: 0,
    max: 60,
    step: 1,
    typical: "18 – 35",
    help: "Volumetric moisture at the time of sampling. Estimate from a sensor or the feel-and-appearance method.",
  },
  temperature: {
    label: "Soil temperature",
    unit: "°C",
    min: 0,
    max: 55,
    step: 0.5,
    typical: "15 – 32",
    help: "Temperature at 10 cm depth, measured mid-morning.",
  },
  ec: {
    label: "Electrical conductivity",
    unit: "dS/m",
    min: 0,
    max: 20,
    step: 0.01,
    typical: "0 – 1.0",
    help: "Salt concentration. Above 1 dS/m indicates developing salinity.",
  },
  waterHoldingCapacity: {
    label: "Water holding capacity",
    unit: "%",
    min: 5,
    max: 80,
    step: 1,
    typical: "35 – 60",
    help: "Share of soil volume that holds plant-available water. Leave at the texture default if unknown.",
  },
};

function read(): SoilRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SoilRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(records: SoilRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(EVENT));
}

export function listRecords(): SoilRecord[] {
  return read().sort((a, b) => (a.context.testedOn < b.context.testedOn ? 1 : -1));
}

export function saveRecord(record: SoilRecord): SoilRecord {
  const all = read().filter((r) => r.id !== record.id);
  write([record, ...all]);
  return record;
}

export function deleteRecord(id: string) {
  write(read().filter((r) => r.id !== id));
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `soil_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useSoilRecords() {
  const [records, setRecords] = useState<SoilRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const refresh = () => setRecords(listRecords());
    refresh();
    setHydrated(true);
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const add = useCallback((r: SoilRecord) => {
    saveRecord(r);
    setRecords(listRecords());
  }, []);

  const remove = useCallback((id: string) => {
    deleteRecord(id);
    setRecords(listRecords());
  }, []);

  return { records, hydrated, add, remove };
}
