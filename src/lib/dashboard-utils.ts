import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  isWithinInterval,
  format,
  parseISO,
} from "date-fns";
import type { CdvSession, CdvStatut } from "@/types/cdv.types";
import type {
  DashboardFilters,
  DashboardPeriode,
} from "@/types/dashboard.types";
import type { FabricCvEncoursRow } from "@/types/fabric.types";

export function filterSessions(
  sessions: CdvSession[],
  filters: DashboardFilters,
): CdvSession[] {
  const dateRange = getPeriodeDateRange(filters.periode);
  const searchLower = filters.search.toLowerCase().trim();

  return sessions.filter((session) => {
    if (filters.client !== null && session.client !== filters.client) {
      return false;
    }

    if (filters.produit !== null && session.produit !== filters.produit) {
      return false;
    }

    if (searchLower.length > 0) {
      const haystack = [
        session.dossier,
        session.camion,
        session.client,
        session.produit,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(searchLower)) {
        return false;
      }
    }

    if (dateRange.start !== null && dateRange.end !== null) {
      if (session.dateArrivee === "") {
        return false;
      }
      try {
        const sessionDate = parseISO(session.dateArrivee);
        if (
          !isWithinInterval(sessionDate, {
            start: dateRange.start,
            end: dateRange.end,
          })
        ) {
          return false;
        }
      } catch {
        return false;
      }
    }

    return true;
  });
}

export function filterFabricRows(
  rows: FabricCvEncoursRow[],
  filters: DashboardFilters,
): FabricCvEncoursRow[] {
  const searchLower = filters.search.toLowerCase().trim();

  return rows.filter((row) => {
    if (
      filters.client !== null &&
      row.expimpnom !== filters.client
    ) {
      return false;
    }

    if (searchLower.length > 0) {
      const haystack = [
        row.refinterne ?? "",
        row.expimpnom ?? "",
        row.clifounom ?? "",
        row.tpfrtident ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });
}

export function getUniqueClients(sessions: CdvSession[]): string[] {
  return Array.from(new Set(sessions.map((s) => s.client)))
    .filter((c) => c.length > 0)
    .sort();
}

export function getUniqueProduits(sessions: CdvSession[]): string[] {
  return Array.from(new Set(sessions.map((s) => s.produit)))
    .filter((p) => p.length > 0)
    .sort();
}

export function getUniqueFabricClients(rows: FabricCvEncoursRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.expimpnom ?? "")))
    .filter((c) => c.length > 0)
    .sort();
}

export function getPeriodeDateRange(periode: DashboardPeriode): {
  start: Date | null;
  end: Date | null;
} {
  const now = new Date();

  switch (periode) {
    case "all":
      return { start: null, end: null };
    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "last_month": {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    case "this_year":
      return { start: startOfYear(now), end: endOfMonth(now) };
  }
}

export function formatDateDisplay(dateStr: string): string {
  if (dateStr === "") return "---";
  try {
    return format(parseISO(dateStr), "dd/MM/yy");
  } catch {
    return "---";
  }
}

export function formatDateTimeDisplay(dateStr: string | null): string {
  if (!dateStr || dateStr === "") return "---";
  try {
    return format(parseISO(dateStr), "dd/MM/yy HH:mm");
  } catch {
    return "---";
  }
}

interface StatusDisplay {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
}

const STATUS_MAP: Record<CdvStatut, StatusDisplay> = {
  brouillon: {
    label: "Brouillon",
    variant: "outline",
    className: "",
  },
  ocr_en_cours: {
    label: "OCR en cours",
    variant: "secondary",
    className: "",
  },
  a_corriger: {
    label: "A corriger",
    variant: "destructive",
    className: "",
  },
  valide: {
    label: "Valide",
    variant: "default",
    className: "",
  },
  genere: {
    label: "Genere",
    variant: "default",
    className: "bg-green-600 text-white",
  },
  cloture: {
    label: "Cloture",
    variant: "outline",
    className: "text-muted-foreground",
  },
};

export function getStatusDisplay(statut: CdvStatut): StatusDisplay {
  return STATUS_MAP[statut];
}
