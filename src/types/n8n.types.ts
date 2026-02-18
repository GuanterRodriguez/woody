import { z } from "zod";
import { OcrCdvSchema, OcrFicheLotSchema } from "@/types/ocr.types";

// --- Request metadata sent alongside binary PDFs ---
export interface N8nOcrRequestMeta {
  sessionId: string;
  produit: string;
  client: string;
}

// --- Response from n8n ---
export const N8nOcrResponseSchema = z.object({
  sessionId: z.string(),
  cdv: OcrCdvSchema,
  fiche: OcrFicheLotSchema,
});

export type N8nOcrResponse = z.infer<typeof N8nOcrResponseSchema>;
