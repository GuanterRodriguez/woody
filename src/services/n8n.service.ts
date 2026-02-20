import { invoke } from "@tauri-apps/api/core";
import { WoodyError } from "@/types/errors";
import { ENV, type N8nAuthType } from "@/lib/env";
import {
  N8nOcrResponseSchema,
  N8nWebhookAcceptedSchema,
  N8nPollProcessingSchema,
  type N8nOcrResponse,
} from "@/types/n8n.types";

const TEST_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 2_000;
const POLL_INTERVAL_MS = 5_000;

// --- JSON extraction ---

export function extractJsonFromText(text: string): string {
  const codeBlockMatch = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/.exec(text);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }
  const jsonMatch = /\{[\s\S]*\}/.exec(text);
  if (jsonMatch?.[0]) {
    return jsonMatch[0].trim();
  }
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
      if (
        error instanceof WoodyError &&
        (error.code === "N8N_NO_URL" || error.code === "N8N_NO_RESULT_URL")
      ) {
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

// --- Step 1: Submit to webhook, get "accepted" ---

async function submitDossierForOcr(
  sessionId: string,
  cdvBytes: Uint8Array,
  ficheBytes: Uint8Array,
  produit: string,
  client: string,
): Promise<void> {
  const { webhookUrl, authType, authValue } = ENV.n8n;

  if (!webhookUrl) {
    throw new WoodyError(
      "L'URL du webhook n8n n'est pas configuree (VITE_N8N_WEBHOOK_URL).",
      "N8N_NO_URL",
    );
  }

  try {
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
    console.info("[n8n] Webhook immediate response:", text.slice(0, 300));

    const jsonStr = extractJsonFromText(text);
    let data: unknown = JSON.parse(jsonStr);
    if (Array.isArray(data)) {
      data = data[0];
    }

    N8nWebhookAcceptedSchema.parse(data);
  } catch (error) {
    if (error instanceof WoodyError) throw error;
    if (typeof error === "string") {
      throw new WoodyError(
        `Erreur reseau n8n: ${error}`,
        "N8N_NETWORK_ERROR",
      );
    }
    const detail =
      error instanceof Error ? error.message.slice(0, 200) : String(error);
    throw new WoodyError(
      `Reponse webhook inattendue (attendu: { status: "accepted" }): ${detail}`,
      "N8N_PARSE_FAILED",
      error,
    );
  }
}

// --- Step 2: Poll results webhook until OCR data is ready ---

async function pollOcrResult(
  sessionId: string,
  onProgress?: (elapsedSeconds: number) => void,
): Promise<N8nOcrResponse> {
  const { resultUrl, timeoutMinutes } = ENV.n8n;

  if (!resultUrl) {
    throw new WoodyError(
      "L'URL du webhook resultats n8n n'est pas configuree (VITE_N8N_RESULT_URL).",
      "N8N_NO_RESULT_URL",
    );
  }

  const maxPollMs = timeoutMinutes * 60 * 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxPollMs) {
    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    onProgress?.(elapsedSeconds);

    let result;
    try {
      result = await invoke<{ status: number; body: string }>(
        "poll_n8n_result",
        { resultUrl, sessionId },
      );
    } catch (error) {
      // Network error during polling — wait and retry
      console.warn("[n8n] Poll network error, retrying...", error);
      await new Promise<void>((resolve) => {
        setTimeout(resolve, POLL_INTERVAL_MS);
      });
      continue;
    }

    if (result.status < 200 || result.status >= 300) {
      throw new WoodyError(
        `Erreur HTTP ${String(result.status)} en interrogeant les resultats n8n`,
        "N8N_POLL_HTTP_ERROR",
      );
    }

    let data: unknown;
    try {
      const jsonStr = extractJsonFromText(result.body);
      data = JSON.parse(jsonStr);
      if (Array.isArray(data)) {
        data = data[0];
      }
    } catch (error) {
      throw new WoodyError(
        "Reponse invalide du webhook resultats n8n",
        "N8N_POLL_PARSE_FAILED",
        error,
      );
    }

    // Check if still processing
    const processingResult = N8nPollProcessingSchema.safeParse(data);
    if (processingResult.success) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, POLL_INTERVAL_MS);
      });
      continue;
    }

    // Try to parse as OCR result
    try {
      return N8nOcrResponseSchema.parse(data);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message.slice(0, 200) : String(error);
      throw new WoodyError(
        `Erreur de parsing de la reponse OCR n8n: ${detail}`,
        "N8N_PARSE_FAILED",
        error,
      );
    }
  }

  throw new WoodyError(
    `L'OCR n8n n'a pas termine apres ${String(timeoutMinutes)} minutes`,
    "N8N_POLL_TIMEOUT",
  );
}

// --- Public API ---

export async function sendDossierForOcr(
  sessionId: string,
  cdvBytes: Uint8Array,
  ficheBytes: Uint8Array,
  produit: string,
  client: string,
  onProgress?: (message: string) => void,
): Promise<N8nOcrResponse> {
  const { retryCount } = ENV.n8n;

  async function doRequest(): Promise<N8nOcrResponse> {
    // Step 1: Submit and get "accepted"
    onProgress?.("Envoi a n8n...");
    await submitDossierForOcr(sessionId, cdvBytes, ficheBytes, produit, client);

    console.info(`[n8n] OCR submitted for session ${sessionId}, polling...`);
    onProgress?.("OCR en cours...");

    // Step 2: Poll results webhook until completion
    return pollOcrResult(sessionId, (elapsedSeconds) => {
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      const timeStr =
        minutes > 0
          ? `${String(minutes)}m${String(seconds).padStart(2, "0")}s`
          : `${String(seconds)}s`;
      onProgress?.(`OCR en cours (${timeStr})...`);
    });
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
