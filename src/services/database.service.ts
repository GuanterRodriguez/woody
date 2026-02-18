import Database from "@tauri-apps/plugin-sql";
import { WoodyError } from "@/types/errors";
import { v4 as uuidv4 } from "uuid";
import type {
  CdvSession,
  CdvStatut,
  DocumentGenere,
  LigneVente,
} from "@/types/cdv.types";
import {
  mapDbRowToFabricCvEncours,
  type FabricCvEncours,
  type FabricCvEncoursRow,
  type FabricCvClotureRow,
} from "@/types/fabric.types";

let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (db) return db;
  try {
    db = await Database.load("sqlite:woody.db");
    return db;
  } catch (error) {
    throw new WoodyError(
      "Impossible de charger la base de donnees",
      "DB_LOAD_FAILED",
      error,
    );
  }
}

export async function initDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.execute(`
    CREATE TABLE IF NOT EXISTS cdv_sessions (
      id TEXT PRIMARY KEY,
      statut TEXT NOT NULL DEFAULT 'brouillon',
      produit TEXT NOT NULL DEFAULT '',
      numero_lot TEXT NOT NULL DEFAULT '',
      camion TEXT NOT NULL DEFAULT '',
      date_arrivee TEXT NOT NULL DEFAULT '',
      frais_transit REAL NOT NULL DEFAULT 0,
      frais_commission REAL NOT NULL DEFAULT 0,
      autre_frais REAL NOT NULL DEFAULT 0,
      frais_ue REAL NOT NULL DEFAULT 0,
      frais_int REAL NOT NULL DEFAULT 0,
      poids_declare REAL NOT NULL DEFAULT 0,
      prix_declare_kilo REAL NOT NULL DEFAULT 0,
      date_bae TEXT NOT NULL DEFAULT '',
      dossier TEXT NOT NULL DEFAULT '',
      client TEXT NOT NULL DEFAULT '',
      fournisseur TEXT NOT NULL DEFAULT '',
      num_declaration TEXT NOT NULL DEFAULT '',
      pdf_cdv_path TEXT NOT NULL DEFAULT '',
      pdf_fiche_lot_path TEXT NOT NULL DEFAULT '',
      ocr_raw_cdv TEXT NOT NULL DEFAULT '',
      ocr_raw_fiche TEXT NOT NULL DEFAULT '',
      fabric_matched INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Migration: Add numero_lot column to existing databases
  try {
    await database.execute(`
      ALTER TABLE cdv_sessions ADD COLUMN numero_lot TEXT NOT NULL DEFAULT ''
    `);
  } catch {
    // Column already exists, ignore error
  }

  await database.execute(`
    CREATE TABLE IF NOT EXISTS lignes_vente (
      id TEXT PRIMARY KEY,
      cdv_session_id TEXT NOT NULL,
      client TEXT NOT NULL DEFAULT '',
      produit TEXT NOT NULL DEFAULT '',
      colis INTEGER NOT NULL DEFAULT 0,
      poids_brut REAL NOT NULL DEFAULT 0,
      poids_net REAL NOT NULL DEFAULT 0,
      prix_unitaire_net REAL NOT NULL DEFAULT 0,
      ordre INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (cdv_session_id) REFERENCES cdv_sessions(id) ON DELETE CASCADE
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS documents_generes (
      id TEXT PRIMARY KEY,
      cdv_session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      file_path TEXT NOT NULL DEFAULT '',
      generated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (cdv_session_id) REFERENCES cdv_sessions(id) ON DELETE CASCADE
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS fabric_cv_encours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fraisuep REAL,
      fraisintp REAL,
      pdsn_30 REAL,
      valeur_compte_vente_30 REAL,
      dateheurebae TEXT,
      refinterne TEXT,
      expimpnom TEXT,
      clifounom TEXT,
      ordre TEXT,
      tpfrtident TEXT,
      synced_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS fabric_cv_cloture (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dossier TEXT,
      refinterne TEXT,
      synced_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS user_activity (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      last_seen_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(entity_type, entity_id)
    )
  `);

  // Performance indexes
  await database.execute(`
    CREATE INDEX IF NOT EXISTS idx_cdv_statut ON cdv_sessions(statut)
  `);

  await database.execute(`
    CREATE INDEX IF NOT EXISTS idx_cdv_fabric_matched ON cdv_sessions(fabric_matched)
  `);

  await database.execute(`
    CREATE INDEX IF NOT EXISTS idx_activity_lookup ON user_activity(entity_type, entity_id)
  `);
}

// --- CdvSession CRUD ---

function mapRowToCdvSession(row: Record<string, unknown>): CdvSession {
  return {
    id: row["id"] as string,
    statut: row["statut"] as CdvSession["statut"],
    produit: row["produit"] as string,
    numeroLot: row["numero_lot"] as string,
    camion: row["camion"] as string,
    dateArrivee: row["date_arrivee"] as string,
    fraisTransit: row["frais_transit"] as number,
    fraisCommission: row["frais_commission"] as number,
    autreFrais: row["autre_frais"] as number,
    fraisUe: row["frais_ue"] as number,
    fraisInt: row["frais_int"] as number,
    poidsDeclare: row["poids_declare"] as number,
    prixDeclareKilo: row["prix_declare_kilo"] as number,
    dateBae: row["date_bae"] as string,
    dossier: row["dossier"] as string,
    client: row["client"] as string,
    fournisseur: row["fournisseur"] as string,
    numDeclaration: row["num_declaration"] as string,
    pdfCdvPath: row["pdf_cdv_path"] as string,
    pdfFicheLotPath: row["pdf_fiche_lot_path"] as string,
    ocrRawCdv: row["ocr_raw_cdv"] as string,
    ocrRawFiche: row["ocr_raw_fiche"] as string,
    fabricMatched: (row["fabric_matched"] as number) === 1,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
  };
}

export interface CreateDossierParams {
  id: string;
  produit: string;
  client: string;
  pdfCdvPath: string;
  pdfFicheLotPath: string;
  numeroLot?: string; // Optional: extrait par lightweight OCR
}

export async function createDossier(
  params: CreateDossierParams,
): Promise<CdvSession> {
  try {
    const database = await getDatabase();
    await database.execute(
      `INSERT INTO cdv_sessions (id, statut, produit, client, pdf_cdv_path, pdf_fiche_lot_path, numero_lot)
       VALUES ($1, 'brouillon', $2, $3, $4, $5, $6)`,
      [
        params.id,
        params.produit,
        params.client,
        params.pdfCdvPath,
        params.pdfFicheLotPath,
        params.numeroLot || "",
      ],
    );
    const result = await getCdvSession(params.id);
    if (!result) {
      throw new Error("Dossier introuvable apres creation");
    }
    return result;
  } catch (error) {
    if (error instanceof WoodyError) throw error;
    throw new WoodyError(
      "Impossible de creer le dossier",
      "DB_CREATE_DOSSIER_FAILED",
      error,
    );
  }
}

export async function createCdvSession(
  session: Pick<CdvSession, "id" | "pdfCdvPath" | "pdfFicheLotPath">,
): Promise<CdvSession> {
  try {
    const database = await getDatabase();
    await database.execute(
      `INSERT INTO cdv_sessions (id, statut, pdf_cdv_path, pdf_fiche_lot_path)
       VALUES ($1, 'brouillon', $2, $3)`,
      [session.id, session.pdfCdvPath, session.pdfFicheLotPath],
    );
    const result = await getCdvSession(session.id);
    if (!result) {
      throw new Error("Session introuvable apres creation");
    }
    return result;
  } catch (error) {
    if (error instanceof WoodyError) throw error;
    throw new WoodyError(
      "Impossible de creer la session CDV",
      "DB_CREATE_SESSION_FAILED",
      error,
    );
  }
}

export async function getCdvSession(
  id: string,
): Promise<CdvSession | null> {
  try {
    const database = await getDatabase();
    const rows = await database.select<Record<string, unknown>[]>(
      "SELECT * FROM cdv_sessions WHERE id = $1",
      [id],
    );
    const first = rows[0];
    if (!first) return null;
    return mapRowToCdvSession(first);
  } catch (error) {
    if (error instanceof WoodyError) throw error;
    throw new WoodyError(
      "Impossible de recuperer la session CDV",
      "DB_QUERY_FAILED",
      error,
    );
  }
}

export async function listCdvSessions(): Promise<CdvSession[]> {
  try {
    const database = await getDatabase();
    const rows = await database.select<Record<string, unknown>[]>(
      "SELECT * FROM cdv_sessions ORDER BY created_at DESC",
    );
    return rows.map(mapRowToCdvSession);
  } catch (error) {
    throw new WoodyError(
      "Impossible de lister les sessions CDV",
      "DB_QUERY_FAILED",
      error,
    );
  }
}

export async function updateCdvSessionPdfPath(
  id: string,
  field: "pdfCdvPath" | "pdfFicheLotPath",
  path: string,
): Promise<void> {
  const column =
    field === "pdfCdvPath" ? "pdf_cdv_path" : "pdf_fiche_lot_path";
  try {
    const database = await getDatabase();
    await database.execute(
      `UPDATE cdv_sessions SET ${column} = $1, updated_at = datetime('now') WHERE id = $2`,
      [path, id],
    );
  } catch (error) {
    throw new WoodyError(
      "Impossible de mettre a jour le chemin PDF",
      "DB_UPDATE_FAILED",
      error,
    );
  }
}

export async function deleteCdvSession(id: string): Promise<void> {
  try {
    const database = await getDatabase();
    await database.execute("DELETE FROM cdv_sessions WHERE id = $1", [id]);
    // Cleanup user activity tracking
    await database.execute(
      "DELETE FROM user_activity WHERE entity_type = 'dossier' AND entity_id = $1",
      [id],
    );
  } catch (error) {
    throw new WoodyError(
      "Impossible de supprimer la session CDV",
      "DB_DELETE_FAILED",
      error,
    );
  }
}

// --- Generic CdvSession update ---

export interface UpdateCdvSessionData {
  statut?: CdvStatut;
  produit?: string;
  camion?: string;
  dateArrivee?: string;
  client?: string;
  fournisseur?: string;
  dossier?: string;
  numDeclaration?: string;
  fraisTransit?: number;
  fraisCommission?: number;
  autreFrais?: number;
  fraisUe?: number;
  fraisInt?: number;
  dateBae?: string;
  poidsDeclare?: number;
  prixDeclareKilo?: number;
  ocrRawCdv?: string;
  ocrRawFiche?: string;
  fabricMatched?: boolean;
}

const SESSION_FIELD_MAP: Record<
  keyof Omit<UpdateCdvSessionData, "statut">,
  string
> = {
  produit: "produit",
  camion: "camion",
  dateArrivee: "date_arrivee",
  client: "client",
  fournisseur: "fournisseur",
  dossier: "dossier",
  numDeclaration: "num_declaration",
  fraisTransit: "frais_transit",
  fraisCommission: "frais_commission",
  autreFrais: "autre_frais",
  fraisUe: "frais_ue",
  fraisInt: "frais_int",
  dateBae: "date_bae",
  poidsDeclare: "poids_declare",
  prixDeclareKilo: "prix_declare_kilo",
  ocrRawCdv: "ocr_raw_cdv",
  ocrRawFiche: "ocr_raw_fiche",
  fabricMatched: "fabric_matched",
};

export async function updateCdvSession(
  id: string,
  data: UpdateCdvSessionData,
): Promise<void> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.statut !== undefined) {
    setClauses.push(`statut = $${String(paramIndex)}`);
    values.push(data.statut);
    paramIndex++;
  }

  for (const [key, column] of Object.entries(SESSION_FIELD_MAP)) {
    const value =
      data[key as keyof Omit<UpdateCdvSessionData, "statut">];
    if (value !== undefined) {
      setClauses.push(`${column} = $${String(paramIndex)}`);
      // Convert boolean to INTEGER for SQLite (fabricMatched)
      values.push(typeof value === "boolean" ? (value ? 1 : 0) : value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return;

  setClauses.push("updated_at = datetime('now')");
  values.push(id);

  const sql = `UPDATE cdv_sessions SET ${setClauses.join(", ")} WHERE id = $${String(paramIndex)}`;

  try {
    const database = await getDatabase();
    await database.execute(sql, values);
  } catch (error) {
    throw new WoodyError(
      "Impossible de mettre a jour le dossier",
      "DB_UPDATE_SESSION_FAILED",
      error,
    );
  }
}

/** @deprecated Use updateCdvSession instead */
export async function updateCdvSessionOcr(
  id: string,
  data: Pick<
    UpdateCdvSessionData,
    | "statut"
    | "camion"
    | "dateArrivee"
    | "fraisTransit"
    | "fraisCommission"
    | "autreFrais"
    | "ocrRawCdv"
    | "ocrRawFiche"
  >,
): Promise<void> {
  return updateCdvSession(id, data);
}

// --- LignesVente CRUD ---

function mapRowToLigneVente(row: Record<string, unknown>): LigneVente {
  return {
    id: row["id"] as string,
    cdvSessionId: row["cdv_session_id"] as string,
    client: row["client"] as string,
    produit: row["produit"] as string,
    colis: row["colis"] as number,
    poidsBrut: row["poids_brut"] as number,
    poidsNet: row["poids_net"] as number,
    prixUnitaireNet: row["prix_unitaire_net"] as number,
    ordre: row["ordre"] as number,
  };
}

export async function saveLignesVente(
  cdvSessionId: string,
  lignes: Array<Omit<LigneVente, "id" | "cdvSessionId">>,
): Promise<void> {
  try {
    const database = await getDatabase();

    // Delete existing lignes for idempotency
    await database.execute(
      "DELETE FROM lignes_vente WHERE cdv_session_id = $1",
      [cdvSessionId],
    );

    // Insert new lignes
    for (const ligne of lignes) {
      await database.execute(
        `INSERT INTO lignes_vente (id, cdv_session_id, client, produit, colis, poids_brut, poids_net, prix_unitaire_net, ordre)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          uuidv4(),
          cdvSessionId,
          ligne.client,
          ligne.produit,
          ligne.colis,
          ligne.poidsBrut,
          ligne.poidsNet,
          ligne.prixUnitaireNet,
          ligne.ordre,
        ],
      );
    }
  } catch (error) {
    throw new WoodyError(
      "Impossible de sauvegarder les lignes de vente",
      "DB_SAVE_LIGNES_FAILED",
      error,
    );
  }
}

