import ExcelJS from "exceljs";
import JSZip from "jszip";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile, readFile } from "@tauri-apps/plugin-fs";
import type { CdvSession, LigneVente } from "@/types/cdv.types";
import { WoodyError } from "@/types/errors";
import templateUrl from "@/assets/TEMPLATE_CV.xlsx?url";

// --- Template loading ---

async function loadTemplate(): Promise<ArrayBuffer> {
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new WoodyError(
      "Impossible de charger le template Excel",
      "EXCEL_TEMPLATE_LOAD_FAILED",
    );
  }
  return response.arrayBuffer();
}

// --- INFORMATIONS sheet: column mapping ---
// Row 1 = headers, Row 2 = values
// Columns A(1) through O(15)

const INFORMATIONS_COLUMNS: Array<{
  col: number;
  field: keyof CdvSession;
}> = [
  { col: 1, field: "produit" },
  { col: 2, field: "camion" },
  { col: 3, field: "dateArrivee" },
  { col: 4, field: "fraisTransit" },
  { col: 5, field: "fraisCommission" },
  { col: 6, field: "autreFrais" },
  { col: 7, field: "fraisUe" },
  { col: 8, field: "fraisInt" },
  { col: 9, field: "poidsDeclare" },
  { col: 10, field: "prixDeclareKilo" },
  { col: 11, field: "dateBae" },
  { col: 12, field: "dossier" },
  { col: 13, field: "client" },
  { col: 14, field: "fournisseur" },
  { col: 15, field: "numDeclaration" },
];

// --- Excel generation ---

export async function generateExcel(
  session: CdvSession,
  lignes: LigneVente[],
): Promise<Uint8Array> {
  const templateBuffer = await loadTemplate();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer);

  // Force recalculation when opened in Excel Desktop
  workbook.calcProperties.fullCalcOnLoad = true;

  fillInformations(workbook, session);
  fillLignesVente(workbook, lignes);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

function fillInformations(workbook: ExcelJS.Workbook, session: CdvSession): void {
  const ws = workbook.getWorksheet("INFORMATIONS");
  if (!ws) {
    throw new WoodyError(
      "Feuille INFORMATIONS introuvable dans le template",
      "EXCEL_SHEET_NOT_FOUND",
    );
  }

  const dataRow = ws.getRow(2);
  for (const mapping of INFORMATIONS_COLUMNS) {
    const value = session[mapping.field];
    dataRow.getCell(mapping.col).value = value as ExcelJS.CellValue;
  }
  dataRow.commit();
}

function fillLignesVente(workbook: ExcelJS.Workbook, lignes: LigneVente[]): void {
  const ws = workbook.getWorksheet("LIGNE DE VENTE");
  if (!ws) {
    throw new WoodyError(
      "Feuille LIGNE DE VENTE introuvable dans le template",
      "EXCEL_SHEET_NOT_FOUND",
    );
  }

  // Clear existing data rows (keep header row 1)
  // Template has 2 example rows (rows 2-3), but there might be more
  const existingRowCount = ws.rowCount;
  for (let r = existingRowCount; r >= 2; r--) {
    const row = ws.getRow(r);
    row.eachCell((cell) => {
      cell.value = null;
    });
    row.commit();
  }

  // Pre-compute: sum poids_net per prix_unitaire_net group
  // Column I needs the aggregated weight so the MATRICE formula
  // INDEX(H, MATCH(MAX(I), I, 0)) picks the price with the most total weight
  const poidsParPrix = new Map<number, number>();
  for (const ligne of lignes) {
    const current = poidsParPrix.get(ligne.prixUnitaireNet) ?? 0;
    poidsParPrix.set(ligne.prixUnitaireNet, current + ligne.poidsNet);
  }

  // Write new data rows starting at row 2
  // Columns: A=client, B=produit, C=colis, D=poids_brut, E=poids_net, F=prix_unitaire_net
  // Helper columns: H=prix_unitaire_net, I=poids_net agrégé par prix
  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i];
    if (!ligne) continue;

    const row = ws.getRow(i + 2);
    row.getCell(1).value = ligne.client; // A
    row.getCell(2).value = ligne.produit; // B
    row.getCell(3).value = ligne.colis; // C
    row.getCell(4).value = ligne.poidsBrut; // D
    row.getCell(5).value = ligne.poidsNet; // E
    row.getCell(6).value = ligne.prixUnitaireNet; // F
    // Col G is empty in template
    row.getCell(8).value = ligne.prixUnitaireNet; // H (helper for INDEX/MATCH)
    row.getCell(9).value = poidsParPrix.get(ligne.prixUnitaireNet) ?? 0; // I (poids agrégé par prix)
    row.commit();
  }

  // Update the named table ref to match new row count
  updateTableRef(ws, "ligne_de_vente", lignes.length);
}

