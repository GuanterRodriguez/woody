# Stack Technique - Woody (Compte de Vente)

## Status: DEFINIE

---

## Type d'application

**Application desktop standalone Windows** - Executable portable (.exe) sans installeur, destine aux postes Azure Virtual Desktop (Windows 10/11).

**Framework choisi : Tauri v2**
- Exe leger (~15-20 MB) vs Electron (~100+ MB)
- Utilise WebView2 (pre-installe sur Windows 10/11)
- Backend Rust performant pour les operations systeme
- Frontend web moderne (React)
- Plugin SQLite integre

---

## Stack choisie

### Core
| Package | Version | Usage |
|---------|---------|-------|
| Tauri v2 | ^2.x | Framework desktop, backend Rust, packaging |
| React | ^19.x | Frontend UI framework |
| TypeScript | ^5.x | Typage statique, mode strict |
| Vite | ^6.x | Build tool, HMR, dev server |

### UI / Frontend
| Package | Version | Usage |
|---------|---------|-------|
| Tailwind CSS | ^4.x | Utility-first CSS framework |
| shadcn/ui | latest | Composants UI accessibles (Button, Input, Table, Dialog, etc.) |
| Lucide React | latest | Icones coherentes avec shadcn/ui |
| react-pdf | ^9.x | Affichage PDF dans l'app (wrapper pdf.js) |
| @tanstack/react-table | ^8.x | Tableaux editables pour les lignes de vente |
| @tanstack/react-router | ^1.x | Routing type-safe |
| Recharts | ^2.x | Graphiques pour le dashboard |
| Zustand | ^5.x | State management leger |
| React Hook Form | ^7.x | Gestion des formulaires |
| Zod | ^3.x | Validation des schemas de donnees |

### Donnees / Stockage
| Package | Version | Usage |
|---------|---------|-------|
| tauri-plugin-sql | ^2.x | Plugin Tauri pour SQLite (via Rust) |
| tauri-plugin-fs | ^2.x | Acces fichiers systeme (import/export PDF) |
| tauri-plugin-dialog | ^2.x | Dialogues natifs (file picker) |
| tauri-plugin-store | ^2.x | Stockage cle-valeur pour les settings |

### Services externes
| Service | Usage | Auth |
|---------|-------|------|
| Google Gemini API | OCR documents (gemini-2.0-flash) | Cle API |
| Fabric SQL Endpoint | Requetes vues CVENCOURS / CV_CLOTURE | Entra ID (MSAL) |
| Microsoft Graph API | (v2) Integration email Outlook | Entra ID (MSAL) |

### PDF / Documents
| Package | Version | Usage |
|---------|---------|-------|
| pdf-lib | ^1.x | Manipulation PDF (split, merge, extraction pages) |
| jsPDF | ^2.x | Generation PDF depuis HTML/donnees |
| html2canvas | ^1.x | Capture HTML pour integration dans PDF (si besoin) |

### Utilitaires
| Package | Version | Usage |
|---------|---------|-------|
| date-fns | ^4.x | Manipulation de dates (matching ±3 jours Fabric) |
| uuid | ^11.x | Generation d'identifiants uniques |
| clsx + tailwind-merge | latest | Utilitaires classes CSS (pour shadcn/ui) |

### Developpement
| Package | Version | Usage |
|---------|---------|-------|
| ESLint | ^9.x | Linting JavaScript/TypeScript |
| Prettier | ^3.x | Formatage de code |
| Vitest | ^3.x | Tests unitaires (compatible Vite) |
| @testing-library/react | ^16.x | Tests composants React |

---

## Scripts / Commandes

```bash
# Developpement
npm run dev              # Lancer Vite dev server (frontend seul)
npm run tauri dev        # Lancer l'app Tauri complete (frontend + backend Rust)

# Build
npm run build            # Build frontend Vite (production)
npm run tauri build      # Build executable Windows (.exe)

# Verification
npm run lint             # ESLint
npm run lint:fix         # ESLint avec auto-fix
npm run typecheck        # TypeScript strict check (tsc --noEmit)
npm run test             # Vitest (tests unitaires)
npm run test:watch       # Vitest en mode watch

# Rust
cargo check              # Verification compilation Rust
cargo clippy             # Linting Rust
```

---

## Variables d'Environnement

```env
# Pas de .env en production - les secrets sont stockes via tauri-plugin-store
# En developpement uniquement :
VITE_GEMINI_API_KEY=xxx          # Cle API Google Gemini (dev only)
VITE_FABRIC_SERVER=xxx           # SQL endpoint Fabric (dev only)
VITE_FABRIC_DATABASE=xxx         # Nom base Fabric (dev only)
```

**En production** : les credentials sont stockees dans le store local chiffre de Tauri (`tauri-plugin-store`), configurables via la page Settings de l'app.

---

## Considerations Desktop

### Stockage local
- **Configuration** : `%APPDATA%/com.grlog.woody/` (gere par Tauri)
- **Base SQLite** : `%APPDATA%/com.grlog.woody/woody.db`
- **Settings** : `%APPDATA%/com.grlog.woody/settings.json` (via tauri-plugin-store)
- **PDFs importes** : `%APPDATA%/com.grlog.woody/documents/` (copies locales)
- **Liasses generees** : `%APPDATA%/com.grlog.woody/output/` ou choix utilisateur

### Distribution
- **Format** : `.exe` portable extrait du build Tauri (`target/release/woody.exe`)
- **Taille** : ~15-20 MB
- **Prerequis** : WebView2 runtime (pre-installe sur Windows 10/11)
- **Mise a jour** : Remplacement manuel du .exe (v1), auto-update possible en v2+
- **Pas d'installeur** : l'exe est directement executable sans droits admin

### Performance
- Demarrage rapide (< 2s)
- Operations locales (SQLite, PDF split) : < 500ms
- OCR Gemini : 5-15s par document (latence reseau)
- Requetes Fabric : 1-5s selon la complexite

---

## Dependances critiques

| Package | Criticite | Risque | Mitigation |
|---------|-----------|--------|------------|
| Tauri v2 | Haute | Framework relativement jeune | Communaute active, backed by CrabNebula |
| react-pdf | Haute | Rendu PDF dans WebView2 | pdf.js est tres mature, fallback possible |
| pdf-lib | Haute | Manipulation PDF cote client | Librairie stable et bien maintenue |
| Google Gemini API | Haute | Dependance externe, cout API | Caching des resultats OCR, retry logic |
| Fabric SQL Endpoint | Haute | Connexion reseau requise | Mode offline avec cache SQLite local |
| tauri-plugin-sql | Moyenne | Plugin Tauri pour SQLite | Alternative : invoquer SQLite via commandes Rust |
