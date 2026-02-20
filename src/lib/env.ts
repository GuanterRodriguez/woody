export type N8nAuthType = "none" | "apiKey" | "bearer";

export const ENV = {
  n8n: {
    webhookUrl: (import.meta.env.VITE_N8N_WEBHOOK_URL as string) ?? "",
    resultUrl: (import.meta.env.VITE_N8N_RESULT_URL as string) ?? "",
    testUrl: import.meta.env.VITE_N8N_TEST_URL,
    authType: (import.meta.env.VITE_N8N_AUTH_TYPE || "none") as N8nAuthType,
    authValue: import.meta.env.VITE_N8N_AUTH_VALUE,
    retryCount: Number(import.meta.env.VITE_N8N_RETRY_COUNT || "0"),
    timeoutMinutes: Number(import.meta.env.VITE_N8N_TIMEOUT_MINUTES || "5"),
  },
  fabric: {
    graphqlEndpoint: import.meta.env.VITE_FABRIC_GRAPHQL_ENDPOINT,
    clientId: import.meta.env.VITE_FABRIC_CLIENT_ID,
    tenantId: import.meta.env.VITE_FABRIC_TENANT_ID,
    clientSecret: import.meta.env.VITE_FABRIC_CLIENT_SECRET,
  },
} as const;
