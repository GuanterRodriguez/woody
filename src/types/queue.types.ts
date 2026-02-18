export type QueueItemStatus =
  | "pending"
  | "ocr_cdv"
  | "ocr_fiche"
  | "done"
  | "error";

export interface QueueItem {
  dossierSessionId: string;
  produit: string;
  client: string;
  pdfCdvDocId: string;
  pdfFicheDocId: string;
  status: QueueItemStatus;
  error: string | null;
  currentStep: string | null;
}
