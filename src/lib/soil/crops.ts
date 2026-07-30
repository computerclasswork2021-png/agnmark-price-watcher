import type { CropFit, SoilMeasurements, Season, SoilTexture } from "./types";
import { TEXTURE_META } from "./scoring";

interface CropSpec {
  name: string;
  ph: [number, number];
  n: number; // kg/ha demand class midpoint
  p: number;
  k: number;
  water: CropFit["waterRequirement"];
  ecTolerance: number; // dS/m
  textures: SoilTexture[];
  baseYield: number; // t/ha at ideal conditions
  difficulty: CropFit["difficulty"];
  seasons: Season[];
  note: string;
}

export const CROPS: CropSpec[] = [
  {
    name: "Rice",
    ph: [5.5, 7.0],
    n: 480,
    p: 20,
    k: 200,
    water: "very_high",
    ecTolerance: 3,
    textures: ["clay", "clay_loam", "silt_loam"],
    baseYield: 5.5,
    difficulty: "moderate",
    seasons: ["kharif"],
    note: "Puddled rice needs a slow-draining subsoil to hold standing water.",
  },
  {
    name: "Wheat",
    ph: [6.0, 7.5],
    n: 420,
    p: 22,
    k: 180,
    water: "medium",
    ecTolerance: 4,
    textures: ["loam", "clay_loam", "silt_loam", "sandy_loam"],
    baseYield: 4.5,
    difficulty: "easy",
    seasons: ["rabi"],
    note: "Wheat rewards well-structured loam with good winter moisture.",
  },
  {
    name: "Maize",
    ph: [5.8, 7.5],
    n: 450,
    p: 24,
    k: 220,
    water: "medium",
    ecTolerance: 2.5,
    textures: ["loam", "sandy_loam", "silt_loam"],
    baseYield: 6.0,
    difficulty: "easy",
    seasons: ["kharif", "rabi"],
    note: "Maize is highly responsive to nitrogen but intolerant of waterlogging.",
  },
  {
    name: "Cotton",
    ph: [6.0, 8.0],
    n: 380,
    p: 18,
    k: 240,
    water: "medium",
    ecTolerance: 6,
    textures: ["clay", "clay_loam", "loam"],
    baseYield: 2.2,
    difficulty: "hard",
    seasons: ["kharif"],
    note: "Deep black cotton soils buffer the long 180-day season.",
  },
  {
    name: "Groundnut",
    ph: [6.0, 7.5],
    n: 200,
    p: 25,
    k: 150,
    water: "low",
    ecTolerance: 2,
    textures: ["sandy_loam", "loamy_sand", "loam"],
    baseYield: 2.5,
    difficulty: "moderate",
    seasons: ["kharif", "zaid"],
    note: "Pegs need a loose, free-draining surface to penetrate.",
  },
  {
    name: "Sugarcane",
    ph: [6.0, 7.8],
    n: 560,
    p: 28,
    k: 300,
    water: "very_high",
    ecTolerance: 3,
    textures: ["clay_loam", "loam", "silt_loam"],
    baseYield: 80,
    difficulty: "hard",
    seasons: ["perennial"],
    note: "A 12-month crop with the highest nutrient and water draw of the set.",
  },
  {
    name: "Mustard",
    ph: [6.0, 8.0],
    n: 300,
    p: 20,
    k: 160,
    water: "low",
    ecTolerance: 5,
    textures: ["loam", "sandy_loam", "clay_loam"],
    baseYield: 1.8,
    difficulty: "easy",
    seasons: ["rabi"],
    note: "Tolerates mild salinity and low rainfall better than wheat.",
  },
  {
    name: "Millets (Bajra/Ragi)",
    ph: [5.5, 8.2],
    n: 220,
    p: 14,
    k: 120,
    water: "low",
    ecTolerance: 6,
    textures: ["sandy", "loamy_sand", "sandy_loam", "loam"],
    baseYield: 2.0,
    difficulty: "easy",
    seasons: ["kharif", "zaid"],
    note: "The safest choice on poor, shallow or saline land.",
  },
  {
    name: "Vegetables (Tomato/Brinjal)",
    ph: [6.0, 7.0],
    n: 400,
    p: 30,
    k: 260,
    water: "high",
    ecTolerance: 2,
    textures: ["loam", "sandy_loam", "silt_loam"],
    baseYield: 25,
    difficulty: "hard",
    seasons: ["rabi", "zaid", "kharif"],
    note: "High value but unforgiving of salinity and erratic moisture.",
  },
  {
    name: "Pulses (Gram/Moong)",
    ph: [6.0, 7.8],
    n: 120,
    p: 24,
    k: 140,
    water: "low",
    ecTolerance: 2,
    textures: ["loam", "sandy_loam", "clay_loam"],
    baseYield: 1.4,
    difficulty: "easy",
    seasons: ["rabi", "zaid"],
    note: "Fixes its own nitrogen and rebuilds soil for the next cereal.",
  },
];

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

