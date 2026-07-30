import type { FertilizerItem, FertilizerPlan, RoadmapStep, SoilMeasurements } from "./types";
import { IDEAL } from "./scoring";

type Tier = "low" | "middle" | "high";

const round25 = (n: number) => Math.max(0, Math.round(n / 5) * 5);

/**
 * Fertiliser planning from measured deficits. Doses are derived from the gap
 * between available nutrient and the low/high ICAR band, converted to product
 * weight using standard nutrient concentrations.
 */
export function fertilizerPlan(
  m: SoilMeasurements,
  acres: number,
  tier: Tier = "middle",
): FertilizerPlan {
  const organic: FertilizerItem[] = [];
  const chemical: FertilizerItem[] = [];
  const bio: FertilizerItem[] = [];
  const warnings: string[] = [];
  const area = Math.max(0.25, acres || 1);

  const nGap = Math.max(0, IDEAL.nitrogen[0] - m.nitrogen); // kg/ha
  const pGap = Math.max(0, IDEAL.phosphorus[0] - m.phosphorus);
  const kGap = Math.max(0, IDEAL.potassium[0] - m.potassium);

  // 1 ha = 2.47 acre. Convert kg/ha deficit to kg of product for the field.
  const perAcre = (kgPerHa: number, concentration: number) =>
    round25((kgPerHa / 2.47 / concentration) * area);

  if (nGap > 0) {
    const urea = perAcre(nGap * 0.35, 0.46); // correct 35% of the gap by fertiliser, rest by organics
    chemical.push({
      name: "Urea (46% N)",
      quantity: `${urea} kg for ${area} acre`,
      schedule: "50% basal at sowing, 25% at tillering/branching, 25% at flowering",
      costRupees: Math.round(urea * 7),
      benefit: "Closes the nitrogen gap during the two peak-uptake windows.",
      reasoning: `Available N is ${Math.round(m.nitrogen)} kg/ha against a minimum of ${IDEAL.nitrogen[0]} kg/ha. Splitting the dose limits leaching and volatilisation losses.`,
    });
  }
  if (pGap > 0) {
    const dap = perAcre(pGap * 0.9, 0.46);
    chemical.push({
      name: tier === "low" ? "Single super phosphate (16% P₂O₅)" : "DAP (18-46-0)",
      quantity: `${tier === "low" ? perAcre(pGap * 0.9, 0.16) : dap} kg for ${area} acre`,
      schedule: "Full dose placed in the root zone as basal at sowing",
      costRupees: Math.round(tier === "low" ? perAcre(pGap * 0.9, 0.16) * 9 : dap * 27),
      benefit: "Supports early root proliferation, when phosphorus demand peaks.",
      reasoning:
        "Phosphorus is immobile in soil, so band placement near the seed outperforms broadcasting by a wide margin.",
    });
  }
  if (kGap > 0) {
    const mop = perAcre(kGap * 0.8, 0.6);
    chemical.push({
      name: "Muriate of potash (60% K₂O)",
      quantity: `${mop} kg for ${area} acre`,
      schedule: "Half basal, half at flowering",
      costRupees: Math.round(mop * 19),
      benefit: "Restores osmotic regulation and improves grain/fruit weight.",
      reasoning: `Available K is ${Math.round(m.potassium)} kg/ha against a minimum of ${IDEAL.potassium[0]} kg/ha.`,
    });
  }

  if (m.organicCarbon < IDEAL.organicCarbon[1]) {
    const fym = Math.round(2.5 * area * 10) / 10;
    organic.push({
      name: "Well-rotted farmyard manure",
      quantity: `${fym} tonne for ${area} acre`,
      schedule: "Incorporate 3 weeks before sowing",
      costRupees: Math.round(fym * 1800),
      benefit:
        "Raises organic carbon roughly 0.05–0.1% per season and improves aggregate stability.",
      reasoning: `Organic carbon is ${m.organicCarbon.toFixed(2)}% against an ideal of ${IDEAL.organicCarbon[0]}–${IDEAL.organicCarbon[1]}%.`,
    });
    organic.push({
      name: "Vermicompost",
      quantity: `${Math.round(400 * area)} kg for ${area} acre`,
      schedule: "Apply in the seed furrow at sowing",
      costRupees: Math.round(400 * area * 8),
      benefit: "Fast-acting carbon plus a microbial inoculum in one application.",
      reasoning:
        "Vermicompost mineralises faster than raw FYM, giving a visible response inside the same season.",
    });
  }

  if (m.ph < IDEAL.ph[0]) {
    organic.push({
      name: "Agricultural lime",
      quantity: `${Math.round((IDEAL.ph[0] - m.ph) * 2 * area * 100)} kg for ${area} acre`,
      schedule: "Broadcast and incorporate 3–4 weeks before sowing",
      costRupees: Math.round((IDEAL.ph[0] - m.ph) * 2 * area * 100 * 6),
      benefit: "Neutralises acidity and releases phosphorus locked as iron/aluminium phosphate.",
      reasoning: `pH ${m.ph.toFixed(1)} is below 6.0; roughly 2 quintal/acre raises pH by about 0.5 unit on a medium-textured soil.`,
    });
  }
  if (m.ph > 8.0 || m.ec > 2) {
    organic.push({
      name: "Gypsum (calcium sulphate)",
      quantity: `${Math.round(200 * area)} kg for ${area} acre`,
      schedule: "Broadcast before the first irrigation, then leach",
      costRupees: Math.round(200 * area * 5),
      benefit: "Replaces sodium on the exchange complex so salts can be leached out.",
      reasoning: `pH ${m.ph.toFixed(1)} with EC ${m.ec.toFixed(2)} dS/m points to sodicity/salinity that gypsum plus leaching corrects.`,
    });
  }

  bio.push({
    name: "Azospirillum / Rhizobium culture",
    quantity: `${Math.round(2 * area)} kg for ${area} acre (seed treatment)`,
    schedule: "Treat seed at sowing; do not mix with fungicide on the same day",
    costRupees: Math.round(2 * area * 120),
    benefit: "Biologically fixes 15–25 kg N/ha, cutting urea requirement.",
    reasoning:
      "Nitrogen-fixing inoculants perform best where organic carbon supports a living microbial population.",
  });
  bio.push({
    name: "Phosphate-solubilising bacteria (PSB)",
    quantity: `${Math.round(2 * area)} kg for ${area} acre`,
    schedule: "Apply with compost as a soil application at sowing",
    costRupees: Math.round(2 * area * 110),
    benefit: "Releases phosphorus already fixed in the soil, reducing fresh DAP need.",
    reasoning:
      "Most Indian soils hold large fixed-P reserves; PSB converts a fraction of it to plant-available form.",
  });

  if (m.nitrogen > IDEAL.nitrogen[1]) {
    warnings.push(
      "Nitrogen already exceeds the agronomic optimum. Applying more urea will cause lodging and nitrate leaching without any yield gain.",
    );
  }
  if (m.phosphorus > IDEAL.phosphorus[1]) {
    warnings.push(
      "Phosphorus is above the response threshold. Extra DAP will induce zinc deficiency instead of raising yield.",
    );
  }
  if (m.ec > 2) {
    warnings.push(
      "Soil EC is elevated. Heavy chemical fertiliser will raise salinity further — leach first, then fertilise.",
    );
  }
  if (tier === "low" && chemical.length > 2) {
    warnings.push(
      "On a limited budget, prioritise the nitrogen dose and organic matter first; potash can wait one season.",
    );
  }

  const all = [...organic, ...chemical, ...bio];
  return { organic, chemical, bio, warnings, totalCost: all.reduce((s, i) => s + i.costRupees, 0) };
}

