// Client-safe AI contract for soil OCR + photo estimation.
// Lives outside *.functions.ts so server-function modules stay thin wrappers.
import { z } from "zod";

export const TEXTURES = [
  "sandy",
  "loamy_sand",
  "sandy_loam",
  "loam",
  "silt_loam",
  "clay_loam",
  "clay",
] as const;

export const COLORS = ["very_dark", "dark_brown", "brown", "reddish", "yellowish", "pale_grey"] as const;

export const ExtractionSchema = z.object({
  readable: z.boolean(),
  reason: z.string().default(""),
  confidence: z.number().min(0).max(100).default(0),
  unreadableFields: z.array(z.string()).default([]),
  notes: z.string().default(""),
  values: z
    .object({
      ph: z.number().nullable().default(null),
      nitrogen: z.number().nullable().default(null),
      phosphorus: z.number().nullable().default(null),
      potassium: z.number().nullable().default(null),
      organicCarbon: z.number().nullable().default(null),
      moisture: z.number().nullable().default(null),
      temperature: z.number().nullable().default(null),
      ec: z.number().nullable().default(null),
      texture: z.enum(TEXTURES).nullable().default(null),
      waterHoldingCapacity: z.number().nullable().default(null),
    })
    .default({
      ph: null,
      nitrogen: null,
      phosphorus: null,
      potassium: null,
      organicCarbon: null,
      moisture: null,
      temperature: null,
      ec: null,
      texture: null,
      waterHoldingCapacity: null,
    }),
  labName: z.string().default(""),
  sampleDate: z.string().default(""),
});

export type SoilExtraction = z.infer<typeof ExtractionSchema>;

export const PhotoSchema = z.object({
  isSoilPhoto: z.boolean(),
  textureEstimate: z.enum(TEXTURES),
  surfaceMoisture: z.enum(["dry", "slightly_moist", "moist", "wet"]),
  colorClassification: z.enum(COLORS),
  surfaceCracking: z.enum(["none", "hairline", "moderate", "severe"]),
  visibleErosion: z.enum(["none", "sheet", "rill", "gully"]),
  organicMatterIndicators: z.array(z.string()),
  generalCondition: z.string(),
  caveats: z.array(z.string()),
  confidence: z.number().min(0).max(100),
  estimatedOrganicCarbon: z.number().nullable().default(null),
  estimatedPh: z.number().nullable().default(null),
});

export type SoilPhotoAnalysis = z.infer<typeof PhotoSchema>;

export const EXTRACTION_SYSTEM =
  "You are an OCR and data-extraction engine for Indian Soil Health Card and private laboratory soil reports. " +
  "Read only what is printed. Never infer, never estimate, never fill a value that is not visible. " +
  "If a value is missing or illegible, return null for it and list its name in unreadableFields. " +
  "If the document is not a soil report at all, or the text cannot be read, set readable=false and explain why in reason.";

export const EXTRACTION_PROMPT = `Extract soil test values from this report.

Unit normalisation rules (apply carefully, show the normalised value):
- Nitrogen, phosphorus, potassium must be returned in kg/ha. If the report gives ppm or mg/kg, multiply by 2.24 to convert to kg/ha.
- Organic carbon must be a percentage. If organic MATTER is given instead, multiply by 0.58.
- Electrical conductivity must be dS/m (same as mmhos/cm). If µS/cm is given, divide by 1000.
- pH is unitless.
- Moisture, water holding capacity are percentages.
- Temperature is °C.
- texture must be one of: sandy, loamy_sand, sandy_loam, loam, silt_loam, clay_loam, clay. Map "silty clay loam" to clay_loam, "sandy clay" to clay_loam, "silt" to silt_loam.

Return STRICT JSON only:
{
  "readable": boolean,
  "reason": string,
  "confidence": number 0-100,
  "unreadableFields": string[],
  "notes": string,
  "labName": string,
  "sampleDate": string,
  "values": {
    "ph": number|null, "nitrogen": number|null, "phosphorus": number|null, "potassium": number|null,
    "organicCarbon": number|null, "moisture": number|null, "temperature": number|null, "ec": number|null,
    "texture": string|null, "waterHoldingCapacity": number|null
  }
}`;

export const PHOTO_SYSTEM =
  "You are a soil-surface interpretation assistant. You judge ONLY what is visible in the photograph: colour, aggregate size, " +
  "crusting, cracking, erosion features, visible residue and roots. You must never claim to measure pH, N, P, K or EC from a photo. " +
  "If the image is not soil, set isSoilPhoto=false and confidence low. Always state limitations in caveats.";

export const PHOTO_PROMPT = `Assess this soil photograph. Return STRICT JSON only:
{
  "isSoilPhoto": boolean,
  "textureEstimate": "sandy"|"loamy_sand"|"sandy_loam"|"loam"|"silt_loam"|"clay_loam"|"clay",
  "surfaceMoisture": "dry"|"slightly_moist"|"moist"|"wet",
  "colorClassification": "very_dark"|"dark_brown"|"brown"|"reddish"|"yellowish"|"pale_grey",
  "surfaceCracking": "none"|"hairline"|"moderate"|"severe",
  "visibleErosion": "none"|"sheet"|"rill"|"gully",
  "organicMatterIndicators": string[],
  "generalCondition": string,
  "caveats": string[],
  "confidence": number 0-100,
  "estimatedOrganicCarbon": number|null,
  "estimatedPh": number|null
}
estimatedOrganicCarbon may only be a broad visual inference from soil darkness (darker = more carbon); if you are not reasonably sure, return null.
estimatedPh must be null unless clear visual evidence exists (for example a white salt/alkali crust).
Every caveat must be a concrete limitation of judging soil from a photograph.`;
