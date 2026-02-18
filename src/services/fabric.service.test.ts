import { describe, it, expect } from "vitest";
import { computeDateRange } from "@/services/fabric.service";
import {
  mapFabricToCdvSession,
  mapDbRowToFabricCvEncours,
  FabricCvEncoursSchema,
  type FabricCvEncours,
  type FabricCvEncoursRow,
} from "@/types/fabric.types";

// --- mapFabricToCdvSession ---

describe("mapFabricToCdvSession", () => {
  it("should map all Fabric fields to CdvSession fields", () => {
    const fabric: FabricCvEncours = {
      FRAISUEP: 300,
      FRAISINTP: 200,
      PDSN_30: 8000,
      VALEUR_COMPTE_VENTE_30: 2.6,
      DATEHEUREBAE: "2026-01-12T10:30:00Z",
      REFINTERNE: "2026-0042-GR",
      EXPIMPNOM: "Client A",
      CLIFOUNOM: "Fournisseur XYZ",
      ORDRE: "2026-000156",
      TPFRTIDENT: "AB123CD",
    };

    const result = mapFabricToCdvSession(fabric);

    expect(result.fraisUe).toBe(300);
    expect(result.fraisInt).toBe(200);
    expect(result.poidsDeclare).toBe(8000);
    expect(result.prixDeclareKilo).toBe(2.6);
    expect(result.dateBae).toBe("2026-01-12");
    expect(result.dossier).toBe("2026-0042-GR");
    expect(result.fournisseur).toBe("Fournisseur XYZ");
    expect(result.numDeclaration).toBe("2026-000156");
    expect(result.fabricMatched).toBe(true);
  });

  it("should handle null values with defaults", () => {
    const fabric: FabricCvEncours = {
      FRAISUEP: null,
      FRAISINTP: null,
      PDSN_30: null,
      VALEUR_COMPTE_VENTE_30: null,
      DATEHEUREBAE: null,
      REFINTERNE: null,
      EXPIMPNOM: null,
      CLIFOUNOM: null,
      ORDRE: null,
      TPFRTIDENT: null,
    };

    const result = mapFabricToCdvSession(fabric);

    expect(result.fraisUe).toBe(0);
    expect(result.fraisInt).toBe(0);
    expect(result.poidsDeclare).toBe(0);
    expect(result.prixDeclareKilo).toBe(0);
    expect(result.dateBae).toBe("");
    expect(result.dossier).toBe("");
    expect(result.fournisseur).toBe("");
    expect(result.numDeclaration).toBe("");
    expect(result.fabricMatched).toBe(true);
  });

  it("should extract date part from ISO datetime", () => {
    const fabric: FabricCvEncours = {
      FRAISUEP: 0,
      FRAISINTP: 0,
      PDSN_30: 0,
      VALEUR_COMPTE_VENTE_30: 0,
      DATEHEUREBAE: "2026-03-15T14:22:00.000Z",
      REFINTERNE: "",
      EXPIMPNOM: "",
      CLIFOUNOM: "",
      ORDRE: "",
      TPFRTIDENT: "",
    };

    const result = mapFabricToCdvSession(fabric);
    expect(result.dateBae).toBe("2026-03-15");
  });
});

// --- mapDbRowToFabricCvEncours ---

