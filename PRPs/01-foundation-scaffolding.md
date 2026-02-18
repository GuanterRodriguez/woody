# PRP #1: Foundation & Scaffolding

> **Status:** TERMINE | Date: 2026-02-13

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
Initialiser le projet Tauri v2 avec React 19, TypeScript strict, Vite, Tailwind CSS et shadcn/ui. Creer le layout principal de l'application (sidebar + zone de contenu), le systeme de routing entre les 4 pages, la page de configuration (settings), et la base SQLite avec le schema initial.

**Etat final desire:**
- L'application Tauri se lance sur Windows avec `npm run tauri dev`
- Le layout avec sidebar est visible et fonctionnel
- La navigation entre les 4 pages fonctionne (Dashboard, Import, Editeur, Settings)
- La page Settings permet de saisir et sauvegarder la cle API Gemini et les parametres Fabric
- La base SQLite est creee avec les 3 tables (cdv_sessions, lignes_vente, documents_generes)
- TypeScript strict mode, ESLint, et le build passent sans erreur

---

## Why

**Valeur business et impact utilisateur:**
C'est la fondation de toute l'application. Sans cette base, aucune feature ne peut etre implementee. Le layout et le routing definissent l'experience de navigation. La configuration permet de connecter les services externes (Gemini, Fabric).

**Integration avec l'existant:**
Premier PRP - pas d'existant. Le repo ne contient que de la documentation.

**Problemes resolus:**
- Creer la structure technique du projet
- Definir les patterns de base qui seront reutilises dans tous les PRPs suivants
- Avoir une application fonctionnelle (meme vide) pour iterer dessus

---

## What

### Comportement Visible

```
┌─────────────────────────────────────────────────┐
│  WOODY                              [−] [□] [×] │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│  📊 Dashboard │   [Contenu de la page active]   │
│          │                                      │
│  📄 Import    │   Page par defaut : Dashboard   │
│          │   avec un message "A venir - PRP #7" │
│  ✏️ Editeur  │                                      │
│          │                                      │
│  ⚙️ Config   │                                      │
│          │                                      │
│          │                                      │
├──────────┴──────────────────────────────────────┤
│  Woody v0.1.0                                   │
└─────────────────────────────────────────────────┘
```

**Page Settings :**
```
┌──────────────────────────────────────┐
│  Configuration                       │
│                                      │
│  --- Google Gemini ---               │
│  Cle API: [__________________] 👁    │
│                                      │
│  --- Microsoft Fabric ---            │
│  SQL Endpoint: [______________]      │
│  Database:     [______________]      │
│                                      │
│  [Tester la connexion]  [Sauvegarder]│
│                                      │
│  Status: ● Gemini OK  ○ Fabric N/C  │
└──────────────────────────────────────┘
```

### Requirements Techniques

1. **Tauri v2** init avec React + TypeScript + Vite
2. **Tailwind CSS v4** configure avec PostCSS
3. **shadcn/ui** initialise avec les composants de base : Button, Input, Card, Label, Separator, Sidebar
4. **TanStack Router** pour le routing type-safe entre les 4 pages
5. **Zustand** store pour les settings (cle Gemini, params Fabric)
6. **tauri-plugin-sql** pour SQLite avec le schema initial
7. **tauri-plugin-store** pour persister les settings (cle API chiffree)
8. **tauri-plugin-fs** et **tauri-plugin-dialog** pour les futures operations fichiers
9. **ESLint** + **Prettier** configures
10. **Vitest** configure (meme si pas de tests encore)
11. Alias `@/` → `src/` dans tsconfig et vite config

---

## Success Criteria

- [ ] `npm run tauri dev` lance l'application sans erreur
- [ ] Le layout sidebar + contenu est visible
- [ ] La navigation entre les 4 pages fonctionne
- [ ] La page Settings sauvegarde la cle Gemini et les params Fabric
- [ ] La base SQLite est creee avec les 3 tables
- [ ] `npm run typecheck` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] `npm run build` passe sans erreur
- [ ] `cargo check` passe sans erreur

