// Lightweight local profile store. Cloud auth + persisted profile can layer on later
// without breaking this contract.
import { useEffect, useState } from "react";

export type Language = "en" | "hi";

export type StorageType = "none" | "own_shed" | "cold_storage" | "warehouse" | "cooperative";
export type TransportType =
  | "none"
  | "bicycle"
  | "motorcycle"
  | "tractor"
  | "pickup"
  | "mini_truck"
  | "truck";
export type IrrigationType = "rainfed" | "canal" | "borewell" | "drip" | "sprinkler";
export type IncomeTier = "low" | "middle" | "high";

export interface FarmProfile {
  farmerName: string;
  language: Language;
  incomeTier: IncomeTier;
  annualIncomeRupees?: number;
  state: string;
  district: string;
  village: string;
  farmSizeAcres: number;
  crop: string;
  storageType: StorageType;
  storageDurationDays: number;
  storageCapacityQuintals: number;
  transportType: TransportType;
  transportCostPerKm: number;
  maxTransportKm: number;
  irrigation: IrrigationType;
  lat?: number;
  lon?: number;
  createdAt: string;
}

const KEY = "predi-farm-x:profile";

export function loadProfile(): FarmProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as FarmProfile;
    // migrate old profiles missing incomeTier
    if (!p.incomeTier) p.incomeTier = "middle";
    return p;
  } catch {
    return null;
  }
}

export function saveProfile(p: FarmProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new Event("predi-farm-x:profile-change"));
}

export function clearProfile() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("predi-farm-x:profile-change"));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export function useProfile() {
  const [profile, setProfile] = useState<FarmProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setProfile(loadProfile());
    setHydrated(true);
    const refresh = () => setProfile(loadProfile());
    window.addEventListener("predi-farm-x:profile-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("predi-farm-x:profile-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return {
    profile,
    hydrated,
    update: (p: FarmProfile) => {
      saveProfile(p);
      setProfile(p);
    },
    clear: () => {
      clearProfile();
      setProfile(null);
    },
  };
}
