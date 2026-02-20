import { useImportStore } from "@/stores/import.store";
import { useQueueStore } from "@/stores/queue.store";
import { readPdfBytes } from "@/services/pdf.service";
import { sendDossierForOcr } from "@/services/n8n.service";
import {
  updateCdvSession,
  saveLignesVente,
} from "@/services/database.service";
import { matchDeclaration } from "@/services/fabric.service";
import { mapFabricToCdvSession } from "@/types/fabric.types";
import type { CdvSession } from "@/types/cdv.types";
import { WoodyError } from "@/types/errors";

const DELAY_BETWEEN_DOSSIERS_MS = 500;

/**
 * Process OCR for a single dossier via n8n webhook.
 * Sends both PDFs (CDV + Fiche de lot) in a single request.
 * Updates queue store status in real-time.
 */
export async function processDossierOcr(sessionId: string): Promise<void> {
  const { updateItemStatus } = useQueueStore.getState();
  const { documents } = useImportStore.getState();

  const queueItem = useQueueStore
    .getState()
    .items.find((i) => i.dossierSessionId === sessionId);
  if (!queueItem) {
    throw new WoodyError("Item de file introuvable", "QUEUE_ITEM_NOT_FOUND");
  }

  const cdvDoc = documents.find((d) => d.id === queueItem.pdfCdvDocId);
  const ficheDoc = documents.find((d) => d.id === queueItem.pdfFicheDocId);

  if (!cdvDoc || !ficheDoc) {
    throw new WoodyError(
      "Documents PDF introuvables pour ce dossier",
      "QUEUE_DOCS_NOT_FOUND",
    );
  }

  // Update status: sending to n8n
  await updateCdvSession(sessionId, { statut: "ocr_en_cours" });

  // Read both PDFs
  const cdvBytes = await readPdfBytes(cdvDoc.filePath);
  const ficheBytes = await readPdfBytes(ficheDoc.filePath);

  // Single call to n8n for both OCR (async webhook + polling)
  updateItemStatus(sessionId, "ocr_fiche", null, "Envoi a n8n...");
  const result = await sendDossierForOcr(
    sessionId,
    cdvBytes,
    ficheBytes,
    queueItem.produit,
    queueItem.client,
    (progressMessage: string) => {
      updateItemStatus(sessionId, "ocr_fiche", null, progressMessage);
    },
  );

  // Save CDV results
  await updateCdvSession(sessionId, {
    camion: result.cdv.camion,
    dateArrivee: result.cdv.date_arrivee,
    fraisTransit: result.cdv.frais_transit,
    fraisCommission: result.cdv.frais_commission,
    autreFrais: result.cdv.autre_frais,
    ocrRawCdv: JSON.stringify(result.cdv),
  });

  // Save Fiche results
  await updateCdvSession(sessionId, {
    statut: "a_corriger",
    ocrRawFiche: JSON.stringify(result.fiche),
  });

  await saveLignesVente(
    sessionId,
    result.fiche.lignes.map((l, i) => ({
      client: l.client,
      produit: l.produit,
      colis: l.colis,
      poidsBrut: l.poids_brut,
      poidsNet: l.poids_net,
      prixUnitaireNet: l.prix_unitaire_net,
      ordre: i + 1,
    })),
  );

  // Auto-enrich from Fabric cache after OCR
  updateItemStatus(sessionId, "ocr_fiche", null, "Enrichissement Fabric...");
  try {
    const camion = result.cdv.camion;
    const dateArrivee = result.cdv.date_arrivee;
    if (camion && dateArrivee && queueItem.client) {
      const matchResult = await matchDeclaration({
        camion,
        dateArrivee,
        client: queueItem.client,
      });
      if (matchResult.matchCount === 1) {
        const firstDecl = matchResult.declarations[0];
        if (firstDecl) {
          const mapped = mapFabricToCdvSession(firstDecl);
          await updateCdvSession(sessionId, mapped);
        }
      }
    }
  } catch {
    // Fabric enrichment is best-effort — don't fail the OCR step
  }
}

/**
 * Re-run OCR for a session directly from the editor.
 * Uses session PDF paths — no queue item needed.
 * @deprecated Use queue-based rerun instead (reset to brouillon + add to queue + processQueue)
 * to ensure only 1 webhook call at a time.
 */
