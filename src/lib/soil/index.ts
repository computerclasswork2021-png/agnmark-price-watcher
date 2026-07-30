import type { SoilRecord, HealthResult, Insight, CropFit, FertilizerPlan, RoadmapStep } from "./types";
import { evaluateSoil } from "./scoring";
import { generateInsights } from "./insights";
import { irrigationAdvice, rankCrops } from "./crops";
import { fertilizerPlan, improvementRoadmap } from "./fertilizer";

export interface SoilAnalysis {
  health: HealthResult;
  insights: Insight[];
  crops: CropFit[];
  fertilizer: FertilizerPlan;
  roadmap: RoadmapStep[];
  irrigation: string;
}

export function analyzeRecord(record: SoilRecord, tier: "low" | "middle" | "high" = "middle"): SoilAnalysis {
  const m = record.measurements;
  const crops = rankCrops(m, record.context.season);
  return {
    health: evaluateSoil(m, record.source),
    insights: generateInsights(m),
    crops,
    fertilizer: fertilizerPlan(m, record.context.fieldSizeAcres, tier),
    roadmap: improvementRoadmap(m),
    irrigation: irrigationAdvice(m, crops[0]),
  };
}

export * from "./types";
export { evaluateSoil, categorise, CATEGORY_META, IDEAL, TEXTURE_META, sustainabilityScore } from "./scoring";
export { generateInsights } from "./insights";
export { rankCrops, scoreCrop, yieldForCrop, irrigationAdvice, CROPS } from "./crops";
export { fertilizerPlan, improvementRoadmap } from "./fertilizer";
export { INTERVENTIONS, simulate } from "./simulate";
