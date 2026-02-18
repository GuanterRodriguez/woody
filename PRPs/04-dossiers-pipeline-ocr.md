# PRP #4: Dossiers & Pipeline OCR

> **Status:** TERMINE | Date: 2026-02-13
> **Prerequis:** PRP #1 (Foundation), PRP #2 (Import PDF), PRP #3 (OCR Gemini)

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
Restructurer la page Import autour du concept de **Dossier** comme unite de travail centrale. Un dossier regroupe 1 PDF Compte de vente + 1 PDF Fiche de lot + un produit + un client. Implementer une file d'attente OCR qui traite automatiquement les dossiers de maniere sequentielle, en enchaenant OCR CDV puis OCR Fiche de lot pour chaque dossier.

**Etat final desire:**
- L'utilisateur importe des PDFs en masse, les split si necessaire
- Il cree des dossiers en associant 1 CDV + 1 Fiche de lot + produit + client
- Un bouton "Lancer la file" declenche le traitement OCR automatique de tous les dossiers
- Chaque dossier passe par : OCR CDV → OCR Fiche de lot → Pret a editer
- La progression est visible en temps reel dans l'interface
- Les PDFs assignes a un dossier disparaissent du pool de documents disponibles

---

## Why

**Valeur business et impact utilisateur:**
Actuellement (PRP #3), l'OCR est lance document par document, manuellement. L'utilisateur doit classifier chaque PDF, lancer l'OCR un par un, et associer mentalement les CDV avec leurs fiches de lot. Le concept de dossier + file d'attente automatise tout ce processus : l'utilisateur prepare ses dossiers une fois, puis lance le traitement et attend.

C'est une amelioration majeure par rapport au workflow N8N ou le formulaire ne traite qu'un seul dossier a la fois. Ici, l'utilisateur peut preparer 10+ dossiers d'un coup et les traiter en batch.

**Integration avec l'existant:**
- Reutilise l'OCR du PRP #3 (`gemini.service.ts`, `ocr.orchestrator.ts`)
- Reutilise l'import PDF du PRP #2 (drop zone, viewer, splitter)
- La table `cdv_sessions` existante correspond deja au concept de dossier (elle a `pdf_cdv_path` + `pdf_fiche_lot_path` + `produit` + `client`)
- Alimente l'editeur (PRP #5) et le reste du pipeline

---

## What

### Comportement Visible

**Page Import restructuree en 3 zones :**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Import & Dossiers                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  📁 Glissez vos PDFs ici ou cliquez pour parcourir          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  === DOCUMENTS DISPONIBLES =======================================   │
│                                                                      │
│  ┌──────────────┬──────────┬───────┬─────────────────────────────┐  │
│  │ Nom          │ Type     │ Pages │ Actions                     │  │
│  ├──────────────┼──────────┼───────┼─────────────────────────────┤  │
│  │ facture1.pdf │ [CDV  ▾] │  3    │ 👁 ✂ 🗑                    │  │
│  │ lot_A.pdf    │ [Fiche▾] │  2    │ 👁 ✂ 🗑                    │  │
│  │ facture2.pdf │ [CDV  ▾] │  1    │ 👁 ✂ 🗑                    │  │
│  │ lot_B.pdf    │ [Fiche▾] │  4    │ 👁 ✂ 🗑                    │  │
│  └──────────────┴──────────┴───────┴─────────────────────────────┘  │
│  Seuls les documents non assignes a un dossier sont affiches ici    │
│                                                                      │
│  === DOSSIERS ===================================================   │
│                                                                      │
│  [+ Creer un dossier]            [▶ Lancer la file OCR (3)]        │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Dossier 1                                     ● Pret        │    │
│  │ Produit: Mangues  │  Client: Client A                       │    │
│  │ CDV: facture_X.pdf  │  Fiche: lot_X.pdf                     │    │
│  │ [Modifier] [Supprimer]                                      │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │ Dossier 2                                     ◐ OCR CDV...  │    │
│  │ Produit: Ananas   │  Client: Client B                       │    │
│  │ CDV: facture_Y.pdf  │  Fiche: lot_Y.pdf                     │    │
│  │ [Modifier] [Supprimer]                                      │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │ Dossier 3                                     ✓ Termine     │    │
│  │ Produit: Mangues  │  Client: Client C                       │    │
│  │ CDV: facture_Z.pdf  │  Fiche: lot_Z.pdf                     │    │
│  │ [Ouvrir editeur →]                                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  === FILE D'ATTENTE OCR =========================================   │
│  (visible uniquement quand la file est active)                       │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Progression: 2/5 dossiers traites                           │   │
│  │  ████████████░░░░░░░░░░░░░░ 40%                             │   │
│  │                                                              │   │
│  │  ✓ Dossier 1 - Complete                                     │   │
│  │  ✓ Dossier 2 - Complete                                     │   │
│  │  ◐ Dossier 3 - OCR Fiche de lot en cours...                 │   │
│  │  ◌ Dossier 4 - En attente                                   │   │
│  │  ◌ Dossier 5 - En attente                                   │   │
│  │                                                              │   │
│  │  [⏸ Pause]  [✕ Annuler]                                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Dialog de creation de dossier :**

```
┌─────────────────────────────────────────────────────┐
│  Creer un dossier                          [Fermer] │
│                                                     │
│  Produit *     [Mangues                          ]  │
│  Client *      [Client A                         ]  │
│                                                     │
│  Compte de vente *                                  │
│  ┌─────────────────────────────────────────────┐    │
│  │ ○ facture1.pdf (3 pages)                    │    │
│  │ ● facture2.pdf (1 page)     ← selectionne  │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Fiche de lot *                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ ○ lot_A.pdf (2 pages)                       │    │
│  │ ● lot_B.pdf (4 pages)      ← selectionne   │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  [Annuler]                     [Creer le dossier]   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Requirements Techniques

1. **Concept Dossier** : Un dossier = 1 `CdvSession` en base. La creation d'un dossier cree immediatement une `cdv_sessions` avec `produit`, `client`, `pdf_cdv_path`, `pdf_fiche_lot_path`, `statut = 'brouillon'`
2. **Pool de documents** : La table des documents n'affiche que les PDFs non assignes a un dossier (`cdvSessionId === null`)
3. **File d'attente OCR** : Zustand store gerant la queue. Traitement sequentiel avec delai 500ms entre chaque appel Gemini. Pour chaque dossier : OCR CDV → OCR Fiche lot → marquer comme termine
4. **Statut dossier** : `brouillon` → `ocr_en_cours` → `a_corriger` → (suite dans PRP #5+)
5. **Controles file** : Pause et annulation de la file d'attente
6. **Suppression dossier** : Remet les PDFs dans le pool (supprime la `cdv_sessions` et remet `cdvSessionId = null` sur les documents)
7. **Navigation** : Le dossier termine a un lien "Ouvrir dans l'editeur" qui navigue vers `/editor/:sessionId` (PRP #5)

---

## Success Criteria

- [ ] L'import PDF en masse fonctionne (drag & drop multiple)
- [ ] Les documents sont classifiables (CDV / Fiche de lot)
- [ ] La creation de dossier associe correctement 1 CDV + 1 Fiche lot + produit + client
- [ ] Les documents assignes disparaissent du pool
- [ ] La file d'attente OCR traite les dossiers sequentiellement
- [ ] L'OCR CDV puis Fiche lot s'enchainent automatiquement pour chaque dossier
- [ ] La progression est visible en temps reel (barre de progression + statut par dossier)
- [ ] Pause et annulation de la file fonctionnent
- [ ] La suppression d'un dossier remet les PDFs dans le pool
- [ ] Les resultats OCR sont sauvegardes en base (`cdv_sessions` + `lignes_vente`)
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` passent sans erreur

---

## All Needed Context

### Documentation & References

| Resource | URL/Chemin | Pourquoi |
|----------|------------|----------|
| Workflow N8N | `docs/AutomatisationN8N.json` | Flux original de reference |
| OCR Service | `src/services/gemini.service.ts` | Service Gemini existant |
| OCR Orchestrator | `src/services/ocr.orchestrator.ts` | Orchestration OCR existante |
| Import Store | `src/stores/import.store.ts` | Store existant a modifier |
| Database Service | `src/services/database.service.ts` | CRUD cdv_sessions existant |
| Import Types | `src/types/import.types.ts` | Types document importes |
| CDV Types | `src/types/cdv.types.ts` | Types session CDV |
| OCR Types | `src/types/ocr.types.ts` | Types OCR |
| Patterns | `agent_docs/code_patterns.md` | Patterns du projet |

### Arborescence Cible

```
src/
├── pages/
│   └── ImportPage.tsx                    # MODIFIER : restructurer en 3 zones
├── components/
│   ├── ocr/
│   │   ├── DocumentTypeSelect.tsx       # EXISTANT : reutiliser
│   │   ├── OcrButton.tsx                # SUPPRIMER (remplace par la queue)
│   │   ├── OcrPreview.tsx               # GARDER (apercu apres OCR)
│   │   └── ProductNameDialog.tsx        # SUPPRIMER (produit saisi dans le dossier)
│   └── dossier/
│       ├── DossierCreateDialog.tsx      # CREER : dialog creation dossier
│       ├── DossierCard.tsx              # CREER : carte dossier dans la liste
│       ├── DossierList.tsx              # CREER : liste des dossiers
│       ├── OcrQueue.tsx                 # CREER : panneau file d'attente
│       └── OcrQueueProgress.tsx         # CREER : barre progression + statut items
├── services/
│   ├── ocr.orchestrator.ts             # MODIFIER : ajouter processQueue()
│   └── database.service.ts             # MODIFIER : createDossier() avec tous les champs
├── stores/
│   ├── import.store.ts                 # MODIFIER : filtrer pool par assignation
│   └── queue.store.ts                  # CREER : etat file d'attente OCR
└── types/
    └── queue.types.ts                  # CREER : types file d'attente
```

### Known Gotchas & Library Quirks

1. **Pool filtering** : Le pool de documents doit filtrer les docs dont `cdvSessionId !== null`. Comme `documents` est dans le store Zustand, utiliser un getter derive (`useMemo` ou getter dans le store).
2. **Race conditions queue** : La file doit etre traitee de maniere strictement sequentielle. Utiliser un flag `isProcessing` dans le store pour eviter les doubles declenchements.
3. **Annulation** : L'annulation de la file arrete le traitement apres le dossier en cours (pas de coupure au milieu d'un appel API). Utiliser un `AbortController` ou un flag `shouldStop`.
4. **Coherence store ↔ DB** : A la creation du dossier, creer la `cdv_sessions` en base ET mettre a jour le `cdvSessionId` des documents dans le store en une operation atomique.
5. **Documents deja OCR** : Si un dossier est recree avec des docs deja OCR-ises (retry), les anciens resultats OCR sont ecrases.
6. **Radio buttons pour selection PDF** : Utiliser des `RadioGroup` shadcn dans le dialog de creation. Un seul CDV et une seule Fiche de lot selectionnable par dossier.

