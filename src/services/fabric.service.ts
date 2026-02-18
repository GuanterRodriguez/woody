import { invoke } from "@tauri-apps/api/core";
import { addDays, subDays, format } from "date-fns";
import { WoodyError } from "@/types/errors";
import { ENV } from "@/lib/env";
import {
  FabricGraphqlResponseSchema,
  FabricCvClotureGraphqlResponseSchema,
  type FabricMatchResult,
  type FabricMatchParams,
} from "@/types/fabric.types";
import {
  clearFabricCvEncours,
  insertFabricCvEncoursBatch,
  getFabricDistinctClients,
  matchFabricDeclarations,
  clearFabricCvCloture,
  insertFabricCvClotureBatch,
  autoCloseDossiers,
} from "@/services/database.service";

// --- Constants ---

const FABRIC_API_SCOPE = "https://api.fabric.microsoft.com/.default";
const TOKEN_ENDPOINT_TIMEOUT_MS = 10_000;
const GRAPHQL_TIMEOUT_MS = 60_000;
const GRAPHQL_PAGE_SIZE = 1000;
const DATE_RANGE_DAYS = 3;
const TOKEN_EXPIRY_BUFFER_S = 120;

// --- Token cache ---

let cachedToken: string | null = null;
let tokenExpiry: Date | null = null;

// --- Auth via Client Credentials ---

export async function authenticateFabric(): Promise<string> {
  const { clientId, tenantId, clientSecret } = ENV.fabric;

  if (!clientId || !tenantId || !clientSecret) {
    throw new WoodyError(
      "Le Client ID, Tenant ID et Secret doivent etre configures dans les variables d'environnement",
      "FABRIC_AUTH_NOT_CONFIGURED",
    );
  }

  if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const result = await withTimeout(
      invoke<{ status: number; body: string }>("fetch_entra_token", {
        tenantId: tenantId.trim(),
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        scope: FABRIC_API_SCOPE,
      }),
      TOKEN_ENDPOINT_TIMEOUT_MS,
    );

    if (result.status >= 400) {
      cachedToken = null;
      tokenExpiry = null;
      throw new WoodyError(
        `Erreur token Entra ID (${String(result.status)}): ${result.body}`,
        "FABRIC_AUTH_FAILED",
      );
    }

    const data: unknown = JSON.parse(result.body) as unknown;
    const tokenData = data as {
      access_token?: string;
      expires_in?: number;
    };

    if (!tokenData.access_token) {
      throw new WoodyError(
        "Reponse token Entra ID invalide (pas de access_token)",
        "FABRIC_AUTH_FAILED",
      );
    }

    cachedToken = tokenData.access_token;
    const expiresInS = tokenData.expires_in ?? 3600;
    tokenExpiry = new Date(
      Date.now() + (expiresInS - TOKEN_EXPIRY_BUFFER_S) * 1000,
    );

    return cachedToken;
  } catch (error) {
    if (error instanceof WoodyError) throw error;
    cachedToken = null;
    tokenExpiry = null;
    const detail =
      error instanceof Error ? error.message : String(error);
    console.error("[Fabric Auth]", error);
    throw new WoodyError(
      `Authentification Entra ID echouee: ${detail}`,
      "FABRIC_AUTH_FAILED",
      error,
    );
  }
}

// --- Timeout helper ---

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new WoodyError(
          `La requete Fabric a depasse le delai de ${String(Math.round(timeoutMs / 1000))}s`,
          "FABRIC_TIMEOUT",
        ),
      );
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

// --- GraphQL query execution via Rust command ---

async function executeGraphqlQuery(
  endpoint: string,
  token: string,
  query: string,
): Promise<unknown> {
  const result = await withTimeout(
    invoke<{ status: number; body: string }>("fabric_graphql_query", {
      url: endpoint.trim(),
      token,
      query,
    }),
    GRAPHQL_TIMEOUT_MS,
  );

  if (result.status >= 400) {
    throw new WoodyError(
      `Erreur GraphQL Fabric (${String(result.status)}): ${result.body}`,
      "FABRIC_GRAPHQL_ERROR",
    );
  }

  return JSON.parse(result.body) as unknown;
}

// --- Public API ---

export async function syncFabricData(
  onProgress?: (page: number, rowsSoFar: number) => void,
): Promise<{ totalRows: number; pagesProcessed: number }> {
  const { graphqlEndpoint } = ENV.fabric;

  if (!graphqlEndpoint) {
    throw new WoodyError(
      "L'endpoint GraphQL Fabric doit etre configure",
      "FABRIC_NOT_CONFIGURED",
    );
  }

  const token = await authenticateFabric();

  // Clear existing data before sync
  await clearFabricCvEncours();

  let cursor: string | null = null;
  let totalRows = 0;
  let page = 0;

  // Paginated fetch: first/after pattern
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    page++;
    const afterClause = cursor ? `, after: "${cursor}"` : "";
    const graphqlQuery = JSON.stringify({
      query: `{ cv_encours(first: ${String(GRAPHQL_PAGE_SIZE)}${afterClause}) { items { FRAISUEP FRAISINTP PDSN_30 VALEUR_COMPTE_VENTE_30 DATEHEUREBAE REFINTERNE EXPIMPNOM CLIFOUNOM ORDRE TPFRTIDENT } hasNextPage endCursor } }`,
    });

    const raw = await executeGraphqlQuery(graphqlEndpoint, token, graphqlQuery);
    const parsed = FabricGraphqlResponseSchema.parse(raw);
    const items = parsed.data.cv_encours.items;

    if (items.length > 0) {
      await insertFabricCvEncoursBatch(
        items.map((item) => ({
          fraisuep: item.FRAISUEP,
          fraisintp: item.FRAISINTP,
          pdsn_30: item.PDSN_30,
          valeur_compte_vente_30: item.VALEUR_COMPTE_VENTE_30,
          dateheurebae: item.DATEHEUREBAE,
          refinterne: item.REFINTERNE,
          expimpnom: item.EXPIMPNOM,
          clifounom: item.CLIFOUNOM,
          ordre: item.ORDRE,
          tpfrtident: item.TPFRTIDENT,
        })),
      );
    }

    totalRows += items.length;
    onProgress?.(page, totalRows);

    const hasNext = parsed.data.cv_encours.hasNextPage ?? false;
    const nextCursor = parsed.data.cv_encours.endCursor ?? null;

    if (!hasNext || !nextCursor) {
      break;
    }

    cursor = nextCursor;
  }

  return { totalRows, pagesProcessed: page };
}