export async function getLignesVente(
  cdvSessionId: string,
): Promise<LigneVente[]> {
  try {
    const database = await getDatabase();
    const rows = await database.select<Record<string, unknown>[]>(
      "SELECT * FROM lignes_vente WHERE cdv_session_id = $1 ORDER BY ordre",
      [cdvSessionId],
    );
    return rows.map(mapRowToLigneVente);
  } catch (error) {
    throw new WoodyError(
      "Impossible de recuperer les lignes de vente",
      "DB_QUERY_LIGNES_FAILED",
      error,
    );
  }
}

export async function saveLignesVenteWithIds(
  cdvSessionId: string,
  lignes: LigneVente[],
): Promise<void> {
  try {
    const database = await getDatabase();

    await database.execute(
      "DELETE FROM lignes_vente WHERE cdv_session_id = $1",
      [cdvSessionId],
    );

    for (const ligne of lignes) {
      await database.execute(
        `INSERT INTO lignes_vente (id, cdv_session_id, client, produit, colis, poids_brut, poids_net, prix_unitaire_net, ordre)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          ligne.id,
          cdvSessionId,
          ligne.client,
          ligne.produit,
          ligne.colis,
          ligne.poidsBrut,
          ligne.poidsNet,
          ligne.prixUnitaireNet,
          ligne.ordre,
        ],
      );
    }
  } catch (error) {
    throw new WoodyError(
      "Impossible de sauvegarder les lignes de vente",
      "DB_SAVE_LIGNES_FAILED",
      error,
    );
  }
}

// --- DocumentGenere CRUD ---

function mapRowToDocumentGenere(row: Record<string, unknown>): DocumentGenere {
  return {
    id: row["id"] as string,
    cdvSessionId: row["cdv_session_id"] as string,
    type: row["type"] as DocumentGenere["type"],
    filePath: row["file_path"] as string,
    generatedAt: row["generated_at"] as string,
  };
}

export async function saveDocumentGenere(
  cdvSessionId: string,
  type: DocumentGenere["type"],
  filePath: string,
): Promise<void> {
  try {
    const database = await getDatabase();
    await database.execute(
      `INSERT INTO documents_generes (id, cdv_session_id, type, file_path)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), cdvSessionId, type, filePath],
    );
  } catch (error) {
    throw new WoodyError(
      "Impossible de sauvegarder le document genere",
      "DB_SAVE_DOCUMENT_FAILED",
      error,
    );
  }
}

