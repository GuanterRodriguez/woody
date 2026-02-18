import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { LigneVente } from "@/types/cdv.types";

interface LignesParPrixViewProps {
  lignes: LigneVente[];
}

interface PriceGroup {
  prixUnitaireNet: number;
  lignes: LigneVente[];
  totalColis: number;
  totalPoidsBrut: number;
  totalPoidsNet: number;
  totalValeur: number;
}

const moneyFormat = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const weightFormat = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function LignesParPrixView({ lignes }: LignesParPrixViewProps) {
  const groups = useMemo(() => {
    const map = new Map<number, LigneVente[]>();
    for (const l of lignes) {
      const existing = map.get(l.prixUnitaireNet);
      if (existing) {
        existing.push(l);
      } else {
        map.set(l.prixUnitaireNet, [l]);
      }
    }

    const result: PriceGroup[] = [];
    for (const [prix, groupLignes] of map) {
      let totalColis = 0;
      let totalPoidsBrut = 0;
      let totalPoidsNet = 0;
      for (const l of groupLignes) {
        totalColis += l.colis;
        totalPoidsBrut += l.poidsBrut;
        totalPoidsNet += l.poidsNet;
      }
      result.push({
        prixUnitaireNet: prix,
        lignes: groupLignes,
        totalColis,
        totalPoidsBrut,
        totalPoidsNet,
        totalValeur: Math.round(totalPoidsNet * prix * 100) / 100,
      });
    }

    // Sort by total poids net descending (heaviest group first = prix retenu)
    result.sort((a, b) => b.totalPoidsNet - a.totalPoidsNet);
    return result;
  }, [lignes]);

  if (lignes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Aucune ligne de vente
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group, index) => (
        <div
          key={group.prixUnitaireNet}
          className={`rounded-lg border p-4 space-y-3 ${
            index === 0
              ? "border-blue-200 bg-blue-50/50"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">
                {moneyFormat.format(group.prixUnitaireNet)} EUR/kg
              </span>
              {index === 0 && (
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  Prix retenu
                </Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {group.lignes.length} ligne{group.lignes.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Client</th>
                  <th className="px-2 py-2 text-left font-medium">Produit</th>
                  <th className="px-2 py-2 text-left font-medium">Colis</th>
                  <th className="px-2 py-2 text-left font-medium">P.Brut</th>
                  <th className="px-2 py-2 text-left font-medium">P.Net</th>
                  <th className="px-2 py-2 text-left font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {group.lignes.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-2 py-1">{l.client}</td>
                    <td className="px-2 py-1">{l.produit}</td>
                    <td className="px-2 py-1">{l.colis}</td>
                    <td className="px-2 py-1">{l.poidsBrut.toFixed(2)}</td>
                    <td className="px-2 py-1">{l.poidsNet.toFixed(2)}</td>
                    <td className="px-2 py-1">
                      {moneyFormat.format(Math.round(l.poidsNet * l.prixUnitaireNet * 100) / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/30">
                <tr>
                  <td className="px-2 py-2 font-medium" colSpan={2}>
                    Sous-total
                  </td>
                  <td className="px-2 py-2 font-medium">{group.totalColis}</td>
                  <td className="px-2 py-2 font-medium">
                    {weightFormat.format(group.totalPoidsBrut)}
                  </td>
                  <td className="px-2 py-2 font-medium">
                    {weightFormat.format(group.totalPoidsNet)}
                  </td>
                  <td className="px-2 py-2 font-medium">
                    {moneyFormat.format(group.totalValeur)} EUR
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
