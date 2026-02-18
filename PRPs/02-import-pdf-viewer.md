# PRP #2: Import PDF & Viewer

> **Status:** TERMINE | Date completion: 2026-02-13
> **Prerequis:** PRP #1 (Foundation & Scaffolding)

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
Implementer la page Import avec : zone de drag & drop pour importer des PDFs, viewer PDF integre avec navigation page par page, et outil de split pour decouper des PDFs multi-CDV en documents individuels. Les PDFs importes sont copies dans le dossier local de l'app et references en base SQLite.

**Etat final desire:**
- L'utilisateur peut glisser-deposer ou parcourir des PDFs dans l'application
- Les PDFs sont affiches dans un viewer avec navigation page par page
- L'utilisateur peut selectionner des plages de pages et splitter un PDF en sous-documents
- Les fichiers importes sont copies localement et enregistres en base
- Une session CDV est creee en statut "brouillon" a l'import

---

## Why

**Valeur business et impact utilisateur:**
Les documents CDV arrivent souvent comme des PDFs volumineux contenant 10-15 comptes de vente differents. Actuellement, les utilisateurs doivent les splitter manuellement avec un outil externe. L'app integre cette fonctionnalite directement.

**Integration avec l'existant:**
S'appuie sur le layout et le routing du PRP #1. Utilise la base SQLite pour creer des sessions CDV et le systeme de fichiers Tauri pour copier les PDFs.

**Problemes resolus:**
- Import fastidieux de documents (actuellement via formulaire N8N)
- Pas de viewer PDF integre (il faut ouvrir les PDFs separement)
- Split manuel des PDFs multi-CDV

---

## What

### Comportement Visible

```
┌─────────────────────────────────────────────────────┐
│  Import & OCR                                       │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │
│  │    📄 Glissez vos PDFs ici                   │    │
│  │    ou cliquez pour parcourir                 │    │
│  │                                             │    │
│  │    Formats acceptes: PDF                     │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Documents importes:                                │
│  ┌──────────────────────────┬──────────────────┐    │
│  │ Nom                      │ Pages │ Actions  │    │
│  ├──────────────────────────┼──────────────────┤    │
│  │ CDV_Janvier2026.pdf      │ 15    │ 👁 ✂️ 🗑  │    │
│  │ Fiche_lot_A.pdf          │ 3     │ 👁 ✂️ 🗑  │    │
│  └──────────────────────────┴──────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**Mode Viewer (clic sur l'oeil) :**
```
┌─────────────────────────────────────────────────────┐
│  CDV_Janvier2026.pdf                    [Fermer]    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │
│  │          [Rendu de la page PDF]              │    │
│  │                                             │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ◄  Page 3 / 15  ►       [Zoom -] 100% [Zoom +]   │
└─────────────────────────────────────────────────────┘
```

**Mode Split (clic sur les ciseaux) :**
```
┌─────────────────────────────────────────────────────┐
│  Decouper: CDV_Janvier2026.pdf (15 pages)           │
│                                                     │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐       │
│  │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │ │...│       │
│  │ ☑ │ │ ☑ │ │ ☑ │ │   │ │   │ │ ☑ │ │   │       │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘       │
│                                                     │
│  Selection: Pages 1-3, 6                            │
│                                                     │
│  Type de document:                                  │
│  ○ Compte de vente  ○ Fiche de lot                  │
│                                                     │
│  [Extraire en nouveau document]                     │
└─────────────────────────────────────────────────────┘
```

### Requirements Techniques

1. **Drag & drop** : Zone d'import avec `tauri-plugin-fs` pour lire les fichiers
2. **Copie locale** : Les PDFs sont copies dans `%APPDATA%/com.grlog.woody/documents/`
3. **react-pdf** : Viewer PDF avec rendu page par page, navigation, zoom
4. **pdf-lib** : Split PDF (extraction de pages selectionnees dans un nouveau document)
5. **Miniatures** : Affichage de miniatures de chaque page pour le mode split
6. **Base SQLite** : Creation d'une `cdv_session` a l'import avec les chemins PDF
7. **Typage documents** : L'utilisateur indique si le PDF est un "Compte de vente" ou une "Fiche de lot"

---

## Success Criteria

- [ ] Drag & drop d'un PDF dans la zone d'import fonctionne
- [ ] Le bouton "parcourir" ouvre un dialogue natif de selection de fichier
- [ ] Les PDFs importes apparaissent dans la liste
- [ ] Le viewer affiche correctement le PDF avec navigation page par page
- [ ] Le zoom fonctionne (50% a 200%)
- [ ] Le mode split affiche les miniatures de toutes les pages
- [ ] L'utilisateur peut selectionner des pages et extraire un sous-document
- [ ] Les fichiers sont copies dans le dossier local de l'app
- [ ] Une session CDV est creee en base a l'import
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` passent sans erreur

