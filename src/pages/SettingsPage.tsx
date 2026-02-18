import { useState } from "react";
import {
  Save,
  Loader2,
  Plug,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettingsStore, type N8nAuthType } from "@/stores/settings.store";
import { testConnection, syncFabricData } from "@/services/fabric.service";
import { testN8nConnection } from "@/services/n8n.service";
import { WoodyError } from "@/types/errors";

type TestStatus = "idle" | "testing" | "success" | "error";

export function SettingsPage() {
  const { settings, isSaving, updateSettings, saveSettings } =
    useSettingsStore();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
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

  async function handleSave() {
    try {
      await saveSettings();
      setSaveMessage("Parametres sauvegardes");
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    } catch {
      setSaveMessage("Erreur lors de la sauvegarde");
      setTimeout(() => {
        setSaveMessage(null);
      }, 5000);
    }
  }

  async function handleTestFabric() {
    setFabricTestStatus("testing");
    setFabricTestMessage(null);

    try {
      await testConnection(settings.fabricGraphqlEndpoint, {
        clientId: settings.fabricClientId,
        tenantId: settings.fabricTenantId,
        clientSecret: settings.fabricClientSecret,
      });
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
      const result = await syncFabricData(
        settings.fabricGraphqlEndpoint,
        {
          clientId: settings.fabricClientId,
          tenantId: settings.fabricTenantId,
          clientSecret: settings.fabricClientSecret,
        },
        (page, rowsSoFar) => {
          setSyncProgress(
            `Page ${String(page)}, ${String(rowsSoFar)} lignes...`,
          );
        },
      );

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
      const reachable = await testN8nConnection({
        webhookUrl: settings.n8nWebhookUrl,
        testUrl: settings.n8nTestUrl,
        authType: settings.n8nAuthType,
        authValue: settings.n8nAuthValue,
      });
      if (reachable) {
        setN8nTestStatus("success");
        const testedUrl = settings.n8nTestUrl || settings.n8nWebhookUrl;
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

  const canTestFabric =
    settings.fabricClientId.length > 0 &&
    settings.fabricTenantId.length > 0 &&
    settings.fabricClientSecret.length > 0 &&
    settings.fabricGraphqlEndpoint.length > 0;
  const canTestN8n =
    settings.n8nWebhookUrl.length > 0 || settings.n8nTestUrl.length > 0;

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

      {/* n8n Webhook Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Webhook OCR (n8n)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL principale */}
          <div className="space-y-2">
            <Label htmlFor="n8n-url">URL du webhook *</Label>
            <Input
              id="n8n-url"
              type="text"
              value={settings.n8nWebhookUrl}
              onChange={(e) => {
                updateSettings({ n8nWebhookUrl: e.target.value });
              }}
              placeholder="https://n8n.example.com/webhook/ocr"
            />
          </div>

          {/* URL de test */}
          <div className="space-y-2">
            <Label htmlFor="n8n-test-url">URL de test</Label>
            <Input
              id="n8n-test-url"
              type="text"
              value={settings.n8nTestUrl}
              onChange={(e) => {
                updateSettings({ n8nTestUrl: e.target.value });
              }}
              placeholder="Laissez vide pour utiliser l'URL principale"
            />
          </div>

          <Separator />

          {/* Authentification */}
          <div className="space-y-3">
            <Label>Authentification</Label>
            <RadioGroup
              value={settings.n8nAuthType}
              onValueChange={(value: string) => {
                const authType = value as N8nAuthType;
                updateSettings({ n8nAuthType: authType });
                if (authType === "none") {
                  updateSettings({ n8nAuthValue: "" });
                }
              }}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="none" id="auth-none" />
                <Label htmlFor="auth-none" className="font-normal">
                  Aucune
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="apiKey" id="auth-apikey" />
                <Label htmlFor="auth-apikey" className="font-normal">
                  Cle API
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="bearer" id="auth-bearer" />
                <Label htmlFor="auth-bearer" className="font-normal">
                  Bearer Token
                </Label>
              </div>
            </RadioGroup>

            {settings.n8nAuthType !== "none" && (
              <div className="space-y-2">
                <Label htmlFor="n8n-auth-value">
                  {settings.n8nAuthType === "apiKey"
                    ? "Cle API"
                    : "Token Bearer"}
                </Label>
                <Input
                  id="n8n-auth-value"
                  type="password"
                  value={settings.n8nAuthValue}
                  onChange={(e) => {
                    updateSettings({ n8nAuthValue: e.target.value });
                  }}
                  placeholder={
                    settings.n8nAuthType === "apiKey"
                      ? "Saisir la cle API..."
                      : "Saisir le token Bearer..."
                  }
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Timeout + Retry */}
          <div className="flex gap-6">
            <div className="flex-1 space-y-2">
              <Label htmlFor="n8n-timeout">Timeout</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="n8n-timeout"
                  type="number"
                  min={1}
                  max={10}
                  value={String(settings.n8nTimeoutMinutes)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!Number.isNaN(val)) {
                      updateSettings({
                        n8nTimeoutMinutes: Math.max(1, Math.min(10, val)),
                      });
                    }
                  }}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <Label htmlFor="n8n-retry">Tentatives</Label>
              <Select
                value={String(settings.n8nRetryCount)}
                onValueChange={(value: string) => {
                  updateSettings({
                    n8nRetryCount: parseInt(value, 10),
                  });
                }}
              >
                <SelectTrigger id="n8n-retry" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Aucune (defaut)</SelectItem>
                  <SelectItem value="1">1 retry</SelectItem>
                  <SelectItem value="2">2 retries</SelectItem>
                  <SelectItem value="3">3 retries</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Test connexion */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleTestN8n()}
              disabled={!canTestN8n || n8nTestStatus === "testing"}
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


      {/* Fabric Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Microsoft Fabric</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Entra ID (Azure AD) App Registration */}
          <div className="space-y-2">
            <Label htmlFor="fabric-client-id">Client ID (Entra ID) *</Label>
            <Input
              id="fabric-client-id"
              value={settings.fabricClientId}
              onChange={(e) => {
                updateSettings({ fabricClientId: e.target.value });
              }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fabric-tenant-id">Tenant ID *</Label>
            <Input
              id="fabric-tenant-id"
              value={settings.fabricTenantId}
              onChange={(e) => {
                updateSettings({ fabricTenantId: e.target.value });
              }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fabric-client-secret">Secret client *</Label>
            <Input
              id="fabric-client-secret"
              type="password"
              value={settings.fabricClientSecret}
              onChange={(e) => {
                updateSettings({ fabricClientSecret: e.target.value });
              }}
              placeholder="Saisir le secret client..."
            />
          </div>

          <Separator />

          {/* GraphQL Endpoint */}
          <div className="space-y-2">
            <Label htmlFor="fabric-graphql-endpoint">
              Endpoint GraphQL *
            </Label>
            <Input
              id="fabric-graphql-endpoint"
              value={settings.fabricGraphqlEndpoint}
              onChange={(e) => {
                updateSettings({ fabricGraphqlEndpoint: e.target.value });
              }}
              placeholder="https://xxx.graphql.fabric.microsoft.com/v1/workspaces/..."
            />
          </div>

          <Separator />

          {/* Test + Sync */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleTestFabric()}
              disabled={!canTestFabric || fabricTestStatus === "testing"}
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
              disabled={!canTestFabric || isSyncing}
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

      <div className="flex items-center gap-4">
        <Button onClick={() => void handleSave()} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
        {saveMessage && (
          <span className="text-sm text-muted-foreground">{saveMessage}</span>
        )}
      </div>

      <Separator className="my-6" />

      <div className="flex items-center gap-4 text-sm">
        <StatusDot active={settings.n8nWebhookUrl.length > 0} />
        <span>
          n8n{" "}
          {settings.n8nWebhookUrl.length > 0
            ? `configure${settings.n8nAuthType !== "none" ? " (auth)" : ""}`
            : "non configure"}
        </span>
        <StatusDot active={settings.fabricGraphqlEndpoint.length > 0} />
        <span>
          Fabric{" "}
          {settings.fabricGraphqlEndpoint.length > 0
            ? "configure"
            : "non configure"}
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
