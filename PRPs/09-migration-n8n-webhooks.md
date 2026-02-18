# PRP #9: Migration OCR - Gemini vers n8n Webhooks (Phase 1)

> **Status:** A FAIRE | Date: 2026-02-16
> **Prerequis:** PRP #3 (OCR Gemini), PRP #4 (Dossiers & Pipeline OCR)

---

## Principes Fondamentaux

1. **Context is King** - Inclure TOUTE la documentation, exemples, et gotchas
2. **Validation Loops** - Tests executables que l'IA peut run et fixer
3. **Information Dense** - Keywords et patterns du codebase
4. **Progressive Success** - Commencer simple, valider, ameliorer
5. **Suivre CLAUDE.md** - Toutes les regles globales du projet

---

## Goal

**Ce qui doit etre construit:**
Remplacer l'OCR local via Google Gemini SDK par des appels webhook synchrones a un workflow n8n. L'application envoie les 2 PDFs d'un dossier (CDV + Fiche de lot) en une seule requete HTTP, n8n traite l'OCR et retourne les resultats dans la reponse HTTP.

**Etat final desire:**
- L'app envoie les 2 PDFs + prompts a n8n en une requete
- n8n repond avec les resultats OCR (CDV + Fiche de lot) dans la reponse HTTP
- Les memes schemas Zod existants (`OcrCdvSchema`, `OcrFicheLotSchema`) valident la reponse
- La file d'attente (queue) fonctionne comme avant : sequentielle, pause/cancel, progression temps reel
- La dependance `@google/genai` est supprimee
- Le setting `geminiApiKey` est remplace par `n8nWebhookUrl`

---

## Why

**Valeur business et impact utilisateur:**
- Google Gemini ne fonctionne plus comme OCR direct (problemes de cle API / quotas / restrictions)
- n8n offre plus de flexibilite : le workflow OCR est configurable sans modifier l'app
- Economie d'executions n8n : un seul appel par dossier (2 PDFs ensemble) au lieu de 2 appels separes
- Le modele IA utilise par n8n est interchangeable (GPT-4, Claude, Gemini, etc.)

**Integration avec l'existant:**
- Remplace `gemini.service.ts` par `n8n.service.ts`
- L'orchestrateur (`ocr.orchestrator.ts`) fait 1 appel au lieu de 2
- Les schemas Zod sont reutilises tels quels
- La sauvegarde en DB (updateCdvSession + saveLignesVente) est identique
- La queue (pause, cancel, progression) est inchangee

**Problemes resolus:**
- Gemini OCR non fonctionnel
- Dependance a une cle API Gemini
- 2 appels API par dossier (reduit a 1)

---

## What

### Comportement Visible

```
┌─────────────────────────────────────────────────────────────────────┐
│  Configuration > OCR                                                 │
│                                                                      │
│  ┌────────────────────────────────────────────────────┐              │
│  │  n8n Webhook                                       │              │
│  │                                                    │              │
│  │  URL du webhook : [https://n8n.example.com/wh/...] │              │
│  │                                                    │              │
│  │  [🔌 Tester la connexion]  ✓ Connexion reussie     │              │
│  └────────────────────────────────────────────────────┘              │
│                                                                      │
│  --- Indicateurs ---                                                 │
│  ● n8n configure                                                     │
│  ● Fabric configure                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

**Flux de traitement (inchange cote utilisateur) :**
```
Import PDFs → Creer dossier → Lancer file OCR → [POST vers n8n] → Resultats OCR → Editeur
```

### Architecture Technique

```
App (Tauri)                                    n8n Workflow
  │                                               │
  │  POST https://n8n.example.com/webhook/ocr     │
  │  Content-Type: application/json                │
  │  Body: {                                       │
  │    sessionId, produit,                         │
  │    cdvPdf (base64),                            │
  │    ficheLotPdf (base64),                       │
  │    promptCdv, promptFiche                      │
  │  }                                             │
  │ ─────────────────────────────────────────────> │
  │                                               │
  │                                  Webhook Trigger
  │                                       ↓
  │                                  Split PDFs
  │                                  ├─ OCR CDV (AI model)
  │                                  └─ OCR Fiche (AI model)
  │                                       ↓
  │                                  Respond to Webhook
  │  HTTP 200                             │
  │  Body: {                              │
  │    sessionId,                         │
  │    cdv: { camion, date_arrivee, ... },│
  │    fiche: { lignes: [...] }           │
  │  }                                    │
  │ <──────────────────────────────────── │
  │                                       │
  Parse + Zod validate
  Save to SQLite
  Update queue UI