function nutrientFit(available: number, demand: number): number {
  const ratio = available / demand;
  if (ratio >= 0.9) return 100;
  return clamp(ratio * 111);
}

export function scoreCrop(spec: CropSpec, m: SoilMeasurements, season?: Season): CropFit {
  const reasons: string[] = [];

  const phMid = (spec.ph[0] + spec.ph[1]) / 2;
  const phFit =
    m.ph >= spec.ph[0] && m.ph <= spec.ph[1] ? 100 : clamp(100 - Math.abs(m.ph - phMid) * 35);
  reasons.push(
    phFit >= 90
      ? `pH ${m.ph.toFixed(1)} sits inside this crop's preferred ${spec.ph[0]}–${spec.ph[1]} band.`
      : `pH ${m.ph.toFixed(1)} is outside the preferred ${spec.ph[0]}–${spec.ph[1]} band, which limits nutrient uptake for this crop.`,
  );

  const nFit = nutrientFit(m.nitrogen, spec.n);
  const pFit = nutrientFit(m.phosphorus, spec.p);
  const kFit = nutrientFit(m.potassium, spec.k);
  const weakest = [
    ["nitrogen", nFit],
    ["phosphorus", pFit],
    ["potassium", kFit],
  ].sort((a, b) => (a[1] as number) - (b[1] as number))[0];
  if ((weakest[1] as number) < 80) {
    reasons.push(
      `Available ${weakest[0]} covers only part of this crop's seasonal demand — a corrective dose is required.`,
    );
  } else {
    reasons.push("Current N, P and K levels broadly cover this crop's seasonal demand.");
  }

  const textureFit = spec.textures.includes(m.texture) ? 100 : 55;
  reasons.push(
    textureFit === 100
      ? `${TEXTURE_META[m.texture].label} texture suits this crop's rooting and drainage needs.`
      : `${TEXTURE_META[m.texture].label} texture is not this crop's preferred class; expect extra management.`,
  );

  const ecFit = m.ec <= spec.ecTolerance ? 100 : clamp(100 - (m.ec - spec.ecTolerance) * 30);
  if (ecFit < 90)
    reasons.push(
      `Salinity of ${m.ec.toFixed(2)} dS/m exceeds this crop's tolerance of ${spec.ecTolerance} dS/m.`,
    );

  const ocFit = clamp((m.organicCarbon / 0.9) * 100);
  if (ocFit < 70)
    reasons.push("Low organic carbon will cap the yield response even if fertiliser is applied.");

  const seasonFit = !season || spec.seasons.includes(season) ? 1 : 0.72;
  if (seasonFit < 1)
    reasons.push(`This crop is not typically grown in the selected ${season} season.`);

  const suitability = Math.round(
    (phFit * 0.22 +
      nFit * 0.14 +
      pFit * 0.11 +
      kFit * 0.11 +
      textureFit * 0.18 +
      ecFit * 0.14 +
      ocFit * 0.1) *
      seasonFit,
  );

  const yieldPotential = (
    spec.baseYield *
    (suitability / 100) *
    (0.75 + (m.organicCarbon / 1.5) * 0.25)
  ).toFixed(spec.baseYield > 10 ? 0 : 1);

  return {
    crop: spec.name,
    suitability,
    yieldPotential: `${yieldPotential} t/ha`,
    waterRequirement: spec.water,
    difficulty: spec.difficulty,
    reasons: [...reasons, spec.note],
  };
}

export function rankCrops(m: SoilMeasurements, season?: Season): CropFit[] {
  return CROPS.map((c) => scoreCrop(c, m, season)).sort((a, b) => b.suitability - a.suitability);
}

export function yieldForCrop(cropName: string, m: SoilMeasurements, season?: Season): number {
  const spec = CROPS.find((c) => c.name === cropName) ?? CROPS[1]!;
  return Number(scoreCrop(spec, m, season).yieldPotential.replace(" t/ha", ""));
}

export function irrigationAdvice(m: SoilMeasurements, top: CropFit | undefined): string {
  const meta = TEXTURE_META[m.texture];
  const interval =
    meta.retention < 0.45
      ? "every 4–5 days"
      : meta.retention < 0.8
        ? "every 7–9 days"
        : "every 10–12 days";
  const method =
    meta.retention < 0.5
      ? "drip or sprinkler"
      : m.ec > 2
        ? "flood with a leaching fraction"
        : "furrow or alternate-furrow";
  const moistureNote =
    m.moisture < 18
      ? "The profile is currently below the refill point — irrigate before the next fertiliser dose."
      : m.moisture > 35
        ? "The profile is near saturation — skip the next irrigation and open drains."
        : "The profile is between field capacity and refill point; hold the current schedule.";
  return `Irrigate ${interval} using ${method}${top ? ` for ${top.crop}` : ""}. ${moistureNote}`;
}
