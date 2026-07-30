// Modular soil scoring engine.
// Each factor is an independent, replaceable scorer: swap in a better model by
// editing one function — weights and aggregation stay untouched.

import type {
  DataSource,
  FactorScore,
  HealthCategory,
  HealthResult,
  SoilMeasurements,
  SoilTexture,
} from "./types";

export const TEXTURE_META: Record<SoilTexture, { label: string; retention: number; drainage: number }> = {
  sandy: { label: "Sandy", retention: 0.2, drainage: 1.0 },
  loamy_sand: { label: "Loamy sand", retention: 0.35, drainage: 0.9 },
  sandy_loam: { label: "Sandy loam", retention: 0.6, drainage: 0.8 },
  loam: { label: "Loam", retention: 0.95, drainage: 0.7 },
  silt_loam: { label: "Silt loam", retention: 0.9, drainage: 0.6 },
  clay_loam: { label: "Clay loam", retention: 0.8, drainage: 0.4 },
  clay: { label: "Clay", retention: 0.7, drainage: 0.2 },
};

export const IDEAL = {
  ph: [6.0, 7.5] as const,
  nitrogen: [280, 560] as const, // kg/ha, ICAR available-N classes
  phosphorus: [11, 25] as const, // kg/ha available P
  potassium: [120, 280] as const, // kg/ha available K
  organicCarbon: [0.75, 1.5] as const, // %
  moisture: [18, 35] as const, // % volumetric
  ec: [0, 1.0] as const, // dS/m
  waterHoldingCapacity: [35, 60] as const, // %
  temperature: [15, 32] as const, // °C
};

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** Score a value that has an optimal band; falls off linearly outside it. */
function bandScore(value: number, lo: number, hi: number, tolerance: number): number {
  if (value >= lo && value <= hi) return 100;
  const distance = value < lo ? lo - value : value - hi;
  return clamp(100 - (distance / tolerance) * 100);
}

function statusFor(value: number, lo: number, hi: number, score: number): FactorScore["status"] {
  if (score >= 85) return "optimal";
  if (score >= 65) return "acceptable";
  if (score < 30) return "critical";
  return value < lo ? "low" : "high";
}

function scorePh(m: SoilMeasurements): FactorScore {
  const [lo, hi] = IDEAL.ph;
  const score = bandScore(m.ph, lo, hi, 2.2);
  const acidic = m.ph < lo;
  return {
    key: "ph",
    label: "pH",
    value: m.ph.toFixed(1),
    score,
    weight: 0.2,
    status: statusFor(m.ph, lo, hi, score),
    reasoning: acidic
      ? "Below pH 6.0 the soil solution carries free aluminium and manganese, which damage root tips, while phosphate binds into insoluble iron/aluminium phosphates."
      : m.ph > hi
        ? "Above pH 7.5 phosphate precipitates as calcium phosphate and micronutrients (Fe, Zn, Mn, B) drop below plant-available concentrations."
        : "pH sits in the 6.0–7.5 window where nitrogen, phosphorus and potassium are all simultaneously plant-available and rhizobia stay active.",
    impact: acidic
      ? "Expect 15–30% lower phosphorus uptake and stunted root systems in most cereals."
      : m.ph > hi
        ? "Expect interveinal chlorosis and 10–25% yield loss in zinc-sensitive crops such as rice and wheat."
        : "Nutrient uptake efficiency is near its practical maximum.",
    action: acidic
      ? "Apply agricultural lime at 2–4 quintal/acre 3–4 weeks before sowing, then re-test."
      : m.ph > hi
        ? "Apply gypsum at 2 quintal/acre and incorporate organic matter; use acidifying fertilisers such as ammonium sulphate."
        : "Maintain with balanced organic inputs; re-test every 6 months.",
  };
}

