import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw, Search } from "lucide-react";
import type { DashboardFilters, DashboardPeriode } from "@/types/dashboard.types";

const ALL_VALUE = "__all__";

interface DossierFiltersProps {
  filters: DashboardFilters;
  clients: string[];
  produits: string[];
  onFilterChange: <K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K],
  ) => void;
  onReset: () => void;
}

interface PeriodeOption {
  value: DashboardPeriode;
  label: string;
}

const PERIODE_OPTIONS: PeriodeOption[] = [
  { value: "all", label: "Toutes" },
  { value: "this_month", label: "Ce mois" },
  { value: "last_month", label: "Mois dernier" },
  { value: "this_year", label: "Cette annee" },
];

export function DossierFilters({
  filters,
  clients,
  produits,
  onFilterChange,
  onReset,
}: DossierFiltersProps) {
  function handleClientChange(value: string) {
    onFilterChange("client", value === ALL_VALUE ? null : value);
  }

  function handleProduitChange(value: string) {
    onFilterChange("produit", value === ALL_VALUE ? null : value);
  }

  function handlePeriodeChange(value: string) {
    onFilterChange("periode", value as DashboardPeriode);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    onFilterChange("search", e.target.value);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
        <Input
          placeholder="Rechercher dossier, camion, client..."
          value={filters.search}
          onChange={handleSearchChange}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.client ?? ALL_VALUE}
        onValueChange={handleClientChange}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Client" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Tous les clients</SelectItem>
          {clients.map((client) => (
            <SelectItem key={client} value={client}>
              {client}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.produit ?? ALL_VALUE}
        onValueChange={handleProduitChange}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Produit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Tous les produits</SelectItem>
          {produits.map((produit) => (
            <SelectItem key={produit} value={produit}>
              {produit}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.periode}
        onValueChange={handlePeriodeChange}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Periode" />
        </SelectTrigger>
        <SelectContent>
          {PERIODE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="ghost" size="icon" onClick={onReset} title="Reinitialiser les filtres">
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
