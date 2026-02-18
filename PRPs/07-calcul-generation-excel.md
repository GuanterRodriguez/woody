# PRP #7: Moteur de Calcul & Generation Excel

> **Status:** A FAIRE | Date: 2026-02-13
> **Prerequis:** PRP #5 (Editeur), PRP #6 (Integration Fabric)

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
Implementer le moteur de calcul qui aggrege les donnees (frais OCR + frais Fabric + lignes de vente) et la generation du document Excel final. Le workflow N8N genere un Excel a partir d'un template (`TEMPLATE_CV.xlsx`) avec 2 feuilles : INFORMATIONS et LIGNE DE VENTE. L'app reproduit ce comportement en utilisant ExcelJS pour manipuler le template et inserer les donnees. L'Excel contient ses propres formules de calcul integrees.

**Etat final desire:**
- Un apercu en temps reel des calculs est affiche dans l'editeur (totaux, frais, net a payer)
- Le bouton "Generer liasse" produit un fichier Excel a partir du template
- L'Excel genere contient les memes donnees que dans le workflow N8N
- Le document est sauvegarde localement et telecharge
- Les PDFs sources (CDV + Fiche lot) peuvent etre inclus dans un ZIP

---

## Why

**Valeur business et impact utilisateur:**
C'est l'output final du processus. Le document Excel est le livrable principal qui resume toute l'operation. Il est actuellement genere via N8N en copiant un template OneDrive et en remplissant les tableaux Excel. L'app reproduit ce comportement localement, sans dependance a OneDrive ou N8N.

**Reference N8N :**
Le workflow N8N (lignes 182-364 du JSON) :
1. Cherche `TEMPLATE_CV` sur OneDrive
2. Copie le template (nouveau fichier nomme `{Client}_{Camion}_{Date}_{id}.xlsx`)
3. Remplit la table `INFORMATIONS` : 15 champs (Produit, Camion, Date, Frais x5, Poids declare, Prix declare, Date BAE, Dossier, Client, Fournisseur, N° Declaration)
4. Remplit la table `ligne_de_vente` : lignes extraites par OCR (client, produit, colis, poids_brut, poids_net, prix_unitaire_net)
5. Attend 20s (pour que Excel Online recalcule les formules)
6. Telecharge le fichier et l'envoie par email

L'app peut faire la meme chose localement avec ExcelJS, sans attente ni email.