```

### Requirements Techniques

1. **Appel synchrone** : POST vers n8n, attente de la reponse HTTP (timeout genereux : 5 minutes)
2. **Payload JSON** : PDFs en base64, prompts en texte, metadata (sessionId, produit)
3. **Reponse JSON** : Memes schemas Zod que Gemini (`OcrCdvSchema`, `OcrFicheLotSchema`)
4. **Timeout configurable** : defaut 5 minutes (OCR peut etre lent)
5. **Gestion d'erreurs** : HTTP errors, timeout, parsing, validation Zod
6. **Test de connexion** : Appel HEAD ou GET a l'URL webhook pour verifier la connectivite
7. **1 seul appel par dossier** : les 2 PDFs partent ensemble

---

## Success Criteria

- [ ] L'app envoie les 2 PDFs a n8n en une requete POST
- [ ] La reponse n8n est validee par les schemas Zod existants
- [ ] Les resultats OCR sont sauvegardes en DB (identique a avant)
- [ ] La queue fonctionne : sequentielle, pause, cancel, progression
- [ ] Le setting `n8nWebhookUrl` remplace `geminiApiKey`
- [ ] La page Settings affiche la configuration n8n
- [ ] Le bouton "Tester la connexion" fonctionne pour n8n
- [ ] Les indicateurs de statut (dots verts) fonctionnent
- [ ] La dependance `@google/genai` est supprimee
- [ ] `gemini.service.ts` est supprime
- [ ] `npm run typecheck && npm run lint && npm run build` passent

---

## All Needed Context

### Documentation & References

| Resource | URL/Chemin | Pourquoi |
|----------|------------|----------|
| Gemini service actuel | `src/services/gemini.service.ts` | Code a remplacer |
| OCR orchestrator | `src/services/ocr.orchestrator.ts` | A modifier pour n8n |
| OCR types & schemas | `src/types/ocr.types.ts` | Schemas Zod a reutiliser |
| Queue store | `src/stores/queue.store.ts` | Inchange mais reference |
| Settings store | `src/stores/settings.store.ts` | Ajouter n8nWebhookUrl |
| Settings page | `src/pages/SettingsPage.tsx` | Modifier section OCR |
| DossierList | `src/components/dossier/DossierList.tsx` | Adapter check config |
| PDF service | `src/services/pdf.service.ts` | readPdfBytes() reutilise |
| Patterns | `agent_docs/code_patterns.md` | Patterns du projet |

### Arborescence Cible (Fichiers a Ajouter/Modifier)

```
src/
├── services/
│   ├── n8n.service.ts              # CREER : appel webhook + parsing reponse
│   ├── ocr.orchestrator.ts         # MODIFIER : remplacer Gemini par n8n
│   └── gemini.service.ts           # SUPPRIMER
├── types/
│   ├── n8n.types.ts                # CREER : types request/response n8n
│   └── ocr.types.ts                # INCHANGE (schemas reutilises)
├── stores/
│   └── settings.store.ts           # MODIFIER : n8nWebhookUrl au lieu de geminiApiKey
├── pages/
│   └── SettingsPage.tsx            # MODIFIER : section n8n au lieu de Gemini
└── components/
    └── dossier/
        └── DossierList.tsx         # MODIFIER : check n8nWebhookUrl
```

### Known Gotchas & Library Quirks

1. **Timeout fetch** : `fetch()` n'a pas de timeout natif. Utiliser `AbortController` avec `setTimeout` (pattern existant dans `gemini.service.ts` via `withTimeout`)
2. **Base64 PDFs** : Reutiliser `pdfBytesToBase64()` de l'ancien `gemini.service.ts`. Attention : pour de gros PDFs (>5MB), le JSON payload peut etre volumineux
3. **n8n "Respond to Webhook"** : Le node n8n "Respond to Webhook" doit etre configure pour renvoyer le JSON. Si le workflow n8n ne repond pas, le fetch restera en attente jusqu'au timeout
4. **Schemas Zod identiques** : Ne PAS modifier `OcrCdvSchema` ni `OcrFicheLotSchema`. La reponse n8n doit contenir exactement la meme structure
5. **CORS** : n8n doit etre configure pour accepter les requetes depuis l'origin Tauri (`https://tauri.localhost`). Ajouter les headers CORS dans le workflow n8n ou configurer n8n globalement
6. **tauri-plugin-store** : `load()` necessite un objet `defaults` (pas optionnel). Ajouter `n8nWebhookUrl: ""` dans les defaults
7. **Prompts dans le payload** : Envoyer les prompts complets dans la requete. Cela permet de modifier les prompts cote app sans toucher au workflow n8n

