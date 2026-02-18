export interface ImportedDocument {
  id: string;
  fileName: string;
  filePath: string;
  originalPath: string;
  pageCount: number;
  type: "cdv" | "fiche_lot" | null;
  cdvSessionId: string | null;
}

export type ImportViewMode = "list" | "viewer" | "splitter" | "classifier" | "pairing";
