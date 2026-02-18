import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FabricCvEncours } from "@/types/fabric.types";

interface FabricSelectorProps {
  open: boolean;
  declarations: FabricCvEncours[];
  onSelect: (declaration: FabricCvEncours) => void;
  onClose: () => void;
}

export function FabricSelector({
  open,
  declarations,
  onSelect,
  onClose,
}: FabricSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  function handleApply() {
    if (selectedIndex === null) return;
    const selected = declarations[selectedIndex];
    if (!selected) return;
    onSelect(selected);
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setSelectedIndex(null);
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Declarations correspondantes ({String(declarations.length)}{" "}
            trouvees)
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Dossier</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Fournisseur</th>
                <th className="px-3 py-2">Date BAE</th>
                <th className="px-3 py-2 text-right">Poids</th>
                <th className="px-3 py-2 text-right">Prix/kg</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {declarations.map((decl, idx) => (
                <tr
                  key={`${decl.REFINTERNE ?? ""}-${String(idx)}`}
                  className={cn(
                    "cursor-pointer border-b transition-colors hover:bg-accent/50",
                    selectedIndex === idx && "bg-accent",
                  )}
                  onClick={() => {
                    setSelectedIndex(idx);
                  }}
                >
                  <td className="px-3 py-2 font-medium">
                    {decl.REFINTERNE ?? "-"}
                  </td>
                  <td className="px-3 py-2">{decl.EXPIMPNOM ?? "-"}</td>
                  <td className="px-3 py-2">{decl.CLIFOUNOM ?? "-"}</td>
                  <td className="px-3 py-2">
                    {decl.DATEHEUREBAE?.split("T")[0] ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {decl.PDSN_30 != null ? `${String(decl.PDSN_30)} kg` : "-"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {decl.VALEUR_COMPTE_VENTE_30 != null
                      ? `${String(decl.VALEUR_COMPTE_VENTE_30)} EUR`
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border-2",
                        selectedIndex === idx
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30",
                      )}
                    >
                      {selectedIndex === idx && (
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleApply} disabled={selectedIndex === null}>
            Appliquer la selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
