# Patterns de Code - Woody (Compte de Vente)

> Ce document est **evolutif**. Il sera enrichi apres chaque PRP implemente.
> Chaque nouveau pattern etabli doit etre documente ici pour assurer la coherence du codebase.

---

## Comment utiliser ce fichier

1. **Avant de coder** : consulter les patterns existants pour rester coherent
2. **Apres implementation** : ajouter tout nouveau pattern utilise
3. **En cas de doute** : suivre le pattern existant le plus proche

---

## Patterns etablis

### Pattern Service

Chaque integration externe ou logique complexe est encapsulee dans un service TypeScript.

```typescript
// src/services/example.service.ts
import { z } from "zod";

// Schema de validation pour les donnees entrantes
const ExampleResponseSchema = z.object({
  field: z.string(),
  value: z.number(),
});

type ExampleResponse = z.infer<typeof ExampleResponseSchema>;

// Fonctions exportees (pas de classe, pas de singleton)
export async function fetchExample(id: string): Promise<ExampleResponse> {
  // Implementation
  const raw = await someApiCall(id);
  return ExampleResponseSchema.parse(raw);
}
```

**Regles :**
- Un fichier par service : `src/services/[nom].service.ts`
- Export de fonctions pures (pas de classes)
- Validation Zod sur les donnees externes (API, OCR, Fabric)
- Types inferes depuis les schemas Zod quand possible
- Gestion d'erreurs explicite (pas de catch silencieux)

---

### Pattern Page

Chaque page est un composant React dans `src/pages/`.

> **Note PRP #1 :** AppLayout est le composant de la route racine (TanStack Router). Les pages sont rendues via `<Outlet />`, elles ne wrappent PAS elles-memes AppLayout.

```typescript
// src/pages/ExamplePage.tsx
export function ExamplePage() {
  // Hooks en haut
  // Handlers au milieu
  // Rendu en bas

  return (
    <div>
      {/* Contenu de la page */}
    </div>
  );
}
```

**Regles :**
- Un fichier par page : `src/pages/[Nom]Page.tsx`
- Les pages sont rendues dans AppLayout via `<Outlet />` (route enfant)
- La logique metier est dans les services, pas dans les pages
- Les pages orchestrent les composants et appellent les services

---

### Pattern Composant

```typescript
// src/components/[domaine]/ExampleComponent.tsx
interface ExampleComponentProps {
  title: string;
  onAction: (id: string) => void;
}

export function ExampleComponent({ title, onAction }: ExampleComponentProps) {
  return (
    // JSX
  );
}
```

**Regles :**
- Organises par domaine : `layout/`, `pdf/`, `editor/`, `dashboard/`, `ui/`
- Props typees avec une interface dediee
- Composants fonctionnels uniquement (pas de classes)
- Export nomme (pas de default export)

---

### Pattern Store (Zustand)

```typescript
// src/stores/example.store.ts
import { create } from "zustand";

interface ExampleState {
  items: string[];
  isLoading: boolean;
  addItem: (item: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useExampleStore = create<ExampleState>((set) => ({
  items: [],
  isLoading: false,
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  setLoading: (loading) => set({ isLoading: loading }),
}));
```

