# PRP #5: Editeur de Dossier

> **Status:** TERMINE | Date: 2026-02-13
> **Prerequis:** PRP #1 (Foundation), PRP #2 (Import PDF), PRP #3 (OCR Gemini), PRP #4 (Dossiers & Pipeline)

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
Implementer la page Editeur de Dossier, la vue principale de correction et validation. Elle permet de verifier et corriger les donnees extraites par OCR (informations generales, frais, lignes de vente) en face du PDF source affiche dans un panel lateral. C'est le point de controle humain du pipeline avant la generation du document final.

**Etat final desire:**
- L'utilisateur accede a l'editeur depuis la page Import (dossier termine) ou depuis le dashboard
- Les champs OCR sont pre-remplis et tous editables
- Le tableau des lignes de vente est editable inline
- Le PDF CDV et/ou Fiche de lot sont affiches cote a cote pour reference
- Les modifications sont auto-sauvegardees en base (debounce 1s)
- Le statut du dossier evolue : `a_corriger` → `valide`

---

## Why

**Valeur business et impact utilisateur:**
C'est LE point de douleur principal du processus actuel. Avec N8N, il n'y a aucun moyen de verifier ou corriger les donnees OCR avant la generation. L'editeur permet de :
- Voir les donnees extraites en face du document source
- Corriger les erreurs OCR (chiffres mal lus, noms tronques)
- Ajouter des lignes manquees ou supprimer des doublons
- Valider que tout est correct avant de generer la liasse

**Integration avec l'existant:**
- Recoit les donnees OCR du PRP #4 (via `cdv_sessions` + `lignes_vente` en base)
- Les champs Fabric seront alimentes automatiquement par le PRP #6
- Alimente le moteur de calcul et la generation du PRP #7

---

## What

### Comportement Visible

```
┌─────────────────────────────────────────────────────────────────────┐
│  Editeur : Dossier Mangues - AB123CD                    [← Retour] │
├─────────────────────────────────────┬───────────────────────────────┤
│                                     │                               │
│  --- Informations Generales ---     │  [PDF Source]                 │
│                                     │                               │
│  Produit:    [Mangues        ]      │  ┌───────────────────────┐   │
│  Camion:     [AB123CD        ]      │  │                       │   │
│  Date arr.:  [2026-01-15     ]      │  │     [Page PDF]        │   │
│  Client:     [Client A       ]      │  │                       │   │
│  Fournisseur:[Fournisseur XYZ]      │  │                       │   │
│  Dossier:    [2026-0042-GR   ]      │  └───────────────────────┘   │
│  N° Decl.:   [2026-000156    ]      │  ◄ Page 1/3 ►               │
│                                     │                               │
│  --- Frais ---                      │  [CDV] [Fiche lot]           │
│  Transit:    [1500.50  ] EUR        │                               │
│  Commission: [2000.00  ] EUR        │                               │
│  Autre:      [350.00   ] EUR        │                               │
│  Frais UE:   [300.00   ] EUR        │                               │
│  Frais INT:  [200.00   ] EUR        │                               │
│  Date BAE:   [2026-01-12     ]      │                               │
│  Poids decl.:[8000.0   ] kg        │                               │
│  Prix decl.: [2.60     ] EUR/kg     │                               │
│                                     │                               │
│  --- Lignes de Vente ---            │                               │
│  ┌──────────┬────────┬─────┬──────┬──────┬───────┬───┐             │
│  │ Client   │Produit │Colis│P.Brut│P.Net │Px/kg  │ X │             │
│  ├──────────┼────────┼─────┼──────┼──────┼───────┼───┤             │
│  │Client A  │Mangues │ 50  │5500  │5000  │ 2.50  │ 🗑│             │
│  │Client B  │Mangues │ 30  │3300  │3000  │ 2.75  │ 🗑│             │
│  └──────────┴────────┴─────┴──────┴──────┴───────┴───┘             │
│  [+ Ajouter une ligne]                                              │
│                                                                      │
│  [Sauvegarder]  [Valider ✓]  [Generer liasse →]                    │
├──────────────────────────────────────────────────────────────────────┤
│  Statut: A corriger │ Sauvegarde: il y a 3s │ ● Auto-save actif    │
└──────────────────────────────────────────────────────────────────────┘
```

