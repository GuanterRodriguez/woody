import type { OcrDocumentState } from "@/types/ocr.types";
import type { ImportedDocument } from "@/types/import.types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface OcrPreviewProps {
  document: ImportedDocument;
  ocrState: OcrDocumentState;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function CdvPreview({ ocrState }: { ocrState: OcrDocumentState }) {
  const result = ocrState.resultCdv;
  if (!result) return null;

  const fields = [
    { label: "Camion", value: result.camion },
    { label: "Date arrivee", value: result.date_arrivee },
    { label: "Frais transit", value: `${formatCurrency(result.frais_transit)} EUR` },
    { label: "Frais commission", value: `${formatCurrency(result.frais_commission)} EUR` },
    { label: "Autre frais", value: `${formatCurrency(result.autre_frais)} EUR` },
  ];

  return (
    <div className="space-y-2">
      {fields.map((field) => (
        <div key={field.label} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{field.label}</span>
          <span className="font-medium">{field.value}</span>
        </div>
      ))}
    </div>
  );
}

function FicheLotPreview({ ocrState }: { ocrState: OcrDocumentState }) {
  const result = ocrState.resultFicheLot;
  if (!result) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-2 py-1.5 font-medium">Client</th>
            <th className="px-2 py-1.5 font-medium">Produit</th>
            <th className="px-2 py-1.5 text-right font-medium">Colis</th>
            <th className="px-2 py-1.5 text-right font-medium">Poids brut</th>
            <th className="px-2 py-1.5 text-right font-medium">Poids net</th>
            <th className="px-2 py-1.5 text-right font-medium">Prix/kg net</th>
          </tr>
        </thead>
        <tbody>
          {result.lignes.map((ligne, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="px-2 py-1.5">{ligne.client}</td>
              <td className="px-2 py-1.5">{ligne.produit}</td>
              <td className="px-2 py-1.5 text-right">{ligne.colis}</td>
              <td className="px-2 py-1.5 text-right">
                {formatCurrency(ligne.poids_brut)}
              </td>
              <td className="px-2 py-1.5 text-right">
                {formatCurrency(ligne.poids_net)}
              </td>
              <td className="px-2 py-1.5 text-right">
                {formatCurrency(ligne.prix_unitaire_net)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t font-medium">
            <td className="px-2 py-1.5" colSpan={2}>
              Total ({result.lignes.length} lignes)
            </td>
            <td className="px-2 py-1.5 text-right">
              {result.lignes.reduce((s, l) => s + l.colis, 0)}
            </td>
            <td className="px-2 py-1.5 text-right">
              {formatCurrency(
                result.lignes.reduce((s, l) => s + l.poids_brut, 0),
              )}
            </td>
            <td className="px-2 py-1.5 text-right">
              {formatCurrency(
                result.lignes.reduce((s, l) => s + l.poids_net, 0),
              )}
            </td>
            <td className="px-2 py-1.5 text-right">—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function OcrPreview({ document, ocrState }: OcrPreviewProps) {
  if (ocrState.status !== "success") return null;

  const title =
    document.type === "cdv"
      ? "Apercu OCR : Compte de vente"
      : "Apercu OCR : Fiche de lot";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{document.fileName}</p>
      </CardHeader>
      <CardContent>
        {ocrState.resultCdv && <CdvPreview ocrState={ocrState} />}
        {ocrState.resultFicheLot && <FicheLotPreview ocrState={ocrState} />}
      </CardContent>
    </Card>
  );
}