**Integration avec l'existant:**
- Utilise les donnees editees (PRP #5) et enrichies (PRP #6)
- Le bouton "Generer liasse" dans l'editeur declenche la generation
- Les documents generes sont listes dans le dashboard (PRP #8)

---

## What

### Comportement Visible

**Apercu des calculs dans l'editeur (section sous les lignes de vente) :**
```
┌─────────────────────────────────────────────────────────────┐
│  --- Recapitulatif ---                                       │
│                                                              │
│  Total colis:           80                                   │
│  Total poids net:    8 000.0 kg                             │
│  Total ventes:      20 750.00 EUR                           │
│                                                              │
│  Frais transit:      1 500.50 EUR                           │
│  Frais commission:   2 000.00 EUR                           │
│  Autres frais:         350.00 EUR                           │
│  Frais UE:             300.00 EUR                           │
│  Frais INT:            200.00 EUR                           │
│  ──────────────────────────────                             │
│  Total frais:        4 350.50 EUR                           │
│                                                              │
│  ══════════════════════════════                             │
│  NET A PAYER:       16 399.50 EUR                           │
│                                                              │
│  Poids declare:      8 000.0 kg                             │
│  Ecart poids:            0.0 kg                             │
└─────────────────────────────────────────────────────────────┘
```

**Dialog de generation :**
```
┌─────────────────────────────────────────────────────────┐
│  Generer la liasse                             [Fermer] │
│                                                         │
│  Fichier: Client_A_AB123CD_2026-01-15.xlsx              │
│                                                         │
│  Documents inclus:                                      │
│  ☑ Document de calcul (Excel)                           │
│  ☑ Compte de vente source (PDF)                         │
│  ☑ Fiche de lot source (PDF)                            │
│                                                         │
│  Format:                                                │
│  ○ Fichier Excel seul                                   │
│  ● ZIP complet (Excel + PDFs sources)                   │
│                                                         │
│  [Generer et telecharger]                               │
│                                                         │
│  Derniere generation: 13/02/2026 a 14:32                │
└─────────────────────────────────────────────────────────┘
```

### Requirements Techniques

1. **Moteur de calcul** (`calculation.engine.ts`) : fonctions pures, testables
   - Total par ligne : `poidsNet * prixUnitaireNet`
   - Total ventes : somme des totaux lignes
   - Total frais : transit + commission + autres + UE + INT
   - Net a payer : total ventes - total frais
   - Poids vendu : somme des poidsNet
   - Ecart poids : poids vendu - poids declare
   - Total colis : somme des colis

2. **ExcelJS** : Librairie pour manipuler des fichiers Excel (.xlsx) en JavaScript
   - Lire le template TEMPLATE_CV.xlsx
   - Ecrire dans les tables nommees (INFORMATIONS, ligne_de_vente)
   - Sauvegarder le fichier genere

3. **Template Excel** : Embarque dans l'app comme asset statique
   - 2 feuilles : INFORMATIONS (15 champs), LIGNE DE VENTE (6 colonnes)
   - Les formules de calcul sont dans le template (pas besoin de les recalculer)

4. **Nommage fichier** : `{Client}_{Camion}_{Date}.xlsx` (pattern du workflow N8N)

5. **ZIP** : Optionnel, inclure les PDFs sources avec l'Excel dans un ZIP

---

## Success Criteria

- [ ] Le moteur de calcul produit des resultats corrects (verifies par tests)
- [ ] L'apercu des calculs dans l'editeur est en temps reel
- [ ] Le fichier Excel est genere correctement depuis le template
- [ ] La table INFORMATIONS contient les 15 champs corrects
- [ ] La table LIGNE DE VENTE contient toutes les lignes
- [ ] Le ZIP contient l'Excel + les PDFs sources
- [ ] Le fichier est sauvegarde localement et telecharge
- [ ] Le statut du dossier passe a "genere"
- [ ] Tests unitaires du moteur de calcul (8+ tests)
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` + `npm run test`

---

## All Needed Context

### Documentation & References

| Resource | URL/Chemin | Pourquoi |
|----------|------------|----------|
| ExcelJS | https://github.com/exceljs/exceljs | Manipulation Excel |
| JSZip | https://stuk.github.io/jszip/ | Creation ZIP |
| Workflow N8N | `docs/AutomatisationN8N.json` | Structure du template (lignes 230-364) |
| Template Excel | `docs/Exemple Excel.xlsx` | Template original a embarquer |
| Tauri save dialog | https://v2.tauri.app/plugin/dialog/ | Dialog "Enregistrer sous" |
| Patterns | `agent_docs/code_patterns.md` | Patterns du projet |

### Structure du Template Excel (extrait du N8N)

**Feuille INFORMATIONS - Table "INFORMATIONS" :**

| Colonne | Source | Exemple |
|---------|--------|---------|
| Produit | Formulaire/Dossier | Mangues |
| Camion | OCR CDV | AB123CD |
| Date d'arrivee du camion | OCR CDV | 2026-01-15 |
| Frais de transit | OCR CDV | 1500.50 |
| Frais Commission | OCR CDV | 2000.00 |
| Autre frais | OCR CDV | 350.00 |
| Frais UE | Fabric | 300.00 |
| Frais INT | Fabric | 200.00 |
| Poids declare | Fabric | 8000.0 |
| Prix declare (au kilo) | Fabric | 2.60 |
| Date BAE | Fabric | 2026-01-12 |
| Dossier | Fabric | 2026-0042-GR |
| Client | Fabric | Client A |
| Fournisseur | Fabric | Fournisseur XYZ |
| N° Declaration | Fabric | 2026-000156 |

**Feuille LIGNE DE VENTE - Table "ligne_de_vente" :**

| Colonne | Exemple |
|---------|---------|
| client | Client A |
| produit | Mangues |
| colis | 50 |
| poids_brut | 5500.0 |
| poids_net | 5000.0 |
| prix_unitaire_net | 2.50 |

### Arborescence Cible

```
src/
├── services/
│   ├── calculation.engine.ts           # CREER : moteur de calcul (fonctions pures)
│   ├── calculation.engine.test.ts      # CREER : tests calculs
│   └── excel-generator.service.ts      # CREER : generation Excel + ZIP
├── components/
│   └── editor/
│       ├── CalculationSummary.tsx       # CREER : apercu calculs dans l'editeur
│       └── GenerationDialog.tsx         # CREER : dialog de generation
├── pages/
│   └── EditorPage.tsx                  # MODIFIER : integrer apercu + dialog
├── assets/
│   └── TEMPLATE_CV.xlsx               # CREER : copier le template
└── types/
    └── calculation.types.ts            # CREER : types calcul
```

### Known Gotchas & Library Quirks

1. **ExcelJS + tables nommees** : ExcelJS supporte les tables Excel (worksheets.getTable). Pour ecrire dans une table existante, il faut ajouter des lignes avec `table.addRow()` ou ecrire directement dans les cellules de la table.
2. **Formules Excel** : ExcelJS ne recalcule PAS les formules. Les cellules avec formules garderont le resultat cache du template. L'Excel se recalculera quand il sera ouvert dans Excel Desktop. Si c'est un probleme, on peut ecrire les valeurs calculees dans les cellules de resultat.
3. **ExcelJS dans le navigateur** : ExcelJS fonctionne dans le navigateur (buffer support via polyfill). Verifier la compatibilite avec Vite.
4. **Tauri save dialog** : Utiliser `@tauri-apps/plugin-dialog` pour le dialog "Enregistrer sous". Necessite la capability `dialog:default`.
5. **Encodage noms fichiers** : Les noms de fichiers avec accents/espaces doivent etre nettoyes. Utiliser un slug pour le nom du fichier.
6. **JSZip** : Si on veut inclure les PDFs sources dans un ZIP, JSZip fonctionne dans le navigateur. Lire les PDFs via Tauri fs, les ajouter au ZIP.

---

## Implementation Blueprint

### Data Models

```typescript
// src/types/calculation.types.ts

interface CalculatedLine {
  client: string;
  produit: string;
  colis: number;
  poidsBrut: number;
  poidsNet: number;
  prixUnitaireNet: number;
  totalLigne: number;        // poidsNet * prixUnitaireNet
}

interface CalculationResult {
  // Lignes
  lignes: CalculatedLine[];
  totalColis: number;
  totalPoidsBrut: number;
  totalPoidsNet: number;
  totalVentes: number;

  // Frais
  fraisTransit: number;
  fraisCommission: number;
  autreFrais: number;
  fraisUe: number;
  fraisInt: number;
  totalFrais: number;

  // Recapitulatif
  netAPayer: number;           // totalVentes - totalFrais

  // Poids
  poidsDeclare: number;
  poidsVendu: number;          // = totalPoidsNet
  ecartPoids: number;          // poidsVendu - poidsDeclare
}
```

### Liste des Taches (dans l'ordre)

#### Phase 1 : Moteur de calcul

1. **Creer `src/types/calculation.types.ts`**
   - Types `CalculatedLine` et `CalculationResult`

2. **Creer `src/services/calculation.engine.ts`**
   - Fonction pure `calculateCdv(session, lignes) → CalculationResult`
   - Arrondi a 2 decimales pour les montants, 1 decimale pour les poids
   - Pas d'effets de bord

3. **Creer `src/services/calculation.engine.test.ts`**
   - Cas nominal (5+ lignes, frais normaux)
   - Lignes vides → totaux a 0
   - Valeurs a zero
   - Grands nombres
   - Arrondis (verifier precision)
   - Net negatif (frais > ventes)
   - Ecart poids positif et negatif

4. **Validation intermediaire**
   ```bash
   npm run typecheck && npm run lint && npm run test
   ```

#### Phase 2 : Apercu dans l'editeur

5. **Creer `src/components/editor/CalculationSummary.tsx`**
   - Composant presentationnel
   - Recoit un `CalculationResult` en props
   - Affiche : totaux lignes, frais, net a payer, ecart poids
   - Formatage `Intl.NumberFormat('fr-FR')` pour les montants

6. **Integrer dans l'editeur**
   - Modifier `src/pages/EditorPage.tsx`
   - Calculer le `CalculationResult` avec `useMemo` quand session ou lignes changent
   - Afficher `CalculationSummary` sous le tableau des lignes

7. **Validation intermediaire**
   ```bash
   npm run typecheck && npm run lint
   ```

#### Phase 3 : Generation Excel

8. **Installer les dependances**
   ```bash
   npm install exceljs jszip
   npm install @tauri-apps/plugin-dialog
   ```
   - Ajouter capability `dialog:default` dans Tauri

9. **Copier le template**
   - Copier `docs/Exemple Excel.xlsx` vers `src/assets/TEMPLATE_CV.xlsx`
   - Configurer Vite pour servir les assets binaires (`?url` import)

10. **Creer `src/services/excel-generator.service.ts`**
    - `generateExcel(session, lignes)` : charge le template, remplit les tables, retourne un `Uint8Array`
    - `generateZip(session, lignes, pdfCdvBytes?, pdfFicheBytes?)` : Excel + PDFs dans un ZIP
    - `buildFileName(session)` : `{Client}_{Camion}_{Date}.xlsx`
    - `saveFile(data, defaultName)` : dialog Tauri + ecriture fichier

11. **Creer `src/components/editor/GenerationDialog.tsx`**
    - Dialog shadcn
    - Checkboxes : Excel, PDF CDV, PDF Fiche lot
    - Radio : fichier seul ou ZIP
    - Bouton "Generer et telecharger"
    - Progression et feedback

12. **Integrer dans l'editeur**
    - Le bouton "Generer liasse" dans EditorToolbar ouvre le dialog
    - Apres generation, mettre a jour le statut dossier en "genere"
    - Sauvegarder le chemin du fichier genere en base

13. **Validation finale**
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
npm run test             # Tests du moteur de calcul
```

### Level 2: Test Manuel

```bash
npm run tauri dev
```

Verifier:
- [ ] L'apercu des calculs est visible dans l'editeur
- [ ] Les totaux se mettent a jour quand on modifie les lignes
- [ ] Le fichier Excel est genere correctement
- [ ] Ouvrir l'Excel dans Excel Desktop : les formules fonctionnent
- [ ] Les 15 champs INFORMATIONS sont presents et corrects
- [ ] Les lignes de vente sont presentes et correctes
- [ ] Le ZIP contient tous les documents selectionnes
- [ ] Le nom du fichier suit le pattern attendu
- [ ] Le statut passe a "genere" apres generation

### Level 3: Integration

- [ ] Le bouton "Generer" dans l'editeur fonctionne end-to-end
- [ ] Les documents generes sont sauvegardes localement
- [ ] Generer un nouveau document ecrase le precedent (ou le versionne)

---

## Anti-Patterns to Avoid

- Ne pas faire de calculs dans les composants React (uniquement dans `calculation.engine`)
- Ne pas hardcoder le format du document (utiliser le template parametrable)
- Ne pas ignorer les arrondis (toujours arrondir a 2 decimales pour les montants)
- Ne pas stocker le template dans `public/` (utiliser `src/assets/` pour le bundling)
- Ne pas oublier de nettoyer les caracteres speciaux dans les noms de fichiers

---

## Evolutions Futures (Hors Scope)

- Envoi automatique par email via Outlook (Graph API)
- Calcul ecart poids avec logique conditionnelle (v2 : si ecart > 100kg, double calcul avec liquidation complementaire)
- Export PDF en complement de l'Excel
- Templates personnalisables par l'utilisateur
- Historique des versions generees

---

## Score de Confiance

**Score: 8/10**

**Points forts:**
- Le moteur de calcul est une logique pure, facilement testable
- ExcelJS est mature et bien documente
- Le template Excel est connu (meme structure que N8N)

**Risques:**
- ExcelJS et les tables nommees Excel : compatibilite a verifier
- Formules non recalculees par ExcelJS (a tester avec le vrai template)
- Taille du template embarque dans le bundle

**Mitigation:**
- Tester ExcelJS avec le vrai template des le debut
- Si les tables nommees posent probleme, ecrire directement dans les cellules
- Compresser le template avec Vite (asset optimization)
