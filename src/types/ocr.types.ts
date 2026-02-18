import { z } from "zod";

// --- CDV OCR Schema ---
export const OcrCdvSchema = z.object({
  camion: z.string().min(1),
  date_arrivee: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  frais_transit: z.number().min(0),
  frais_commission: z.number().min(0),
  autre_frais: z.number().min(0),
});
export type OcrCdvResult = z.infer<typeof OcrCdvSchema>;

// --- Fiche de Lot OCR Schema ---
export const LigneVenteOcrSchema = z.object({
  client: z.string(),
  produit: z.string(),
  colis: z.number().int().min(0),
  poids_brut: z.number().min(0),
  poids_net: z.number().min(0),
  prix_unitaire_net: z.number().min(0),
});

export const OcrFicheLotSchema = z.object({
  lignes: z.array(LigneVenteOcrSchema).min(1),
});
export type OcrFicheLotResult = z.infer<typeof OcrFicheLotSchema>;
export type LigneVenteOcr = z.infer<typeof LigneVenteOcrSchema>;

// --- OCR Status ---
export type OcrStatus = "idle" | "processing" | "success" | "error";

export interface OcrDocumentState {
  status: OcrStatus;
  error: string | null;
  resultCdv: OcrCdvResult | null;
  resultFicheLot: OcrFicheLotResult | null;
  rawResponse: string | null;
}