function updateTableRef(
  ws: ExcelJS.Worksheet,
  tableName: string,
  dataRowCount: number,
): void {
  // ExcelJS stores tables internally - access via unknown cast
  // since the property is not in the public TypeScript types
  const wsInternal = ws as unknown as Record<string, unknown>;
  const tablesMap = wsInternal["tables"] as
    | Record<string, { table: { ref: string } }>
    | undefined;
  if (!tablesMap) return;

  const entry = tablesMap[tableName];
  if (!entry) return;

  // Keep original start column and header row, update end row
  // Original ref is like "A1:F3" (header + 2 data rows)
  const refMatch = /^([A-Z]+)(\d+):([A-Z]+)\d+$/.exec(entry.table.ref);
  if (!refMatch) return;

  const startCol = refMatch[1] ?? "A";
  const startRow = refMatch[2] ?? "1";
  const endCol = refMatch[3] ?? "F";
  const newEndRow = Number(startRow) + dataRowCount; // header row + data rows
  entry.table.ref = `${startCol}${startRow}:${endCol}${String(newEndRow)}`;
}

// --- File naming ---

export function buildFileName(session: CdvSession): string {
  const sanitize = (s: string): string =>
    s
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/\s+/g, "_")
      .trim();

  const client = sanitize(session.client || "Client");
  const camion = sanitize(session.camion || "Camion");
  const date = session.dateArrivee || (new Date().toISOString().split("T")[0] ?? "");

  return [client, camion, date].join("_") + ".xlsx";
}

// --- ZIP packaging ---

export async function generateZip(
  excelBytes: Uint8Array,
  excelFileName: string,
  pdfCdvPath: string | null,
  pdfFicheLotPath: string | null,
): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(excelFileName, excelBytes);

  if (pdfCdvPath) {
    const cdvBytes = await readFile(pdfCdvPath);
    const cdvName = pdfCdvPath.split(/[\\/]/).pop() ?? "cdv.pdf";
    zip.file(cdvName, cdvBytes);
  }

  if (pdfFicheLotPath) {
    const ficheBytes = await readFile(pdfFicheLotPath);
    const ficheName = pdfFicheLotPath.split(/[\\/]/).pop() ?? "fiche_lot.pdf";
    zip.file(ficheName, ficheBytes);
  }

  const zipBuffer = await zip.generateAsync({ type: "uint8array" });
  return zipBuffer;
}

// --- Save with dialog ---

export async function saveFileWithDialog(
  data: Uint8Array,
  defaultName: string,
): Promise<string | null> {
  const ext = defaultName.split(".").pop()?.toLowerCase() ?? "";
  const filters =
    ext === "zip"
      ? [{ name: "ZIP", extensions: ["zip"] }]
      : ext === "pdf"
        ? [{ name: "PDF", extensions: ["pdf"] }]
        : [{ name: "Excel", extensions: ["xlsx"] }];

  const filePath = await save({
    defaultPath: defaultName,
    filters,
  });

  if (!filePath) return null;

  await writeFile(filePath, data);
  return filePath;
}