**Regles :**
- Un store par domaine : `src/stores/[domaine].store.ts`
- Interface d'etat explicite
- Actions definies dans le store (pas d'actions externes)
- Pas de logique metier dans le store (deleguer aux services)

---

### Pattern Types

```typescript
// src/types/cdv.types.ts

// Types principaux du domaine
export interface CdvSession {
  id: string;
  statut: CdvStatut;
  produit: string;
  camion: string;
  // ...
}

export type CdvStatut = "brouillon" | "ocr_en_cours" | "a_corriger" | "valide" | "genere";

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
```

**Regles :**
- Types domaine dans `src/types/[domaine].types.ts`
- Union types pour les enums (pas d'enum TypeScript)
- camelCase pour les proprietes TypeScript (meme si la source est en snake_case)
- Fonctions de mapping explicites entre formats (API snake_case → TS camelCase)

---

### Pattern Gestion d'Erreurs

```typescript
// Erreur domaine typee
export class WoodyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "WoodyError";
  }
}

// Usage dans un service
export async function ocrDocument(file: File): Promise<OcrResult> {
  try {
    const response = await geminiCall(file);
    return parseOcrResponse(response);
  } catch (error) {
    throw new WoodyError(
      "Echec de l'OCR du document",
      "OCR_FAILED",
      error,
    );
  }
}

// Usage dans un composant (avec toast)
try {
  await ocrDocument(file);
} catch (error) {
  if (error instanceof WoodyError) {
    toast.error(error.message);
  }
}
```

**Regles :**
- `WoodyError` pour toutes les erreurs metier
- Code d'erreur string pour identification programmatique
- `cause` pour chainer les erreurs originales
- Toast utilisateur pour les erreurs non-bloquantes
- Dialog pour les erreurs bloquantes

---

### Pattern Tauri Commands

```rust
// src-tauri/src/main.rs (ou module dedie)
#[tauri::command]
fn read_file(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| e.to_string())
}
```

```typescript
// Appel cote frontend
import { invoke } from "@tauri-apps/api/core";

const data = await invoke<number[]>("read_file", { path: "/some/path" });
```

**Regles :**
- Commandes Rust uniquement pour les operations systeme (fichiers, process)
- La logique metier reste cote TypeScript
- Resultat `Result<T, String>` pour la gestion d'erreurs
- Nommage snake_case cote Rust, camelCase cote TypeScript

---

## Classes/Styles communs

### Tailwind + shadcn/ui
- Utiliser les composants shadcn/ui en priorite (Button, Input, Card, Table, Dialog, etc.)
- Tailwind pour le layout et les ajustements
- Pas de CSS custom sauf necessite absolue
- Utilitaire `cn()` pour combiner les classes conditionnellement

```typescript
import { cn } from "@/lib/utils";

<div className={cn("p-4 rounded-lg", isActive && "bg-primary/10")} />
```

### Couleurs et theme
- Utiliser les variables CSS de shadcn/ui (`--primary`, `--secondary`, etc.)
- Pas de couleurs hardcodees
- Theme clair par defaut (dark mode en v2)

---

## Conventions de fichiers

| Type de fichier | Emplacement | Convention | Exemple |
|-----------------|-------------|------------|---------|
| Pages | `src/pages/` | PascalCase + Page | `DashboardPage.tsx` |
| Composants | `src/components/[domaine]/` | PascalCase | `PdfViewer.tsx` |
| Services | `src/services/` | camelCase + .service | `gemini.service.ts` |
| Stores | `src/stores/` | camelCase + .store | `cdv.store.ts` |
| Types | `src/types/` | camelCase + .types | `cdv.types.ts` |
| Utilitaires | `src/lib/` | camelCase | `utils.ts` |
| Tests | co-localises | .test.ts(x) | `gemini.service.test.ts` |
| Commandes Tauri | `src-tauri/src/` | snake_case (.rs) | `commands.rs` |
| Config | racine | selon convention outil | `vite.config.ts` |

---

## Pattern App Init (PRP #1)

```typescript
// src/App.tsx - Initialisation de l'app au demarrage
export function App() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    async function initApp() {
      await initDatabase();    // Cree les tables SQLite
      await loadSettings();    // Charge les settings depuis tauri-plugin-store
      setIsReady(true);
    }
    void initApp();
  }, []);

  if (initError) return <ErrorScreen />;
  if (!isReady) return <LoadingScreen />;
  return <RouterProvider router={router} />;
}
```

**Regles :**
- L'init DB et le chargement des settings se font avant le rendu du router
- Etat de chargement et d'erreur geres dans App.tsx
- Les plugins Tauri ne sont disponibles que dans le contexte Tauri (`npm run tauri dev`)

---

## Pattern Routing (PRP #1)

```typescript
// src/routes.ts - Route tree manuelle (code-based, pas file-based)
const rootRoute = createRootRoute({ component: AppLayout });
const dashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: DashboardPage });
// ... autres routes
const routeTree = rootRoute.addChildren([dashboardRoute, ...]);
export const router = createRouter({ routeTree });

// Declaration de type pour TanStack Router
declare module "@tanstack/react-router" {
  interface Register { router: typeof router; }
}
```

**Regles :**
- Route tree manuelle dans `src/routes.ts`
- AppLayout est le composant de la route racine
- Pages rendues via `<Outlet />` dans AppLayout
- Pas de file-based routing (overhead inutile pour 4 pages)

---

## Import Aliases

```typescript
// tsconfig.json paths
"@/*" → "src/*"

// Exemples d'imports
import { CdvSession } from "@/types/cdv.types";
import { fetchCvEncours } from "@/services/fabric.service";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { useCdvStore } from "@/stores/cdv.store";
```

---

## Pattern PDF Worker (PRP #2)

```typescript
// src/lib/pdf-worker.ts - Initialiser UNE SEULE FOIS avant tout composant react-pdf
import { pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// Import en tete de page (avant les composants react-pdf)
// src/pages/ImportPage.tsx
import "@/lib/pdf-worker";
```

**Regles :**
- Le worker doit etre configure avant tout rendu de `<Document>` ou `<Page>`
- Utiliser `new URL(..., import.meta.url)` pour la resolution Vite
- Les CSS react-pdf s'importent depuis `react-pdf/dist/Page/AnnotationLayer.css` et `TextLayer.css`

---

## Pattern Tauri File Operations (PRP #2)

```typescript
// Lecture/ecriture fichiers via @tauri-apps/plugin-fs
import { readFile, writeFile, mkdir, exists } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";

// readFile retourne Uint8Array, writeFile prend Uint8Array
const bytes = await readFile(filePath);
await writeFile(destPath, bytes);

// Creer un dossier
const dir = await join(await appDataDir(), "documents");
if (!(await exists(dir))) await mkdir(dir, { recursive: true });
```

**Regles :**
- Utiliser le plugin fs Tauri (pas fetch, pas invoke custom)
- Les chemins doivent etre dans le scope des capabilities (APPDATA, DOCUMENT, HOME)
- `readFile` retourne `Uint8Array` (compatible pdf-lib et react-pdf)

---

## Pattern Tauri Drag & Drop (PRP #2)

```typescript
import { listen } from "@tauri-apps/api/event";

// Dans un useEffect
const unDrop = await listen<{ paths: string[] }>("tauri://drag-drop", (event) => {
  const pdfPaths = event.payload.paths.filter(p => p.toLowerCase().endsWith(".pdf"));
  // traiter les fichiers
});

// Aussi disponible : "tauri://drag-enter", "tauri://drag-leave"
```

**Regles :**
- Toujours fournir un bouton "parcourir" (dialog) comme fallback
- Filtrer par extension cote client
- Nettoyer les listeners dans le return du useEffect

---

## Pattern Database CRUD (PRP #2)

```typescript
// database.select<T>() retourne Promise<T> - passer T comme tableau
const rows = await database.select<Record<string, unknown>[]>(
  "SELECT * FROM table WHERE id = $1", [id],
);

// Mapper snake_case DB → camelCase TS via une fonction dediee
function mapRowToEntity(row: Record<string, unknown>): Entity {
  return {
    id: row["id"] as string,
    myField: row["my_field"] as string,
    isActive: (row["is_active"] as number) === 1, // INTEGER → boolean
  };
}
```

**Regles :**
- `database.select<T>` : T est le type complet du retour (inclure `[]`)
- `database.execute` pour INSERT/UPDATE/DELETE
- Mapper chaque row explicitement (pas de cast direct du tableau)
- `fabric_matched` et autres booleans stockes comme INTEGER (0/1) en SQLite

---

## Pattern PDF Split par Separateurs (PRP #2)

```typescript
// Store : splitPoints = numeros de pages apres lesquelles couper
// Ex: [2, 5] sur un PDF de 8 pages => 3 documents : pages 1-2, 3-5, 6-8
splitPoints: number[]
toggleSplitPoint: (afterPage: number) => void  // ajoute ou retire un point de coupe

// Service : splitPdfBySegments genere N fichiers PDF
const segments = await splitPdfBySegments(sourcePath, splitPoints, totalPages);
// Retourne { fileName, filePath, pageCount }[]
```

**Regles :**
- L'utilisateur clique entre deux miniatures pour poser un separateur
- Pas de selection de pages individuelles (pattern pdfgear)
- Le split genere autant de documents que de segments
- `onSplitComplete` recoit un tableau de `ImportedDocument[]`

---

## Pattern ScrollArea Fix (PRP #2)

```typescript
// shadcn ScrollArea ne se contraint pas dans un flex container
// Utiliser un div natif avec min-h-0 et overflow-auto a la place
<div className="min-h-0 flex-1 overflow-y-auto">
  {/* contenu scrollable */}
</div>

// Pour les Dialog plein ecran, overrider sm:max-w-lg de DialogContent
<DialogContent className="... w-[calc(100vw-2rem)] max-w-none sm:max-w-none">
```

**Regles :**
- `min-h-0` est necessaire pour que `flex-1` respecte la hauteur du conteneur
- Eviter `ScrollArea` de shadcn dans les layouts flex complexes
- `sm:max-w-none` requis pour overrider le `sm:max-w-lg` par defaut de DialogContent

---

## Pattern n8n Webhook Service (PRP #9)

```typescript
// src/services/n8n.service.ts
import { N8nOcrResponseSchema, type N8nOcrRequest } from "@/types/n8n.types";

// Envoie les 2 PDFs (CDV + Fiche de lot) en une seule requete POST
// Timeout 5 minutes via AbortController (OCR peut etre lent)
export async function sendDossierForOcr(
  webhookUrl: string,
  sessionId: string,
  cdvBytes: Uint8Array,
  ficheBytes: Uint8Array,
  produit: string,
): Promise<N8nOcrResponse> {
  const payload: N8nOcrRequest = {
    sessionId, produit,
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
    // ... parse response, validate with N8nOcrResponseSchema
  } finally { clearTimeout(timer); }
}

// Test connexion: GET au webhook, status < 500 = OK
export async function testN8nConnection(webhookUrl: string): Promise<boolean>
```

**Regles :**
- POST JSON avec PDFs en base64 + prompts complets (pas de multipart)
- Timeout 5 minutes via `AbortController` (pas de timeout natif sur fetch)
- Validation Zod via `N8nOcrResponseSchema` qui compose `OcrCdvSchema` + `OcrFicheLotSchema`
- `extractJsonFromText()` en fallback si n8n wraps en code fences
- Prompts inclus dans le payload (modifiables cote app sans toucher au workflow n8n)
- Codes d'erreur : `N8N_NO_URL`, `N8N_TIMEOUT`, `N8N_HTTP_ERROR`, `N8N_PARSE_FAILED`

---

## Pattern OCR Orchestrator (PRP #3, updated PRP #9)

```typescript
// src/services/ocr.orchestrator.ts
// Orchestre : lecture 2 PDFs -> appel n8n unique -> sauvegarde DB -> update store

export async function processDossierOcr(sessionId: string): Promise<void> {
  const webhookUrl = useSettingsStore.getState().settings.n8nWebhookUrl;
  // Read both PDFs, single call to sendDossierForOcr()
  // Save CDV results via updateCdvSession()
  // Save Fiche results via saveLignesVente()
}

export async function processQueue(): Promise<void> {
  // Sequential processing, pause/cancel, delay 500ms between dossiers
}
```

**Regles :**
- Logique d'orchestration dans un service, pas dans les composants
- Acces au store via `.getState()` (pas de hook, appele hors React)
- Un seul appel n8n par dossier (2 PDFs ensemble, pas 2 appels separes)
- Pas de delay entre CDV et Fiche (un seul appel), delay 500ms entre dossiers
- Statut CDV mis a jour : brouillon → ocr_en_cours → a_corriger

---

## Pattern Zod Validation External Data (PRP #3)

```typescript
// src/types/ocr.types.ts
import { z } from "zod";

// Schemas en snake_case (format JSON n8n/OCR)
export const OcrCdvSchema = z.object({
  camion: z.string().min(1),
  date_arrivee: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  frais_transit: z.number().min(0),
});
export type OcrCdvResult = z.infer<typeof OcrCdvSchema>;

// Usage: validation stricte avant sauvegarde
const parsed = OcrCdvSchema.parse(JSON.parse(jsonStr));
```

**Regles :**
- Schemas Zod en `snake_case` pour les donnees externes (API, OCR)
- Mapping vers `camelCase` au moment de la sauvegarde DB
- `z.infer<typeof Schema>` pour inferer les types
- Validation avec `.parse()` (pas `.safeParse()`) - l'erreur est catchee au niveau service

---

## Pattern Database Dynamic Update (PRP #3)

```typescript
// Construction dynamique de SET clauses pour update partiel
export async function updateCdvSessionOcr(
  id: string,
  data: UpdateCdvSessionOcrData,
): Promise<void> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [key, column] of Object.entries(FIELD_MAP)) {
    const value = data[key];
    if (value !== undefined) {
      setClauses.push(`${column} = $${String(paramIndex)}`);
      values.push(value);
      paramIndex++;
    }
  }
  // ... execute UPDATE with dynamic SET
}
```

**Regles :**
- Parametres `$N` numerotes dynamiquement (SQLite via tauri-plugin-sql)
- `updated_at = datetime('now')` toujours ajoute
- `saveLignesVente` fait un DELETE + INSERT (idempotent)

---

## Pattern Dossier & Queue (PRP #4)

### Concept Dossier
Un dossier = 1 `CdvSession` en base, associant 1 PDF CDV + 1 PDF Fiche de lot + produit + client.

```typescript
// Creation de dossier via database.service.ts
await createDossier({
  id: uuidv4(),
  produit: "Mangues",
  client: "Client A",
  pdfCdvPath: cdvDoc.filePath,
  pdfFicheLotPath: ficheDoc.filePath,
});

// Assigner les documents au dossier dans le store
setDocumentCdvSessionId(cdvDoc.id, sessionId);
setDocumentCdvSessionId(ficheDoc.id, sessionId);
```

### Pool de documents (filtrage)
```typescript
// Store getter pour obtenir les documents non assignes
getAvailableDocuments: (type?) => {
  const { documents } = get();
  return documents.filter(
    (d) => d.cdvSessionId === null && (type ? d.type === type : true),
  );
},
```

**Regles :**
- Les documents assignes a un dossier (`cdvSessionId !== null`) disparaissent du pool
- La suppression d'un dossier remet `cdvSessionId = null` sur les documents via `clearDocumentCdvSessionId`

---

### Pattern Queue Store (PRP #4)

```typescript
// src/stores/queue.store.ts - Etat temporaire en memoire (pas en base)
interface QueueState {
  items: QueueItem[];
  isProcessing: boolean;
  isPaused: boolean;
  shouldStop: boolean;
  processedCount: number;
  totalCount: number;
}
```

**Regles :**
- La file est un etat temporaire (pas en base SQLite)
- Traitement strictement sequentiel (pas de parallelisme, rate limiting Gemini)
- `shouldStop` flag verifie entre chaque dossier (pas de coupure mid-API)
- `isPaused` verifie dans une boucle d'attente (200ms polling)

---

### Pattern OCR Queue Processing (PRP #4)

```typescript
// src/services/ocr.orchestrator.ts
export async function processQueue(): Promise<void> {
  startProcessing();
  for (const item of pendingItems) {
    if (shouldStop) break;
    while (isPaused) await delay(200);
    await processDossierOcr(item.dossierSessionId); // CDV → Fiche lot
    incrementProcessed();
  }
}
```

**Regles :**
- `processDossierOcr` enchaine OCR CDV puis OCR Fiche lot pour un meme dossier
- Delai 500ms entre chaque appel API Gemini
- Statut mis a jour en temps reel via `updateItemStatus` dans le queue store
- Les erreurs sont catchees par dossier (un echec ne bloque pas les suivants)

---

## Pattern Editor Store (PRP #5)

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
  saveError: string | null;
  activePdfTab: "cdv" | "fiche_lot";
}
```

**Regles :**
- `isDirty` flag active a chaque modification (updateSessionField, updateLigne, addLigne, removeLigne)
- Auto-save debounce 1s dans EditorPage via `useEffect` + `setTimeout`
- `save()` persiste session + lignes via `updateCdvSession` + `saveLignesVenteWithIds`
- `validate()` sauvegarde puis change le statut en "valide"
- `reset()` nettoie l'etat au unmount de la page

---

## Pattern Generic Database Update (PRP #5)

```typescript
// Remplacement de updateCdvSessionOcr par updateCdvSession generique
// Supporte tous les champs de CdvSession (pas seulement les champs OCR)
export async function updateCdvSession(
  id: string,
  data: UpdateCdvSessionData, // produit, camion, frais, dates, etc.
): Promise<void>

// Sauvegarde avec IDs preserves (editor needs stable IDs for inline editing)
export async function saveLignesVenteWithIds(
  cdvSessionId: string,
  lignes: LigneVente[], // includes id field
): Promise<void>
```

**Regles :**
- `updateCdvSession` remplace `updateCdvSessionOcr` (deprecated, kept for backward compat)
- `saveLignesVenteWithIds` preserve les IDs des lignes (contrairement a `saveLignesVente` qui regenere des UUIDs)

---

## Pattern React Hook Form + Zod (PRP #5)

```typescript
// src/components/editor/InformationsForm.tsx
const InformationsFormSchema = z.object({
  produit: z.string().min(1, "Le produit est requis"),
  camion: z.string().min(1, "Le camion est requis"),
  // ...
});

const form = useForm<InformationsFormValues>({
  resolver: zodResolver(InformationsFormSchema),
  defaultValues: { ... },
});

// Notify parent on blur (not on each keystroke)
function handleFieldBlur(field: keyof InformationsFormValues) {
  const value = form.getValues(field);
  onFieldChange({ [field]: value });
}
```

**Regles :**
- `zodResolver` de `@hookform/resolvers/zod`
- NE PAS utiliser `z.coerce.number()` avec React Hook Form (type incompatible) - utiliser `z.number()` et parser manuellement via `parseFloat` dans onChange
- Reset form uniquement quand `session.id` change (pas sur chaque field change)
- `eslint-disable react-hooks/exhaustive-deps` en block (`/* */`) car `eslint-disable-next-line` ne couvre pas le dep array

---

## Pattern TanStack Table Inline Edit (PRP #5)

```typescript
// Editable cell: click to edit, blur to commit
function EditableCell({ value, rowId, columnId, type, editingCell, onStartEdit, onCommit }) {
  const isEditing = editingCell?.rowId === rowId && editingCell.columnId === columnId;
  if (!isEditing) {
    return <div onClick={() => onStartEdit({ rowId, columnId })}>{value}</div>;
  }
  return <Input defaultValue={value} autoFocus onBlur={(e) => onCommit(rowId, columnId, e.target.value)} />;
}
```

**Regles :**
- TanStack Table ne fournit pas d'editing inline natif
- Un seul `editingCell` state (rowId + columnId) pour tracker quelle cellule est en edition
- `defaultValue` (pas `value`) pour eviter le controlled input lag
- Commit sur `onBlur` et `Enter`, cancel sur `Escape`
- Totals row dans `<tfoot>` calculee via `useMemo`

---

## Pattern PDF Side Panel (PRP #5)

```typescript
// PdfSidePanel: reutilise react-pdf dans un panel (pas un dialog)
// - Tabs CDV / Fiche lot
// - Chaque tab a son propre PdfPanelViewer (page/zoom state local)
// - Memoize file prop avec useMemo pour eviter les reloads

function PdfPanelViewer({ filePath }: { filePath: string }) {
  // Local state for page/zoom (not in store)
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  // Load bytes, memoize file data...
}
```

**Regles :**
- Import `@/lib/pdf-worker` en haut du fichier (avant les composants react-pdf)
- Etat page/zoom local au viewer (pas dans le store global)
- `onLoadSuccess` pour obtenir le nombre de pages

---

## Pattern ResizablePanelGroup (PRP #5)

```typescript
// react-resizable-panels v4: le prop est `orientation` (pas `direction`)
<ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
  <ResizablePanel defaultSize={55} minSize={35}>...</ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel defaultSize={45} minSize={25}>...</ResizablePanel>
</ResizablePanelGroup>
```

**Regles :**
- `orientation="horizontal"` (PAS `direction`) dans react-resizable-panels v4
- `min-h-0 flex-1` sur le group pour contraindre dans un flex container
- `withHandle` sur ResizableHandle pour le grip visuel

---

## Pattern Parameterized Route (PRP #5)

```typescript
// src/routes.ts
export const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/editor/$sessionId",
  component: EditorPage,
});

