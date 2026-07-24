import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  question: z.string().min(1).max(2000),
  language: z.enum(["en", "hi"]).default("en"),
  context: z.string().optional().default(""),
  incomeTier: z.enum(["low", "middle", "high"]).default("middle"),
});

const TIER: Record<string, string> = {
  low: "Farmer income LOW. Recommend only DIY / free / under-₹500 solutions (neem, cow dung, hand tools, PM-KISAN, Soil Health Card).",
  middle: "Farmer income MIDDLE. Suggest affordable inputs, KCC loans, warehouse rental.",
  high: "Farmer income HIGH. Precision ag, cold storage, branded inputs are fine.",
};

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Lovable AI is not configured for this project.");

    const langInstruction =
      data.language === "hi"
        ? "जवाब सरल हिंदी (देवनागरी) में 3-5 छोटे वाक्यों में दें। कठिन शब्द न लें।"
        : "Answer in plain English, 3-5 short sentences. Simple words a low-literacy farmer follows.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "You are PREDI-FARM X's voice assistant for Indian farmers. Give practical Indian-context guidance in ₹, kg/quintal, km, IST. Never invent specific mandi prices or scheme deadlines — say clearly when giving general guidance. Match solutions to the farmer's income tier.",
          },
          {
            role: "user",
            content: `${langInstruction}\n\n${TIER[data.incomeTier] ?? TIER.middle}\n\nFarmer context: ${data.context || "(none)"}\n\nQuestion: ${data.question}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Assistant failed [${res.status}]: ${body}`);
    }
    const payload = await res.json();
    const answer = payload?.choices?.[0]?.message?.content ?? "";
    return { answer: String(answer) };
  });
