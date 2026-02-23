import { invoke } from "@tauri-apps/api/core";
import { WoodyError } from "@/types/errors";
import { ENV, type N8nAuthType } from "@/lib/env";
import {
  N8nOcrResponseSchema,
  N8nWebhookAcceptedSchema,
  type N8nOcrResponse,
} from "@/types/n8n.types";

const TEST_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 2_000;
const INITIAL_POLL_DELAY_MS = 120_000; // 2 min before first poll
const POLL_INTERVAL_MS = 30_000; // then every 30s

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
        (error.code === "N8N_NO_URL" || error.code === "N8N_NO_API")
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

// --- Step 1: Submit to webhook, get executionId ---

async function submitDossierForOcr(
  sessionId: string,
  cdvBytes: Uint8Array,
  ficheBytes: Uint8Array,
  produit: string,
  client: string,
): Promise<string> {
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
    console.info("[n8n] Webhook response:", text.slice(0, 300));

    const jsonStr = extractJsonFromText(text);
    let data: unknown = JSON.parse(jsonStr);
    if (Array.isArray(data)) {
      data = data[0];
    }

    const accepted = N8nWebhookAcceptedSchema.parse(data);
    return accepted.executionId;
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
      `Reponse webhook inattendue (attendu: { status: "accepted", executionId }): ${detail}`,
      "N8N_PARSE_FAILED",
      error,
    );
  }
}

// --- Step 2: Poll n8n REST API for execution result (0 n8n executions) ---

async function pollExecutionResult(
  executionId: string,
  onProgress?: (elapsedSeconds: number) => void,
): Promise<N8nOcrResponse> {
  const { apiUrl, apiKey, timeoutMinutes } = ENV.n8n;

  if (!apiUrl || !apiKey) {
    throw new WoodyError(
      "L'API n8n n'est pas configuree (VITE_N8N_API_URL / VITE_N8N_API_KEY).",
      "N8N_NO_API",
    );
  }

  const maxPollMs = timeoutMinutes * 60 * 1000;
  const startTime = Date.now();

  // Wait before first poll (OCR takes 2-5 min, no point polling earlier)
  await new Promise<void>((resolve) => {
    const waitUntil = startTime + INITIAL_POLL_DELAY_MS;
    const tick = () => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      onProgress?.(elapsed);
      if (Date.now() >= waitUntil) {
        resolve();
      } else {
        setTimeout(tick, 1000);
      }
    };
    tick();
  });

  while (Date.now() - startTime < maxPollMs) {
    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    onProgress?.(elapsedSeconds);

    let result;
    try {
      result = await invoke<{ status: number; body: string }>(
        "get_n8n_execution",
        { apiUrl, apiKey, executionId },
      );
    } catch (error) {
      console.warn("[n8n] REST API poll error, retrying...", error);
      await new Promise<void>((resolve) => {
        setTimeout(resolve, POLL_INTERVAL_MS);
      });
      continue;
    }

    if (result.status < 200 || result.status >= 300) {
      throw new WoodyError(
        `Erreur HTTP ${String(result.status)} en interrogeant l'API n8n`,
        "N8N_POLL_HTTP_ERROR",
      );
    }

    let execution: { status: string; data?: { resultData?: { runData?: Record<string, unknown[]> } } };
    try {
      execution = JSON.parse(result.body) as typeof execution;
    } catch (error) {
      throw new WoodyError(
        "Reponse invalide de l'API REST n8n",
        "N8N_POLL_PARSE_FAILED",
        error,
      );
    }

    if (execution.status === "error") {
      throw new WoodyError(
        "L'execution OCR n8n a echoue",
        "N8N_EXECUTION_ERROR",
      );
    }

    if (execution.status === "running" || execution.status === "waiting" || execution.status === "new") {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, POLL_INTERVAL_MS);
      });
      continue;
    }

    if (execution.status === "success") {
      // Extract Build Result output from execution data
      try {
        const runData = execution.data?.resultData?.runData;
        if (!runData) {
          throw new Error("Pas de runData dans l'execution");
        }

        const buildResultRuns = runData["Build Result"] as
          | { data?: { main?: Array<Array<{ json: unknown }>> } }[]
          | undefined;
        if (!buildResultRuns?.[0]) {
          throw new Error("Pas de donnees pour le node 'Build Result'");
        }

        const outputItems = buildResultRuns[0].data?.main?.[0];
        if (!outputItems?.[0]) {
          throw new Error("Pas d'items en sortie de 'Build Result'");
        }

        return N8nOcrResponseSchema.parse(outputItems[0].json);
      } catch (error) {
        if (error instanceof WoodyError) throw error;
        const detail =
          error instanceof Error ? error.message.slice(0, 200) : String(error);
        throw new WoodyError(
          `Erreur de parsing de la reponse OCR n8n: ${detail}`,
          "N8N_PARSE_FAILED",
          error,
        );
      }
    }

    // Unknown status — treat as still running
    await new Promise<void>((resolve) => {
      setTimeout(resolve, POLL_INTERVAL_MS);
    });
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
    // Step 1: Submit and get executionId
    onProgress?.("Envoi a n8n...");
    const executionId = await submitDossierForOcr(
      sessionId, cdvBytes, ficheBytes, produit, client,
    );

    console.info(`[n8n] OCR submitted for session ${sessionId}, executionId=${executionId}`);
    onProgress?.("OCR en cours...");

    // Step 2: Poll REST API for execution result (0 n8n executions)
    return pollExecutionResult(executionId, (elapsedSeconds) => {
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