function nutrientFactor(
  key: string,
  label: string,
  value: number,
  lo: number,
  hi: number,
  tolerance: number,
  weight: number,
  unit: string,
  copy: { low: string; high: string; ok: string; impactLow: string; impactHigh: string; actionLow: string; actionHigh: string },
): FactorScore {
  const score = bandScore(value, lo, hi, tolerance);
  const status = statusFor(value, lo, hi, score);
  const low = value < lo;
  return {
    key,
    label,
    value: `${Math.round(value)} ${unit}`,
    score,
    weight,
    status,
    reasoning: low ? copy.low : value > hi ? copy.high : copy.ok,
    impact: low ? copy.impactLow : value > hi ? copy.impactHigh : "Supply matches crop demand across the growth cycle.",
    action: low ? copy.actionLow : value > hi ? copy.actionHigh : "No corrective dose required this season.",
  };
}

function scoreNitrogen(m: SoilMeasurements): FactorScore {
  const [lo, hi] = IDEAL.nitrogen;
  return nutrientFactor("nitrogen", "Nitrogen (N)", m.nitrogen, lo, hi, 300, 0.16, "kg/ha", {
    low: "Available nitrogen below 280 kg/ha is the ICAR 'low' class — the soil cannot mineralise enough N to sustain vegetative growth without external supply.",
    high: "Above 560 kg/ha nitrogen drives excessive vegetative growth, delays flowering and leaches into groundwater as nitrate.",
    ok: "Available nitrogen sits in the ICAR 'medium-to-high' class, matching the uptake curve of most cereals.",
    impactLow: "Pale lower leaves, thin tillering and 20–35% yield reduction in cereals.",
    impactHigh: "Lodging risk, delayed maturity, higher pest pressure and wasted fertiliser spend.",
    actionLow: "Split-apply urea: 50% basal, 25% at tillering, 25% at panicle initiation; add 2 t/acre FYM to build the mineralisable pool.",
    actionHigh: "Skip basal urea this season; grow a heavy-feeding cereal to draw down the surplus.",
  });
}

function scorePhosphorus(m: SoilMeasurements): FactorScore {
  const [lo, hi] = IDEAL.phosphorus;
  return nutrientFactor("phosphorus", "Phosphorus (P)", m.phosphorus, lo, hi, 22, 0.13, "kg/ha", {
    low: "Olsen-P below 11 kg/ha limits ATP formation and root proliferation, especially in the first 30 days after sowing.",
    high: "Phosphorus above 25 kg/ha antagonises zinc and iron uptake and offers no further yield response.",
    ok: "Phosphorus is in the medium-to-high availability class for the establishment phase.",
    impactLow: "Weak root systems, purple leaf tinge, poor grain filling — typically 10–20% yield loss.",
    impactHigh: "Induced zinc deficiency and wasted DAP expenditure.",
    actionLow: "Apply DAP or single super phosphate as a full basal dose in the root zone, plus PSB culture to unlock fixed P.",
    actionHigh: "Withhold phosphatic fertiliser for 1–2 seasons and monitor zinc.",
  });
}

function scorePotassium(m: SoilMeasurements): FactorScore {
  const [lo, hi] = IDEAL.potassium;
  return nutrientFactor("potassium", "Potassium (K)", m.potassium, lo, hi, 160, 0.12, "kg/ha", {
    low: "Available K below 120 kg/ha restricts stomatal regulation and phloem loading, so the crop loses its drought and disease buffer.",
    high: "Very high K competes with magnesium and calcium uptake at the root surface.",
    ok: "Potassium is adequate to run osmotic regulation and translocation through grain fill.",
    impactLow: "Leaf-margin scorching, lodging, poor grain weight and sharply higher drought damage.",
    impactHigh: "Possible magnesium deficiency in sandy soils; no yield gain from further K.",
    actionLow: "Apply muriate of potash in two splits (basal + flowering) and return crop residue instead of burning it.",
    actionHigh: "Stop potash application; monitor Mg and Ca.",
  });
}

