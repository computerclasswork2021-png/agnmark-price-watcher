import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  imageDataUrl: z.string().startsWith("data:image/"),
  crop: z.string().min(1),
  language: z.enum(["en", "hi"]).default("en"),
  incomeTier: z.enum(["low", "middle", "high"]).default("middle"),
});

const DiagnosisSchema = z.object({
  disease: z.string(),
  confidence: z.number().min(0).max(100),
  severity: z.enum(["healthy", "mild", "moderate", "severe", "unknown"]),
  symptoms: z.array(z.string()),
  treatment: z.array(z.string()),
  prevention: z.array(z.string()),
  chemicalControl: z.array(z.string()),
  biochemicalControl: z.array(z.string()),
  physicalControl: z.array(z.string()),
  reasoning: z.string(),
  severityReasoning: z.string(),
  needsMoreImages: z.boolean(),
});

export type Diagnosis = z.infer<typeof DiagnosisSchema>;

const TIER: Record<string, string> = {
  low: "Farmer income LOW: recommend ONLY cheap solutions — neem oil, cow urine spray, wood ash, tobacco decoction, hand-picking pests, mulching, crop rotation. No pesticides above ₹300. Mention free govt Soil Health Card if soil issue.",
  middle:
    "Farmer income MIDDLE: recommend affordable generic pesticides (mancozeb, carbendazim under ₹800), knapsack sprayer, foliar urea.",
  high: "Farmer income HIGH: branded plant-protection chemicals, precision spraying, lab soil test, imported biopesticides ok.",
};

export const diagnoseLeaf = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Lovable AI is not configured for this project.");

    const langInstruction =
      data.language === "hi"
        ? "All human-readable strings in natural Hindi (Devanagari). JSON keys and enum values stay English."
        : "All human-readable strings in plain English.";

    const tierClause = TIER[data.incomeTier] ?? TIER.middle;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a careful plant-pathology assistant for Indian farmers. If image is blurry or not a leaf, set needsMoreImages true and confidence low. Never guess.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Crop: ${data.crop}. Diagnose the leaf. ${langInstruction} ${tierClause}
Return STRICT JSON:
{
  "disease": string,
  "confidence": number 0-100,
  "severity": "healthy"|"mild"|"moderate"|"severe"|"unknown",
  "severityReasoning": string,
  "symptoms": string[],
  "treatment": string[],
  "prevention": string[],
  "chemicalControl": string[],       // NPK / pesticide steps at this income tier, cheapest first
  "biochemicalControl": string[],    // biopesticides, enzymes, biocontrol agents
  "physicalControl": string[],       // pruning, spacing, mulching, hand removal, drainage
  "reasoning": string,
  "needsMoreImages": boolean
}`,
              },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Diagnosis failed [${res.status}]: ${body}`);
    }

    const payload = await res.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Diagnosis returned no content");
    return DiagnosisSchema.parse(JSON.parse(content));
  });
