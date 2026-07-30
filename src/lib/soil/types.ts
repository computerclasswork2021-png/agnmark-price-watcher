// Soil Intelligence Engine — domain model.
// Kept transport-agnostic so a cloud/IoT/satellite source can populate the same
// shapes later without touching the scoring, insight or simulation engines.

export type SoilTexture =
  | "sandy"
  | "loamy_sand"
  | "sandy_loam"
  | "loam"
  | "silt_loam"
  | "clay_loam"
  | "clay";

export type SoilColor = "very_dark" | "dark_brown" | "brown" | "reddish" | "yellowish" | "pale_grey";

export type SoilTypeName =
  | "alluvial"
  | "black"
  | "red"
  | "laterite"
  | "desert"
  | "mountain"
  | "saline"
  | "peaty";

/** How the numbers were obtained — drives the confidence + honesty layer. */
export type DataSource = "lab_report" | "manual" | "photo_estimate";

export interface SoilMeasurements {
  ph: number;
  nitrogen: number; // kg/ha
  phosphorus: number; // kg/ha
  potassium: number; // kg/ha
  organicCarbon: number; // %
  moisture: number; // % volumetric
  temperature: number; // °C
  ec: number; // dS/m
  texture: SoilTexture;
  waterHoldingCapacity: number; // %
  color: SoilColor;
  soilType: SoilTypeName;
}

export interface SoilContext {
  farmName: string;
  fieldName: string;
  fieldSizeAcres: number;
  village: string;
  district: string;
  state: string;
  season: Season;
  testedOn: string; // ISO date
}

export type Season = "kharif" | "rabi" | "zaid" | "perennial";

export interface PhotoObservation {
  textureEstimate: SoilTexture;
  surfaceMoisture: "dry" | "slightly_moist" | "moist" | "wet";
  colorClassification: SoilColor;
  surfaceCracking: "none" | "hairline" | "moderate" | "severe";
  visibleErosion: "none" | "sheet" | "rill" | "gully";
  organicMatterIndicators: string[];
  generalCondition: string;
  caveats: string[];
  confidence: number; // 0-100
}

export interface SoilRecord {
  id: string;
  createdAt: string;
  source: DataSource;
  measurements: SoilMeasurements;
  context: SoilContext;
  /** Present only for photo-derived or photo-augmented records. */
  photo?: PhotoObservation;
  /** Present for uploaded lab reports — what OCR pulled out, for audit. */
  extraction?: {
    fileName: string;
    confidence: number;
    unreadableFields: string[];
    notes: string;
  };
  crop?: string;
  notes?: string;
}

export type HealthCategory = "excellent" | "good" | "moderate" | "poor" | "critical";

export interface FactorScore {
  key: string;
  label: string;
  value: string;
  score: number; // 0-100
  weight: number; // 0-1
  status: "optimal" | "acceptable" | "low" | "high" | "critical";
  /** Scientific reasoning — never surface a score without this. */
  reasoning: string;
  impact: string;
  action: string;
}

export interface HealthResult {
  score: number;
  category: HealthCategory;
  factors: FactorScore[];
  sustainability: number;
  confidence: number;
  confidenceBasis: string;
  limitations: string[];
}

export interface Insight {
  id: string;
  severity: "info" | "watch" | "warning" | "critical";
  observation: string;
  reasoning: string;
  impact: string;
  action: string;
}

export interface CropFit {
  crop: string;
  suitability: number;
  yieldPotential: string;
  waterRequirement: "low" | "medium" | "high" | "very_high";
  difficulty: "easy" | "moderate" | "hard";
  reasons: string[];
}

export interface FertilizerPlan {
  organic: FertilizerItem[];
  chemical: FertilizerItem[];
  bio: FertilizerItem[];
  warnings: string[];
  totalCost: number;
}

export interface FertilizerItem {
  name: string;
  quantity: string;
  schedule: string;
  costRupees: number;
  benefit: string;
  reasoning: string;
}

export interface RoadmapStep {
  week: number;
  title: string;
  detail: string;
  why: string;
  effort: "low" | "medium" | "high";
}
