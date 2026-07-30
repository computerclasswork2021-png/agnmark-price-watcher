import type { SoilMeasurements } from "./types";
import { IDEAL, TEXTURE_META } from "./scoring";

export interface Intervention {
  id: string;
  label: string;
  group: "nutrient" | "amendment" | "water" | "management";
  unit: string;
  min: number;
  max: number;
  step: number;
  /** Neutral value — no change applied. */
  neutral: number;
  presets: { label: string; value: number }[];
  apply: (m: SoilMeasurements, v: number) => SoilMeasurements;
  explain: (v: number, before: SoilMeasurements, after: SoilMeasurements) => string | null;
}

const cp = (m: SoilMeasurements): SoilMeasurements => ({ ...m });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const d = (a: number, b: number, unit: string, digits = 1) =>
  `${a.toFixed(digits)}${unit} → ${b.toFixed(digits)}${unit}`;

export const INTERVENTIONS: Intervention[] = [
  {
    id: "nitrogen",
    label: "Adjust nitrogen",
    group: "nutrient",
    unit: "kg/ha",
    min: -150,
    max: 250,
    step: 10,
    neutral: 0,
    presets: [
      { label: "Increase N", value: 120 },
      { label: "Reduce N", value: -80 },
    ],
    apply: (m, v) => ({ ...cp(m), nitrogen: clamp(m.nitrogen + v, 0, 900) }),
    explain: (v, b, a) =>
      v === 0
        ? null
        : v > 0
          ? `Adding ${v} kg/ha of available nitrogen moves the soil from ${Math.round(b.nitrogen)} to ${Math.round(a.nitrogen)} kg/ha. Nitrogen is the limiting factor for chlorophyll and rubisco synthesis, so closing the gap toward the ${IDEAL.nitrogen[0]} kg/ha threshold lifts the nitrogen sub-score and the modelled yield. Above ${IDEAL.nitrogen[1]} kg/ha the score falls again because surplus nitrate leaches and causes lodging.`
          : `Reducing available nitrogen by ${Math.abs(v)} kg/ha (${Math.round(b.nitrogen)} → ${Math.round(a.nitrogen)}) lowers lodging and leaching risk. If this pushes the soil under ${IDEAL.nitrogen[0]} kg/ha the yield forecast drops, because the crop can no longer meet peak demand from soil supply alone.`,
  },
  {
    id: "phosphorus",
    label: "Increase phosphorus",
    group: "nutrient",
    unit: "kg/ha",
    min: 0,
    max: 40,
    step: 1,
    neutral: 0,
    presets: [{ label: "Basal DAP", value: 12 }],
    apply: (m, v) => ({ ...cp(m), phosphorus: clamp(m.phosphorus + v, 0, 120) }),
    explain: (v, b, a) =>
      v === 0
        ? null
        : `Phosphorus rises ${d(b.phosphorus, a.phosphorus, " kg/ha", 0)}. Phosphorus drives ATP transfer and root proliferation in the first 30 days. Gains stop once the soil passes ${IDEAL.phosphorus[1]} kg/ha, where extra P antagonises zinc uptake instead of adding yield.`,
  },
  {
    id: "potassium",
    label: "Increase potassium",
    group: "nutrient",
    unit: "kg/ha",
    min: 0,
    max: 200,
    step: 10,
    neutral: 0,
    presets: [{ label: "MOP split dose", value: 80 }],
    apply: (m, v) => ({ ...cp(m), potassium: clamp(m.potassium + v, 0, 900) }),
    explain: (v, b, a) =>
      v === 0
        ? null
        : `Potassium rises ${d(b.potassium, a.potassium, " kg/ha", 0)}. Potassium regulates stomatal behaviour and phloem loading, so this mainly improves drought buffering and grain weight rather than vegetative growth.`,
  },
  {
    id: "micronutrients",
    label: "Add micronutrients (Zn, B, Fe)",
    group: "nutrient",
    unit: "kg/acre ZnSO₄",
    min: 0,
    max: 25,
    step: 5,
    neutral: 0,
    presets: [{ label: "25 kg/acre zinc sulphate", value: 25 }],
    apply: (m, v) => (v === 0 ? cp(m) : { ...cp(m), ph: clamp(m.ph - v * 0.004, 3.5, 10) }),
    explain: (v) =>
      v === 0
        ? null
        : `Zinc sulphate at ${v} kg/acre corrects the interveinal chlorosis typical of high-pH soils and mildly acidifies the rhizosphere. It does not change N, P or K, so the headline health score barely moves — the benefit shows up as grain quality and reduced sterility, which the score cannot capture.`,
  },
  {
    id: "compost",
    label: "Add compost / FYM",
    group: "amendment",
    unit: "t/acre",
    min: 0,
    max: 6,
    step: 0.5,
    neutral: 0,
    presets: [
      { label: "2 t/acre FYM", value: 2 },
      { label: "4 t/acre heavy", value: 4 },
    ],
    apply: (m, v) => ({
      ...cp(m),
      organicCarbon: clamp(m.organicCarbon + v * 0.065, 0, 4),
      nitrogen: clamp(m.nitrogen + v * 22, 0, 900),
      potassium: clamp(m.potassium + v * 12, 0, 900),
      waterHoldingCapacity: clamp(m.waterHoldingCapacity + v * 1.6, 5, 80),
      ph: clamp(m.ph + (m.ph < 6.5 ? v * 0.05 : -v * 0.03), 3.5, 10),
    }),
    explain: (v, b, a) =>
      v === 0
        ? null
        : `${v} t/acre of compost raises organic carbon ${d(b.organicCarbon, a.organicCarbon, "%", 2)} and water holding capacity ${d(b.waterHoldingCapacity, a.waterHoldingCapacity, "%", 0)}. Compost carbon feeds the microbial biomass that glues aggregates together, which is why moisture retention and mineralised nitrogen (${Math.round(b.nitrogen)} → ${Math.round(a.nitrogen)} kg/ha) both rise. It also buffers pH toward neutral from either direction.`,
  },
  {
    id: "vermicompost",
    label: "Add vermicompost",
    group: "amendment",
    unit: "kg/acre",
    min: 0,
    max: 1200,
    step: 100,
    neutral: 0,
    presets: [{ label: "400 kg/acre", value: 400 }],
    apply: (m, v) => ({
      ...cp(m),
      organicCarbon: clamp(m.organicCarbon + (v / 1000) * 0.12, 0, 4),
      nitrogen: clamp(m.nitrogen + (v / 1000) * 40, 0, 900),
      phosphorus: clamp(m.phosphorus + (v / 1000) * 4, 0, 120),
    }),
    explain: (v, b, a) =>
      v === 0
        ? null
        : `${v} kg/acre of vermicompost lifts organic carbon ${d(b.organicCarbon, a.organicCarbon, "%", 2)}. Vermicompost is more humified than raw FYM, so a smaller weight delivers a faster carbon and nutrient response inside the same season.`,
  },
  {
    id: "lime",
    label: "Add lime",
    group: "amendment",
    unit: "quintal/acre",
    min: 0,
    max: 8,
    step: 0.5,
    neutral: 0,
    presets: [{ label: "2 qtl/acre", value: 2 }],
    apply: (m, v) => ({
      ...cp(m),
      ph: clamp(m.ph + v * 0.25, 3.5, 10),
      phosphorus: clamp(m.phosphorus + (m.ph < 6 ? v * 1.2 : 0), 0, 120),
    }),
    explain: (v, b, a) =>
      v === 0
        ? null
        : `Lime at ${v} quintal/acre shifts pH ${d(b.ph, a.ph, "", 2)}. Neutralising acidity precipitates toxic aluminium and releases phosphate previously locked as iron/aluminium phosphate, which is why available P also rises to ${a.phosphorus.toFixed(0)} kg/ha without any P fertiliser.`,
  },
  {
    id: "gypsum",
    label: "Add gypsum",
    group: "amendment",
    unit: "quintal/acre",
    min: 0,
    max: 8,
    step: 0.5,
    neutral: 0,
    presets: [{ label: "2 qtl/acre", value: 2 }],
    apply: (m, v) => ({
      ...cp(m),
      ph: clamp(m.ph - v * 0.12, 3.5, 10),
      ec: clamp(m.ec - v * 0.18, 0.05, 20),
    }),
    explain: (v, b, a) =>
      v === 0
        ? null
        : `Gypsum at ${v} quintal/acre lowers pH ${d(b.ph, a.ph, "", 2)} and EC ${d(b.ec, a.ec, " dS/m", 2)}. Calcium displaces sodium from the exchange complex; once displaced, sodium can be leached below the root zone, which is what actually reduces salinity.`,
  },
  {
    id: "chemical",
    label: "Apply chemical fertiliser (NPK complex)",
    group: "nutrient",
    unit: "kg/acre 10:26:26",
    min: 0,
    max: 200,
    step: 25,
    neutral: 0,
    presets: [{ label: "50 kg/acre", value: 50 }],
    apply: (m, v) => ({
      ...cp(m),
      nitrogen: clamp(m.nitrogen + v * 0.25, 0, 900),
      phosphorus: clamp(m.phosphorus + v * 0.16, 0, 120),
      potassium: clamp(m.potassium + v * 0.64, 0, 900),
      ec: clamp(m.ec + v * 0.002, 0.05, 20),
    }),
    explain: (v, b, a) =>
      v === 0
        ? null
        : `${v} kg/acre of 10:26:26 raises all three macronutrients at once (N ${Math.round(b.nitrogen)}→${Math.round(a.nitrogen)}, P ${b.phosphorus.toFixed(0)}→${a.phosphorus.toFixed(0)}, K ${Math.round(b.potassium)}→${Math.round(a.potassium)} kg/ha) but also adds soluble salts, nudging EC ${d(b.ec, a.ec, " dS/m", 2)}. On a soil already above 2 dS/m this trade-off can cost more than it gains.`,
  },
  {
    id: "bio",
    label: "Apply bio-fertiliser",
    group: "nutrient",
    unit: "kg/acre",
    min: 0,
    max: 6,
    step: 1,
    neutral: 0,
    presets: [{ label: "2 kg/acre culture", value: 2 }],
    apply: (m, v) => ({
      ...cp(m),
      nitrogen: clamp(m.nitrogen + v * 9, 0, 900),
      phosphorus: clamp(m.phosphorus + v * 1.1, 0, 120),
      organicCarbon: clamp(m.organicCarbon + v * 0.004, 0, 4),
    }),
    explain: (v, b, a) =>
      v === 0
        ? null
        : `Bio-fertiliser at ${v} kg/acre fixes atmospheric nitrogen and solubilises fixed phosphorus, giving N ${Math.round(b.nitrogen)}→${Math.round(a.nitrogen)} kg/ha with no salt load. The response depends on living soil carbon — on soils under 0.4% organic carbon the effect is roughly half of what is modelled here.`,
  },
  {
    id: "organic_matter",
    label: "Add organic matter (residue / green manure)",
    group: "amendment",
    unit: "t/acre",
    min: 0,
    max: 5,
    step: 0.5,
    neutral: 0,
    presets: [{ label: "Residue return 2 t", value: 2 }],
    apply: (m, v) => ({
      ...cp(m),
      organicCarbon: clamp(m.organicCarbon + v * 0.045, 0, 4),
      waterHoldingCapacity: clamp(m.waterHoldingCapacity + v * 1.2, 5, 80),
      moisture: clamp(m.moisture + v * 0.8, 0, 60),
    }),
    explain: (v, b, a) =>
      v === 0
        ? null
        : `Returning ${v} t/acre of residue instead of burning it raises organic carbon ${d(b.organicCarbon, a.organicCarbon, "%", 2)} and cuts evaporative loss, lifting stored moisture ${d(b.moisture, a.moisture, "%", 0)}. This is the cheapest carbon-building option available.`,
  },
  {
    id: "irrigation",
    label: "Adjust irrigation",
    group: "water",
    unit: "% moisture change",
    min: -15,
    max: 20,
    step: 1,
    neutral: 0,
    presets: [
      { label: "Improve irrigation", value: 10 },
      { label: "Reduce irrigation", value: -8 },
    ],
    apply: (m, v) => ({
      ...cp(m),
      moisture: clamp(m.moisture + v, 0, 60),
      ec: clamp(m.ec + (v > 0 ? -v * 0.02 : v * -0.03), 0.05, 20),
    }),
    explain: (v, b, a) =>
      v === 0
        ? null
        : v > 0
          ? `Extra irrigation raises stored moisture ${d(b.moisture, a.moisture, "%", 0)} and leaches a little salt (EC ${b.ec.toFixed(2)} → ${a.ec.toFixed(2)} dS/m). Nutrients move to the root by mass flow, so moisture in the 18–35% band is a precondition for any fertiliser to work. Past 35% the score drops because oxygen is displaced from the pore space.`
          : `Cutting irrigation drops moisture ${d(b.moisture, a.moisture, "%", 0)} and concentrates salts slightly. Useful on a waterlogged profile, harmful once the soil falls under 18%.`,
  },
  {
    id: "drainage",
    label: "Improve drainage",
    group: "water",
    unit: "level",
    min: 0,
    max: 3,
    step: 1,
    neutral: 0,
    presets: [{ label: "Field drains + raised beds", value: 2 }],
    apply: (m, v) => ({
      ...cp(m),
      moisture: clamp(m.moisture - v * 3, 0, 60),
      ec: clamp(m.ec - v * 0.12, 0.05, 20),
    }),
    explain: (v, b, a) =>
      v === 0
        ? null
        : `Drainage improvement level ${v} pulls excess water out of the profile (${d(b.moisture, a.moisture, "%", 0)}) and carries dissolved salts with it (EC ${d(b.ec, a.ec, " dS/m", 2)}). This only helps when the starting moisture is above field capacity; on a dry soil it makes matters worse.`,
  },
  {
    id: "water_availability",
    label: "Improve water availability (storage / mulch)",
    group: "water",
    unit: "% WHC gain",
    min: 0,
    max: 20,
    step: 1,
    neutral: 0,
    presets: [{ label: "Mulch + farm pond", value: 8 }],
    apply: (m, v) => ({
      ...cp(m),
      waterHoldingCapacity: clamp(m.waterHoldingCapacity + v, 5, 80),
      moisture: clamp(m.moisture + v * 0.35, 0, 60),
    }),
    explain: (v, b, a) =>
      v === 0
        ? null
        : `Mulching and on-farm water storage raise water holding capacity ${d(b.waterHoldingCapacity, a.waterHoldingCapacity, "%", 0)}. A larger buffer stretches the safe interval between irrigations and protects the crop through a break in the monsoon.`,
  },
];

export interface SimulationChange {
  interventionId: string;
  label: string;
  value: number;
  explanation: string;
}

export function simulate(
  base: SoilMeasurements,
  values: Record<string, number>,
): { result: SoilMeasurements; changes: SimulationChange[] } {
  let current = cp(base);
  const changes: SimulationChange[] = [];
  for (const iv of INTERVENTIONS) {
    const v = values[iv.id] ?? iv.neutral;
    if (v === iv.neutral) continue;
    const before = current;
    const after = iv.apply(before, v);
    const explanation = iv.explain(v, before, after);
    current = after;
    if (explanation) changes.push({ interventionId: iv.id, label: iv.label, value: v, explanation });
  }
  return { result: current, changes };
}

export function textureLabel(m: SoilMeasurements) {
  return TEXTURE_META[m.texture].label;
}