// EditorPage.tsx - access param
const { sessionId } = editorRoute.useParams();

// Navigation depuis ImportPage
void navigate({ to: "/editor/$sessionId", params: { sessionId } });
```

**Regles :**
- Export la route pour `useParams()` dans le composant page
- `$sessionId` dans le path pour TanStack Router parametrique
- Navigation avec `params` object

---

## Pattern Fabric Service (PRP #6)

```typescript
// src/services/fabric.service.ts
import { PublicClientApplication } from "@azure/msal-browser";
import { addDays, subDays, format } from "date-fns";

// MSAL singleton + token caching
let msalInstance: PublicClientApplication | null = null;
let cachedToken: string | null = null;

// Auth via popup (pas redirect - Tauri WebView2)
const result = await pca.acquireTokenPopup({
  scopes: ["https://analysis.windows.net/powerbi/api/.default"],
});

// REST API Fabric - SQL query en body JSON
const response = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});

// Matching: camion + date ±3 jours + client
const dateFrom = format(subDays(dateBase, 3), "yyyy-MM-dd");
const dateTo = format(addDays(dateBase, 3), "yyyy-MM-dd");
```

**Regles :**
- MSAL `PublicClientApplication` avec popup (pas redirect) car Tauri WebView2
- Token cache en memoire avec expiry check (60s buffer)
- `acquireTokenSilent` d'abord, fallback sur popup
- Requetes SQL avec parametres echappes (single quotes doublees)
- Timeout 15s sur les requetes Fabric
- Validation Zod sur les reponses Fabric
- Cache client list en memoire (`getCachedClients`/`setCachedClients`)

---

## Pattern Fabric Enrichment UI (PRP #6)

```typescript
// Editor store: Fabric state
interface EditorState {
  fabricLoading: boolean;
  fabricError: string | null;
  fabricDeclarations: FabricCvEncours[];
  showFabricSelector: boolean;
  enrichFromFabric: () => Promise<void>;
  applyFabricDeclaration: (declaration: FabricCvEncours) => void;
}

