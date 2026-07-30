import type { Insight, SoilMeasurements } from "./types";
import { IDEAL, TEXTURE_META } from "./scoring";

/**
 * Explainable insight generation. Every entry carries observation → reasoning →
 * impact → action, so nothing is ever surfaced as an unexplained number.
 */
export function generateInsights(m: SoilMeasurements): Insight[] {
  const out: Insight[] = [];
  const push = (i: Insight) => out.push(i);

  // --- pH ---------------------------------------------------------------
  if (m.ph < 5.5) {
    push({
      id: "ph-strong-acid",
      severity: "critical",
      observation: `Soil is strongly acidic at pH ${m.ph.toFixed(1)}.`,
      reasoning:
        "Under pH 5.5, exchangeable aluminium becomes soluble and is directly toxic to root tips, while phosphate is locked up as iron and aluminium phosphates.",
      impact:
        "Root growth is physically restricted and applied phosphorus largely fails to reach the crop.",
      action:
        "Apply agricultural lime at 3–4 quintal/acre, incorporate 3–4 weeks before sowing, then re-test pH.",
    });
  } else if (m.ph < IDEAL.ph[0]) {
    push({
      id: "ph-slight-acid",
      severity: "warning",
      observation: `Soil is slightly acidic at pH ${m.ph.toFixed(1)}.`,
      reasoning:
        "Between pH 5.5 and 6.0 phosphorus availability begins to fall and rhizobial nodulation in pulses slows down.",
      impact: "Expect 10–15% lower phosphorus use efficiency and weaker nodulation in legumes.",
      action:
        "Apply lime at 2 quintal/acre or 1 t/acre compost, which buffers pH upward gradually.",
    });
  } else if (m.ph > 8.2) {
    push({
      id: "ph-alkaline",
      severity: "warning",
      observation: `Soil is alkaline at pH ${m.ph.toFixed(1)}.`,
      reasoning:
        "Above pH 8.2 carbonate dominates the soil solution, precipitating phosphate as calcium phosphate and reducing zinc and iron solubility by orders of magnitude.",
      impact:
        "Interveinal yellowing (zinc/iron chlorosis) and reduced grain filling, especially in rice and wheat.",
      action:
        "Apply gypsum at 2 quintal/acre, use ammonium sulphate instead of urea, and add 25 kg/acre zinc sulphate.",
    });
  } else {
    push({
      id: "ph-ok",
      severity: "info",
      observation: `pH ${m.ph.toFixed(1)} is in the optimal range.`,
      reasoning:
        "Between pH 6.0 and 7.5 all major and most micronutrients are simultaneously plant-available.",
      impact: "Fertiliser applied this season will be used at close to its maximum efficiency.",
      action: "Maintain with organic inputs and re-test every six months.",
    });
  }

  // --- Nitrogen ---------------------------------------------------------
  if (m.nitrogen < IDEAL.nitrogen[0]) {
    push({
      id: "n-low",
      severity: m.nitrogen < 200 ? "critical" : "warning",
      observation: `Nitrogen deficiency detected (${Math.round(m.nitrogen)} kg/ha available N).`,
      reasoning:
        "Available N under 280 kg/ha falls in the ICAR low class. Nitrogen is the backbone of chlorophyll and rubisco, and the soil's own mineralisation cannot cover peak crop demand.",
      impact: "Pale lower leaves, reduced tillering and a typical 20–35% yield penalty in cereals.",
      action:
        "Split urea across basal, tillering and panicle stages, and add FYM to rebuild the mineralisable pool.",
    });
  } else if (m.nitrogen > IDEAL.nitrogen[1]) {
    push({
      id: "n-high",
      severity: "watch",
      observation: `Nitrogen is above the agronomic optimum (${Math.round(m.nitrogen)} kg/ha).`,
      reasoning:
        "Surplus nitrate is mobile, leaches below the root zone and pushes vegetative growth over reproductive growth.",
      impact: "Lodging, delayed maturity, higher sucking-pest pressure and wasted input money.",
      action:
        "Skip the basal nitrogen dose this season and monitor crop colour before any top dressing.",
    });
  }

  // --- Phosphorus / Potassium -------------------------------------------
  if (m.phosphorus < IDEAL.phosphorus[0]) {
    push({
      id: "p-low",
      severity: "warning",
      observation: `Phosphorus is below the ideal range (${Math.round(m.phosphorus)} kg/ha).`,
      reasoning:
        "Phosphorus drives ATP transfer and early root proliferation; it is immobile, so the crop can only take up what sits near the root.",
      impact: "Weak root systems, purple leaf tinge and poor grain set.",
      action:
        "Place DAP or SSP in the root zone as a full basal dose and inoculate with phosphate-solubilising bacteria.",
    });
  }
  if (m.potassium >= IDEAL.potassium[0] && m.potassium <= IDEAL.potassium[1]) {
    push({
      id: "k-ok",
      severity: "info",
      observation: `Potassium is adequate (${Math.round(m.potassium)} kg/ha).`,
      reasoning:
        "Potassium regulates stomatal opening and phloem transport; at this level the crop retains its drought and disease buffer.",
      impact: "Better water-use efficiency and grain weight without additional potash spend.",
      action: "Return crop residue to the field instead of burning it to hold this level.",
    });
  } else if (m.potassium < IDEAL.potassium[0]) {
    push({
      id: "k-low",
      severity: "warning",
      observation: `Potassium is deficient (${Math.round(m.potassium)} kg/ha).`,
      reasoning:
        "Below 120 kg/ha the crop cannot maintain osmotic regulation under midday water stress.",
      impact: "Leaf-margin scorching, lodging and disproportionate damage during any dry spell.",
      action: "Apply muriate of potash in two splits — basal and at flowering.",
    });
  }

  // --- Organic carbon ----------------------------------------------------
  if (m.organicCarbon < IDEAL.organicCarbon[0]) {
    push({
      id: "oc-low",
      severity: m.organicCarbon < 0.4 ? "critical" : "warning",
      observation: `Organic carbon is below the ideal range (${m.organicCarbon.toFixed(2)}%).`,
      reasoning:
        "Organic carbon is the food source for the microbial biomass that builds aggregates, so low carbon means weak structure, low cation exchange capacity and slow nutrient cycling.",
      impact:
        "Surface crusting, faster drying, and a permanent dependence on purchased fertiliser.",
      action:
        "Apply 2–3 t/acre FYM or 1 t/acre vermicompost and grow a green-manure legume before the main crop.",
    });
  }

  // --- Water -------------------------------------------------------------
  const meta = TEXTURE_META[m.texture];
  if (m.waterHoldingCapacity >= IDEAL.waterHoldingCapacity[0]) {
    push({
      id: "whc-ok",
      severity: "info",
      observation: `Water retention is good (${Math.round(m.waterHoldingCapacity)}% water holding capacity).`,
      reasoning: `${meta.label} texture combined with the current organic matter gives the soil a deep buffer of plant-available water between irrigations.`,
      impact: "Longer safe interval between irrigations and better resilience to a broken monsoon.",
      action: "Mulch the surface to protect this buffer through the hottest weeks.",
    });
  } else {
    push({
      id: "whc-low",
      severity: "warning",
      observation: `Water holding capacity is low (${Math.round(m.waterHoldingCapacity)}%).`,
      reasoning:
        "Coarse texture and low organic matter leave few micro-pores to hold water against gravity.",
      impact:
        "Frequent short irrigations required; nutrients leach past the root zone with each event.",
      action:
        "Add organic matter, mulch heavily and shift to drip or shorter, more frequent irrigation.",
    });
  }

  // --- Salinity ----------------------------------------------------------
  if (m.ec > 1) {
    push({
      id: "ec-high",
      severity: m.ec > 4 ? "critical" : "warning",
      observation: `Salt concentration is elevated (EC ${m.ec.toFixed(2)} dS/m).`,
      reasoning:
        "Dissolved salts lower the osmotic potential of the soil solution, so roots must work against the soil to extract water.",
      impact:
        m.ec > 4
          ? "Germination failure and 25–50% yield loss in sensitive crops."
          : "Mild osmotic stress; pulses and vegetables will underperform.",
      action:
        "Leach with good-quality water, apply gypsum if sodium-dominated, and grow salt-tolerant crops meanwhile.",
    });
  }

  // --- Balance risk ------------------------------------------------------
  const ratio = m.nitrogen / Math.max(1, m.potassium);
  if (ratio > 3 || ratio < 0.7) {
    push({
      id: "npk-imbalance",
      severity: "watch",
      observation: "Risk of nutrient imbalance exists between nitrogen and potassium.",
      reasoning: `The N:K ratio is ${ratio.toFixed(1)}:1, well outside the 1:1 to 2:1 band that keeps vegetative and reproductive growth in step.`,
      impact:
        "Nutrient antagonism at the root surface reduces uptake of whichever element is in relative shortage.",
      action:
        "Correct the deficient element first, then re-balance the remaining dose rather than raising both.",
    });
  }

  const rank = { critical: 0, warning: 1, watch: 2, info: 3 } as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