export async function testConnection(): Promise<boolean> {
  const { graphqlEndpoint } = ENV.fabric;

  if (!graphqlEndpoint) {
    throw new WoodyError(
      "L'endpoint GraphQL Fabric doit etre configure",
      "FABRIC_NOT_CONFIGURED",
    );
  }

  const token = await authenticateFabric();

  // Simple introspection query to test connection
  const graphqlQuery = JSON.stringify({
    query: "{ cv_encours(first: 1) { items { REFINTERNE } } }",
  });

  await executeGraphqlQuery(graphqlEndpoint, token, graphqlQuery);
  return true;
}

export async function getClientList(): Promise<string[]> {
  return getFabricDistinctClients();
}

export async function matchDeclaration(
  params: FabricMatchParams,
): Promise<FabricMatchResult> {
  if (!params.camion || !params.dateArrivee || !params.client) {
    throw new WoodyError(
      "Le camion, la date d'arrivee et le client sont requis pour le matching",
      "FABRIC_MATCH_PARAMS_MISSING",
    );
  }

  const { dateFrom, dateTo } = computeDateRange(params.dateArrivee);

  const declarations = await matchFabricDeclarations(
    params.camion,
    dateFrom,
    dateTo,
    params.client,
  );

  return {
    declarations,
    matchCount: declarations.length,
  };
}

// --- Date helpers ---

export function computeDateRange(dateArrivee: string): {
  dateFrom: string;
  dateTo: string;
} {
  const dateBase = new Date(dateArrivee);
  return {
    dateFrom: format(subDays(dateBase, DATE_RANGE_DAYS), "yyyy-MM-dd"),
    dateTo: format(addDays(dateBase, DATE_RANGE_DAYS), "yyyy-MM-dd"),
  };
}

// --- CV Cloture sync ---

export async function syncFabricCvCloture(
  onProgress?: (page: number, rowsSoFar: number) => void,
): Promise<{ totalRows: number; pagesProcessed: number }> {
  const { graphqlEndpoint } = ENV.fabric;

  if (!graphqlEndpoint) {
    throw new WoodyError(
      "L'endpoint GraphQL Fabric doit etre configure",
      "FABRIC_NOT_CONFIGURED",
    );
  }

  const token = await authenticateFabric();
  await clearFabricCvCloture();

  let cursor: string | null = null;
  let totalRows = 0;
  let page = 0;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    page++;
    const afterClause = cursor ? `, after: "${cursor}"` : "";
    const graphqlQuery = JSON.stringify({
      query: `{ cv_cloture(first: ${String(GRAPHQL_PAGE_SIZE)}${afterClause}) { items { DOSSIER REFINTERNE } hasNextPage endCursor } }`,
    });

    const raw = await executeGraphqlQuery(graphqlEndpoint, token, graphqlQuery);
    const parsed = FabricCvClotureGraphqlResponseSchema.parse(raw);
    const items = parsed.data.cv_cloture.items;

    if (items.length > 0) {
      await insertFabricCvClotureBatch(
        items.map((item) => ({
          dossier: item.DOSSIER,
          refinterne: item.REFINTERNE,
        })),
      );
    }

    totalRows += items.length;
    onProgress?.(page, totalRows);

    const hasNext = parsed.data.cv_cloture.hasNextPage ?? false;
    const nextCursor = parsed.data.cv_cloture.endCursor ?? null;

    if (!hasNext || !nextCursor) {
      break;
    }

    cursor = nextCursor;
  }

  return { totalRows, pagesProcessed: page };
}

// --- Sync all Fabric data + auto-close ---

export async function syncAllFabricData(
  onProgress?: (step: string, detail: string) => void,
): Promise<{ encoursRows: number; clotureRows: number; autoClosed: number }> {
  onProgress?.("cv_encours", "Synchronisation des declarations en cours...");
  const encours = await syncFabricData();

  onProgress?.("cv_cloture", "Synchronisation des clotures...");
  const cloture = await syncFabricCvCloture();

  onProgress?.("auto_close", "Cloture automatique des dossiers...");
  const autoClosed = await autoCloseDossiers();

  return {
    encoursRows: encours.totalRows,
    clotureRows: cloture.totalRows,
    autoClosed,
  };
}

// --- Reset auth state (for testing) ---

export function resetFabricAuth(): void {
  cachedToken = null;
  tokenExpiry = null;
}
