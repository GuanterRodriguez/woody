import { z } from "zod";
import { OcrCdvSchema, OcrFicheLotSchema } from "@/types/ocr.types";

// --- Request metadata sent alongside binary PDFs ---
export interface N8nOcrRequestMeta {
  sessionId: string;
  produit: string;
  client: string;
}

// --- Immediate webhook response (async mode) ---
export const N8nWebhookAcceptedSchema = z.object({
  status: z.literal("accepted"),
});
export type N8nWebhookAccepted = z.infer<typeof N8nWebhookAcceptedSchema>;

// --- Polling response: either "processing" or the final OCR result ---
export const N8nPollProcessingSchema = z.object({
  status: z.literal("processing"),
});

// --- Final OCR response ---
export const N8nOcrResponseSchema = z.object({
  sessionId: z.string(),
  cdv: OcrCdvSchema,
  fiche: OcrFicheLotSchema,
});

export type N8nOcrResponse = z.infer<typeof N8nOcrResponseSchema>;
