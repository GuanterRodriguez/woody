import { describe, it, expect } from "vitest";
import { extractJsonFromText } from "./n8n.service";
import {
  OcrCdvSchema,
  OcrFicheLotSchema,
  LigneVenteOcrSchema,
} from "@/types/ocr.types";
import { N8nOcrResponseSchema } from "@/types/n8n.types";

// --- extractJsonFromText ---

describe("extractJsonFromText", () => {
  it("extracts raw JSON object", () => {
    const input = '{"camion": "AB123", "date_arrivee": "2026-01-15"}';
    expect(extractJsonFromText(input)).toBe(input);
  });

  it("extracts JSON from ```json code fence", () => {
    const json = '{"camion": "AB123"}';
    const input = `\`\`\`json\n${json}\n\`\`\``;
    expect(extractJsonFromText(input)).toBe(json);
  });

  it("extracts JSON from ``` code fence without language tag", () => {
    const json = '{"camion": "AB123"}';
    const input = `\`\`\`\n${json}\n\`\`\``;
    expect(extractJsonFromText(input)).toBe(json);
  });

  it("extracts JSON surrounded by text", () => {
    const input = 'Here is the result:\n{"camion": "AB123"}\nEnd of result.';
    expect(extractJsonFromText(input)).toBe('{"camion": "AB123"}');
  });

  it("returns raw text when no JSON found", () => {
    const input = "No JSON here";
    expect(extractJsonFromText(input)).toBe("No JSON here");
  });

  it("handles multiline JSON", () => {
    const json = `{
  "camion": "AB123",
  "date_arrivee": "2026-01-15"
}`;
    const input = `\`\`\`json\n${json}\n\`\`\``;
    const result = extractJsonFromText(input);
    expect(JSON.parse(result)).toEqual({
      camion: "AB123",
      date_arrivee: "2026-01-15",
    });
  });
});

// --- N8nOcrResponseSchema validation ---

describe("N8nOcrResponseSchema", () => {
  const validResponse = {
    sessionId: "test-session-id",
    cdv: {
      camion: "AB123CD",
      date_arrivee: "2026-01-15",
      frais_transit: 1500.5,
      frais_commission: 2000.0,
      autre_frais: 350.0,
    },
    fiche: {
      lignes: [
        {
          client: "Client A",
          produit: "Mangues",
          colis: 10,
          poids_brut: 150.5,
          poids_net: 140.0,
          prix_unitaire_net: 2.5,
        },
      ],
    },
  };

  it("parses valid n8n response", () => {
    const result = N8nOcrResponseSchema.parse(validResponse);
    expect(result.sessionId).toBe("test-session-id");
    expect(result.cdv.camion).toBe("AB123CD");
    expect(result.fiche.lignes).toHaveLength(1);
  });

  it("rejects missing sessionId", () => {
    const { sessionId: _, ...incomplete } = validResponse;
    void _;
    expect(() => {
      N8nOcrResponseSchema.parse(incomplete);
    }).toThrow();
  });

  it("rejects missing cdv", () => {
    const { cdv: _, ...incomplete } = validResponse;
    void _;
    expect(() => {
      N8nOcrResponseSchema.parse(incomplete);
    }).toThrow();
  });

  it("rejects missing fiche", () => {
    const { fiche: _, ...incomplete } = validResponse;
    void _;
    expect(() => {
      N8nOcrResponseSchema.parse(incomplete);
    }).toThrow();
  });
});

// --- OcrCdvSchema validation ---