function scoreOrganicCarbon(m: SoilMeasurements): FactorScore {
  const [lo, hi] = IDEAL.organicCarbon;
  const score = bandScore(m.organicCarbon, lo, hi, 0.8);
  return {
    key: "organicCarbon",
    label: "Organic carbon",
    value: `${m.organicCarbon.toFixed(2)} %`,
    score,
    weight: 0.18,
    status: statusFor(m.organicCarbon, lo, hi, score),
    reasoning:
      m.organicCarbon < lo
        ? "Organic carbon under 0.75% means a thin microbial food supply and weak aggregate stability, so the soil holds less water and mineralises less nitrogen each season."
        : "Organic carbon above 0.75% sustains microbial biomass, aggregate structure and a steady nitrogen mineralisation flow.",
    impact:
      m.organicCarbon < lo
        ? "Compaction, crusting after rain, higher irrigation frequency and permanent dependence on purchased fertiliser."
        : "Better infiltration, higher cation exchange capacity and 10–20% better fertiliser use efficiency.",
    action:
      m.organicCarbon < lo
        ? "Apply 2–3 t/acre well-rotted FYM or 1 t/acre vermicompost, and grow a green-manure legume (dhaincha/sunhemp) before the main crop."
        : "Maintain residue return and periodic compost application.",
  };
}

function scoreMoisture(m: SoilMeasurements): FactorScore {
  const [lo, hi] = IDEAL.moisture;
  const score = bandScore(m.moisture, lo, hi, 18);
  return {
    key: "moisture",
    label: "Moisture",
    value: `${Math.round(m.moisture)} %`,
    score,
    weight: 0.11,
    status: statusFor(m.moisture, lo, hi, score),
    reasoning:
      m.moisture < lo
        ? "Below roughly 18% volumetric moisture most field soils approach the permanent wilting point band, so nutrient mass-flow to the roots stalls."
        : m.moisture > hi
          ? "Above 35% the pore space is water-filled, oxygen diffusion collapses and roots shift to anaerobic respiration."
          : "Moisture is between field capacity and the refill point, which is where root water uptake is most efficient.",
    impact:
      m.moisture < lo
        ? "Nutrients present in the soil stay unavailable; applied urea will not dissolve or move."
        : m.moisture > hi
          ? "Denitrification losses, root rot risk and delayed field operations."
          : "Water and nutrient delivery to the root system is unconstrained.",
    action:
      m.moisture < lo
        ? "Irrigate to field capacity before the next fertiliser dose and mulch to cut evaporation."
        : m.moisture > hi
          ? "Open field drains, avoid the next irrigation and delay nitrogen application until the surface dries."
          : "Continue the current irrigation interval.",
  };
}

function scoreEc(m: SoilMeasurements): FactorScore {
  const score = m.ec <= 1 ? 100 : bandScore(m.ec, 0, 1, 3);
  return {
    key: "ec",
    label: "Electrical conductivity",
    value: `${m.ec.toFixed(2)} dS/m`,
    score,
    weight: 0.1,
    status: statusFor(m.ec, 0, 1, score),
    reasoning:
      m.ec > 1
        ? "EC above 1 dS/m indicates dissolved salts that lower the osmotic potential of the soil solution, so roots must spend energy to extract water."
        : "Salt concentration is non-saline; osmotic stress on roots is negligible.",
    impact:
      m.ec > 4
        ? "Strongly saline — germination failure and 25–50% yield loss in sensitive crops."
        : m.ec > 1
          ? "Mild salinity stress; sensitive crops such as pulses and vegetables will underperform."
          : "No salinity-linked yield penalty.",
    action:
      m.ec > 1
        ? "Leach with good-quality irrigation water, apply gypsum if sodium-dominated, and switch to salt-tolerant crops (barley, cotton, mustard) meanwhile."
        : "No salinity management needed.",
  };
}