---

## Implementation Blueprint

### Data Models

```typescript
// src/types/n8n.types.ts

import { z } from "zod";
import { OcrCdvSchema, OcrFicheLotSchema } from "@/types/ocr.types";

// --- Request payload sent to n8n ---
export interface N8nOcrRequest {
  sessionId: string;
  produit: string;
  cdvPdf: string;        // base64 encoded
  ficheLotPdf: string;   // base64 encoded
  promptCdv: string;
  promptFiche: string;
}

// --- Response from n8n ---
export const N8nOcrResponseSchema = z.object({
  sessionId: z.string(),
  cdv: OcrCdvSchema,
  fiche: OcrFicheLotSchema,
});

export type N8nOcrResponse = z.infer<typeof N8nOcrResponseSchema>;
```

### Liste des Taches (dans l'ordre)

#### Phase 1 : Service n8n + Types

1. **Creer `src/types/n8n.types.ts`**
   - Fichier: `src/types/n8n.types.ts`
   - Action: Creer
   - Details: Interface `N8nOcrRequest`, schema Zod `N8nOcrResponseSchema` composant les schemas OCR existants

2. **Creer `src/services/n8n.service.ts`**
   - Fichier: `src/services/n8n.service.ts`
   - Action: Creer
   - Details:
     - Migrer `pdfBytesToBase64()` depuis gemini.service.ts
     - Migrer `extractJsonFromText()` depuis gemini.service.ts (au cas ou n8n wraps en code fences)
     - Migrer les prompts (`PROMPT_CDV`, `buildPromptFicheLot`) depuis gemini.service.ts
     - Nouvelle fonction `sendDossierForOcr(webhookUrl, sessionId, cdvBytes, ficheBytes, produit)`:
       - Construire le payload JSON avec les 2 PDFs en base64 + prompts
       - `fetch(webhookUrl, { method: "POST", body, signal, headers })`
       - Timeout via `AbortController` (defaut 5 minutes)
       - Parser la reponse JSON
       - Valider avec `N8nOcrResponseSchema`
       - Retourner `N8nOcrResponse`
     - Nouvelle fonction `testN8nConnection(webhookUrl)`:
       - Appel GET ou HEAD a l'URL
       - Retourne `true` si status < 500
     - Gestion d'erreurs avec `WoodyError`:
       - `N8N_NO_URL` : URL non configuree
       - `N8N_TIMEOUT` : timeout depasse
       - `N8N_HTTP_ERROR` : erreur HTTP (4xx, 5xx)
       - `N8N_PARSE_FAILED` : JSON invalide ou Zod validation echouee

3. **Validation intermediaire**
   ```bash
   npm run typecheck
   ```

#### Phase 2 : Modifier l'orchestrateur

4. **Modifier `src/services/ocr.orchestrator.ts`**
   - Fichier: `src/services/ocr.orchestrator.ts`
   - Action: Modifier
   - Details:
     - Remplacer les imports `ocrCompteDeVente`, `ocrFicheDeLot` par `sendDossierForOcr`
     - Remplacer `useSettingsStore.getState().settings.geminiApiKey` par `settings.n8nWebhookUrl`
     - `processDossierOcr()` simplifie :
       1. Lire les 2 PDFs (`readPdfBytes`)
       2. Appeler `sendDossierForOcr()` une seule fois
       3. Sauvegarder les resultats CDV dans `updateCdvSession()`
       4. Sauvegarder les lignes de vente dans `saveLignesVente()`
       5. Mettre a jour le statut queue
     - Supprimer le delay de 500ms entre CDV et Fiche (plus necessaire, un seul appel)
     - Garder le delay de 500ms entre dossiers (pour ne pas surcharger n8n)
     - `processQueue()` : inchange (meme logique sequentielle, pause, cancel)

5. **Validation intermediaire**
   ```bash
   npm run typecheck
   ```

#### Phase 3 : Settings + UI

6. **Modifier `src/stores/settings.store.ts`**
   - Fichier: `src/stores/settings.store.ts`
   - Action: Modifier
   - Details:
     - Remplacer `geminiApiKey: string` par `n8nWebhookUrl: string` dans `AppSettings`
     - Mettre a jour `DEFAULT_SETTINGS` : `n8nWebhookUrl: ""`
     - Mettre a jour `getStore()` defaults : `n8nWebhookUrl: ""`
     - Mettre a jour `loadSettings()` : charger `n8nWebhookUrl`
     - Mettre a jour `saveSettings()` : sauvegarder `n8nWebhookUrl`

