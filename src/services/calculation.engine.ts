import type { CdvSession, LigneVente } from "@/types/cdv.types";
import type {
  CalculatedLine,
  CalculationResult,
} from "@/types/calculation.types";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundWeight(value: number): number {
  return Math.round(value * 10) / 10;
}

type CalculationSessionInput = Pick<
  CdvSession,
  | "fraisTransit"
  | "fraisCommission"
  | "autreFrais"
  | "fraisUe"
  | "fraisInt"
  | "poidsDeclare"
  | "prixDeclareKilo"
>;

export function calculateCdv(
  session: CalculationSessionInput,
  lignes: LigneVente[],
): CalculationResult {
  // Calculate per-line totals
  const calculatedLignes: CalculatedLine[] = lignes.map((l) => ({
    client: l.client,
    produit: l.produit,
    colis: l.colis,
    poidsBrut: l.poidsBrut,
    poidsNet: l.poidsNet,
    prixUnitaireNet: l.prixUnitaireNet,
    totalLigne: roundMoney(l.poidsNet * l.prixUnitaireNet),
  }));

  // Aggregate line totals
  let totalColis = 0;
  let totalPoidsBrut = 0;
  let totalPoidsNet = 0;
  let totalVentes = 0;
  for (const cl of calculatedLignes) {
    totalColis += cl.colis;
    totalPoidsBrut += cl.poidsBrut;
    totalPoidsNet += cl.poidsNet;
    totalVentes += cl.totalLigne;
  }

  // Fees
  const totalFrais = roundMoney(
    session.fraisTransit +
      session.fraisCommission +
      session.autreFrais +
      session.fraisUe +
      session.fraisInt,
  );

  // Prix unitaire retenu: prix avec le plus de poids net total
  let prixUnitaireRetenu = 0;
  if (lignes.length > 0) {
    const poidsParPrix = new Map<number, number>();
    for (const l of lignes) {
      const current = poidsParPrix.get(l.prixUnitaireNet) ?? 0;
      poidsParPrix.set(l.prixUnitaireNet, current + l.poidsNet);
    }
    let maxPoids = 0;
    for (const [prix, poids] of poidsParPrix) {
      if (poids > maxPoids) {
        maxPoids = poids;
        prixUnitaireRetenu = prix;
      }
    }
  }

  // Net
  const netAPayer = roundMoney(totalVentes - totalFrais);

  // Weight
  const poidsVendu = roundWeight(totalPoidsNet);
  const ecartPoids = roundWeight(poidsVendu - session.poidsDeclare);

  // Comparatif déclaré vs calcul
  const valeurDeclaree = roundMoney(session.poidsDeclare * session.prixDeclareKilo);
  const valeurBrute = roundMoney(prixUnitaireRetenu * session.poidsDeclare);
  const valeurNette = roundMoney(valeurBrute - totalFrais);
  const ecartValeur = roundMoney(valeurDeclaree - valeurNette);

  return {
    lignes: calculatedLignes,
    totalColis,
    totalPoidsBrut: roundWeight(totalPoidsBrut),
    totalPoidsNet: roundWeight(totalPoidsNet),
    totalVentes: roundMoney(totalVentes),
    fraisTransit: session.fraisTransit,
    fraisCommission: session.fraisCommission,
    autreFrais: session.autreFrais,
    fraisUe: session.fraisUe,
    fraisInt: session.fraisInt,
    totalFrais,
    prixUnitaireRetenu,
    netAPayer,
    poidsDeclare: session.poidsDeclare,
    poidsVendu,
    ecartPoids,
    valeurDeclaree,
    valeurBrute,
    valeurNette,
    ecartValeur,
  };
}
