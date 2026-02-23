import { z } from "zod";
import { OcrCdvSchema, OcrFicheLotSchema } from "@/types/ocr.types";

// --- Request metadata sent alongside binary PDFs ---
export interface N8nOcrRequestMeta {
  sessionId: string;
  produit: string;
  client: string;
}

// --- Webhook "accepted" response (includes executionId for REST API polling) ---
export const N8nWebhookAcceptedSchema = z.object({
  status: z.literal("accepted"),
  executionId: z.string(),
});

// --- OCR response (extracted from n8n execution data) ---
export const N8nOcrResponseSchema = z.object({
  sessionId: z.string(),
  cdv: OcrCdvSchema,
  fiche: OcrFicheLotSchema,
});

export type N8nOcrResponse = z.infer<typeof N8nOcrResponseSchema>;