describe("mapDbRowToFabricCvEncours", () => {
  it("should map snake_case DB row to UPPER_CASE Fabric type", () => {
    const row: FabricCvEncoursRow = {
      id: 1,
      fraisuep: 300,
      fraisintp: 200,
      pdsn_30: 8000,
      valeur_compte_vente_30: 2.6,
      dateheurebae: "2026-01-12T10:30:00Z",
      refinterne: "2026-0042-GR",
      expimpnom: "Client A",
      clifounom: "Fournisseur XYZ",
      ordre: "2026-000156",
      tpfrtident: "AB123CD",
      synced_at: "2026-01-15T10:00:00Z",
    };

    const result = mapDbRowToFabricCvEncours(row);

    expect(result.FRAISUEP).toBe(300);
    expect(result.FRAISINTP).toBe(200);
    expect(result.PDSN_30).toBe(8000);
    expect(result.VALEUR_COMPTE_VENTE_30).toBe(2.6);
    expect(result.DATEHEUREBAE).toBe("2026-01-12T10:30:00Z");
    expect(result.REFINTERNE).toBe("2026-0042-GR");
    expect(result.EXPIMPNOM).toBe("Client A");
    expect(result.CLIFOUNOM).toBe("Fournisseur XYZ");
    expect(result.ORDRE).toBe("2026-000156");
    expect(result.TPFRTIDENT).toBe("AB123CD");
  });

  it("should handle null values", () => {
    const row: FabricCvEncoursRow = {
      id: 2,
      fraisuep: null,
      fraisintp: null,
      pdsn_30: null,
      valeur_compte_vente_30: null,
      dateheurebae: null,
      refinterne: null,
      expimpnom: null,
      clifounom: null,
      ordre: null,
      tpfrtident: null,
      synced_at: "2026-01-15T10:00:00Z",
    };

    const result = mapDbRowToFabricCvEncours(row);

    expect(result.FRAISUEP).toBeNull();
    expect(result.DATEHEUREBAE).toBeNull();
    expect(result.EXPIMPNOM).toBeNull();
  });
});

// --- FabricCvEncoursSchema ---

describe("FabricCvEncoursSchema", () => {
  it("should validate a complete Fabric row", () => {
    const row = {
      FRAISUEP: 300,
      FRAISINTP: 200,
      PDSN_30: 8000,
      VALEUR_COMPTE_VENTE_30: 2.6,
      DATEHEUREBAE: "2026-01-12T10:30:00Z",
      REFINTERNE: "2026-0042-GR",
      EXPIMPNOM: "Client A",
      CLIFOUNOM: "Fournisseur XYZ",
      ORDRE: "2026-000156",
      TPFRTIDENT: "AB123CD",
    };

    const result = FabricCvEncoursSchema.parse(row);
    expect(result.FRAISUEP).toBe(300);
  });

  it("should accept null values", () => {
    const row = {
      FRAISUEP: null,
      FRAISINTP: null,
      PDSN_30: null,
      VALEUR_COMPTE_VENTE_30: null,
      DATEHEUREBAE: null,
      REFINTERNE: null,
      EXPIMPNOM: null,
      CLIFOUNOM: null,
      ORDRE: null,
      TPFRTIDENT: null,
    };

    const result = FabricCvEncoursSchema.parse(row);
    expect(result.FRAISUEP).toBeNull();
  });

  it("should reject invalid types", () => {
    const row = {
      FRAISUEP: "not a number",
      FRAISINTP: 0,
      PDSN_30: 0,
      VALEUR_COMPTE_VENTE_30: 0,
      DATEHEUREBAE: null,
      REFINTERNE: null,
      EXPIMPNOM: null,
      CLIFOUNOM: null,
      ORDRE: null,
      TPFRTIDENT: null,
    };

    expect(() => FabricCvEncoursSchema.parse(row)).toThrow();
  });
});

// --- computeDateRange ---

describe("computeDateRange", () => {
  it("should compute ±3 days range", () => {
    const result = computeDateRange("2026-01-15");

    expect(result.dateFrom).toBe("2026-01-12");
    expect(result.dateTo).toBe("2026-01-18");
  });

  it("should handle month boundaries", () => {
    const result = computeDateRange("2026-03-02");

    expect(result.dateFrom).toBe("2026-02-27");
    expect(result.dateTo).toBe("2026-03-05");
  });

  it("should handle year boundaries", () => {
    const result = computeDateRange("2026-01-01");

    expect(result.dateFrom).toBe("2025-12-29");
    expect(result.dateTo).toBe("2026-01-04");
  });
});
