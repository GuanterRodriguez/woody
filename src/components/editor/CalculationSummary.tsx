import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { CalculationResult } from "@/types/calculation.types";

interface CalculationSummaryProps {
  result: CalculationResult;
}

const moneyFormat = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const weightFormat = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function MoneyValue({ value, className }: { value: number; className?: string }) {
  return (
    <span className={className}>
      {moneyFormat.format(value)} EUR
    </span>
  );
}

function WeightValue({ value }: { value: number }) {
  return <span>{weightFormat.format(value)} kg</span>;
}

function SummaryRow({
  label,
  children,
  bold,
}: {
  label: string;
  children: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between text-sm ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "text-base" : ""}>{children}</span>
    </div>
  );
}

export function CalculationSummary({ result }: CalculationSummaryProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recapitulatif</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Totaux lignes */}
        <div className="space-y-1.5">
          <SummaryRow label="Total colis">
            {String(result.totalColis)}
          </SummaryRow>
          <SummaryRow label="Total poids brut">
            <WeightValue value={result.totalPoidsBrut} />
          </SummaryRow>
          <SummaryRow label="Total poids net">
            <WeightValue value={result.totalPoidsNet} />
          </SummaryRow>
          <SummaryRow label="Total ventes" bold>
            <MoneyValue value={result.totalVentes} />
          </SummaryRow>
        </div>

        <Separator />

        {/* Frais */}
        <div className="space-y-1.5">
          <SummaryRow label="Frais de transit">
            <MoneyValue value={result.fraisTransit} />
          </SummaryRow>
          <SummaryRow label="Frais commission">
            <MoneyValue value={result.fraisCommission} />
          </SummaryRow>
          <SummaryRow label="Autres frais">
            <MoneyValue value={result.autreFrais} />
          </SummaryRow>
          <SummaryRow label="Frais UE">
            <MoneyValue value={result.fraisUe} />
          </SummaryRow>
          <SummaryRow label="Frais INT">
            <MoneyValue value={result.fraisInt} />
          </SummaryRow>
          <SummaryRow label="Total frais" bold>
            <MoneyValue value={result.totalFrais} />
          </SummaryRow>
        </div>

        <Separator />

        {/* Comparatif */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Comparatif</p>
          <SummaryRow label="Prix unitaire retenu">
            <span>{moneyFormat.format(result.prixUnitaireRetenu)} EUR/kg</span>
          </SummaryRow>
          <SummaryRow label="Poids retenu">
            <WeightValue value={result.poidsDeclare} />
          </SummaryRow>
          <SummaryRow label="Valeur">
            <MoneyValue value={result.valeurBrute} />
          </SummaryRow>
          <SummaryRow label="Frais">
            <MoneyValue value={result.totalFrais} />
          </SummaryRow>
          <SummaryRow label="Valeur finale" bold>
            <MoneyValue value={result.valeurNette} />
          </SummaryRow>
        </div>

        <Separator />

        {/* Valeur a reporter */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Declaration</p>
          <SummaryRow label="Valeur declaree">
            <MoneyValue value={result.valeurDeclaree} />
          </SummaryRow>
          <SummaryRow label="Valeur finale">
            <MoneyValue value={result.valeurNette} />
          </SummaryRow>
        </div>
        <div className={`rounded-md p-3 text-center text-sm font-semibold ${
          result.ecartValeur < 0
            ? "bg-destructive/10 text-destructive"
            : "bg-green-500/10 text-green-700"
        }`}>
          {result.ecartValeur < 0
            ? `VALEUR A REPORTER : +${moneyFormat.format(Math.abs(result.ecartValeur))} EUR`
            : "VALEUR DECLAREE MAINTENUE"}
        </div>

        <Separator />

        {/* Poids */}
        <div className="space-y-1.5">
          <SummaryRow label="Poids declare">
            <WeightValue value={result.poidsDeclare} />
          </SummaryRow>
          <SummaryRow label="Poids vendu">
            <WeightValue value={result.poidsVendu} />
          </SummaryRow>
          {result.ecartPoids > 0 && (
            <div className="rounded-md bg-orange-500/10 p-2 text-center text-sm font-semibold text-orange-700">
              POIDS EN TROP : +{weightFormat.format(result.ecartPoids)} kg
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