---

## Implementation Blueprint

### Data Models

```typescript
// src/types/queue.types.ts

export type QueueItemStatus =
  | "pending"       // En attente dans la file
  | "ocr_cdv"       // OCR du CDV en cours
  | "ocr_fiche"     // OCR de la Fiche de lot en cours
  | "done"          // Termine avec succes
  | "error";        // Erreur pendant le traitement

export interface QueueItem {
  dossierSessionId: string;   // ID de la cdv_session
  produit: string;
  client: string;
  pdfCdvDocId: string;        // ID du document CDV dans le store
  pdfFicheDocId: string;      // ID du document Fiche de lot dans le store
  status: QueueItemStatus;
  error: string | null;
  currentStep: string | null; // Description etape en cours (pour l'UI)
}

export interface QueueState {
  items: QueueItem[];
  isProcessing: boolean;
  isPaused: boolean;
  processedCount: number;
  totalCount: number;
}
```

```typescript
// Extension de import.store.ts

// Getter pour le pool (documents non assignes)
availableDocuments: (type?: "cdv" | "fiche_lot") => ImportedDocument[];
// Retourne documents.filter(d => d.cdvSessionId === null && (type ? d.type === type : true))
```

```typescript
// Extension createDossier dans database.service.ts
interface CreateDossierParams {
  id: string;
  produit: string;
  client: string;
  pdfCdvPath: string;
  pdfFicheLotPath: string;
}
```

