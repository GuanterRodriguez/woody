import { describe, it, expect } from "vitest";
import { calculateCdv } from "./calculation.engine";
import type { LigneVente } from "@/types/cdv.types";

function makeSession(overrides: Partial<Parameters<typeof calculateCdv>[0]> = {}) {
  return {
    fraisTransit: 1500,
    fraisCommission: 2000,
    autreFrais: 350,
    fraisUe: 300,
    fraisInt: 200,
    poidsDeclare: 8000,
    prixDeclareKilo: 2.5,
    ...overrides,
  };
}

function makeLigne(overrides: Partial<LigneVente> = {}): LigneVente {
  return {
    id: "test-id",
    cdvSessionId: "session-id",
    client: "Client A",
    produit: "Mangues",
    colis: 10,
    poidsBrut: 110,
    poidsNet: 100,
    prixUnitaireNet: 2.5,
    ordre: 1,
    ...overrides,
  };
}

describe("calculateCdv", () => {
  it("calculates correct totals for nominal case with 3 lines", () => {
    const session = makeSession();
    const lignes = [
      makeLigne({ colis: 20, poidsBrut: 2200, poidsNet: 2000, prixUnitaireNet: 2.5, ordre: 1 }),
      makeLigne({ colis: 30, poidsBrut: 3300, poidsNet: 3000, prixUnitaireNet: 3.0, ordre: 2 }),
      makeLigne({ colis: 30, poidsBrut: 3300, poidsNet: 3000, prixUnitaireNet: 2.0, ordre: 3 }),
    ];

    const result = calculateCdv(session, lignes);

    expect(result.totalColis).toBe(80);
    expect(result.totalPoidsNet).toBe(8000);
    expect(result.totalPoidsBrut).toBe(8800);
    // Line totals: 2000*2.5=5000, 3000*3=9000, 3000*2=6000
    expect(result.totalVentes).toBe(20000);
    expect(result.totalFrais).toBe(4350);
    expect(result.netAPayer).toBe(15650);
  });

  it("returns zeros for empty lignes array", () => {
    const session = makeSession({ fraisTransit: 0, fraisCommission: 0, autreFrais: 0, fraisUe: 0, fraisInt: 0 });
    const result = calculateCdv(session, []);

    expect(result.lignes).toHaveLength(0);
    expect(result.totalColis).toBe(0);
    expect(result.totalPoidsNet).toBe(0);
    expect(result.totalVentes).toBe(0);
    expect(result.totalFrais).toBe(0);
    expect(result.netAPayer).toBe(0);
  });

  it("calculates correctly for a single ligne", () => {
    const session = makeSession({ fraisTransit: 100, fraisCommission: 0, autreFrais: 0, fraisUe: 0, fraisInt: 0 });
    const lignes = [makeLigne({ poidsNet: 500, prixUnitaireNet: 3.0 })];

    const result = calculateCdv(session, lignes);

    expect(result.lignes[0]?.totalLigne).toBe(1500);
    expect(result.totalVentes).toBe(1500);
    expect(result.totalFrais).toBe(100);
    expect(result.netAPayer).toBe(1400);
  });

  it("returns totalVentes as net when all frais are zero", () => {
    const session = makeSession({ fraisTransit: 0, fraisCommission: 0, autreFrais: 0, fraisUe: 0, fraisInt: 0 });
    const lignes = [makeLigne({ poidsNet: 1000, prixUnitaireNet: 5.0 })];

    const result = calculateCdv(session, lignes);

    expect(result.totalFrais).toBe(0);
    expect(result.netAPayer).toBe(5000);
  });

  it("produces negative net when frais exceed ventes", () => {
    const session = makeSession({ fraisTransit: 10000, fraisCommission: 5000, autreFrais: 0, fraisUe: 0, fraisInt: 0 });
    const lignes = [makeLigne({ poidsNet: 100, prixUnitaireNet: 2.0 })];

    const result = calculateCdv(session, lignes);

    expect(result.totalVentes).toBe(200);
    expect(result.totalFrais).toBe(15000);
    expect(result.netAPayer).toBe(-14800);
  });

  it("rounds money to 2 decimals correctly", () => {
    const session = makeSession({ fraisTransit: 0, fraisCommission: 0, autreFrais: 0, fraisUe: 0, fraisInt: 0 });
    // 333 * 1.01 = 336.33
    const lignes = [makeLigne({ poidsNet: 333, prixUnitaireNet: 1.01 })];

    const result = calculateCdv(session, lignes);

    expect(result.lignes[0]?.totalLigne).toBe(336.33);
    expect(result.totalVentes).toBe(336.33);
  });

  it("handles large numbers without overflow", () => {
    const session = makeSession({ fraisTransit: 100000, fraisCommission: 50000, autreFrais: 25000, fraisUe: 10000, fraisInt: 5000 });
    const lignes = [
      makeLigne({ colis: 500, poidsBrut: 55000, poidsNet: 50000, prixUnitaireNet: 10.0, ordre: 1 }),
      makeLigne({ colis: 500, poidsBrut: 55000, poidsNet: 50000, prixUnitaireNet: 10.0, ordre: 2 }),
    ];

    const result = calculateCdv(session, lignes);

    expect(result.totalColis).toBe(1000);
    expect(result.totalVentes).toBe(1000000);
    expect(result.totalFrais).toBe(190000);
    expect(result.netAPayer).toBe(810000);
  });

  it("calculates positive ecart poids when vendu > declare", () => {
    const session = makeSession({ poidsDeclare: 5000 });
    const lignes = [makeLigne({ poidsNet: 6000 })];

    const result = calculateCdv(session, lignes);

    expect(result.poidsVendu).toBe(6000);
    expect(result.poidsDeclare).toBe(5000);
    expect(result.ecartPoids).toBe(1000);
  });

  it("calculates negative ecart poids when vendu < declare", () => {
    const session = makeSession({ poidsDeclare: 10000 });
    const lignes = [makeLigne({ poidsNet: 7500 })];

    const result = calculateCdv(session, lignes);

    expect(result.poidsVendu).toBe(7500);
    expect(result.ecartPoids).toBe(-2500);
  });

  it("handles zero poidsDeclare with ecart = poidsVendu", () => {
    const session = makeSession({ poidsDeclare: 0 });
    const lignes = [makeLigne({ poidsNet: 3000 })];

    const result = calculateCdv(session, lignes);

    expect(result.poidsDeclare).toBe(0);
    expect(result.poidsVendu).toBe(3000);
    expect(result.ecartPoids).toBe(3000);
  });

  it("picks prix unitaire retenu from price group with most total weight", () => {
    const session = makeSession();
    const lignes = [
      makeLigne({ poidsNet: 640, prixUnitaireNet: 1.38, ordre: 1 }),
      makeLigne({ poidsNet: 640, prixUnitaireNet: 1.5, ordre: 2 }),
      makeLigne({ poidsNet: 200, prixUnitaireNet: 1.38, ordre: 3 }),
    ];

    const result = calculateCdv(session, lignes);

    // prix 1.38: 640+200=840kg, prix 1.50: 640kg → retenu = 1.38
    expect(result.prixUnitaireRetenu).toBe(1.38);
  });

  it("returns 0 for prixUnitaireRetenu when no lignes", () => {
    const session = makeSession();
    const result = calculateCdv(session, []);

    expect(result.prixUnitaireRetenu).toBe(0);
  });

  it("returns the only price as prixUnitaireRetenu for single ligne", () => {
    const session = makeSession();
    const lignes = [makeLigne({ poidsNet: 500, prixUnitaireNet: 3.0 })];

    const result = calculateCdv(session, lignes);

    expect(result.prixUnitaireRetenu).toBe(3.0);
  });

  it("calculates comparatif declare vs calcul - MAINTENU", () => {
    const session = makeSession({
      poidsDeclare: 1280,
      prixDeclareKilo: 1.3,
      fraisTransit: 38.64,
      fraisCommission: 443.88,
      autreFrais: 56,
      fraisUe: 158,
      fraisInt: 8,
    });
    const lignes = [
      makeLigne({ poidsNet: 640, prixUnitaireNet: 1.38, ordre: 1 }),
      makeLigne({ poidsNet: 640, prixUnitaireNet: 1.5, ordre: 2 }),
    ];

    const result = calculateCdv(session, lignes);

    // valeurDeclaree = 1280 * 1.3 = 1664
    expect(result.valeurDeclaree).toBe(1664);
    // prixUnitaireRetenu = 1.38 (both have 640kg, first wins)
    // valeurBrute = 1.38 * 1280 = 1766.40
    expect(result.valeurBrute).toBe(1766.4);
    // totalFrais = 38.64 + 443.88 + 56 + 158 + 8 = 704.52
    // valeurNette = 1766.40 - 704.52 = 1061.88
    expect(result.valeurNette).toBe(1061.88);
    // ecartValeur = 1664 - 1061.88 = 602.12 (>0 = MAINTENU)
    expect(result.ecartValeur).toBe(602.12);
  });

  it("calculates comparatif declare vs calcul - REPORTER", () => {
    const session = makeSession({
      poidsDeclare: 1000,
      prixDeclareKilo: 1.0,
      fraisTransit: 0,
      fraisCommission: 0,
      autreFrais: 0,
      fraisUe: 0,
      fraisInt: 0,
    });
    const lignes = [
      makeLigne({ poidsNet: 1000, prixUnitaireNet: 3.0 }),
    ];

    const result = calculateCdv(session, lignes);

    // valeurDeclaree = 1000 * 1.0 = 1000
    expect(result.valeurDeclaree).toBe(1000);
    // valeurBrute = 3.0 * 1000 = 3000
    expect(result.valeurBrute).toBe(3000);
    // valeurNette = 3000 - 0 = 3000
    expect(result.valeurNette).toBe(3000);
    // ecartValeur = 1000 - 3000 = -2000 (<0 = REPORTER)
    expect(result.ecartValeur).toBe(-2000);
  });
});
