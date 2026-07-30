import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ExtractionSchema,
  EXTRACTION_PROMPT,
  EXTRACTION_SYSTEM,
  PhotoSchema,
  PHOTO_PROMPT,
  PHOTO_SYSTEM,
} from "./soil/ai-schemas";
import { callSoilVision } from "./soil-ai.server";

const ReportInput = z.object({
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(3).max(100),
  dataUrl: z.string().min(32).max(12_000_000),
  language: z.enum(["en", "hi"]).default("en"),
});

const PhotoInput = z.object({
  imageDataUrl: z.string().startsWith("data:image/").max(12_000_000),
  language: z.enum(["en", "hi"]).default("en"),
});

export const extractSoilReport = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => ReportInput.parse(raw))
  .handler(async ({ data }) => {
    const isPdf = data.mimeType === "application/pdf";
    const content = isPdf
      ? [
          { type: "text", text: EXTRACTION_PROMPT },
          { type: "file", file: { filename: data.fileName, file_data: data.dataUrl } },
        ]
      : [
          { type: "text", text: EXTRACTION_PROMPT },
          { type: "image_url", image_url: { url: data.dataUrl } },
        ];
    const json = await callSoilVision(EXTRACTION_SYSTEM, content, data.language);
    return ExtractionSchema.parse(json);
  });

export const analyzeSoilPhoto = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => PhotoInput.parse(raw))
  .handler(async ({ data }) => {
    const json = await callSoilVision(
      PHOTO_SYSTEM,
      [
        { type: "text", text: PHOTO_PROMPT },
        { type: "image_url", image_url: { url: data.imageDataUrl } },
      ],
      data.language,
    );
    return PhotoSchema.parse(json);
  });