---

## All Needed Context

### Documentation & References

| Resource | URL/Chemin | Pourquoi |
|----------|------------|----------|
| react-pdf | https://github.com/wojtekmaj/react-pdf | Viewer PDF React |
| pdf-lib | https://pdf-lib.js.org/ | Manipulation PDF (split) |
| tauri-plugin-fs | https://v2.tauri.app/plugin/fs/ | Lecture/ecriture fichiers |
| tauri-plugin-dialog | https://v2.tauri.app/plugin/dialog/ | Dialogue fichier natif |
| Patterns de code | `agent_docs/code_patterns.md` | Pattern Service, Composant |
| Types CDV | `src/types/cdv.types.ts` | CdvSession (cree dans PRP #1) |

### Arborescence Codebase Actuelle (apres PRP #1)

```
src/
├── pages/
│   ├── ImportPage.tsx          # Placeholder a remplacer
│   └── ...
├── components/
│   ├── layout/
│   └── ui/
├── services/
│   └── database.service.ts     # CRUD SQLite existant
├── stores/
│   └── settings.store.ts
├── types/
│   └── cdv.types.ts            # Types existants
└── lib/
    └── utils.ts
```

### Arborescence Cible (Fichiers a Ajouter/Modifier)

```
src/
├── pages/
│   └── ImportPage.tsx              # MODIFIER : implementer la vraie page
├── components/
│   └── pdf/
│       ├── PdfDropZone.tsx         # CREER : zone drag & drop
│       ├── PdfViewer.tsx           # CREER : viewer PDF avec navigation
│       ├── PdfSplitter.tsx         # CREER : outil de split avec miniatures
│       └── PdfThumbnail.tsx        # CREER : miniature d'une page
├── services/
│   ├── pdf.service.ts              # CREER : operations PDF (split, info)
│   └── database.service.ts        # MODIFIER : ajouter CRUD cdv_sessions
└── stores/
    └── import.store.ts             # CREER : etat de la page import
```

### Known Gotchas & Library Quirks

1. **react-pdf et pdf.js worker** : react-pdf necessite de configurer le worker pdf.js. Avec Vite, utiliser `pdfjs.GlobalWorkerOptions.workerSrc` ou le package `pdfjs-dist/build/pdf.worker.min.mjs`.
2. **pdf-lib et fichiers binaires** : `PDFDocument.load()` prend un `Uint8Array` ou `ArrayBuffer`. Utiliser `fetch()` pour les fichiers locaux ou `invoke` Tauri pour lire les bytes.
3. **Tauri file drop** : Tauri v2 supporte le drag & drop natif via l'event `tauri://drag-drop`. Utiliser `listen('tauri://drag-drop', callback)` pour intercepter les fichiers.
4. **Permissions Tauri** : Les operations fichiers necessitent les permissions appropriees dans `capabilities/default.json` (scope `fs:read`, `fs:write`).
5. **Miniatures PDF** : react-pdf peut rendre des pages a petite taille pour les miniatures, mais c'est couteux en memoire pour les gros PDFs. Limiter le nombre de miniatures visibles simultanement.

---

## Implementation Blueprint

### Data Models

```typescript
// Deja defini dans src/types/cdv.types.ts (PRP #1)
// CdvSession avec pdf_cdv_path et pdf_fiche_lot_path

// Nouveau type pour le store import
interface ImportedDocument {
  id: string;
  fileName: string;
  filePath: string;          // Chemin local copie
  originalPath: string;      // Chemin original
  pageCount: number;
  type: "cdv" | "fiche_lot" | null;  // Type assigne par l'utilisateur
  cdvSessionId: string | null;       // Lie a une session CDV
}
```

### Liste des Taches (dans l'ordre)

#### Phase 1: Import de fichiers

1. **Creer le service PDF**
   - Fichier: `src/services/pdf.service.ts`
   - Fonctions: `getPdfPageCount()`, `splitPdf()`, `copyPdfToAppDir()`
   - Utiliser pdf-lib pour les operations PDF

2. **Creer la zone de drag & drop**
   - Fichier: `src/components/pdf/PdfDropZone.tsx`
   - Support drag & drop natif Tauri + bouton parcourir (dialog)
   - Validation : uniquement les fichiers .pdf

3. **Creer le store import**
   - Fichier: `src/stores/import.store.ts`
   - Gestion des documents importes, document actif, mode (liste/viewer/split)

4. **Implementer la page Import**
   - Fichier: `src/pages/ImportPage.tsx`
   - Zone de drop en haut, liste des documents en dessous
   - Actions par document : voir, splitter, supprimer

#### Phase 2: Viewer PDF

5. **Creer le viewer PDF**
   - Fichier: `src/components/pdf/PdfViewer.tsx`
   - Rendu page par page avec react-pdf
   - Navigation : precedent/suivant, saisie numero de page
   - Zoom : boutons +/-, valeur en pourcentage

#### Phase 3: Split PDF

6. **Creer les miniatures**
   - Fichier: `src/components/pdf/PdfThumbnail.tsx`
   - Rendu miniature d'une page avec react-pdf (petite taille)

7. **Creer l'outil de split**
   - Fichier: `src/components/pdf/PdfSplitter.tsx`
   - Grille de miniatures avec checkboxes de selection
   - Selection du type de document (CDV / Fiche de lot)
   - Bouton "Extraire" qui cree un nouveau PDF avec pdf-lib

8. **Integrer avec la base SQLite**
   - Modifier: `src/services/database.service.ts`
   - Fonctions: `createCdvSession()`, `updateCdvSessionPdf()`, `listCdvSessions()`
   - A l'extraction, creer une session CDV et lier le PDF

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
- [ ] Drag & drop d'un PDF fonctionne
- [ ] Le dialogue natif s'ouvre au clic sur "parcourir"
- [ ] Le viewer affiche le PDF correctement
- [ ] La navigation page par page fonctionne
- [ ] Le zoom fonctionne
- [ ] Le mode split affiche les miniatures
- [ ] La selection de pages et l'extraction fonctionnent
- [ ] Le fichier extrait est un PDF valide

### Level 3: Integration

- [ ] Les PDFs sont copies dans `%APPDATA%/com.grlog.woody/documents/`
- [ ] Une session CDV est creee en base
- [ ] Le chemin du PDF est enregistre dans la session
- [ ] La liste des documents persiste apres redemarrage

---

## Final Validation Checklist

- [ ] `npm run typecheck` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] `npm run build` passe sans erreur
- [ ] Tests manuels OK
- [ ] Gestion des erreurs implementee (fichier corrompu, PDF vide, etc.)
- [ ] Types corrects (pas de `any`)
- [ ] Patterns du projet respectes
- [ ] code_patterns.md mis a jour si nouveau pattern
- [ ] AGENTS.md > Current State mis a jour

---

## Anti-Patterns to Avoid

- Ne pas charger tout le PDF en memoire pour les miniatures (lazy loading)
- Ne pas stocker les PDFs en base SQLite (seulement les chemins)
- Ne pas creer de viewer PDF custom quand react-pdf suffit
- Ne pas ignorer les erreurs de lecture PDF (fichiers corrompus)

---

## Evolutions Futures (Hors Scope)

- OCR automatique apres import (PRP #3)
- Association automatique CDV + Fiche de lot (PRP #4)
- Import depuis email Outlook (v2)

---

## Score de Confiance

**Score: 8/10**

**Points forts:**
- react-pdf et pdf-lib sont des librairies matures et bien documentees
- Le scope est clair et bien defini

**Risques:**
- Performance des miniatures sur les gros PDFs (15+ pages)
- Configuration du worker pdf.js avec Vite + Tauri

**Mitigation:**
- Lazy loading des miniatures (virtualisation)
- Tester la configuration pdf.js worker des le debut
