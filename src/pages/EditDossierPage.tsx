import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useEditorStore } from "@/stores/editor.store";
import { useQueueStore } from "@/stores/queue.store";
import { useImportStore } from "@/stores/import.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { InformationsForm } from "@/components/editor/InformationsForm";
import { FraisForm } from "@/components/editor/FraisForm";
import { FabricEnrichment } from "@/components/editor/FabricEnrichment";
import { FabricSelector } from "@/components/editor/FabricSelector";
import { LignesVenteTable } from "@/components/editor/LignesVenteTable";
import { LignesParPrixView } from "@/components/editor/LignesParPrixView";
import { CalculationSummary } from "@/components/editor/CalculationSummary";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { GenerationDialog } from "@/components/editor/GenerationDialog";
import { PdfSidePanel } from "@/components/editor/PdfSidePanel";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { calculateCdv } from "@/services/calculation.engine";
import { processQueue } from "@/services/ocr.orchestrator";
import { updateCdvSession } from "@/services/database.service";
import { WoodyError } from "@/types/errors";
import { editorRoute } from "@/routes";
import type { QueueItem } from "@/types/queue.types";

const AUTOSAVE_DEBOUNCE_MS = 1000;

export function EditDossierPage() {
  const { sessionId: routeSessionId } = editorRoute.useParams();
  const navigate = useNavigate();

  const {
    session,
    lignes,
    isLoading,
    isSaving,
    isDirty,
    lastSavedAt,
    saveError,
    activePdfTab,
    fabricLoading,
    fabricError,
    fabricDeclarations,
    showFabricSelector,
    loadSession,
    updateSessionField,
    updateLigne,
    addLigne,
    removeLigne,
    save,
    validate,
    setActivePdfTab,
    enrichFromFabric,
    applyFabricDeclaration,
    closeFabricSelector,
    reset,
  } = useEditorStore();

  const { markDossierSeen } = useNavigationStore();

  // Load session on mount + mark as seen
  useEffect(() => {
    void loadSession(routeSessionId);
    void markDossierSeen(routeSessionId);
    return () => {
      reset();
    };
  }, [routeSessionId, loadSession, markDossierSeen, reset]);

  // Calculation result (real-time)
  const calculationResult = useMemo(() => {
    if (!session) return null;
    return calculateCdv(session, lignes);
  }, [session, lignes]);

  // Auto-save debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDirty) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void save();
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [isDirty, save]);

  // OCR rerun via queue
  const { documents } = useImportStore();
  const { addToQueue, clearQueue, isProcessing } = useQueueStore();

  async function handleRerunOcr() {
    if (!session || isProcessing) return;

    try {
      // Save current changes first
      if (isDirty) {
        await save();
      }

      // Find associated PDF documents
      const cdvDoc = documents.find(
        (d) => d.cdvSessionId === session.id && d.type === "cdv",
      );
      const ficheDoc = documents.find(
        (d) => d.cdvSessionId === session.id && d.type === "fiche_lot",
      );

      if (!cdvDoc || !ficheDoc) {
        throw new WoodyError(
          "Documents PDF introuvables pour ce dossier",
          "RERUN_DOCS_NOT_FOUND",
        );
      }

      // Reset status to brouillon
      await updateCdvSession(session.id, { statut: "brouillon" });

      // Add to queue (clear first to ensure only this one)
      clearQueue();
      const queueItem: QueueItem = {
        dossierSessionId: session.id,
        produit: session.produit,
        client: session.client,
        pdfCdvDocId: cdvDoc.id,
        pdfFicheDocId: ficheDoc.id,
        status: "pending",
        error: null,
        currentStep: null,
      };
      addToQueue(queueItem);

      // Start queue processing
      void processQueue();

      // Navigate back to home to see queue progress
      void navigate({ to: "/" });
    } catch (error) {
      const message =
        error instanceof WoodyError ? error.message : "Erreur lors de la relance OCR";
      throw new WoodyError(message, "RERUN_OCR_FAILED", error);
    }
  }

  // Generation dialog
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);

  function handleGenerated() {
    setShowGenerationDialog(false);
    updateSessionField({ statut: "genere" });
  }

  function handleBack() {
    void navigate({ to: "/edit-dossiers" });
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Dossier introuvable</p>
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">
          Editeur : {session.produit}
          {session.camion ? ` - ${session.camion}` : ""}
        </h1>
      </div>

      {/* Main content: split panels */}
      <ResizablePanelGroup
        orientation="horizontal"
        className="min-h-0 flex-1"
      >
        {/* Left panel: forms + table */}
        <ResizablePanel defaultSize={55} minSize={35}>
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-6">
              <InformationsForm
                session={session}
                onFieldChange={updateSessionField}
              />
              <FraisForm
                session={session}
                onFieldChange={updateSessionField}
              />
              <FabricEnrichment
                session={session}
                fabricLoading={fabricLoading}
                fabricError={fabricError}
                fabricDeclarations={fabricDeclarations}
                onEnrich={() => {
                  void enrichFromFabric();
                }}
              />
              <Tabs defaultValue="lignes">
                <TabsList>
                  <TabsTrigger value="lignes">Lignes</TabsTrigger>
                  <TabsTrigger value="par-prix">Par prix</TabsTrigger>
                </TabsList>
                <TabsContent value="lignes" className="mt-3">
                  <LignesVenteTable
                    lignes={lignes}
                    onUpdateLigne={updateLigne}
                    onAddLigne={addLigne}
                    onRemoveLigne={removeLigne}
                  />
                </TabsContent>
                <TabsContent value="par-prix" className="mt-3">
                  <LignesParPrixView lignes={lignes} />
                </TabsContent>
              </Tabs>
              {calculationResult && (
                <CalculationSummary result={calculationResult} />
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel: PDF viewer */}
        <ResizablePanel defaultSize={45} minSize={25}>
          <PdfSidePanel
            pdfCdvPath={session.pdfCdvPath}
            pdfFicheLotPath={session.pdfFicheLotPath}
            activeTab={activePdfTab}
            onTabChange={setActivePdfTab}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Bottom toolbar */}
      <EditorToolbar
        statut={session.statut}
        isSaving={isSaving}
        isDirty={isDirty}
        isRunningOcr={isProcessing}
        lastSavedAt={lastSavedAt}
        saveError={saveError}
        onSave={() => {
          void save();
        }}
        onValidate={() => {
          void validate();
        }}
        onGenerate={() => {
          setShowGenerationDialog(true);
        }}
        onRerunOcr={() => {
          void handleRerunOcr();
        }}
      />

      {/* Generation dialog */}
      <GenerationDialog
        open={showGenerationDialog}
        session={session}
        lignes={lignes}
        calculationResult={calculationResult}
        onClose={() => {
          setShowGenerationDialog(false);
        }}
        onGenerated={handleGenerated}
      />

      {/* Fabric multi-result selector */}
      <FabricSelector
        open={showFabricSelector}
        declarations={fabricDeclarations}
        onSelect={applyFabricDeclaration}
        onClose={closeFabricSelector}
      />
    </div>
  );
}