export async function getDocumentsGeneres(
  cdvSessionId: string,
): Promise<DocumentGenere[]> {
  try {
    const database = await getDatabase();
    const rows = await database.select<Record<string, unknown>[]>(
      "SELECT * FROM documents_generes WHERE cdv_session_id = $1 ORDER BY generated_at DESC",
      [cdvSessionId],
    );
    return rows.map(mapRowToDocumentGenere);
  } catch (error) {
    throw new WoodyError(
      "Impossible de recuperer les documents generes",
      "DB_QUERY_DOCUMENTS_FAILED",
      error,
    );
  }
}

// --- Fabric CV Encours (local cache) ---

export async function clearFabricCvEncours(): Promise<void> {
  try {
    const database = await getDatabase();
    await database.execute("DELETE FROM fabric_cv_encours");
  } catch (error) {
    throw new WoodyError(
      "Impossible de vider le cache Fabric",
      "DB_FABRIC_CLEAR_FAILED",
      error,
    );
  }
}

export async function insertFabricCvEncoursBatch(
  rows: Array<{
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
  }>,
): Promise<void> {
  try {
    const database = await getDatabase();
    for (const row of rows) {
      await database.execute(
        `INSERT INTO fabric_cv_encours (fraisuep, fraisintp, pdsn_30, valeur_compte_vente_30, dateheurebae, refinterne, expimpnom, clifounom, ordre, tpfrtident)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          row.fraisuep,
          row.fraisintp,
          row.pdsn_30,
          row.valeur_compte_vente_30,
          row.dateheurebae,
          row.refinterne,
          row.expimpnom,
          row.clifounom,
          row.ordre,
          row.tpfrtident,
        ],
      );
    }
  } catch (error) {
    throw new WoodyError(
      "Impossible d'inserer les donnees Fabric",
      "DB_FABRIC_INSERT_FAILED",
      error,
    );
  }
}

export async function getFabricDistinctClients(): Promise<string[]> {
  try {
    const database = await getDatabase();
    const rows = await database.select<Array<{ expimpnom: string }>>(
      "SELECT DISTINCT expimpnom FROM fabric_cv_encours WHERE expimpnom IS NOT NULL AND expimpnom <> '' ORDER BY expimpnom",
    );
    return rows.map((r) => r.expimpnom);
  } catch (error) {
    throw new WoodyError(
      "Impossible de recuperer les clients Fabric",
      "DB_FABRIC_CLIENTS_FAILED",
      error,
    );
  }
}

export async function matchFabricDeclarations(
  camion: string,
  dateFrom: string,
  dateTo: string,
  client: string,
): Promise<FabricCvEncours[]> {
  try {
    const database = await getDatabase();
    const rows = await database.select<FabricCvEncoursRow[]>(
      `SELECT * FROM fabric_cv_encours
       WHERE tpfrtident LIKE $1
       AND dateheurebae BETWEEN $2 AND $3
       AND expimpnom = $4`,
      [`%${camion}%`, dateFrom, dateTo, client],
    );
    return rows.map(mapDbRowToFabricCvEncours);
  } catch (error) {
    throw new WoodyError(
      "Impossible de rechercher les declarations Fabric",
      "DB_FABRIC_MATCH_FAILED",
      error,
    );
  }
}

export async function getFabricCvEncoursCount(): Promise<number> {
  try {
    const database = await getDatabase();
    const rows = await database.select<Array<{ cnt: number }>>(
      "SELECT COUNT(*) as cnt FROM fabric_cv_encours",
    );
    const first = rows[0];
    return first ? first.cnt : 0;
  } catch (error) {
    throw new WoodyError(
      "Impossible de compter les donnees Fabric",
      "DB_FABRIC_COUNT_FAILED",
      error,
    );
  }
}

// --- Fabric CV Cloture (local cache - lookup only) ---

export async function clearFabricCvCloture(): Promise<void> {
  try {
    const database = await getDatabase();
    await database.execute("DELETE FROM fabric_cv_cloture");
  } catch (error) {
    throw new WoodyError(
      "Impossible de vider le cache Fabric cloture",
      "DB_FABRIC_CLOTURE_CLEAR_FAILED",
      error,
    );
  }
}

export async function insertFabricCvClotureBatch(
  rows: Array<{
    dossier: string | null;
    refinterne: string | null;
  }>,
): Promise<void> {
  try {
    const database = await getDatabase();
    for (const row of rows) {
      await database.execute(
        `INSERT INTO fabric_cv_cloture (dossier, refinterne)
         VALUES ($1, $2)`,
        [row.dossier, row.refinterne],
      );
    }
  } catch (error) {
    throw new WoodyError(
      "Impossible d'inserer les donnees Fabric cloture",
      "DB_FABRIC_CLOTURE_INSERT_FAILED",
      error,
    );
  }
}

export async function listFabricCvCloture(): Promise<FabricCvClotureRow[]> {
  try {
    const database = await getDatabase();
    return await database.select<FabricCvClotureRow[]>(
      "SELECT * FROM fabric_cv_cloture ORDER BY synced_at DESC",
    );
  } catch (error) {
    throw new WoodyError(
      "Impossible de lister les clotures Fabric",
      "DB_FABRIC_CLOTURE_LIST_FAILED",
      error,
    );
  }
}

// --- Dashboard pipeline queries ---

export async function getUnmatchedFabricCvEncours(): Promise<FabricCvEncoursRow[]> {
  try {
    const database = await getDatabase();
    return await database.select<FabricCvEncoursRow[]>(`
      SELECT f.*
      FROM fabric_cv_encours f
      LEFT JOIN cdv_sessions s
        ON s.fabric_matched = 1
        AND f.refinterne IS NOT NULL
        AND f.refinterne <> ''
        AND f.refinterne = s.dossier
      WHERE s.id IS NULL
      ORDER BY f.dateheurebae DESC
    `);
  } catch (error) {
    throw new WoodyError(
      "Impossible de recuperer les declarations non traitees",
      "DB_UNMATCHED_QUERY_FAILED",
      error,
    );
  }
}

export async function autoCloseDossiers(): Promise<number> {
  try {
    const database = await getDatabase();
    const result = await database.execute(`
      UPDATE cdv_sessions
      SET statut = 'cloture', updated_at = datetime('now')
      WHERE statut = 'genere'
      AND dossier IN (
        SELECT refinterne FROM fabric_cv_cloture
        WHERE refinterne IS NOT NULL AND refinterne <> ''
      )
    `);
    return result.rowsAffected;
  } catch (error) {
    throw new WoodyError(
      "Impossible de cloturer automatiquement les dossiers",
      "DB_AUTO_CLOSE_FAILED",
      error,
    );
  }
}
