/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_N8N_WEBHOOK_URL: string;
  readonly VITE_N8N_TEST_URL: string;
  readonly VITE_N8N_AUTH_TYPE: string;
  readonly VITE_N8N_AUTH_VALUE: string;
  readonly VITE_N8N_RETRY_COUNT: string;

  readonly VITE_FABRIC_GRAPHQL_ENDPOINT: string;
  readonly VITE_FABRIC_CLIENT_ID: string;
  readonly VITE_FABRIC_TENANT_ID: string;
  readonly VITE_FABRIC_CLIENT_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const APP_VERSION: string;

declare module "*.xlsx?url" {
  const url: string;
  export default url;
}