7. **Modifier `src/pages/SettingsPage.tsx`**
   - Fichier: `src/pages/SettingsPage.tsx`
   - Action: Modifier
   - Details:
     - Remplacer la Card "Google Gemini" par "n8n Webhook"
     - Input URL (type text, pas password) au lieu de API key
     - Bouton "Tester la connexion" utilisant `testN8nConnection()`
     - Status dot : `n8nWebhookUrl.length > 0` au lieu de `geminiApiKey.length > 0`
     - Label : "n8n configure / non configure" au lieu de "Gemini"

8. **Modifier `src/components/dossier/DossierList.tsx`**
   - Fichier: `src/components/dossier/DossierList.tsx`
   - Action: Modifier (si necessaire)
   - Details: Verifier qu'aucune reference a `geminiApiKey` n'existe. Le bouton "Lancer la file OCR" ne fait pas de check API key directement (c'est fait dans l'orchestrateur), donc pas de changement necessaire ici.

9. **Validation intermediaire**
   ```bash
   npm run typecheck && npm run lint
   ```

#### Phase 4 : Nettoyage

10. **Supprimer `src/services/gemini.service.ts`**
    - Fichier: `src/services/gemini.service.ts`
    - Action: Supprimer
    - Details: Le fichier entier. Les utilitaires (`pdfBytesToBase64`, `extractJsonFromText`) et les prompts sont migres dans `n8n.service.ts`

11. **Supprimer la dependance `@google/genai`**
    - Fichier: `package.json`
    - Action: Modifier
    - Details: `npm uninstall @google/genai`

12. **Mise a jour des tests**
    - Fichier: `tests/gemini.service.test.ts` (si existant)
    - Action: Renommer/adapter en `tests/n8n.service.test.ts`
    - Details: Adapter les tests pour le nouveau service. Tester `pdfBytesToBase64`, `extractJsonFromText`, et la construction du payload

13. **Validation finale**
    ```bash
    npm run typecheck && npm run lint && npm run build
    ```

### Pseudocode

```typescript
// n8n.service.ts - sendDossierForOcr()
export async function sendDossierForOcr(
  webhookUrl: string,
  sessionId: string,
  cdvBytes: Uint8Array,
  ficheBytes: Uint8Array,
  produit: string,
): Promise<N8nOcrResponse> {
  if (!webhookUrl) throw new WoodyError("...", "N8N_NO_URL");

  const payload: N8nOcrRequest = {
    sessionId,
    produit,
    cdvPdf: pdfBytesToBase64(cdvBytes),
    ficheLotPdf: pdfBytesToBase64(ficheBytes),
    promptCdv: PROMPT_CDV,
    promptFiche: buildPromptFicheLot(produit),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new WoodyError(`Erreur HTTP ${response.status}`, "N8N_HTTP_ERROR");
    }

    const text = await response.text();
    const jsonStr = extractJsonFromText(text);
    const data: unknown = JSON.parse(jsonStr);
    return N8nOcrResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof WoodyError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new WoodyError("Timeout n8n depasse", "N8N_TIMEOUT");
    }
    throw new WoodyError("Erreur de parsing reponse n8n", "N8N_PARSE_FAILED", error);
  } finally {
    clearTimeout(timer);
  }
}
```

```typescript
// ocr.orchestrator.ts - processDossierOcr() simplifie
export async function processDossierOcr(sessionId: string): Promise<void> {
  const webhookUrl = useSettingsStore.getState().settings.n8nWebhookUrl;
  const { updateItemStatus } = useQueueStore.getState();
  const { documents } = useImportStore.getState();

  if (!webhookUrl) throw new WoodyError("URL webhook n8n non configuree", "N8N_NO_URL");

  // Find queue item and docs (meme logique)
  const queueItem = useQueueStore.getState().items.find(i => i.dossierSessionId === sessionId);
  const cdvDoc = documents.find(d => d.id === queueItem.pdfCdvDocId);
  const ficheDoc = documents.find(d => d.id === queueItem.pdfFicheDocId);

  // Update status
  updateItemStatus(sessionId, "ocr_cdv", null, "Envoi a n8n...");
  await updateCdvSession(sessionId, { statut: "ocr_en_cours" });

  // Read both PDFs
  const cdvBytes = await readPdfBytes(cdvDoc.filePath);
  const ficheBytes = await readPdfBytes(ficheDoc.filePath);

  // Single call to n8n
  updateItemStatus(sessionId, "ocr_fiche", null, "OCR en cours (n8n)...");
  const result = await sendDossierForOcr(webhookUrl, sessionId, cdvBytes, ficheBytes, queueItem.produit);

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

  await saveLignesVente(sessionId, result.fiche.lignes.map((l, i) => ({
    client: l.client,
    produit: l.produit,
    colis: l.colis,
    poidsBrut: l.poids_brut,
    poidsNet: l.poids_net,
    prixUnitaireNet: l.prix_unitaire_net,
    ordre: i + 1,
  })));
}
```