---

## All Needed Context

### Documentation & References

| Resource | URL/Chemin | Pourquoi |
|----------|------------|----------|
| Tauri v2 Quick Start | https://v2.tauri.app/start/ | Setup initial |
| Tauri v2 + React | https://v2.tauri.app/start/frontend/react/ | Integration React |
| tauri-plugin-sql | https://v2.tauri.app/plugin/sql/ | SQLite setup |
| tauri-plugin-store | https://v2.tauri.app/plugin/store/ | Settings persistence |
| shadcn/ui | https://ui.shadcn.com/docs/installation/vite | Installation Vite |
| TanStack Router | https://tanstack.com/router/latest | Routing |
| Patterns de code | `agent_docs/code_patterns.md` | Patterns a suivre |
| Stack technique | `agent_docs/tech_stack.md` | Packages et versions |

### Arborescence Codebase Actuelle

```
Compte de vente/
├── AGENTS.md
├── CLAUDE.md
├── agent_docs/
│   ├── project_brief.md
│   ├── code_patterns.md
│   ├── tech_stack.md
│   └── testing.md
├── PRPs/
│   └── templates/prp_base.md
├── docs/
│   ├── AutomatisationN8N.json
│   └── Exemple Excel.xlsx
└── src/
    └── .gitkeep
```

### Arborescence Cible (Fichiers a Creer)

```
Compte de vente/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   ├── capabilities/
│   │   └── default.json
│   ├── icons/
│   │   └── (icones par defaut Tauri)
│   └── src/
│       ├── main.rs
│       └── lib.rs
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── vite-env.d.ts
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── ImportPage.tsx
│   │   ├── EditorPage.tsx
│   │   └── SettingsPage.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx
│   │   │   └── Sidebar.tsx
│   │   └── ui/
│   │       └── (composants shadcn/ui)
│   ├── services/
│   │   └── database.service.ts
│   ├── stores/
│   │   └── settings.store.ts
│   ├── types/
│   │   └── cdv.types.ts
│   └── lib/
│       └── utils.ts
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── eslint.config.js
├── .prettierrc
└── .gitignore (mise a jour)
```

### Known Gotchas & Library Quirks

