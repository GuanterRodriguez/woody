# AGENTS.md - Woody - Master Plan

## Project Overview

| Aspect | Detail |
|--------|--------|
| **App** | Woody - Gestion des Comptes de Vente |
| **Type** | Application desktop standalone Windows (.exe portable) |
| **Stack** | Tauri v2 (Rust) + React 19 + TypeScript + Vite |
| **Phase** | Pre-implementation (documentation et PRPs) |
| **Status** | Stack definie, PRPs en cours de redaction |

---

## Architecture Applicative

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (React)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Dashboard │ │ Import   │ │ Editeur  │ │ Config │ │
│  │   Page   │ │  & OCR   │ │  CDV     │ │  Page  │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│          ↕ Zustand Store (etat global)              │
│  ┌──────────────────────────────────────────────┐   │
│  │              Services Layer                   │   │
│  │  n8n.service    │ fabric.service │ pdf.service│   │   │
│  │  calc.engine    │ db.service     │ auth       │   │
│  └──────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│              TAURI BACKEND (Rust)                    │
│  ┌─────────────┐ ┌────────────┐ ┌───────────────┐  │
│  │ File System  │ │  SQLite    │ │  Systeme      │  │
│  │  Commands   │ │  Plugin    │ │  (dialog,etc) │  │
│  └─────────────┘ └────────────┘ └───────────────┘  │
└─────────────────────────────────────────────────────┘
         ↕                    ↕                ↕
   n8n Webhooks       Fabric SQL         Fichiers
   (OCR documents)      Endpoint           locaux
                        (donnees CDV)      (PDFs, cache)
```

### Flux principal (Pipeline Dossier)
```
Import masse PDFs → Split si necessaire → Classifier (CDV / Fiche lot)
                                                    ↓
                            Creer Dossier (CDV + Fiche lot + Produit + Client)
                                                    ↓
                              File d'attente OCR (sequentiel, batch)
                              └── Envoi dossier complet a n8n (CDV + Fiche)
                                  → infos + frais + lignes vente
                                                    ↓
                              Editeur de Dossier (correction humaine)
                                                    ↓
                              Enrichissement Fabric (matching auto)
                              └── frais UE/INT, poids declare, dossier, etc.
                                                    ↓
                              Generation Excel (template + calculs integres)
