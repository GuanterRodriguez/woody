import { z } from "zod";
import type { CdvSession } from "@/types/cdv.types";

// --- Zod schemas for Fabric CVENCOURS data ---

export const FabricCvEncoursSchema = z.object({
  FRAISUEP: z.number().nullable(),
  FRAISINTP: z.number().nullable(),
  PDSN_30: z.number().nullable(),
  VALEUR_COMPTE_VENTE_30: z.number().nullable(),
  DATEHEUREBAE: z.string().nullable(),
  REFINTERNE: z.string().nullable(),
  EXPIMPNOM: z.string().nullable(),
  CLIFOUNOM: z.string().nullable(),
  ORDRE: z.string().nullable(),
  TPFRTIDENT: z.string().nullable(),
});

export type FabricCvEncours = z.infer<typeof FabricCvEncoursSchema>;

export const FabricCvEncoursArraySchema = z.array(FabricCvEncoursSchema);

// --- GraphQL response schema (Fabric GraphQL API) ---

export const FabricGraphqlResponseSchema = z.object({
  data: z.object({
    cv_encours: z.object({
      items: z.array(FabricCvEncoursSchema),
      hasNextPage: z.boolean().optional(),
      endCursor: z.string().nullable().optional(),
    }),
  }),
});

export type FabricGraphqlResponse = z.infer<typeof FabricGraphqlResponseSchema>;

// --- Local DB row type (snake_case columns from SQLite cache) ---

export interface FabricCvEncoursRow {
  id: number;
  fraisuep: number | null;
  fraisintp: number | null;
  pdsn_30: number | null;
  valeur_compte_vente_30: number | null;
  dateheurebae: string | null;
  refinterne: string | null;
  expimpnom: string | null;
  clifounom: string | null;
  ordre: string | null;
  tpfrtident: string | null;
  synced_at: string;
}

export function mapDbRowToFabricCvEncours(
  row: FabricCvEncoursRow,
): FabricCvEncours {
  return {
    FRAISUEP: row.fraisuep,
    FRAISINTP: row.fraisintp,
    PDSN_30: row.pdsn_30,
    VALEUR_COMPTE_VENTE_30: row.valeur_compte_vente_30,
    DATEHEUREBAE: row.dateheurebae,
    REFINTERNE: row.refinterne,
    EXPIMPNOM: row.expimpnom,
    CLIFOUNOM: row.clifounom,
    ORDRE: row.ordre,
    TPFRTIDENT: row.tpfrtident,
  };
}

// --- Match result ---

export interface FabricMatchResult {
  declarations: FabricCvEncours[];
  matchCount: number;
}

// --- Fabric connection status ---

export type FabricConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

// --- Mapping function: Fabric row → CdvSession partial ---

export function mapFabricToCdvSession(
  fabric: FabricCvEncours,
): Partial<CdvSession> {
  return {
    fraisUe: fabric.FRAISUEP ?? 0,
    fraisInt: fabric.FRAISINTP ?? 0,
    poidsDeclare: fabric.PDSN_30 ?? 0,
    prixDeclareKilo: fabric.VALEUR_COMPTE_VENTE_30 ?? 0,
    dateBae: fabric.DATEHEUREBAE?.split("T")[0] ?? "",
    dossier: fabric.REFINTERNE ?? "",
    fournisseur: fabric.CLIFOUNOM ?? "",
    numDeclaration: fabric.ORDRE ?? "",
    fabricMatched: true,
  };
}

// --- Match parameters ---

export interface FabricMatchParams {
  camion: string;
  dateArrivee: string;
  client: string;
}

// --- Zod schemas for Fabric CV_CLOTURE (minimal: lookup only) ---

export const FabricCvClotureSchema = z.object({
  DOSSIER: z.string().nullable(),
  REFINTERNE: z.string().nullable(),
});

export type FabricCvCloture = z.infer<typeof FabricCvClotureSchema>;

export const FabricCvClotureGraphqlResponseSchema = z.object({
  data: z.object({
    cv_cloture: z.object({
      items: z.array(FabricCvClotureSchema),
      hasNextPage: z.boolean().optional(),
      endCursor: z.string().nullable().optional(),
    }),
  }),
});

export type FabricCvClotureGraphqlResponse = z.infer<
  typeof FabricCvClotureGraphqlResponseSchema
>;

export interface FabricCvClotureRow {
  id: number;
  dossier: string | null;
  refinterne: string | null;
  synced_at: string;
}