1. **Tauri v2 vs v1** : La syntaxe des plugins a change. Utiliser `@tauri-apps/plugin-sql` (v2) et non `tauri-plugin-sql` (v1). Les imports sont `import Database from '@tauri-apps/plugin-sql'`.
2. **WebView2 sur Windows** : Doit etre present. Sur Azure VD (Win10/11), il est pre-installe.
3. **shadcn/ui init** : Utiliser `npx shadcn@latest init` puis `npx shadcn@latest add [composant]`. Ne pas installer shadcn comme dependance npm.
4. **tauri-plugin-sql SQLite** : Necessite d'ajouter le feature `sqlite` dans Cargo.toml : `tauri-plugin-sql = { version = "2", features = ["sqlite"] }`.
5. **Tailwind v4** : La config a change - `@import "tailwindcss"` dans le CSS au lieu de `@tailwind base/components/utilities`.
6. **TanStack Router** : Genere automatiquement les routes a partir de l'arborescence de fichiers si on utilise le file-based routing. Alternative : route tree manuelle.
7. **Alias @/** : Doit etre configure a la fois dans `tsconfig.json` (paths) ET `vite.config.ts` (resolve.alias).

---

## Implementation Blueprint

### Data Models

```typescript
// src/types/cdv.types.ts

export type CdvStatut = "brouillon" | "ocr_en_cours" | "a_corriger" | "valide" | "genere";

export interface CdvSession {
  id: string;
  statut: CdvStatut;
  produit: string;
  camion: string;
  dateArrivee: string;
  fraisTransit: number;
  fraisCommission: number;
  autreFrais: number;
  fraisUe: number;
  fraisInt: number;
  poidsDeclare: number;
  prixDeclareKilo: number;
  dateBae: string;
  dossier: string;
  client: string;
  fournisseur: string;
  numDeclaration: string;
  pdfCdvPath: string;
  pdfFicheLotPath: string;
  ocrRawCdv: string;
  ocrRawFiche: string;
  fabricMatched: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LigneVente {
  id: string;
  cdvSessionId: string;
  client: string;
  produit: string;
  colis: number;
  poidsBrut: number;
  poidsNet: number;
  prixUnitaireNet: number;
  ordre: number;
}

export interface DocumentGenere {
  id: string;
  cdvSessionId: string;
  type: "calcul" | "cdv_reconstitue" | "fiche_lot_reconstituee";
  filePath: string;
  generatedAt: string;
}
```

```typescript
// src/stores/settings.store.ts

export interface AppSettings {
  geminiApiKey: string;
  fabricServer: string;
  fabricDatabase: string;
}
```

### Liste des Taches (dans l'ordre)

#### Phase 1: Init Tauri + React

1. **Initialiser le projet Tauri v2 avec React + TypeScript + Vite**
   - Commande: `npm create tauri-app@latest` avec template React-TS
   - Ou init manuelle si la structure existante doit etre preservee
   - Configurer `tauri.conf.json` (nom: "Woody", identifier: "com.grlog.woody")

2. **Configurer Tailwind CSS + shadcn/ui**
   - Installer Tailwind CSS v4
   - Initialiser shadcn/ui (`npx shadcn@latest init`)
   - Ajouter les composants de base: Button, Input, Card, Label, Separator

3. **Configurer les plugins Tauri**
   - `tauri-plugin-sql` (feature sqlite)
   - `tauri-plugin-store`
   - `tauri-plugin-fs`
   - `tauri-plugin-dialog`
   - Configurer les permissions dans `capabilities/default.json`

#### Phase 2: Layout + Routing

4. **Creer le layout principal**
   - `src/components/layout/AppLayout.tsx` : wrapper avec sidebar + zone de contenu
   - `src/components/layout/Sidebar.tsx` : navigation laterale avec liens vers les 4 pages
   - Utiliser les composants shadcn/ui Sidebar si disponibles, sinon custom

5. **Configurer le routing**
   - Installer et configurer TanStack Router
   - 4 routes : `/` (Dashboard), `/import` (Import), `/editor` (Editeur), `/settings` (Config)
   - Pages placeholder pour Dashboard, Import, Editeur

6. **Creer les pages placeholder**
   - `DashboardPage.tsx` : Message "Dashboard - A venir (PRP #7)"
   - `ImportPage.tsx` : Message "Import & OCR - A venir (PRP #2)"
   - `EditorPage.tsx` : Message "Editeur CDV - A venir (PRP #4)"

#### Phase 3: Settings + SQLite

7. **Creer la page Settings**
   - Formulaire avec: Cle API Gemini, SQL Endpoint Fabric, Database Fabric
   - Boutons: Tester connexion, Sauvegarder
   - Indicateurs de statut

8. **Configurer le store Zustand pour les settings**
   - `src/stores/settings.store.ts`
   - Persistence via `tauri-plugin-store`

9. **Initialiser SQLite**
   - `src/services/database.service.ts`
   - Fonction `initDatabase()` qui cree les 3 tables si elles n'existent pas
   - Appel au demarrage de l'app dans `main.tsx` ou `App.tsx`

10. **Creer les types de base**
    - `src/types/cdv.types.ts` avec CdvSession, LigneVente, DocumentGenere

#### Phase 4: Dev tooling

11. **Configurer ESLint + Prettier**
    - ESLint flat config avec rules TypeScript strict
    - Prettier avec config standard

12. **Configurer Vitest**
    - `vitest.config.ts` ou section dans `vite.config.ts`
    - Setup fichier `tests/setup.ts`
    - Un test de base qui passe (sanity check)

### Pseudocode

```
// App startup flow
1. main.tsx → mount React app
2. App.tsx → init database (create tables if not exist)
3. App.tsx → load settings from tauri-plugin-store
4. App.tsx → render AppLayout with Router
5. AppLayout → Sidebar + <Outlet /> (active page)
6. Default route → DashboardPage (placeholder)
```

### Integration Points

| Element | Fichier | Action |
|---------|---------|--------|
| Entry point React | `src/main.tsx` | Creer |
| Router setup | `src/App.tsx` | Creer |
| Layout principal | `src/components/layout/AppLayout.tsx` | Creer |
| Sidebar navigation | `src/components/layout/Sidebar.tsx` | Creer |
| Page Settings | `src/pages/SettingsPage.tsx` | Creer |
| Store settings | `src/stores/settings.store.ts` | Creer |
| Service database | `src/services/database.service.ts` | Creer |
| Types domaine | `src/types/cdv.types.ts` | Creer |
| Utilitaire cn() | `src/lib/utils.ts` | Creer (via shadcn init) |
| Tauri config | `src-tauri/tauri.conf.json` | Creer |
| Tauri main | `src-tauri/src/main.rs` | Creer |
| Permissions | `src-tauri/capabilities/default.json` | Creer |

---

## Validation Loop

### Level 1: Syntax & Style

```bash
npm run typecheck        # TypeScript strict mode - 0 erreurs
npm run lint             # ESLint - 0 erreurs
npm run build            # Vite build - 0 erreurs
cargo check              # Rust compilation - 0 erreurs
```

### Level 2: Test Manuel

```bash
npm run tauri dev        # Lancer l'application
```

Verifier:
- [ ] La fenetre Woody s'ouvre
- [ ] La sidebar est visible avec les 4 liens
- [ ] Cliquer sur chaque lien affiche la bonne page
- [ ] La page Settings permet de saisir et sauvegarder les parametres
- [ ] Apres redemarrage, les settings sont conserves
- [ ] Pas d'erreur dans la console du navigateur (WebView2 devtools)

### Level 3: Integration

- [ ] La base SQLite est creee dans le bon dossier
- [ ] Les 3 tables existent (verifier avec un outil SQLite ou une commande)
- [ ] Les settings sont persistees entre les relances

---

## Final Validation Checklist

- [ ] `npm run typecheck` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] `npm run build` passe sans erreur
- [ ] `cargo check` passe sans erreur
- [ ] Tests manuels OK (app se lance, navigation fonctionne, settings persistent)
- [ ] Types corrects (pas de `any`, strict mode)
- [ ] Patterns du projet respectes (voir code_patterns.md)
- [ ] code_patterns.md mis a jour si nouveau pattern
- [ ] AGENTS.md > Current State mis a jour

---

## Anti-Patterns to Avoid

- Ne pas utiliser `any` en TypeScript
- Ne pas installer de packages inutiles "au cas ou"
- Ne pas creer de composants UI custom quand shadcn/ui fournit l'equivalent
- Ne pas mettre de logique metier dans les composants React
- Ne pas hardcoder la cle API Gemini dans le code
- Ne pas ignorer les erreurs de compilation Rust
- Ne pas utiliser CSS custom quand Tailwind suffit

---

## Evolutions Futures (Hors Scope)

- Les pages Dashboard, Import, Editeur ne sont que des placeholders (PRPs suivants)
- Pas de logique OCR (PRP #3)
- Pas de connexion reelle a Fabric (PRP #5)
- Pas de tests unitaires metier (a ajouter dans les PRPs concernes)

---

## Score de Confiance

**Score: 9/10**

**Points forts:**
- Tauri v2 + React est une stack bien documentee
- shadcn/ui s'initialise facilement avec Vite
- Le scope est clair et limite (structure + layout + settings + SQLite)

**Risques:**
- Compatibilite Tauri v2 plugins avec la derniere version
- Configuration des permissions Tauri (capabilities)

**Mitigation:**
- Suivre la doc officielle Tauri v2
- Tester sur Windows des le debut (pas seulement sur Mac en dev)
