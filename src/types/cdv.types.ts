export type CdvStatut =
  | "brouillon"
  | "ocr_en_cours"
  | "a_corriger"
  | "valide"
  | "genere"
  | "cloture";

export interface CdvSession {
  id: string;
  statut: CdvStatut;
  produit: string;
  numeroLot: string; // Numéro de lot (extrait par lightweight OCR)
  camion: string;
  dateArrivee: string;
  fraisTransit: number;
  fraisCommission: number;
  autreFrais: number;
  fraisUe: number;
  fraisInt: number;
  poidsDeclare: number;
  prixDeclareKilo: number;
  dateBae: string;
  dossier: string;
  client: string;
  fournisseur: string;
  numDeclaration: string;
  pdfCdvPath: string;
  pdfFicheLotPath: string;
  ocrRawCdv: string;
  ocrRawFiche: string;
  fabricMatched: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LigneVente {
  id: string;
  cdvSessionId: string;
  client: string;
  produit: string;
  colis: number;
  poidsBrut: number;
  poidsNet: number;
  prixUnitaireNet: number;
  ordre: number;
}

export interface DocumentGenere {
  id: string;
  cdvSessionId: string;
  type: "calcul" | "cdv_reconstitue" | "fiche_lot_reconstituee";
  filePath: string;
  generatedAt: string;
}
