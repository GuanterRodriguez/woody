import { WoodyError } from "@/types/errors";
import type { N8nAuthType } from "@/stores/settings.store";
import {
  N8nOcrResponseSchema,
  type N8nOcrResponse,
} from "@/types/n8n.types";

const TEST_TIMEOUT_MS = 10_000; // 10 seconds for connection test
const RETRY_DELAY_MS = 2_000; // 2 seconds between retries

// --- Config interfaces ---

export interface N8nServiceConfig {
  webhookUrl: string;
  authType: N8nAuthType;
  authValue: string;
  timeoutMinutes: number;
  retryCount: number;
}

export interface N8nTestConfig {
  webhookUrl: string;
  testUrl: string;
  authType: N8nAuthType;
  authValue: string;
}

// --- JSON extraction ---

export function extractJsonFromText(text: string): string {
  // Try to find ```json ... ``` code blocks first
  const codeBlockMatch = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/.exec(text);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }
  // Try to find raw JSON object
  const jsonMatch = /\{[\s\S]*\}/.exec(text);
  if (jsonMatch?.[0]) {
    return jsonMatch[0].trim();
  }
  // Return as-is, let JSON.parse fail with a clear error
  return text.trim();
}

// --- Auth headers (for non-multipart requests) ---

function buildAuthHeaders(
  auth: { authType: N8nAuthType; authValue: string },
): Record<string, string> {
  const headers: Record<string, string> = {};
  switch (auth.authType) {
    case "apiKey":
      if (auth.authValue) {
        headers["X-API-Key"] = auth.authValue;
      }
      break;
    case "bearer":
      if (auth.authValue) {
        headers["Authorization"] = `Bearer ${auth.authValue}`;
      }
      break;
    case "none":
    default:
      break;
  }
  return headers;
}

// --- Retry wrapper ---

async function withRetry<T>(
  fn: () => Promise<T>,
  retryCount: number,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // Don't retry config errors
      if (error instanceof WoodyError && error.code === "N8N_NO_URL") {
        throw error;
      }
      if (attempt < retryCount) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, RETRY_DELAY_MS);
        });
      }
    }
  }
  throw lastError;
}

// --- Main n8n OCR function ---

export async function sendDossierForOcr(
  config: N8nServiceConfig,
  sessionId: string,
  cdvBytes: Uint8Array,
  ficheBytes: Uint8Array,
  produit: string,
  client: string,
): Promise<N8nOcrResponse> {
  if (!config.webhookUrl) {
    throw new WoodyError(
      "L'URL du webhook n8n n'est pas configuree. Allez dans Parametres.",
      "N8N_NO_URL",
    );
  }

  const timeoutMs =
    Math.max(1, Math.min(10, config.timeoutMinutes)) * 60 * 1000;

  async function doRequest(): Promise<N8nOcrResponse> {
    // Build multipart/form-data with binary PDFs + metadata
    const formData = new FormData();
    formData.append("sessionId", sessionId);
    formData.append("produit", produit);
    formData.append("client", client);
    formData.append(
      "cdvPdf",
      new Blob([cdvBytes.buffer as ArrayBuffer], { type: "application/pdf" }),
      "cdv.pdf",
    );
    formData.append(
      "ficheLotPdf",
      new Blob([ficheBytes.buffer as ArrayBuffer], { type: "application/pdf" }),
      "fiche_lot.pdf",
    );

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      // Don't set Content-Type manually - fetch sets multipart boundary automatically
      const headers = buildAuthHeaders({
        authType: config.authType,
        authValue: config.authValue,
      });

      const response = await fetch(config.webhookUrl, {
        method: "POST",
        headers,
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new WoodyError(
          `Erreur HTTP ${String(response.status)} depuis n8n`,
          "N8N_HTTP_ERROR",
        );
      }

      const text = await response.text();
      const jsonStr = extractJsonFromText(text);
      const data: unknown = JSON.parse(jsonStr);
      return N8nOcrResponseSchema.parse(data);
    } catch (error) {
      if (error instanceof WoodyError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new WoodyError(
          `Le delai d'attente n8n est depasse (${String(config.timeoutMinutes)} min)`,
          "N8N_TIMEOUT",
        );
      }
      throw new WoodyError(
        "Erreur de parsing de la reponse n8n",
        "N8N_PARSE_FAILED",
        error,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  return withRetry(doRequest, config.retryCount);
}

// --- Test connection ---

export async function testN8nConnection(
  config: N8nTestConfig,
): Promise<boolean> {
  const url = config.testUrl || config.webhookUrl;
  if (!url) {
    throw new WoodyError("L'URL du webhook n8n est vide", "N8N_NO_URL");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, TEST_TIMEOUT_MS);

  try {
    const headers = buildAuthHeaders({
      authType: config.authType,
      authValue: config.authValue,
    });

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    // n8n webhook might return 200 or 405 (method not allowed for GET)
    // Any response < 500 means the server is reachable
    return response.status < 500;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new WoodyError(
        "Le test de connexion a expire (10s)",
        "N8N_TIMEOUT",
      );
    }
    throw new WoodyError(
      "Impossible de se connecter au webhook n8n",
      "N8N_CONNECTION_FAILED",
      error,
    );
  } finally {
    clearTimeout(timer);
  }
}