```

### Integrations externes
- **n8n Webhooks** : OCR des documents via workflow n8n (CDV + Fiche de lot en une requete)
- **Fabric SQL Endpoint** : Vues CVENCOURS (en cours) et CV_CLOTURE (clotures)
- **Microsoft Graph API** : (v2) Integration email Outlook

---

## How I Should Think

1. **Comprendre le contexte** - Lire AGENTS.md + agent_docs/ avant toute action
2. **Respecter les patterns existants** - Consulter `agent_docs/code_patterns.md`
3. **Planifier avant de coder** - Proposer un plan, attendre approbation explicite
4. **Une feature a la fois** - Suivre les PRPs dans l'ordre (01 → 02 → 03 → ...)
5. **Verifier apres chaque changement** - Suivre la boucle de validation 3 couches
6. **Mettre a jour le contexte** - Enrichir code_patterns.md et Current State apres chaque session

---

## Workflow: Plan -> Execute -> Verify

### Plan
- Lire le PRP correspondant a la feature en cours
- Identifier les fichiers a creer/modifier
- Verifier les dependances avec les PRPs precedents
- Attendre l'approbation explicite de l'utilisateur

### Execute
- Une feature a la fois, dans l'ordre des PRPs
- Commits atomiques et descriptifs
- Respecter les patterns de `code_patterns.md`
- TypeScript strict mode, pas de `any`, validation Zod

### Verify
```bash
npm run typecheck        # TypeScript
npm run lint             # ESLint
npm run build            # Build Vite
cargo check              # Rust (si modifie)
npm run test             # Tests unitaires
npm run tauri dev        # Test manuel
```

---

## Context Files

| Fichier | Contenu |
|---------|---------|
| `CLAUDE.md` | Regles de developpement pour Claude Code |
| `agent_docs/project_brief.md` | Vision, proposition de valeur, fonctionnalites, modele de donnees |
| `agent_docs/tech_stack.md` | Stack Tauri v2 + React, packages, scripts, distribution |
| `agent_docs/code_patterns.md` | Patterns : Service, Page, Composant, Store, Types, Erreurs, Tauri |
| `agent_docs/testing.md` | Strategie tests : Vitest, fixtures, checklist pre-commit |
| `PRPs/templates/prp_base.md` | Template pour nouvelles features |
| `PRPs/01-foundation-scaffolding.md` | Structure projet, layout, routing, config, SQLite |
| `PRPs/02-import-pdf-viewer.md` | Import PDF, viewer, split multi-CDV |
| `PRPs/03-ocr-gemini.md` | Integration Google Gemini pour OCR |
| `PRPs/04-dossiers-pipeline-ocr.md` | Concept Dossier, regroupement PDFs, file d'attente OCR |
| `PRPs/05-editeur-dossier.md` | Editeur dossier : formulaire + tableau editable + panel PDF |
| `PRPs/06-integration-fabric.md` | Connexion Fabric, matching declarations, enrichissement |
| `PRPs/07-calcul-generation-excel.md` | Moteur calcul, generation Excel depuis template |
| `PRPs/08-dashboard.md` | Dashboard avec filtres, stats et actions rapides |
| `PRPs/09-migration-n8n-webhooks.md` | Migration OCR Gemini vers n8n webhooks (Phase 1) |
| `PRPs/10-fix-fabric-auth.md` | Fix authentification Fabric MSAL (redirect URI) |
| `docs/AutomatisationN8N.json` | Workflow N8N original (reference) |
| `docs/Exemple Excel.xlsx` | Template Excel original (reference) |

---

## Current State

- **Last Updated:** 2026-02-16
- **Working On:** Pret pour PRP #8 (Dashboard)
- **Recently Completed:**
  - PRP #10 - Fix Fabric Auth (redirectUri MSAL corrige : window.location.origin → nativeclient URI pour Tauri WebView2)
  - PRP #9 - Migration OCR n8n (remplace Gemini SDK par webhook n8n synchrone, 1 appel par dossier avec 2 PDFs, n8nWebhookUrl dans Settings, test connexion, suppression @google/genai)
  - PRP #7 - Calcul & Generation Excel (moteur calcul pur, apercu recapitulatif temps reel, generation Excel via ExcelJS + template, packaging ZIP avec PDFs sources, dialog de generation, sauvegarde via Tauri save dialog)
  - PRP #6 - Integration Fabric (MSAL auth, matching declarations, enrichissement editeur, dropdown client, test connexion Settings)
  - PRP #5 - Editeur de Dossier (formulaire infos + frais, tableau lignes editable, panel PDF, auto-save, validation)
  - PRP #4 - Dossiers & Pipeline OCR (concept dossier, creation dialog, file d'attente OCR, pause/cancel, pool filtering)
  - PRP #3 - OCR Gemini (service Gemini, schemas Zod, composants OCR, persistence DB, integration ImportPage)
  - PRP #2 - Import PDF & Viewer (drag & drop, viewer, split, SQLite CRUD)
  - PRP #1 - Foundation & Scaffolding (Tauri v2 + React 19 + TypeScript strict)
  - Layout sidebar (shadcn/ui) + routing TanStack Router (4 pages)
  - Page Settings fonctionnelle (n8n webhook URL, Fabric params, test connexion n8n + Fabric, persistence via tauri-plugin-store)
  - Base SQLite avec 3 tables + CRUD cdv_sessions + lignes_vente
  - Dev tooling : ESLint 9 (strict), Prettier, Vitest
  - Types domaine (CdvSession, LigneVente, DocumentGenere, ImportedDocument, OcrCdvResult, OcrFicheLotResult, QueueItem, FabricCvEncours) + WoodyError
  - PDF service (react-pdf viewer, pdf-lib split par separateurs, Tauri fs copy)
  - n8n service (webhook OCR POST, timeout 5min, JSON extraction, validation Zod, test connexion)
  - Fabric service (MSAL auth popup, REST API queries, matching ±3j, client list, token caching)
  - Calculation engine (fonctions pures: calculateCdv, roundMoney, roundWeight) + 10 tests unitaires
  - Excel generator service (ExcelJS template fill, JSZip packaging, Tauri save dialog)
  - Import store Zustand (documents, viewer state, split points, pool filtering)
  - Queue store Zustand (file d'attente OCR, pause, cancel, progression)
  - Editor store Zustand (session, lignes, auto-save, validation, Fabric enrichment state)
  - Dossier components (DossierCreateDialog with Fabric client dropdown, DossierCard, DossierList, OcrQueue, OcrQueueProgress)
  - Editor components (InformationsForm, FraisForm, FabricEnrichment, FabricSelector, LignesVenteTable, CalculationSummary, GenerationDialog, PdfSidePanel, EditorToolbar)
  - OCR orchestrator refactored for n8n webhook (1 call per dossier, processDossierOcr, processQueue)
  - Generic updateCdvSession DB function + saveLignesVenteWithIds + fabricMatched boolean support
  - DocumentGenere CRUD (saveDocumentGenere, getDocumentsGeneres)
  - Route /editor/$sessionId avec navigation depuis ImportPage
- **Blocked By:** Rien
- **Next Steps:** Implementer PRP #8 (Dashboard)
- **Bugs Connus:** Aucun
- **Architecture Decision:** Les PRPs sont structures autour du concept de Dossier (CDV + Fiche lot + produit + client) comme unite de travail, avec une file d'attente OCR pour le traitement batch. Cela remplace l'approche document-par-document. Le pipeline complet est : Import → Dossier → OCR Queue (n8n) → Editeur → Fabric → Generation Excel.

---

## Roadmap

### Phase 1: Foundation
- [x] Structure du repo
- [x] Fichiers de contexte (AGENTS.md, CLAUDE.md, agent_docs)
- [x] Template PRP
- [x] Definition du projet (brief, objectifs, utilisateurs cibles)
- [x] Choix de la stack technique (Tauri v2 + React + TS)
- [x] Redaction des agent_docs (project_brief, tech_stack, code_patterns, testing)
- [x] Redaction des PRPs (7 features)
- [x] **PRP #1** - Setup Tauri v2 + React, layout, routing, config, SQLite

### Phase 2: Pipeline Dossier
- [x] **PRP #2** - Import PDF & Viewer (drag & drop, apercu, split)
- [x] **PRP #3** - OCR Gemini (envoi, parsing, sauvegarde)
- [x] **PRP #4** - Dossiers & Pipeline OCR (concept dossier, regroupement, file d'attente)
- [x] **PRP #5** - Editeur de Dossier (formulaire + tableau editable + panel PDF)

### Phase 3: Enrichissement & Generation
- [x] **PRP #6** - Integration Fabric (connexion, matching, enrichissement)
- [x] **PRP #7** - Calcul & Generation Excel (moteur calcul, template Excel, ZIP)

### Phase 3.5: Bug Fixes & Migration
- [x] **PRP #9** - Migration OCR : Gemini → n8n Webhooks (Phase 1 - dossiers entiers)
- [x] **PRP #10** - Fix Authentification Fabric (redirect URI MSAL)

### Phase 4: Dashboard & Polish
- [ ] **PRP #8** - Dashboard (tableau de bord, filtres, stats, actions)
- [ ] Tests automatises complets
- [ ] Optimisation performance
- [ ] UX polish

### Phase 5: Release
- [ ] Build production (.exe portable)
- [ ] Test sur Azure Virtual Desktop
- [ ] Documentation utilisateur
- [ ] Distribution

### v2 (Futur)
- [ ] Integration email Outlook (Graph API) - import auto des pieces jointes
- [ ] Calcul ecart poids (declare vs vendu) avec logique conditionnelle
- [ ] Mode sombre
- [ ] Auto-update

---

## What NOT To Do

- Ne pas coder sans plan approuve
- Ne pas ignorer les patterns etablis dans code_patterns.md
- Ne pas skipper les verifications (typecheck + lint + build + test)
- Ne pas committer de credentials ou secrets dans le code
- Ne pas ajouter de features hors du scope du PRP en cours
- Ne pas modifier les fichiers de contexte (AGENTS.md, CLAUDE.md) sans discussion
- Ne pas introduire de dependances sans justification
- Ne pas utiliser `any` en TypeScript
- Ne pas creer de fichiers inutiles ou de code mort

---

## Notes pour les Agents

1. **Toujours lire CLAUDE.md** avant de commencer une session
2. **Consulter les patterns** dans `agent_docs/code_patterns.md`
3. **Lire le PRP en cours** avant d'implementer
4. **Respecter l'ordre des PRPs** (les features s'appuient les unes sur les autres)
5. **Verifier** avec les 3 couches apres chaque modification
6. **Mettre a jour Current State** a la fin de chaque session
7. **Enrichir code_patterns.md** si un nouveau pattern est etabli