### Requirements Techniques

1. **React Hook Form + Zod** : Formulaire informations generales avec validation
2. **TanStack Table** : Tableau editable inline pour les lignes de vente
3. **react-pdf** : Panel lateral avec viewer PDF (reutiliser PdfViewer du PRP #2)
4. **Layout split** : `ResizablePanelGroup` de shadcn/ui pour panel gauche (editeur) + panel droit (PDF)
5. **Auto-save** : Debounce 1s sur les modifications, sauvegarde automatique en base
6. **Navigation** : Route `/editor/:sessionId`, accessible depuis ImportPage et Dashboard
7. **Chargement** : Donnees chargees depuis SQLite au montage (`getCdvSession` + `getLignesVente`)

---

## Success Criteria

- [ ] La page Editeur charge les donnees d'un dossier depuis la base
- [ ] Le formulaire informations est pre-rempli et editable
- [ ] Le tableau des lignes de vente est editable inline (clic sur cellule)
- [ ] L'ajout et la suppression de lignes fonctionnent
- [ ] Le PDF source est affiche dans le panel lateral
- [ ] L'utilisateur peut naviguer entre PDF CDV et PDF Fiche de lot (onglets)
- [ ] Les modifications sont sauvegardees automatiquement (debounce 1s)
- [ ] Indicateur visuel de sauvegarde ("Sauvegarde..." / "Sauvegarde OK")
- [ ] Le bouton "Valider" change le statut en "valide"
- [ ] La navigation depuis la page Import fonctionne (`/editor/:sessionId`)
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` passent sans erreur

---

## All Needed Context

### Documentation & References

| Resource | URL/Chemin | Pourquoi |
|----------|------------|----------|
| React Hook Form | https://react-hook-form.com/ | Gestion formulaires |
| TanStack Table | https://tanstack.com/table/latest | Tableaux editables |
| shadcn Resizable | https://ui.shadcn.com/docs/components/resizable | Panel split |
| shadcn Form | https://ui.shadcn.com/docs/components/form | Composant formulaire |
| shadcn Tabs | https://ui.shadcn.com/docs/components/tabs | Onglets CDV/Fiche |
| Zod | https://zod.dev/ | Validation schemas |
| Patterns | `agent_docs/code_patterns.md` | Patterns du projet |

### Arborescence Cible

```
src/
├── pages/
│   └── EditorPage.tsx                  # MODIFIER : implementer l'editeur complet
├── components/
│   └── editor/
│       ├── InformationsForm.tsx        # CREER : formulaire informations generales
│       ├── FraisForm.tsx               # CREER : formulaire frais
│       ├── LignesVenteTable.tsx        # CREER : tableau editable
│       ├── PdfSidePanel.tsx            # CREER : panel lateral PDF
│       └── EditorToolbar.tsx           # CREER : barre d'actions (sauvegarder, valider, generer)
├── services/
│   └── database.service.ts            # MODIFIER : updateCdvSession generique, CRUD lignes
├── stores/
│   └── editor.store.ts                # CREER : etat de l'editeur
└── types/
    └── cdv.types.ts                   # EXISTANT : types deja definis
```

### Known Gotchas & Library Quirks

1. **TanStack Table inline editing** : TanStack Table ne fournit pas d'editing inline natif. Creer des cellules custom avec des inputs controles. Utiliser `columnHelper.display()` pour les colonnes editables.
2. **React Hook Form + Zod** : Utiliser `zodResolver` de `@hookform/resolvers/zod`. Installer `@hookform/resolvers` et `react-hook-form`.
3. **Auto-save debounce** : Utiliser `useEffect` avec `setTimeout` pour debouncer. Attention a nettoyer le timeout au unmount et quand les donnees changent.
4. **ResizablePanelGroup** : Composant shadcn base sur `react-resizable-panels`. Installer avec `npx shadcn@latest add resizable`.
5. **Chargement async** : Les donnees SQLite sont chargees async. Afficher un skeleton/loader pendant le chargement.
6. **react-pdf dans le panel** : Reutiliser `PdfViewer` du PRP #2 mais l'adapter pour un panel (pas un dialog). Memoiser le `file` prop.
7. **Tabs pour PDFs** : `shadcn Tabs` pour switcher entre CDV et Fiche de lot dans le panel lateral.

---

## Implementation Blueprint

### Data Models

```typescript
// Schema de validation du formulaire informations
const InformationsFormSchema = z.object({
  produit: z.string().min(1, "Le produit est requis"),
  camion: z.string().min(1, "Le camion est requis"),
  dateArrivee: z.string().min(1, "La date est requise"),
  client: z.string().optional(),
  fournisseur: z.string().optional(),
  dossier: z.string().optional(),
  numDeclaration: z.string().optional(),
});

// Schema de validation du formulaire frais
const FraisFormSchema = z.object({
  fraisTransit: z.number().min(0),
  fraisCommission: z.number().min(0),
  autreFrais: z.number().min(0),
  fraisUe: z.number().min(0),
  fraisInt: z.number().min(0),
  dateBae: z.string().optional(),
  poidsDeclare: z.number().min(0),
  prixDeclareKilo: z.number().min(0),
});

// Schema d'une ligne de vente pour le tableau editable
const LigneVenteFormSchema = z.object({
  id: z.string(),
  client: z.string().min(1),
  produit: z.string().min(1),
  colis: z.number().int().min(0),
  poidsBrut: z.number().min(0),
  poidsNet: z.number().min(0),
  prixUnitaireNet: z.number().min(0),
});
```

```typescript
// src/stores/editor.store.ts
interface EditorState {
  sessionId: string | null;
  session: CdvSession | null;
  lignes: LigneVente[];
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  lastSavedAt: string | null;
  activePdfTab: "cdv" | "fiche_lot";
}

interface EditorActions {
  loadSession(sessionId: string): Promise<void>;
  updateSession(partial: Partial<CdvSession>): void;
  updateLigne(ligneId: string, partial: Partial<LigneVente>): void;
  addLigne(): void;
  removeLigne(ligneId: string): void;
  reorderLignes(fromIndex: number, toIndex: number): void;
  save(): Promise<void>;
  validate(): Promise<void>;
  setActivePdfTab(tab: "cdv" | "fiche_lot"): void;
}
```

### Liste des Taches (dans l'ordre)

#### Phase 1 : Store + Services

1. **Installer les dependances**
   ```bash
   npm install react-hook-form @hookform/resolvers
   npm install @tanstack/react-table
   npx shadcn@latest add resizable tabs form input label -y
   ```

2. **Creer `src/stores/editor.store.ts`**
   - Etat : session, lignes, flags (loading, saving, dirty)
   - Actions : load, update, add/remove/reorder lignes, save, validate

3. **Modifier `src/services/database.service.ts`**
   - Ajouter `updateCdvSession(id, partial)` : mise a jour generique de tous les champs
   - Modifier `saveLignesVente` pour accepter des lignes avec ID (upsert)

4. **Validation intermediaire**
   ```bash
   npm run typecheck && npm run lint
   ```

#### Phase 2 : Formulaires

5. **Creer `src/components/editor/InformationsForm.tsx`**
   - React Hook Form + zodResolver
   - Champs : produit, camion, dateArrivee, client, fournisseur, dossier, numDeclaration
   - Champs Fabric (client, fournisseur, dossier, numDeclaration) affichables mais editables manuellement (PRP #6 les remplira automatiquement)

6. **Creer `src/components/editor/FraisForm.tsx`**
   - Champs numeriques : fraisTransit, fraisCommission, autreFrais, fraisUe, fraisInt
   - Champs additionnels : dateBae, poidsDeclare, prixDeclareKilo
   - Inputs avec formatage (2 decimales)

7. **Validation intermediaire**
   ```bash
   npm run typecheck && npm run lint
   ```

#### Phase 3 : Tableau lignes de vente

8. **Creer `src/components/editor/LignesVenteTable.tsx`**
   - TanStack Table avec colonnes editables
   - Colonnes : client, produit, colis, poidsBrut, poidsNet, prixUnitaireNet, supprimer
   - Edition inline : clic sur cellule → input, blur → sauvegarde
   - Bouton "Ajouter une ligne" en bas
   - Ligne de totaux en tfoot (colis, poidsBrut, poidsNet)

9. **Validation intermediaire**
   ```bash
   npm run typecheck && npm run lint
   ```

#### Phase 4 : Panel PDF + Layout

10. **Creer `src/components/editor/PdfSidePanel.tsx`**
    - Reutilise PdfViewer du PRP #2 (adapte pour un panel, pas un dialog)
    - Onglets shadcn `Tabs` pour switcher entre CDV et Fiche de lot
    - Navigation par page

11. **Creer `src/components/editor/EditorToolbar.tsx`**
    - Barre d'actions en bas de l'editeur
    - Boutons : Sauvegarder (force), Valider, Generer liasse (disabled → PRP #7)
    - Indicateur : statut du dossier, derniere sauvegarde, auto-save actif

12. **Implementer `src/pages/EditorPage.tsx`**
    - Layout `ResizablePanelGroup` : panel gauche (formulaires + table) + panel droit (PDF)
    - Chargement des donnees au montage via `editor.store.loadSession(sessionId)`
    - Route `/editor/:sessionId`
    - Auto-save : `useEffect` qui debounce les sauvegardes quand `isDirty` change

13. **Ajouter la route**
    - Modifier `src/routes.ts` pour ajouter la route `/editor/$sessionId`
    - Le composant charge le sessionId depuis les params de route

14. **Validation finale**
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
```

### Level 2: Test Manuel

```bash
npm run tauri dev
```

Verifier:
- [ ] L'editeur charge les donnees d'un dossier apres OCR
- [ ] Tous les champs du formulaire sont editables
- [ ] Le tableau des lignes est editable inline (clic → edit → blur → save)
- [ ] Ajouter/supprimer des lignes fonctionne
- [ ] La ligne de totaux est correcte
- [ ] Le PDF est visible dans le panel lateral
- [ ] Les onglets CDV/Fiche lot fonctionnent
- [ ] Les modifications declenchent l'auto-save (indicateur visible)
- [ ] Le bouton "Valider" change le statut
- [ ] Relancer l'app : les donnees sont persistees

### Level 3: Integration

- [ ] La navigation depuis ImportPage fonctionne (clic sur dossier termine)
- [ ] Les donnees OCR du PRP #4 sont correctement chargees
- [ ] Les modifications persistent entre les sessions
- [ ] Le bouton retour ramene a la page Import

---

## Anti-Patterns to Avoid

- Ne pas mettre la logique de sauvegarde dans les composants (utiliser le store + service)
- Ne pas re-creer un viewer PDF (reutiliser PdfViewer du PRP #2)
- Ne pas rendre le formulaire entier en un seul composant geant (decomposer)
- Ne pas sauvegarder a chaque keystroke (debounce obligatoire)
- Ne pas bloquer l'UI pendant la sauvegarde (operation async)
- Ne pas recalculer les totaux dans chaque composant (un seul useMemo dans le parent)

---

## Evolutions Futures (Hors Scope)

- Enrichissement Fabric automatique (PRP #6)
- Generation de liasse (PRP #7)
- Drag & drop pour reordonner les lignes (v2)
- Historique des modifications (v2)
- Raccourcis clavier dans le tableau (Tab, Enter, Escape)

---

## Score de Confiance

**Score: 8/10**

**Points forts:**
- React Hook Form + TanStack Table sont des librairies matures
- Le layout split est un pattern UI classique
- Les types sont deja definis

**Risques:**
- Complexite de l'editing inline avec TanStack Table
- Performance avec beaucoup de lignes de vente
- Gestion du focus et de la navigation clavier dans le tableau

**Mitigation:**
- Commencer avec un editing simple (clic pour editer, pas de navigation clavier)
- Virtualisation si > 100 lignes (peu probable dans ce contexte)
- Tests manuels approfondis du workflow d'edition