// enrichFromFabric: 1 result → auto-apply, N results → show selector
// mapFabricToCdvSession: Fabric row → Partial<CdvSession>
// fabricMatched: boolean flag persisted in SQLite as INTEGER (0/1)
```

**Regles :**
- `enrichFromFabric()` verifie camion + dateArrivee + client avant de lancer
- 1 resultat → application automatique, N resultats → dialog `FabricSelector`
- `fabricMatched: true` indique que les donnees Fabric ont ete appliquees
- `FabricEnrichment` component affiche les champs avec badge "Fabric"
- `FabricSelector` dialog pour selection multi-resultats avec table clickable
- Les donnees Fabric enrichissent via `updateSessionField` → isDirty → auto-save

---

## Pattern Combobox Client (PRP #6)

```typescript
// Combobox = Popover + Command (cmdk) de shadcn
// Fallback sur Input texte si Fabric non disponible
{fabricAvailable && fabricClients.length > 0 ? (
  <Popover open={clientListOpen} onOpenChange={setClientListOpen}>
    <PopoverTrigger asChild>
      <Button variant="outline" role="combobox">{client || "Selectionner..."}</Button>
    </PopoverTrigger>
    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
      <Command>
        <CommandInput placeholder="Rechercher..." />
        <CommandList>
          <CommandEmpty>Aucun client trouve.</CommandEmpty>
          <CommandGroup>
            {fabricClients.map((c) => (
              <CommandItem key={c} value={c} onSelect={...}>{c}</CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
) : (
  <Input value={client} onChange={...} />
)}
```

**Regles :**
- `w-[--radix-popover-trigger-width]` pour matcher la largeur du trigger
- Client list chargee au mount du dialog, cachee en memoire
- Fallback transparent sur input libre si Fabric non configure ou erreur

---

## Pattern Database Boolean (PRP #6)

```typescript
// Booleans stockes comme INTEGER (0/1) en SQLite
// Conversion automatique dans updateCdvSession:
values.push(typeof value === "boolean" ? (value ? 1 : 0) : value);

// Lecture: conversion dans mapRowToCdvSession
fabricMatched: (row["fabric_matched"] as number) === 1,
```

**Regles :**
- SQLite n'a pas de type BOOLEAN natif, utiliser INTEGER
- Conversion TS boolean → SQLite integer dans la fonction d'update generique
- Conversion SQLite integer → TS boolean dans le mapper

---

## Pattern Calculation Engine (PRP #7)

```typescript
// src/services/calculation.engine.ts - Fonctions pures, pas d'effets de bord
import type { CdvSession, LigneVente } from "@/types/cdv.types";
import type { CalculationResult } from "@/types/calculation.types";

// Arrondi 2 decimales pour les montants
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

// Arrondi 1 decimale pour les poids
function roundWeight(value: number): number {
  return Math.round(value * 10) / 10;
}

// Pick<> pour decoupler du type CdvSession complet
export function calculateCdv(
  session: Pick<CdvSession, "fraisTransit" | "fraisCommission" | ...>,
  lignes: LigneVente[],
): CalculationResult { ... }
```

**Regles :**
- Fonctions pures sans effets de bord (pas d'acces store, pas d'API)
- `roundMoney` (2 decimales) pour tous les montants EUR
- `roundWeight` (1 decimale) pour tous les poids kg
- `Pick<CdvSession, ...>` pour limiter le couplage
- `useMemo` dans EditorPage pour recalcul automatique

---

## Pattern Excel Generation (PRP #7)

```typescript
// src/services/excel-generator.service.ts
import ExcelJS from "exceljs";
import JSZip from "jszip";
import templateUrl from "@/assets/TEMPLATE_CV.xlsx?url";

// Template charge via fetch (Vite asset URL)
const response = await fetch(templateUrl);
const buffer = await response.arrayBuffer();
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(buffer);

// Forcer recalcul des formules a l'ouverture
workbook.calcProperties.fullCalcOnLoad = true;

// Ecriture directe dans les cellules (pas via table API)
const ws = workbook.getWorksheet("INFORMATIONS");
const dataRow = ws.getRow(2);
dataRow.getCell(1).value = session.produit;
dataRow.commit();
```

**Regles :**
- Template `.xlsx` dans `src/assets/` (pas `public/`), importe via `?url`
- Declarer `*.xlsx?url` dans `src/vite-env.d.ts`
- Ecriture par position de cellule (plus fiable que l'API table ExcelJS)
- `fullCalcOnLoad = true` pour les formules
- ExcelJS ne recalcule PAS les formules — elles se recalculent a l'ouverture dans Excel Desktop
- `writeBuffer()` retourne un Buffer, caster en `Uint8Array`
- Helper columns (H, I) dans LIGNE DE VENTE pour les formules INDEX/MATCH

---

## Pattern Tauri Save Dialog (PRP #7)

```typescript
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

const filePath = await save({
  defaultPath: "fichier.xlsx",
  filters: [{ name: "Excel", extensions: ["xlsx"] }],
});
if (!filePath) return null; // Annule par l'utilisateur
await writeFile(filePath, data); // data: Uint8Array
```

**Regles :**
- Capability `dialog:allow-save` requise dans `default.json`
- `fs:allow-write-file` doit inclure `$DOCUMENT/**` et `$DOWNLOAD/**` pour sauvegarder hors APPDATA
- `save()` retourne `string | null` (null = annule)
- Toujours verifier le retour avant d'ecrire