describe("OcrCdvSchema", () => {
  const validCdvData = {
    camion: "AB123CD",
    date_arrivee: "2026-01-15",
    frais_transit: 1500.5,
    frais_commission: 2000.0,
    autre_frais: 350.0,
  };

  it("parses valid CDV data", () => {
    const result = OcrCdvSchema.parse(validCdvData);
    expect(result).toEqual(validCdvData);
  });

  it("rejects empty camion", () => {
    expect(() => {
      OcrCdvSchema.parse({ ...validCdvData, camion: "" });
    }).toThrow();
  });

  it("rejects missing camion field", () => {
    const { camion: _, ...incomplete } = validCdvData;
    void _;
    expect(() => {
      OcrCdvSchema.parse(incomplete);
    }).toThrow();
  });

  it("rejects invalid date format", () => {
    expect(() => {
      OcrCdvSchema.parse({ ...validCdvData, date_arrivee: "15/01/2026" });
    }).toThrow();
  });

  it("rejects negative frais_transit", () => {
    expect(() => {
      OcrCdvSchema.parse({ ...validCdvData, frais_transit: -100 });
    }).toThrow();
  });

  it("rejects negative frais_commission", () => {
    expect(() => {
      OcrCdvSchema.parse({ ...validCdvData, frais_commission: -50 });
    }).toThrow();
  });

  it("rejects string instead of number for frais", () => {
    expect(() => {
      OcrCdvSchema.parse({ ...validCdvData, frais_transit: "1500" });
    }).toThrow();
  });

  it("accepts zero frais values", () => {
    const result = OcrCdvSchema.parse({
      ...validCdvData,
      frais_transit: 0,
      frais_commission: 0,
      autre_frais: 0,
    });
    expect(result.frais_transit).toBe(0);
  });
});

// --- OcrFicheLotSchema validation ---

describe("OcrFicheLotSchema", () => {
  const validLigne = {
    client: "Client A",
    produit: "Mangues",
    colis: 10,
    poids_brut: 150.5,
    poids_net: 140.0,
    prix_unitaire_net: 2.5,
  };

  const validFicheData = {
    lignes: [validLigne],
  };

  it("parses valid fiche de lot data", () => {
    const result = OcrFicheLotSchema.parse(validFicheData);
    expect(result.lignes).toHaveLength(1);
    expect(result.lignes[0]).toEqual(validLigne);
  });

  it("parses multiple lignes", () => {
    const data = {
      lignes: [
        validLigne,
        { ...validLigne, client: "Client B", colis: 5 },
      ],
    };
    const result = OcrFicheLotSchema.parse(data);
    expect(result.lignes).toHaveLength(2);
  });

  it("rejects empty lignes array", () => {
    expect(() => {
      OcrFicheLotSchema.parse({ lignes: [] });
    }).toThrow();
  });

  it("rejects missing lignes field", () => {
    expect(() => {
      OcrFicheLotSchema.parse({});
    }).toThrow();
  });
});

// --- LigneVenteOcrSchema validation ---

describe("LigneVenteOcrSchema", () => {
  const validLigne = {
    client: "Client A",
    produit: "Mangues",
    colis: 10,
    poids_brut: 150.5,
    poids_net: 140.0,
    prix_unitaire_net: 2.5,
  };

  it("rejects negative poids_brut", () => {
    expect(() => {
      LigneVenteOcrSchema.parse({ ...validLigne, poids_brut: -10 });
    }).toThrow();
  });

  it("rejects negative poids_net", () => {
    expect(() => {
      LigneVenteOcrSchema.parse({ ...validLigne, poids_net: -5 });
    }).toThrow();
  });

  it("rejects negative prix_unitaire_net", () => {
    expect(() => {
      LigneVenteOcrSchema.parse({ ...validLigne, prix_unitaire_net: -1 });
    }).toThrow();
  });

  it("rejects non-integer colis", () => {
    expect(() => {
      LigneVenteOcrSchema.parse({ ...validLigne, colis: 10.5 });
    }).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => {
      LigneVenteOcrSchema.parse({ client: "A" });
    }).toThrow();
  });

  it("accepts zero values", () => {
    const result = LigneVenteOcrSchema.parse({
      ...validLigne,
      colis: 0,
      poids_brut: 0,
      poids_net: 0,
      prix_unitaire_net: 0,
    });
    expect(result.colis).toBe(0);
  });
});
