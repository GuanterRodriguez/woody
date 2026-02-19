import { invoke } from "@tauri-apps/api/core";
import { WoodyError } from "@/types/errors";
import { ENV, type N8nAuthType } from "@/lib/env";
import {
  N8nOcrResponseSchema,
  type N8nOcrResponse,
} from "@/types/n8n.types";

const TEST_TIMEOUT_MS = 10_000; // 10 seconds for connection test
const RETRY_DELAY_MS = 2_000; // 2 seconds between retries

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
  sessionId: string,
  cdvBytes: Uint8Array,
  ficheBytes: Uint8Array,
  produit: string,
  client: string,
): Promise<N8nOcrResponse> {
  const { webhookUrl, authType, authValue, retryCount } = ENV.n8n;

  if (!webhookUrl) {
    throw new WoodyError(
      "L'URL du webhook n8n n'est pas configuree (VITE_N8N_WEBHOOK_URL).",
      "N8N_NO_URL",
    );
  }

  async function doRequest(): Promise<N8nOcrResponse> {
    try {
      // Use Rust command to bypass WebView fetch timeout (~120s)
      const result = await invoke<{ status: number; body: string }>(
        "send_n8n_webhook",
        {
          webhookUrl,
          sessionId,
          produit,
          clientName: client,
          cdvPdf: Array.from(cdvBytes),
          fichePdf: Array.from(ficheBytes),
          authType,
          authValue: authValue || "",
        },
      );

      if (result.status < 200 || result.status >= 300) {
        throw new WoodyError(
          `Erreur HTTP ${String(result.status)} depuis n8n`,
          "N8N_HTTP_ERROR",
        );
      }

      const text = result.body;
      console.warn("[n8n] Raw response:", text.slice(0, 500));

      const jsonStr = extractJsonFromText(text);
      let data: unknown = JSON.parse(jsonStr);

      // n8n sometimes wraps responses in an array — unwrap if needed
      if (Array.isArray(data)) {
        data = data[0];
      }

      return N8nOcrResponseSchema.parse(data);
    } catch (error) {
      if (error instanceof WoodyError) throw error;
      // invoke() rejects with a string for Rust errors
      if (typeof error === "string") {
        throw new WoodyError(
          `Erreur reseau n8n: ${error}`,
          "N8N_NETWORK_ERROR",
        );
      }
      const detail =
        error instanceof Error ? error.message.slice(0, 200) : String(error);
      throw new WoodyError(
        `Erreur de parsing de la reponse n8n: ${detail}`,
        "N8N_PARSE_FAILED",
        error,
      );
    }
  }

  return withRetry(doRequest, retryCount);
}

// --- Test connection ---

export async function testN8nConnection(): Promise<boolean> {
  const { webhookUrl, testUrl, authType, authValue } = ENV.n8n;
  const url = testUrl || webhookUrl;
  if (!url) {
    throw new WoodyError("L'URL du webhook n8n est vide", "N8N_NO_URL");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, TEST_TIMEOUT_MS);

  try {
    const headers = buildAuthHeaders({ authType, authValue });

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
