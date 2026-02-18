import { RefreshCw, Loader2, AlertCircle, Check, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CdvSession } from "@/types/cdv.types";
import type { FabricCvEncours } from "@/types/fabric.types";

interface FabricEnrichmentProps {
  session: CdvSession;
  fabricLoading: boolean;
  fabricError: string | null;
  fabricDeclarations: FabricCvEncours[];
  onEnrich: () => void;
}

interface FabricFieldDisplayProps {
  label: string;
  value: string | number;
  isFabricMatched: boolean;
}

function FabricFieldDisplay({
  label,
  value,
  isFabricMatched,
}: FabricFieldDisplayProps) {
  const displayValue =
    typeof value === "number" ? (value === 0 ? "-" : String(value)) : (value || "-");

  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium">{displayValue}</span>
        {isFabricMatched && displayValue !== "-" && (
          <Badge
            variant="secondary"
            className="h-5 gap-1 bg-blue-100 text-xs text-blue-700"
          >
            <Database className="h-3 w-3" />
            Fabric
          </Badge>
        )}
      </div>
    </div>
  );
}

export function FabricEnrichment({
  session,
  fabricLoading,
  fabricError,
  fabricDeclarations,
  onEnrich,
}: FabricEnrichmentProps) {
  const hasResults = fabricDeclarations.length > 0;
  const canEnrich =
    session.camion !== "" &&
    session.dateArrivee !== "" &&
    session.client !== "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Enrichissement Fabric</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onEnrich}
          disabled={fabricLoading || !canEnrich}
        >
          {fabricLoading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          {fabricLoading ? "Recherche..." : "Enrichir"}
        </Button>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span
          className={cn(
            "inline-block h-2 w-2 rounded-full",
            session.fabricMatched
              ? "bg-green-500"
              : hasResults
                ? "bg-yellow-500"
                : "bg-gray-300",
          )}
        />
        <span className="text-muted-foreground">
          {session.fabricMatched
            ? `Enrichi (${String(fabricDeclarations.length)} declaration${fabricDeclarations.length > 1 ? "s" : ""})`
            : hasResults
              ? "Resultats disponibles"
              : "Non enrichi"}
        </span>
        {canEnrich && !session.fabricMatched && (
          <span className="text-muted-foreground text-xs">
            ({session.camion} + {session.dateArrivee} + {session.client})
          </span>
        )}
      </div>

      {/* Error display */}
      {fabricError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{fabricError}</span>
        </div>
      )}

      {/* Missing fields hint */}
      {!canEnrich && !fabricError && (
        <p className="text-xs text-muted-foreground">
          Remplissez le camion, la date d'arrivee et le client pour lancer
          l'enrichissement.
        </p>
      )}

      {/* Fabric-enriched fields display */}
      {session.fabricMatched && (
        <div className="space-y-1.5">
          <FabricFieldDisplay
            label="Dossier"
            value={session.dossier}
            isFabricMatched={session.fabricMatched}
          />
          <FabricFieldDisplay
            label="Fournisseur"
            value={session.fournisseur}
            isFabricMatched={session.fabricMatched}
          />
          <FabricFieldDisplay
            label="N° Declaration"
            value={session.numDeclaration}
            isFabricMatched={session.fabricMatched}
          />
          <FabricFieldDisplay
            label="Frais UE"
            value={session.fraisUe}
            isFabricMatched={session.fabricMatched}
          />
          <FabricFieldDisplay
            label="Frais INT"
            value={session.fraisInt}
            isFabricMatched={session.fabricMatched}
          />
          <FabricFieldDisplay
            label="Poids declare"
            value={session.poidsDeclare}
            isFabricMatched={session.fabricMatched}
          />
          <FabricFieldDisplay
            label="Prix declare"
            value={session.prixDeclareKilo}
            isFabricMatched={session.fabricMatched}
          />
          <FabricFieldDisplay
            label="Date BAE"
            value={session.dateBae}
            isFabricMatched={session.fabricMatched}
          />

          <div className="flex items-center gap-1.5 pt-1 text-xs text-green-600">
            <Check className="h-3.5 w-3.5" />
            Donnees Fabric appliquees
          </div>
        </div>
      )}
    </div>
  );
}