### Integration Points

| Element | Fichier | Action |
|---------|---------|--------|
| OCR service | `gemini.service.ts` → `n8n.service.ts` | Remplacer |
| Orchestrateur | `ocr.orchestrator.ts` | Modifier imports + logique |
| Settings store | `settings.store.ts` | Remplacer geminiApiKey par n8nWebhookUrl |
| Settings UI | `SettingsPage.tsx` | Remplacer card Gemini par n8n |
| Status dots | `SettingsPage.tsx` | Adapter condition |
| Package.json | `package.json` | Supprimer @google/genai |

---

## Validation Loop

### Level 1: Syntax & Style

```bash
npm run typecheck
npm run lint
npm run build
```

### Level 2: Test Manuel

```bash
npm run tauri dev
```

Verifier:
- [ ] La page Settings affiche la section n8n (pas Gemini)
- [ ] L'URL webhook est persistee apres sauvegarde + reload
- [ ] Le bouton "Tester la connexion" fonctionne (avec un n8n accessible)
- [ ] Le status dot est vert quand l'URL est renseignee
- [ ] La file OCR envoie les dossiers a n8n
- [ ] Les resultats OCR sont sauvegardes en DB
- [ ] Le dossier passe de "brouillon" a "a_corriger"
- [ ] L'editeur affiche les donnees OCR correctement
- [ ] La pause/cancel fonctionne pendant le traitement

### Level 3: Integration

- [ ] Creer un dossier (CDV + Fiche + produit + client)
- [ ] Lancer la file OCR
- [ ] Verifier que les resultats sont corrects dans l'editeur
- [ ] Generer un Excel a partir du dossier OCR-ise
- [ ] La navigation Import → OCR → Editeur → Generation fonctionne

---

## Final Validation Checklist

- [ ] Lint passe sans erreur
- [ ] Build/compilation passe sans erreur
- [ ] Tests manuels OK
- [ ] Gestion des erreurs implementee (timeout, HTTP errors, parsing)
- [ ] Types corrects (pas de contournement)
- [ ] Patterns du projet respectes (voir code_patterns.md)
- [ ] code_patterns.md mis a jour avec les patterns n8n
- [ ] AGENTS.md > Current State mis a jour

---

## Anti-Patterns to Avoid

- Ne pas garder `@google/genai` dans les dependances
- Ne pas dupliquer les schemas Zod (reutiliser `OcrCdvSchema`, `OcrFicheLotSchema`)
- Ne pas creer de serveur HTTP local (approche synchrone)
- Ne pas hardcoder l'URL webhook (configurable dans Settings)
- Ne pas envoyer les PDFs en multipart/form-data (JSON base64 plus simple)
- Ne pas ignorer le timeout (5 minutes par defaut, configurable)
- Ne pas modifier l'existant sans lien avec ce PRP

---

## Evolutions Futures (Hors Scope)

- **Phase 2** : Envoyer les documents 1 par 1, l'app constitue les dossiers a partir des infos OCR
- **Callback asynchrone** : Serveur HTTP local pour recevoir les resultats n8n en mode async
- **WebSocket** : Connexion persistante avec n8n pour progression en temps reel
- **Multi-provider** : Toggle Gemini / n8n dans les settings
- **Retry cote app** : Retry automatique si n8n echoue (actuellement delegue a n8n)

---

## Score de Confiance

**Score: 9/10**

**Points forts:**
- Architecture simple (HTTP POST + attente reponse)
- Schemas Zod existants reutilises sans modification
- Queue inchangee (code eprouve)
- Un seul appel par dossier (simplification)

**Risques:**
- Timeout si n8n est lent (5min devrait suffire)
- CORS si n8n n'accepte pas l'origin Tauri
- Taille du payload JSON (2 PDFs en base64 = ~33% plus gros que le binaire)

**Mitigation:**
- Timeout configurable (defaut genereux)
- Documentation CORS dans la section gotchas
- Les PDFs sont generalement <5MB, le JSON sera <15MB (acceptable)
