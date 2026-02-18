import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument } from "pdf-lib";
import type { CdvSession } from "@/types/cdv.types";
import type { CalculationResult } from "@/types/calculation.types";
import { WoodyError } from "@/types/errors";

// --- Formatting helpers ---
// jsPDF standard fonts (helvetica) only support ISO 8859-1.
// Intl.NumberFormat("fr-FR") uses narrow no-break space (U+202F) as thousands
// separator, which renders as "/" in jsPDF. Euro sign (U+20AC) is also unsupported.
// We sanitize by replacing non-ASCII spaces with regular spaces and using "EUR".

const moneyFmt = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const weightFmt = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Replace non-breaking / narrow no-break spaces with regular spaces */
function sanitize(s: string): string {
  return s.replace(/[\u00A0\u202F\u2007\u2009]/g, " ");
}

function money(value: number): string {
  return sanitize(moneyFmt.format(value)) + " EUR";
}

function weight(value: number): string {
  return sanitize(weightFmt.format(value));
}

// jspdf-autotable stores finalY on doc.lastAutoTable but it's not in TS types
function getFinalY(doc: jsPDF, fallback: number): number {
  const d = doc as unknown as {
    lastAutoTable?: { finalY?: number };
  };
  return d.lastAutoTable?.finalY ?? fallback;
}

// --- Colors ---

const COLOR_HEADER_BG: [number, number, number] = [240, 240, 240];
const COLOR_GREEN_BG: [number, number, number] = [220, 245, 220];
const COLOR_GREEN_TEXT: [number, number, number] = [34, 120, 34];
const COLOR_RED_BG: [number, number, number] = [255, 230, 230];
const COLOR_RED_TEXT: [number, number, number] = [180, 30, 30];
const COLOR_ORANGE_BG: [number, number, number] = [255, 240, 220];
const COLOR_ORANGE_TEXT: [number, number, number] = [180, 100, 20];
const COLOR_BORDER: [number, number, number] = [180, 180, 180];

// --- PDF Generation ---

type SessionFields = Pick<
  CdvSession,
  | "produit"
  | "camion"
  | "dateArrivee"
  | "client"
  | "fournisseur"
  | "dossier"
  | "numDeclaration"
  | "poidsDeclare"
  | "prixDeclareKilo"
>;

