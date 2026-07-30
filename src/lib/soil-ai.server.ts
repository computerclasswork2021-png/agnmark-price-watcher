// Server-only AI gateway helper for the Soil Intelligence Engine.
type ContentBlock = Record<string, unknown>;

export async function callSoilVision(
  system: string,
  content: ContentBlock[],
  language: "en" | "hi",
): Promise<unknown> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Lovable AI is not configured for this project.");

  const langClause =
    language === "hi"
      ? "All human-readable strings must be in natural Hindi (Devanagari). JSON keys and enum values stay in English."
      : "All human-readable strings must be in plain English.";

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: `${system}\n${langClause}` },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("AI rate limit reached. Please retry in a minute.");
  if (res.status === 402)
    throw new Error("AI credits exhausted for this workspace. Add credits to continue.");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Soil AI request failed [${res.status}]: ${body.slice(0, 300)}`);
  }

  const payload = await res.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Soil AI returned no content.");
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text).match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Soil AI returned an unparseable response.");
    return JSON.parse(match[0]);
  }
}