export async function rerunSessionOcr(session: CdvSession): Promise<void> {
  if (!session.pdfCdvPath || !session.pdfFicheLotPath) {
    throw new WoodyError(
      "Les fichiers PDF sont manquants pour ce dossier",
      "SESSION_PDFS_NOT_FOUND",
    );
  }

  const previousStatut = session.statut;
  await updateCdvSession(session.id, { statut: "ocr_en_cours" });

  try {
    const cdvBytes = await readPdfBytes(session.pdfCdvPath);
    const ficheBytes = await readPdfBytes(session.pdfFicheLotPath);

    const result = await sendDossierForOcr(
      session.id,
      cdvBytes,
      ficheBytes,
      session.produit,
      session.client,
    );

    await updateCdvSession(session.id, {
      camion: result.cdv.camion,
      dateArrivee: result.cdv.date_arrivee,
      fraisTransit: result.cdv.frais_transit,
      fraisCommission: result.cdv.frais_commission,
      autreFrais: result.cdv.autre_frais,
      ocrRawCdv: JSON.stringify(result.cdv),
    });

    await updateCdvSession(session.id, {
      statut: "a_corriger",
      ocrRawFiche: JSON.stringify(result.fiche),
    });

    await saveLignesVente(
      session.id,
      result.fiche.lignes.map((l, i) => ({
        client: l.client,
        produit: l.produit,
        colis: l.colis,
        poidsBrut: l.poids_brut,
        poidsNet: l.poids_net,
        prixUnitaireNet: l.prix_unitaire_net,
        ordre: i + 1,
      })),
    );

    // Auto-enrich from Fabric cache
    try {
      const camion = result.cdv.camion;
      const dateArrivee = result.cdv.date_arrivee;
      if (camion && dateArrivee && session.client) {
        const matchResult = await matchDeclaration({
          camion,
          dateArrivee,
          client: session.client,
        });
        if (matchResult.matchCount === 1) {
          const firstDecl = matchResult.declarations[0];
          if (firstDecl) {
            const mapped = mapFabricToCdvSession(firstDecl);
            await updateCdvSession(session.id, mapped);
          }
        }
      }
    } catch {
      // Fabric enrichment is best-effort
    }
  } catch (error) {
    // Restore previous status so the dossier doesn't get stuck at ocr_en_cours
    await updateCdvSession(session.id, { statut: previousStatut });
    throw error;
  }
}

const PAUSE_POLL_MS = 200;
const MAX_PAUSE_DURATION_MS = 5 * 60 * 1000; // 5 minutes max pause

/**
 * Process the entire OCR queue sequentially.
 * Respects pause/cancel flags between each dossier.
 * Wrapped in try/finally to always reset isProcessing.
 */
export async function processQueue(): Promise<void> {
  const { startProcessing, updateItemStatus, incrementProcessed } =
    useQueueStore.getState();

  startProcessing();

  try {
    const pendingItems = useQueueStore
      .getState()
      .items.filter((i) => i.status === "pending");

    for (const item of pendingItems) {
      if (useQueueStore.getState().shouldStop) break;

      // Wait while paused (with max duration safety net)
      const pauseStart = Date.now();
      while (useQueueStore.getState().isPaused) {
        if (useQueueStore.getState().shouldStop) break;
        if (Date.now() - pauseStart > MAX_PAUSE_DURATION_MS) {
          useQueueStore.getState().resumeProcessing();
          break;
        }
        await new Promise<void>((resolve) => {
          setTimeout(resolve, PAUSE_POLL_MS);
        });
      }

      if (useQueueStore.getState().shouldStop) break;

      try {
        await processDossierOcr(item.dossierSessionId);
        updateItemStatus(item.dossierSessionId, "done", null, "Termine");
        incrementProcessed();
      } catch (error) {
        const message =
          error instanceof WoodyError ? error.message : "Erreur OCR inconnue";
        updateItemStatus(item.dossierSessionId, "error", message, null);
        await updateCdvSession(item.dossierSessionId, {
          statut: "brouillon",
        });
        incrementProcessed();
      }

      // Delay between dossiers
      if (!useQueueStore.getState().shouldStop) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, DELAY_BETWEEN_DOSSIERS_MS);
        });
      }
    }
  } finally {
    useQueueStore.setState({ isProcessing: false });
  }
}