function scoreTexture(m: SoilMeasurements): FactorScore {
  const meta = TEXTURE_META[m.texture];
  const score = Math.round(clamp(40 + meta.retention * 60));
  return {
    key: "texture",
    label: "Texture",
    value: meta.label,
    score,
    weight: 0.1,
    status: score >= 85 ? "optimal" : score >= 65 ? "acceptable" : "low",
    reasoning: `${meta.label} soils hold roughly ${Math.round(meta.retention * 100)}% of ideal plant-available water and drain at ${Math.round(meta.drainage * 100)}% of the sandy-soil rate, which sets both irrigation interval and nutrient leaching risk.`,
    impact:
      meta.retention < 0.5
        ? "Frequent short irrigations required; nitrogen and potassium leach quickly below the root zone."
        : meta.drainage < 0.35
          ? "Slow drainage after heavy rain; risk of temporary waterlogging and delayed sowing."
          : "Balanced water holding and aeration — the most forgiving texture class for mixed cropping.",
    action:
      meta.retention < 0.5
        ? "Build organic matter and use split fertiliser doses; drip irrigation pays back fastest on this texture."
        : meta.drainage < 0.35
          ? "Form raised beds or broad-bed furrows and add gypsum plus compost to open the structure."
          : "Maintain current structure with residue return.",
  };
}

export const SCORERS = [
  scorePh,
  scoreNitrogen,
  scorePhosphorus,
  scorePotassium,
  scoreOrganicCarbon,
  scoreMoisture,
  scoreEc,
  scoreTexture,
];

export function categorise(score: number): HealthCategory {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "moderate";
  if (score >= 30) return "poor";
  return "critical";
}

export const CATEGORY_META: Record<HealthCategory, { label: string; tone: "good" | "warn" | "bad" }> = {
  excellent: { label: "Excellent", tone: "good" },
  good: { label: "Good", tone: "good" },
  moderate: { label: "Moderate", tone: "warn" },
  poor: { label: "Poor", tone: "bad" },
  critical: { label: "Critical", tone: "bad" },
};

const CONFIDENCE: Record<DataSource, { value: number; basis: string; limitations: string[] }> = {
  lab_report: {
    value: 92,
    basis: "Derived from a laboratory soil health report, so nutrient values are analytically measured.",
    limitations: [
      "Accuracy depends on how representative the sampled cores were of the whole field.",
      "Values age — nitrogen and moisture change within weeks of sampling.",
    ],
  },
  manual: {
    value: 74,
    basis: "Derived from values you entered manually; the engine trusts them as given and cannot verify them.",
    limitations: [
      "No cross-check against a laboratory method is possible.",
      "Unit or transcription mistakes propagate directly into the score.",
    ],
  },
  photo_estimate: {
    value: 42,
    basis: "Derived largely from visible surface characteristics in a photograph. This is an estimate, not a measurement.",
    limitations: [
      "Photographs cannot measure pH, N, P, K, organic carbon or EC — those values are inferred ranges, not readings.",
      "Lighting, moisture at the time of the photo and surface residue all bias the estimate.",
      "A laboratory soil test remains required before any major fertiliser or lime investment.",
    ],
  },
};

export function sustainabilityScore(m: SoilMeasurements): number {
  const carbon = clamp((m.organicCarbon / 1.5) * 100);
  const salinity = clamp(100 - m.ec * 20);
  const structure = TEXTURE_META[m.texture].retention * 100;
  const balance = 100 - Math.min(60, Math.abs(m.nitrogen / 4 - m.potassium / 2) / 4);
  const water = clamp((m.waterHoldingCapacity / 55) * 100);
  return Math.round(carbon * 0.35 + salinity * 0.2 + structure * 0.15 + balance * 0.15 + water * 0.15);
}

export function evaluateSoil(m: SoilMeasurements, source: DataSource): HealthResult {
  const factors = SCORERS.map((fn) => fn(m));
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const score = Math.round(factors.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight);
  const conf = CONFIDENCE[source];
  return {
    score,
    category: categorise(score),
    factors,
    sustainability: sustainabilityScore(m),
    confidence: conf.value,
    confidenceBasis: conf.basis,
    limitations: conf.limitations,
  };
}
