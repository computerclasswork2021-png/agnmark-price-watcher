import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  farmerName: z.string().min(1),
  state: z.string().min(1),
  district: z.string().optional().default(""),
  crop: z.string().min(1),
  farmSizeAcres: z.number().positive(),
  storageType: z.string(),
  storageDurationDays: z.number().int().min(0),
  storageCapacityQuintals: z.number().min(0),
  transportType: z.string(),
  transportCostPerKm: z.number().min(0),
  maxTransportKm: z.number().min(0),
  irrigation: z.string(),
  language: z.enum(["en", "hi"]).default("en"),
  incomeTier: z.enum(["low", "middle", "high"]).default("middle"),
});

const QualityBlock = z.object({
  chemical: z.string(),
  biochemical: z.string(),
  physical: z.string(),
  howToImprove: z.array(z.string()).min(1),
  howToMaintain: z.array(z.string()).min(1),
});

const DecisionSchema = z.object({
  action: z.enum(["harvest", "wait", "store", "sell", "transport", "monitor"]),
  actionLabel: z.string(),
  headline: z.string(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(100),
  confidenceReason: z.string(),
  profitImpactRupees: z.number(),
  profitBasis: z.string(),
  riskLevel: z.enum(["low", "moderate", "high", "critical"]),
  riskReason: z.string(),
  farmRiskScore: z.number().min(0).max(100),
  farmRiskReasoning: z.string(),
  cropQuality: QualityBlock,
  alternatives: z
    .array(
      z.object({
        action: z.string(),
        summary: z.string(),
        profitDeltaRupees: z.number(),
      }),
    )
    .min(1)
    .max(3),
  dailyTasks: z.array(z.string()).min(2).max(8),
  sources: z.array(z.string()),
});

export type Decision = z.infer<typeof DecisionSchema>;

const TIER_HINT: Record<string, string> = {
  low: "Farmer INCOME TIER = LOW (< ₹1 lakh/year). Only recommend cheap, DIY, mostly-manual solutions: neem oil, cow dung/vermicompost, jeevamrutha, hand weeding, wood-ash pest control, mulching with local waste, sharing labour with neighbours, free/subsidised govt schemes (PM-KISAN, Soil Health Card, PMFBY). NEVER recommend cold storage, branded pesticides above ₹500, drip irrigation, mechanised harvesters. If a solution costs more than ₹500, mark it clearly as 'if you can borrow via KCC'.",
  middle:
    "Farmer INCOME TIER = MIDDLE (₹1–5 lakh/year). Recommend affordable inputs: urea/DAP fertilisers, knapsack sprayer, generic pesticides under ₹1500, warehouse rental, mini truck hire, KCC loans. Avoid premium precision-ag or imported branded goods.",
  high: "Farmer INCOME TIER = HIGH (> ₹5 lakh/year). Recommend precision agriculture: drip/sprinkler, cold storage, branded plant-protection chemicals, soil testing labs, mechanised harvesting, contract-farming buyers, direct FPO/mandi trucking. Include ROI figures.",
};

export const generateDecision = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Lovable AI is not configured for this project.");

    const langInstruction =
      data.language === "hi"
        ? "CRITICAL: Every human-readable string (actionLabel, headline, reasoning, confidenceReason, profitBasis, riskReason, farmRiskReasoning, cropQuality.*, alternatives.*, dailyTasks, sources) MUST be in natural Hindi (Devanagari script). Do NOT leave any English word. JSON keys and enum values stay English."
        : "All human-readable strings in plain English suitable for a low-literacy farmer.";

    const tierClause = TIER_HINT[data.incomeTier] ?? TIER_HINT.middle;

    const prompt = `You are the decision engine for PREDI-FARM X for Indian farmers. Give ONE actionable recommendation with full reasoning. Do not invent live weather or mandi numbers.

${tierClause}

Farmer profile:
- Name: ${data.farmerName}
- Location: ${data.district}, ${data.state}, India
- Crop: ${data.crop}
- Farm size: ${data.farmSizeAcres} acres
- Irrigation: ${data.irrigation}
- Storage: ${data.storageType} (${data.storageCapacityQuintals} qtl / ${data.storageCapacityQuintals * 100} kg, up to ${data.storageDurationDays} days)
- Transport: ${data.transportType} at ₹${data.transportCostPerKm}/km, up to ${data.maxTransportKm} km
- Income tier: ${data.incomeTier}
- Currency: INR (₹), units: kilograms & quintals, distances km, timezone IST

${langInstruction}

Every task must be one concrete Indian-farmer action written like a friend telling them what to do TODAY (e.g. "Spray 10 L neem+cow-urine solution on chilli plants at 5pm", NOT "Apply foliar biopesticide"). Use local names, cheap tools, IST timing.

Return STRICT JSON only:
{
  "action": "harvest"|"wait"|"store"|"sell"|"transport"|"monitor",
  "actionLabel": string,             // 2-4 word imperative
  "headline": string,                // one-sentence why
  "reasoning": string,               // 2-3 sentences citing weather/mandi/storage/transport
  "confidence": number,              // 0-100
  "confidenceReason": string,        // 1 sentence why exactly this % and not higher/lower
  "profitImpactRupees": number,      // realistic farm-level ₹ figure
  "profitBasis": string,             // e.g. "per 10 quintals (1000 kg)"
  "riskLevel": "low"|"moderate"|"high"|"critical",
  "riskReason": string,
  "farmRiskScore": number,           // 0-100, lower safer
  "farmRiskReasoning": string,       // 2-3 sentences: which factors pushed the score up/down
  "cropQuality": {
    "chemical": string,              // NPK status, pH, pesticide residue notes tailored to this crop+region
    "biochemical": string,           // enzymes, chlorophyll, ripening hormones, sugar/starch
    "physical": string,              // moisture %, size, colour, bruise/rot signs
    "howToImprove": string[],        // 3-5 concrete steps AFFORDABLE for this income tier
    "howToMaintain": string[]        // 3-5 concrete steps to keep quality
  },
  "alternatives": [ { "action": string, "summary": string, "profitDeltaRupees": number } ],
  "dailyTasks": [ string ],          // 4-6 concrete tasks for TODAY, income-tier appropriate
  "sources": [ string ]
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a careful agricultural analyst for Indian farmers. Always return valid JSON only. Never fabricate specific market prices or weather values. Match every recommendation to the farmer's income tier.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`AI decision failed [${res.status}]: ${body}`);
    }

    const payload = await res.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI decision returned no content");

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI decision returned invalid JSON");
    }

    return DecisionSchema.parse(parsed);
  });

// -------- Deep analyze (7-day profit chart + windows) --------

const AnalyzeInput = Input.extend({
  currentMandiPrice: z.number().min(0).optional(),
});

const AnalyzeSchema = z.object({
  yieldForecastQuintals: z.number().min(0),
  yieldReasoning: z.string(),
  diseaseRiskScore: z.number().min(0).max(100),
  diseaseRiskReasoning: z.string(),
  bestSellWindow: z.object({
    startDaysFromNow: z.number(),
    endDaysFromNow: z.number(),
    reasoning: z.string(),
  }),
  profitByHarvestDay: z
    .array(
      z.object({
        dayOffset: z.number(),
        expectedPricePerQuintal: z.number(),
        expectedProfitRupees: z.number(),
        note: z.string(),
      }),
    )
    .length(7),
  cropQuality: QualityBlock,
  summary: z.string(),
});

export type DeepAnalysis = z.infer<typeof AnalyzeSchema>;

export const runDeepAnalysis = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => AnalyzeInput.parse(raw))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Lovable AI is not configured for this project.");

    const tierClause = TIER_HINT[data.incomeTier] ?? TIER_HINT.middle;
    const langInstruction =
      data.language === "hi"
        ? "All human-readable strings in natural Hindi (Devanagari). JSON keys and enum values stay English."
        : "All human-readable strings in plain English.";

    const prompt = `Do a 7-day deep analysis for this Indian farmer. Use general seasonal patterns; NEVER invent specific mandi prices. Expected prices should be reasoned bands (e.g. "typical range around ${data.currentMandiPrice ?? "current mandi"} ±5%").

${tierClause}
${langInstruction}

Currency ₹ INR, units quintals+kg, timezone IST.

Farmer: ${data.crop} · ${data.farmSizeAcres} acres · ${data.district}, ${data.state} · irrigation ${data.irrigation} · storage ${data.storageType} ${data.storageCapacityQuintals} qtl · transport ${data.transportType} ₹${data.transportCostPerKm}/km ${data.maxTransportKm} km · income ${data.incomeTier}.
${data.currentMandiPrice ? `Current live mandi modal price ≈ ₹${data.currentMandiPrice}/qtl.` : "No live mandi price."}

Return STRICT JSON:
{
  "yieldForecastQuintals": number,          // realistic yield for this crop+region+size
  "yieldReasoning": string,                 // 2 sentences
  "diseaseRiskScore": number,               // 0-100, higher = more risk right now
  "diseaseRiskReasoning": string,
  "bestSellWindow": { "startDaysFromNow": number, "endDaysFromNow": number, "reasoning": string },
  "profitByHarvestDay": [                   // exactly 7 items, dayOffset 0..6
    { "dayOffset": number, "expectedPricePerQuintal": number, "expectedProfitRupees": number, "note": string }
  ],
  "cropQuality": {
    "chemical": string, "biochemical": string, "physical": string,
    "howToImprove": string[], "howToMaintain": string[]
  },
  "summary": string
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "Careful agri analyst. Return only valid JSON. Never invent specific prices; give reasoned bands.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Deep analysis failed [${res.status}]: ${body}`);
    }
    const payload = await res.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Analysis returned no content");
    return AnalyzeSchema.parse(JSON.parse(content));
  });