export function generateCalculationPdf(
  session: SessionFields,
  result: CalculationResult,
): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // --- Title ---
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("RESULTAT DE COMPTE DE VENTE", pageWidth / 2, y, {
    align: "center",
  });
  y += 12;

  // --- Parties ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(session.fournisseur || "Fournisseur", margin, y);
  doc.text(session.client || "Client", pageWidth - margin, y, {
    align: "right",
  });
  y += 6;

  // --- References ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (session.dossier || session.numDeclaration) {
    const refParts: string[] = [];
    if (session.dossier) refParts.push(session.dossier);
    if (session.numDeclaration) refParts.push(session.numDeclaration);
    doc.text(refParts.join("     "), margin, y);
    y += 6;
  }

  // --- Camion details ---
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, 20);

  doc.setFontSize(9);
  const detailsLeft = margin + 3;
  const detailsValueX = margin + contentWidth / 2;
  let detailY = y + 5;

  doc.setFont("helvetica", "normal");
  doc.text("Date du camion :", detailsLeft, detailY);
  doc.text(session.dateArrivee || "", detailsValueX, detailY);
  detailY += 6;

  doc.text("Matricule du camion :", detailsLeft, detailY);
  doc.text(session.camion || "", detailsValueX, detailY);
  detailY += 6;

  doc.text("Produit selectionne :", detailsLeft, detailY);
  doc.text(session.produit || "", detailsValueX, detailY);

  y += 26;

  // --- Declaration ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Declaration", pageWidth / 2, y, { align: "center" });
  y += 2;

  const declarePrice =
    Math.round(session.poidsDeclare * session.prixDeclareKilo * 100) / 100;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "normal", cellWidth: contentWidth * 0.6 },
      1: { halign: "right", cellWidth: contentWidth * 0.4 },
    },
    body: [
      ["Poids declare", weight(session.poidsDeclare)],
      ["Prix unitaire declare", money(session.prixDeclareKilo)],
      ["Prix declare", money(declarePrice)],
    ],
  });

  y = getFinalY(doc, y + 20) + 6;

  // --- Detail des calculs ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Detail des calculs", pageWidth / 2, y, { align: "center" });
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "normal", cellWidth: contentWidth * 0.6 },
      1: { halign: "right", cellWidth: contentWidth * 0.4 },
    },
    body: [
      [
        "Prix unitaire retenu (EUR/kg) :",
        money(result.prixUnitaireRetenu),
      ],
      ["Poids net total (kg) :", weight(result.totalPoidsNet)],
      ["", ""],
      ["Frais de commission (EUR) :", money(result.fraisCommission)],
      ["Frais de transit (EUR) :", money(result.fraisTransit)],
      ["Autres frais (EUR) :", money(result.autreFrais)],
      ["", ""],
      ["Frais transport UE :", money(result.fraisUe)],
      ["Frais transport INT :", money(result.fraisInt)],
    ],
  });

  y = getFinalY(doc, y + 40) + 4;

  // --- Summary box ---
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.4,
    },
    headStyles: {
      fillColor: COLOR_HEADER_BG,
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: contentWidth * 0.6 },
      1: {
        halign: "right",
        cellWidth: contentWidth * 0.4,
        fontStyle: "bold",
      },
    },
    body: [
      ["Valeur brute (EUR)", money(result.valeurBrute)],
      ["Frais totaux (EUR)", money(result.totalFrais)],
      ["Valeur nette (EUR)", money(result.valeurNette)],
    ],
  });

  y = getFinalY(doc, y + 30) + 8;

  // --- Resultat ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resultat", pageWidth / 2, y, { align: "center" });
  y += 6;

  // Declaration status
  const isReporter = result.ecartValeur < 0;
  const statusText = isReporter
    ? `VALEUR A REPORTER : +${money(Math.abs(result.ecartValeur))}`
    : "VALEUR DECLAREE MAINTENU";
  const statusBg = isReporter ? COLOR_RED_BG : COLOR_GREEN_BG;
  const statusColor = isReporter ? COLOR_RED_TEXT : COLOR_GREEN_TEXT;

  const boxH = 10;
  const boxX = margin + 10;
  const boxW = contentWidth - 20;

  doc.setFillColor(...statusBg);
  doc.setDrawColor(...(isReporter ? COLOR_RED_TEXT : COLOR_GREEN_TEXT));
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, y, boxW, boxH, 2, 2, "FD");
  doc.setTextColor(...statusColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(statusText, pageWidth / 2, y + boxH / 2 + 1, {
    align: "center",
  });
  y += boxH + 4;

  // Weight difference
  const hasWeightDiff = result.ecartPoids !== 0;
  const weightText = hasWeightDiff
    ? `DIFFERENCE DE POIDS : ${result.ecartPoids > 0 ? "+" : ""}${weightFmt.format(result.ecartPoids)} KG`
    : "PAS DE DIFFERENCE (0KG)";
  const weightBg = hasWeightDiff ? COLOR_ORANGE_BG : COLOR_GREEN_BG;
  const weightColor = hasWeightDiff ? COLOR_ORANGE_TEXT : COLOR_GREEN_TEXT;

  doc.setFillColor(...weightBg);
  doc.setDrawColor(
    ...(hasWeightDiff ? COLOR_ORANGE_TEXT : COLOR_GREEN_TEXT),
  );
  doc.roundedRect(boxX, y, boxW, boxH, 2, 2, "FD");
  doc.setTextColor(...weightColor);
  doc.text(weightText, pageWidth / 2, y + boxH / 2 + 1, {
    align: "center",
  });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}

// --- PDF Merging ---

export async function mergePdfs(
  pdfs: Array<{ name: string; bytes: Uint8Array }>,
): Promise<Uint8Array> {
  try {
    const mergedDoc = await PDFDocument.create();

    for (const pdf of pdfs) {
      const sourceDoc = await PDFDocument.load(pdf.bytes, {
        ignoreEncryption: true,
      });
      const pageCount = sourceDoc.getPageCount();
      const indices = Array.from({ length: pageCount }, (_, i) => i);
      const copiedPages = await mergedDoc.copyPages(sourceDoc, indices);
      for (const page of copiedPages) {
        mergedDoc.addPage(page);
      }
    }

    const mergedBytes = await mergedDoc.save();
    return new Uint8Array(mergedBytes);
  } catch (error) {
    if (error instanceof WoodyError) throw error;
    throw new WoodyError(
      "Impossible de fusionner les PDFs",
      "PDF_MERGE_FAILED",
      error,
    );
  }
}
