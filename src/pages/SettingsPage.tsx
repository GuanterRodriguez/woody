import { useState } from "react";
import {
  Loader2,
  Plug,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/stores/settings.store";
import { testConnection, syncFabricData } from "@/services/fabric.service";
import { testN8nConnection } from "@/services/n8n.service";
import { ENV } from "@/lib/env";
import { WoodyError } from "@/types/errors";

type TestStatus = "idle" | "testing" | "success" | "error";

export function SettingsPage() {
  const { settings, updateSettings, saveSettings } = useSettingsStore();
  const [fabricTestStatus, setFabricTestStatus] =
    useState<TestStatus>("idle");
  const [fabricTestMessage, setFabricTestMessage] = useState<string | null>(
    null,
  );
  const [n8nTestStatus, setN8nTestStatus] = useState<TestStatus>("idle");
  const [n8nTestMessage, setN8nTestMessage] = useState<string | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function handleTestFabric() {
    setFabricTestStatus("testing");
    setFabricTestMessage(null);

    try {
      await testConnection();
      setFabricTestStatus("success");
      setFabricTestMessage("Connexion reussie");
      setTimeout(() => {
        setFabricTestStatus("idle");
        setFabricTestMessage(null);
      }, 5000);
    } catch (error) {
      setFabricTestStatus("error");
      const message =
        error instanceof WoodyError
          ? error.message
          : "Erreur de connexion";
      setFabricTestMessage(message);
      setTimeout(() => {
        setFabricTestStatus("idle");
        setFabricTestMessage(null);
      }, 10000);
    }
  }

  async function handleSync() {
    setIsSyncing(true);
    setSyncProgress(null);
    setSyncMessage(null);
    setSyncError(null);

    try {
      const result = await syncFabricData((page, rowsSoFar) => {
        setSyncProgress(
          `Page ${String(page)}, ${String(rowsSoFar)} lignes...`,
        );
      });

      const now = new Date().toISOString();
      updateSettings({
        fabricLastSyncAt: now,
        fabricLastSyncCount: result.totalRows,
      });
      // Auto-save sync metadata
      await saveSettings();

      setSyncMessage(
        `${String(result.totalRows)} lignes synchronisees (${String(result.pagesProcessed)} page${result.pagesProcessed > 1 ? "s" : ""})`,
      );
      setSyncProgress(null);
    } catch (error) {
      const message =
        error instanceof WoodyError
          ? error.message
          : "Erreur lors de la synchronisation";
      setSyncError(message);
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleTestN8n() {
    setN8nTestStatus("testing");
    setN8nTestMessage(null);

    try {
      const reachable = await testN8nConnection();
      if (reachable) {
        setN8nTestStatus("success");
        const testedUrl = ENV.n8n.testUrl || ENV.n8n.webhookUrl;
        setN8nTestMessage(`Connexion reussie (${testedUrl})`);
      } else {
        setN8nTestStatus("error");
        setN8nTestMessage("Le serveur n8n repond avec une erreur");
      }
      setTimeout(() => {
        setN8nTestStatus("idle");
        setN8nTestMessage(null);
      }, 5000);
    } catch (error) {
      setN8nTestStatus("error");
      const message =
        error instanceof WoodyError
          ? error.message
          : "Erreur de connexion";
      setN8nTestMessage(message);
      setTimeout(() => {
        setN8nTestStatus("idle");
        setN8nTestMessage(null);
      }, 10000);
    }
  }

  const fabricConfigured =
    ENV.fabric.clientId.length > 0 &&
    ENV.fabric.tenantId.length > 0 &&
    ENV.fabric.clientSecret.length > 0 &&
    ENV.fabric.graphqlEndpoint.length > 0;

  const n8nConfigured = ENV.n8n.webhookUrl.length > 0;

  function formatSyncDate(isoStr: string): string {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  }

  return (
    <div className="h-full overflow-auto p-6 max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Configuration</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Les parametres de connexion sont integres au build. Pour les modifier, mettez a jour les variables d'environnement et recompilez.
      </p>

      {/* n8n Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Webhook OCR (n8n)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <StatusDot active={n8nConfigured} />
            <span className="text-sm">
              {n8nConfigured
                ? `Configure${ENV.n8n.authType !== "none" ? " (auth)" : ""}`
                : "Non configure"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleTestN8n()}
              disabled={!n8nConfigured || n8nTestStatus === "testing"}
            >
              {n8nTestStatus === "testing" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plug className="mr-1.5 h-3.5 w-3.5" />
              )}
              Tester la connexion
            </Button>
            {n8nTestStatus === "success" && n8nTestMessage && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                {n8nTestMessage}
              </span>
            )}
            {n8nTestStatus === "error" && n8nTestMessage && (
              <span className="flex items-center gap-1.5 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                {n8nTestMessage}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fabric Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Microsoft Fabric</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <StatusDot active={fabricConfigured} />
            <span className="text-sm">
              {fabricConfigured ? "Configure" : "Non configure"}
            </span>
          </div>

          {/* Test + Sync */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleTestFabric()}
              disabled={!fabricConfigured || fabricTestStatus === "testing"}
            >
              {fabricTestStatus === "testing" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plug className="mr-1.5 h-3.5 w-3.5" />
              )}
              Tester la connexion
            </Button>
            {fabricTestStatus === "success" && fabricTestMessage && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                {fabricTestMessage}
              </span>
            )}
            {fabricTestStatus === "error" && fabricTestMessage && (
              <span className="flex items-center gap-1.5 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                {fabricTestMessage}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSync()}
              disabled={!fabricConfigured || isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              Synchroniser les donnees
            </Button>
            {syncProgress && (
              <span className="text-sm text-muted-foreground">
                {syncProgress}
              </span>
            )}
            {syncMessage && !isSyncing && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                {syncMessage}
              </span>
            )}
            {syncError && (
              <span className="flex items-center gap-1.5 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                {syncError}
              </span>
            )}
          </div>

          {settings.fabricLastSyncAt && (
            <p className="text-sm text-muted-foreground">
              Derniere synchro : {formatSyncDate(settings.fabricLastSyncAt)}{" "}
              — {String(settings.fabricLastSyncCount)} lignes
            </p>
          )}
        </CardContent>
      </Card>

      <Separator className="my-6" />

      <div className="flex items-center gap-4 text-sm">
        <StatusDot active={n8nConfigured} />
        <span>
          n8n{" "}
          {n8nConfigured
            ? `configure${ENV.n8n.authType !== "none" ? " (auth)" : ""}`
            : "non configure"}
        </span>
        <StatusDot active={fabricConfigured} />
        <span>
          Fabric{" "}
          {fabricConfigured ? "configure" : "non configure"}
        </span>
      </div>
    </div>
  );
}

interface StatusDotProps {
  active: boolean;
}

function StatusDot({ active }: StatusDotProps) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        active ? "bg-green-500" : "bg-gray-300"
      }`}
    />
  );
}