/** Week-by-week soil improvement roadmap derived from the actual deficits. */
export function improvementRoadmap(m: SoilMeasurements): RoadmapStep[] {
  const steps: RoadmapStep[] = [];
  let week = 1;

  if (m.organicCarbon < IDEAL.organicCarbon[0]) {
    steps.push({
      week: week++,
      title: "Apply compost / farmyard manure",
      detail:
        "Spread 2–3 t/acre of well-rotted FYM or 1 t/acre vermicompost and incorporate to 15 cm.",
      why: `Organic carbon is ${m.organicCarbon.toFixed(2)}% — rebuilding it first makes every later input work harder.`,
      effort: "medium",
    });
  }
  if (m.ph < IDEAL.ph[0] || m.ph > 8.0) {
    steps.push({
      week: week++,
      title: m.ph < IDEAL.ph[0] ? "Correct soil pH with lime" : "Correct alkalinity with gypsum",
      detail:
        m.ph < IDEAL.ph[0]
          ? "Broadcast agricultural lime at 2–3 quintal/acre and incorporate; allow 3 weeks to react."
          : "Broadcast gypsum at 2 quintal/acre and follow with a leaching irrigation.",
      why: `pH ${m.ph.toFixed(1)} is outside 6.0–7.5, so a share of applied nutrients is chemically unavailable.`,
      effort: "medium",
    });
  }
  if (m.moisture < IDEAL.moisture[0] || m.waterHoldingCapacity < IDEAL.waterHoldingCapacity[0]) {
    steps.push({
      week: week++,
      title: "Improve irrigation and mulch",
      detail:
        "Mulch with crop residue at 2 t/acre and shift to shorter, more frequent irrigations or drip.",
      why: "Low stored moisture prevents nutrient mass-flow, so fertiliser applied now would not reach the root.",
      effort: "low",
    });
  }
  if (
    m.nitrogen < IDEAL.nitrogen[0] ||
    m.phosphorus < IDEAL.phosphorus[0] ||
    m.potassium < IDEAL.potassium[0]
  ) {
    steps.push({
      week: week++,
      title: "Apply the corrective NPK dose",
      detail: "Follow the fertiliser plan, keeping nitrogen split across growth stages.",
      why: "With pH, carbon and moisture corrected first, uptake efficiency of this dose is materially higher.",
      effort: "medium",
    });
  }
  steps.push({
    week: week++,
    title: "Sow a green-manure legume or inoculate seed",
    detail:
      "Sow dhaincha or sunhemp on fallow land, or treat seed with Rhizobium/Azospirillum before sowing.",
    why: "Biological nitrogen fixation adds 15–25 kg N/ha at a fraction of urea cost and feeds soil biology.",
    effort: "low",
  });
  steps.push({
    week: week + 1,
    title: "Re-test soil",
    detail:
      "Collect 8–10 cores in a zig-zag pattern from 0–15 cm, mix, quarter to 500 g and submit to the nearest soil testing lab.",
    why: "Measuring after the intervention is the only way to confirm the score change is real rather than modelled.",
    effort: "low",
  });

  return steps.map((s, i) => ({ ...s, week: i + 1 }));
}