### Liste des Taches (dans l'ordre)

#### Phase 1 : Types + Store Queue

1. **Creer `src/types/queue.types.ts`**
   - Types: `QueueItemStatus`, `QueueItem`, `QueueState`

2. **Creer `src/stores/queue.store.ts`**
   - Etat: `items`, `isProcessing`, `isPaused`, `processedCount`, `totalCount`
   - Actions: `addToQueue(item)`, `startProcessing()`, `pauseProcessing()`, `cancelProcessing()`, `updateItemStatus(id, status, error?)`, `clearQueue()`, `incrementProcessed()`
   - Le store ne contient PAS la logique de traitement (juste l'etat)

3. **Modifier `src/stores/import.store.ts`**
   - Ajouter getter `availableDocuments(type?)` : filtre `cdvSessionId === null`
   - Supprimer `ocrStates` et actions OCR individuelles (remplaces par la queue)
   - Garder `setDocumentType`, `setDocumentCdvSessionId`

4. **Validation intermediaire**
   ```bash
   npm run typecheck && npm run lint
   ```

#### Phase 2 : Service + Orchestrateur

5. **Modifier `src/services/database.service.ts`**
   - Ajouter `createDossier(params)` : INSERT complet avec produit, client, les 2 PDF paths, statut = 'brouillon'
   - Modifier `createCdvSession` existant pour supporter les nouveaux champs (ou remplacer par `createDossier`)

6. **Modifier `src/services/ocr.orchestrator.ts`**
   - Ajouter `processDossierOcr(sessionId)` : enchaine OCR CDV → OCR Fiche lot pour un dossier
   - Ajouter `processQueue()` : boucle sur les items de la queue, appelle `processDossierOcr` pour chaque, respecte le delai, gere pause/annulation
   - `processQueue` lit l'etat depuis `queue.store` et le met a jour en temps reel

7. **Validation intermediaire**
   ```bash
   npm run typecheck && npm run lint
   ```

#### Phase 3 : Composants UI

8. **Creer `src/components/dossier/DossierCreateDialog.tsx`**
   - Dialog shadcn avec formulaire : Produit (Input), Client (Input)
   - RadioGroup pour selectionner le CDV parmi les docs disponibles type "cdv"
   - RadioGroup pour selectionner la Fiche lot parmi les docs disponibles type "fiche_lot"
   - Bouton "Creer le dossier" disabled si selection incomplete
   - A la creation : appelle `createDossier` (DB) + met a jour `cdvSessionId` des 2 docs (store)

9. **Creer `src/components/dossier/DossierCard.tsx`**
   - Affiche : produit, client, noms des 2 PDFs, statut
   - Indicateur visuel du statut (icone + couleur)
   - Actions contextuelles : Modifier, Supprimer, Ouvrir editeur (si termine)

10. **Creer `src/components/dossier/DossierList.tsx`**
    - Liste des dossiers (cartes ou lignes de tableau)
    - Bouton "Creer un dossier"
    - Bouton "Lancer la file OCR" avec compteur de dossiers eligibles
    - Filtre par statut (optionnel)

11. **Creer `src/components/dossier/OcrQueue.tsx`**
    - Panneau visible uniquement quand la file est active
    - Barre de progression globale (processedCount / totalCount)
    - Liste des items avec statut individuel
    - Boutons Pause et Annuler

12. **Creer `src/components/dossier/OcrQueueProgress.tsx`**
    - Composant presentationnel pour un item de la file
    - Icone selon statut : ◌ pending, ◐ en cours (spinner), ✓ done, ✕ error
    - Message d'erreur si applicable

13. **Validation intermediaire**
    ```bash
    npm run typecheck && npm run lint
    ```

#### Phase 4 : Integration ImportPage

14. **Restructurer `src/pages/ImportPage.tsx`**
    - **Zone 1** : PdfDropZone + tableau documents (pool non assigne uniquement)
    - **Zone 2** : DossierList (liste des dossiers crees)
    - **Zone 3** : OcrQueue (panneau file d'attente, visible si active)
    - Supprimer : OcrButton inline, OcrPreview inline, bouton "Lancer OCR sur tous"
    - Supprimer : ProductNameDialog (le produit est saisi a la creation du dossier)
    - Garder : PdfViewer dialog, PdfSplitter dialog, DocumentTypeSelect

15. **Nettoyage**
    - Supprimer les composants orphelins si plus utilises
    - Nettoyer les imports inutilises
    - Verifier que les stores sont coherents

16. **Validation finale**
    ```bash
    npm run typecheck && npm run lint && npm run build && npm run test
    ```

---

## Validation Loop

### Level 1: Syntax & Style

```bash
npm run typecheck
npm run lint
npm run build
npm run test
```

### Level 2: Test Manuel

```bash
npm run tauri dev
```

Verifier:
- [ ] Importer 4+ PDFs par drag & drop
- [ ] Classifier les PDFs (CDV ou Fiche de lot)
- [ ] Creer un dossier avec 1 CDV + 1 Fiche lot + produit + client
- [ ] Le CDV et la Fiche lot assignes disparaissent du pool
- [ ] Creer 3+ dossiers
- [ ] Lancer la file OCR → les dossiers sont traites sequentiellement
- [ ] La barre de progression se met a jour en temps reel
- [ ] Le statut de chaque dossier est visible (en cours, termine, erreur)
- [ ] Mettre en pause → reprendre → la file reprend
- [ ] Annuler → la file s'arrete
- [ ] Supprimer un dossier → les PDFs reviennent dans le pool
- [ ] Tester sans cle API → erreur claire sur le dossier concerne
- [ ] Les resultats OCR sont bien en base (verifier avec l'editeur en PRP #5)

### Level 3: Integration

- [ ] L'import existant (PRP #2) fonctionne toujours (drop, split)
- [ ] Les donnees OCR sont correctement sauvegardees dans `cdv_sessions` et `lignes_vente`
- [ ] La page Settings permet toujours de configurer la cle API

---

## Anti-Patterns to Avoid

- Ne pas lancer la file en parallele (toujours sequentiel pour le rate limiting Gemini)
- Ne pas stocker la file en base (c'est un etat temporaire en memoire)
- Ne pas bloquer l'UI pendant le traitement (la file tourne en background via async)
- Ne pas permettre la creation de dossiers avec des documents deja assignes
- Ne pas oublier de nettoyer le store quand un dossier est supprime
- Ne pas dupliquer la logique OCR - reutiliser `runOcrCdv` et `runOcrFicheLot` du PRP #3

---

## Evolutions Futures (Hors Scope)

- Dropdown client peuple depuis Fabric (PRP #6)
- Enrichissement Fabric automatique apres OCR (PRP #6)
- Navigation vers l'editeur (PRP #5)
- OCR retry automatique en cas d'erreur reseau
- Estimation du temps restant dans la file

---

## Score de Confiance

**Score: 8/10**

**Points forts:**
- Reutilise les briques OCR existantes (PRP #3)
- Le modele de donnees `cdv_sessions` supporte deja le concept de dossier
- Le pattern Zustand store + service orchestrateur est eprouve
- L'UI est une restructuration de l'existant, pas une creation from scratch

**Risques:**
- La restructuration de ImportPage est consequente (supprimer/ajouter beaucoup de composants)
- La gestion pause/annulation peut introduire des edge cases
- La coherence store ↔ DB quand un dossier est supprime

**Mitigation:**
- Implementer incrementalement : d'abord la creation de dossier, puis la queue
- La pause est simple (flag booleen verifie entre chaque dossier)
- Utiliser des transactions ou au minimum un nettoyage dans `finally`
