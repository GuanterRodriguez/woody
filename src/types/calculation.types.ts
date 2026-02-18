export interface CalculatedLine {
  client: string;
  produit: string;
  colis: number;
  poidsBrut: number;
  poidsNet: number;
  prixUnitaireNet: number;
  totalLigne: number; // poidsNet * prixUnitaireNet, rounded to 2 decimals
}

export interface CalculationResult {
  // Lignes
  lignes: CalculatedLine[];
  totalColis: number;
  totalPoidsBrut: number; // 1 decimal
  totalPoidsNet: number; // 1 decimal
  totalVentes: number; // 2 decimals

  // Frais
  fraisTransit: number;
  fraisCommission: number;
  autreFrais: number;
  fraisUe: number;
  fraisInt: number;
  totalFrais: number; // 2 decimals

  // Recapitulatif
  prixUnitaireRetenu: number; // prix avec le plus de poids vendu, 2 decimals
  netAPayer: number; // totalVentes - totalFrais, 2 decimals

  // Poids
  poidsDeclare: number; // 1 decimal
  poidsVendu: number; // = totalPoidsNet, 1 decimal
  ecartPoids: number; // poidsVendu - poidsDeclare, 1 decimal

  // Comparatif déclaré vs calcul
  valeurDeclaree: number; // poidsDeclare * prixDeclareKilo, 2 decimals
  valeurBrute: number; // prixUnitaireRetenu * poidsDeclare, 2 decimals
  valeurNette: number; // valeurBrute - totalFrais, 2 decimals
  ecartValeur: number; // valeurDeclaree - valeurNette, 2 decimals (>0 = REPORTER, <=0 = MAINTENU)
}
