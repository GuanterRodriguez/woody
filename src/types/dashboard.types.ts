export type DashboardTab = "non_traite" | "a_traiter" | "genere" | "cloture";

export type ATraiterSubTab = "main" | "anomalies";

export type DashboardPeriode =
  | "all"
  | "this_month"
  | "last_month"
  | "this_year";

export interface DashboardFilters {
  client: string | null;
  produit: string | null;
  search: string;
  periode: DashboardPeriode;
}

export interface DashboardTabCounts {
  nonTraite: number;
  aTraiter: number;
  anomalies: number;
  genere: number;
  cloture: number;
}
