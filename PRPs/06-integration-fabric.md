# PRP #6: Integration Fabric & Enrichissement

> **Status:** A FAIRE | Date: 2026-02-13
> **Prerequis:** PRP #1 (Foundation), PRP #4 (Dossiers & Pipeline), PRP #5 (Editeur)

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
Connecter l'application au Fabric Warehouse via le SQL endpoint (REST API ou TDS). Implementer deux fonctionnalites cles :
1. **Liste des clients** depuis CVENCOURS, pour alimenter un dropdown dans la creation de dossier (PRP #4)
2. **Matching automatique** (camion + date +-3 jours + client) pour enrichir les dossiers avec les donnees declaratives (frais UE/INT, poids declare, prix declare, date BAE, dossier, fournisseur, n° declaration)

Le matching peut etre declenche manuellement depuis l'editeur (bouton "Enrichir") OU automatiquement dans la file d'attente OCR du PRP #4 (apres l'OCR, avant de marquer le dossier comme termine).

**Etat final desire:**
- La connexion Fabric fonctionne avec authentication Entra ID ou connexion string
- La liste des clients est recuperable depuis CVENCOURS
- Le matching retourne les declarations correspondantes
- Les champs Fabric sont automatiquement remplis dans le dossier
- En cas de multi-resultats, l'utilisateur peut choisir
- Un bouton "Enrichir" dans l'editeur permet de relancer le matching
- Les erreurs de connexion sont gerees proprement

---

## Why

**Valeur business et impact utilisateur:**
Les donnees Fabric contiennent les informations declaratives officielles (frais douaniers, poids declares, numeros de declaration). Sans ces donnees, le document de calcul est incomplet. Dans le workflow N8N :
1. La liste des clients alimente le dropdown du formulaire
2. Apres l'OCR, le matching retrouve automatiquement la declaration correspondante
3. Les frais UE/INT, poids et prix declares sont injectes dans le document

L'app reproduit ce comportement en ajoutant la possibilite de corriger manuellement et de gerer les cas multi-resultats.

**Integration avec l'existant:**
- Le dropdown client enrichit la creation de dossier (PRP #4)
- Le matching enrichit les champs de l'editeur (PRP #5)
- Peut s'integrer dans la file OCR (PRP #4) comme etape supplementaire
- Les donnees CV_CLOTURE alimentent le dashboard (PRP #8)

---

## What

### Comportement Visible

**Dans la creation de dossier (PRP #4) :**
```
Client *      [Client A                     ▾]   ← dropdown Fabric
              │ Client A                       │
              │ Client B                       │
              │ Client C                       │
              └────────────────────────────────┘
```

**Dans l'editeur (PRP #5) :**
```
┌─────────────────────────────────────────────────────┐
│  --- Enrichissement Fabric ---       [🔄 Enrichir]  │
│                                                     │
│  Statut: ● Connecte                                 │
│  Matching: Camion AB123CD + Date ±3j + Client A     │
│  Resultat: 1 declaration trouvee ✓                  │
│                                                     │
│  Dossier:      2026-0042-GR    [Fabric ✓]           │
│  Fournisseur:  Fournisseur XYZ [Fabric ✓]           │
│  N° Declaration: 2026-000156   [Fabric ✓]           │
│  Frais UE:     300.00 EUR      [Fabric ✓]           │
│  Frais INT:    200.00 EUR      [Fabric ✓]           │
│  Poids declare: 8000.0 kg      [Fabric ✓]           │
│  Prix declare: 2.60 EUR/kg     [Fabric ✓]           │
│  Date BAE:     2026-01-12      [Fabric ✓]           │
└─────────────────────────────────────────────────────┘
```

**En cas de multi-resultats :**
```
┌─────────────────────────────────────────────────────┐
│  Declarations correspondantes (3 trouvees)          │
│                                                     │
│  ┌──────────┬────────────┬──────────┬─────────┐     │
│  │ Dossier  │ Client     │ Date BAE │ Poids   │     │
│  ├──────────┼────────────┼──────────┼─────────┤     │
│  │ 2026-042 │ Client A   │ 12/01    │ 8000 kg │ [✓] │
│  │ 2026-043 │ Client A   │ 14/01    │ 5000 kg │ [ ] │
│  │ 2026-044 │ Client B   │ 13/01    │ 3000 kg │ [ ] │
│  └──────────┴────────────┴──────────┴─────────┘     │
│                                                     │
│  [Appliquer la selection]                            │
└─────────────────────────────────────────────────────┘
```

### Requirements Techniques

1. **Approche REST API Fabric** (prioritaire) : Utiliser l'API REST Fabric depuis le frontend WebView2. Plus simple que TDS dans le navigateur
2. **Alternative** : Si REST ne marche pas, utiliser `tedious` via une commande Tauri Rust (sidecar)
3. **Auth Entra ID** : MSAL.js avec `@azure/msal-browser`. Scope : `https://analysis.windows.net/powerbi/api/.default`
4. **Requete CVENCOURS** :
   ```sql
   SELECT DISTINCT EXPIMPNOM AS Client FROM [dbo].[CVENCOURS] ORDER BY EXPIMPNOM
   ```
5. **Requete matching** :
   ```sql
   SELECT FRAISUEP, FRAISINTP, PDSN_30, VALEUR_COMPTE_VENTE_30,
          DATEHEUREBAE, REFINTERNE, EXPIMPNOM, CLIFOUNOM, ORDRE, TPFRTIDENT
   FROM [dbo].[CVENCOURS]
   WHERE TPFRTIDENT LIKE '%{camion}%'
     AND DATEHEUREBAE BETWEEN '{date - 3j}' AND '{date + 3j}'
     AND EXPIMPNOM = '{client}'
   ```
6. **Mapping** : Fonctions de mapping Fabric → TypeScript (voir table ci-dessous)
7. **Cache** : Cache local (en memoire ou SQLite) pour la liste des clients (rafraichie manuellement)

### Champs Fabric et leur Mapping

| Champ Fabric | Champ CdvSession | Description |
|--------------|------------------|-------------|
| `FRAISUEP` | `fraisUe` | Frais Union Europeenne |
| `FRAISINTP` | `fraisInt` | Frais internationaux |
| `PDSN_30` | `poidsDeclare` | Poids net declare (kg) |
| `VALEUR_COMPTE_VENTE_30` | `prixDeclareKilo` | Valeur declaree par kg |
| `DATEHEUREBAE` | `dateBae` | Date bon a enlever |
| `REFINTERNE` | `dossier` | Reference interne dossier |
| `EXPIMPNOM` | `client` | Nom importateur (matching) |
| `CLIFOUNOM` | `fournisseur` | Nom fournisseur |
| `ORDRE` | `numDeclaration` | Numero de declaration |
| `TPFRTIDENT` | (matching) | Identifiant vehicule (matching) |

---

## Success Criteria

- [ ] La connexion Fabric fonctionne (testable depuis Settings)
- [ ] La liste des clients est recuperable depuis CVENCOURS
- [ ] Le dropdown client fonctionne dans la creation de dossier
- [ ] Le matching retourne des resultats pour un camion + date + client connus
- [ ] Les champs Fabric sont remplis dans le dossier apres matching
- [ ] En cas de multi-resultats, un selecteur est affiche
- [ ] Le bouton "Enrichir" dans l'editeur relance le matching
- [ ] Les erreurs de connexion/auth sont gerees proprement
- [ ] La connexion Fabric est testable depuis la page Settings
- [ ] Tests unitaires sur le mapping et la construction des requetes
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` + `npm run test`

---

## All Needed Context

### Documentation & References

| Resource | URL/Chemin | Pourquoi |
|----------|------------|----------|
| Fabric SQL Endpoint | https://learn.microsoft.com/en-us/fabric/data-warehouse/connectivity | Connexion |
| Fabric REST API | https://learn.microsoft.com/en-us/rest/api/fabric/ | API alternative |
| MSAL.js Browser | https://github.com/AzureAD/microsoft-authentication-library-for-js | Auth Entra |
| Workflow N8N | `docs/AutomatisationN8N.json` | Requetes originales (lignes 793-946) |
| Settings Store | `src/stores/settings.store.ts` | Params Fabric configures |
| Patterns | `agent_docs/code_patterns.md` | Patterns du projet |

### Arborescence Cible

```
src/
├── services/
│   ├── fabric.service.ts           # CREER : connexion + requetes Fabric
│   ├── fabric.service.test.ts      # CREER : tests mapping + requetes
│   └── database.service.ts         # MODIFIER : cache clients Fabric
├── types/
│   └── fabric.types.ts             # CREER : types Fabric + schemas Zod
├── components/
│   └── editor/
│       ├── FabricEnrichment.tsx     # CREER : panneau enrichissement Fabric
│       └── FabricSelector.tsx       # CREER : selecteur multi-resultats
├── pages/
│   └── EditorPage.tsx              # MODIFIER : integrer FabricEnrichment
├── stores/
│   └── editor.store.ts             # MODIFIER : ajouter etat Fabric
└── components/
    └── dossier/
        └── DossierCreateDialog.tsx  # MODIFIER : dropdown client depuis Fabric
```

### Known Gotchas & Library Quirks

1. **REST API Fabric dans WebView2** : L'API REST Fabric fonctionne en fetch() standard. Le token Entra ID doit etre obtenu via MSAL puis passe en header `Authorization: Bearer {token}`.
2. **MSAL dans Tauri** : `@azure/msal-browser` fonctionne dans WebView2. Utiliser `PublicClientApplication` avec popup (pas redirect, car le redirect ne fonctionne pas bien dans Tauri).
3. **Requetes parametrees** : Pour la REST API, les requetes SQL sont envoyees en body JSON. Toujours echapper les parametres pour eviter l'injection SQL. Utiliser des requetes parametrees cote serveur.
4. **Dates Fabric** : Les dates sont en format ISO datetime. Utiliser `date-fns` pour le calcul ±3 jours.
5. **Valeurs nulles** : De nombreux champs Fabric peuvent etre null. Le mapping doit gerer les nulls (defaulter a 0 pour les nombres, '' pour les strings).
6. **Timeout** : Les requetes Fabric peuvent etre lentes (5-10s). Afficher un loader et gerer les timeouts.

---

## Implementation Blueprint

### Data Models

```typescript
// src/types/fabric.types.ts
import { z } from "zod";

export const FabricCvEncoursSchema = z.object({
  FRAISUEP: z.number().nullable(),
  FRAISINTP: z.number().nullable(),
  PDSN_30: z.number().nullable(),
  VALEUR_COMPTE_VENTE_30: z.number().nullable(),
  DATEHEUREBAE: z.string().nullable(),
  REFINTERNE: z.string().nullable(),
  EXPIMPNOM: z.string().nullable(),
  CLIFOUNOM: z.string().nullable(),
  ORDRE: z.string().nullable(),
  TPFRTIDENT: z.string().nullable(),
});
export type FabricCvEncours = z.infer<typeof FabricCvEncoursSchema>;

export interface FabricMatchResult {
  declarations: FabricCvEncours[];
  matchCount: number;
}

export function mapFabricToCdvSession(fabric: FabricCvEncours): Partial<CdvSession> {
  return {
    fraisUe: fabric.FRAISUEP ?? 0,
    fraisInt: fabric.FRAISINTP ?? 0,
    poidsDeclare: fabric.PDSN_30 ?? 0,
    prixDeclareKilo: fabric.VALEUR_COMPTE_VENTE_30 ?? 0,
    dateBae: fabric.DATEHEUREBAE?.split("T")[0] ?? "",
    dossier: fabric.REFINTERNE ?? "",
    client: fabric.EXPIMPNOM ?? "",
    fournisseur: fabric.CLIFOUNOM ?? "",
    numDeclaration: fabric.ORDRE ?? "",
    fabricMatched: true,
  };
}
```

### Liste des Taches (dans l'ordre)

#### Phase 1 : Service Fabric

1. **Creer `src/types/fabric.types.ts`**
   - Schema Zod pour les donnees CVENCOURS
   - Fonction de mapping `mapFabricToCdvSession`
   - Interface `FabricMatchResult`

2. **Creer `src/services/fabric.service.ts`**
   - `authenticateFabric()` : obtenir un token via MSAL
   - `testConnection()` : verifier la connexion
   - `getClientList()` : requete DISTINCT EXPIMPNOM
   - `matchDeclaration(camion, dateArrivee, client)` : requete avec filtre ±3j
   - Construction des requetes SQL (parametrees)
   - Gestion du token, refresh automatique

3. **Creer `src/services/fabric.service.test.ts`**
   - Tests du mapping (valeurs normales, nulls, edge cases)
   - Tests de la construction des requetes SQL
   - Tests du calcul de dates ±3 jours

4. **Validation intermediaire**
   ```bash
   npm run typecheck && npm run lint && npm run test
   ```

#### Phase 2 : UI Enrichissement

5. **Creer `src/components/editor/FabricEnrichment.tsx`**
   - Bouton "Enrichir depuis Fabric"
   - Indicateur de connexion
   - Affichage des resultats (champs enrichis avec badge "Fabric")
   - Gestion de l'etat (loading, success, error, multi-results)

6. **Creer `src/components/editor/FabricSelector.tsx`**
   - Dialog avec tableau des declarations trouvees
   - L'utilisateur selectionne la bonne declaration
   - Bouton "Appliquer"

7. **Integrer dans l'editeur**
   - Modifier `src/pages/EditorPage.tsx` : ajouter FabricEnrichment
   - Modifier `src/stores/editor.store.ts` : action `enrichFromFabric`

#### Phase 3 : Dropdown clients

8. **Modifier `src/components/dossier/DossierCreateDialog.tsx`**
   - Remplacer l'input Client par un Combobox/Select peuple depuis Fabric
   - Fallback sur input libre si Fabric non connecte
   - Cache local de la liste clients

9. **Modifier la page Settings**
   - Ajouter bouton "Tester la connexion Fabric"
   - Feedback visuel (connecte / erreur / non configure)

10. **Validation finale**
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
- [ ] La connexion Fabric fonctionne depuis Settings
- [ ] Le dropdown client affiche les clients CVENCOURS
- [ ] Le matching retourne des resultats pour un camion + date + client connus
- [ ] Les champs Fabric sont remplis dans l'editeur apres enrichissement
- [ ] Le multi-resultats affiche le selecteur
- [ ] Les erreurs de connexion sont gerees proprement
- [ ] Sans connexion Fabric, l'app reste fonctionnelle (input libre pour client)

### Level 3: Integration

- [ ] Les champs Fabric sont marques visuellement (badge/icone)
- [ ] Les donnees enrichies sont sauvegardees en base
- [ ] Le dropdown client fonctionne dans la creation de dossier
- [ ] Le bouton "Enrichir" relance le matching dans l'editeur

---

## Anti-Patterns to Avoid

- Ne pas stocker le token Entra ID en clair dans les settings (utiliser le secure store)
- Ne pas concatener des strings dans les requetes SQL (parametrer)
- Ne pas requeter Fabric a chaque keystroke (uniquement sur action utilisateur)
- Ne pas ignorer les valeurs nulles (mapper vers des defaults)
- Ne pas bloquer l'app si Fabric est indisponible (mode degrade)

---

## Evolutions Futures (Hors Scope)

- Ecriture dans Fabric (UPDATE pour marquer un CDV comme cloture)
- Enrichissement automatique dans la file OCR (etape supplementaire apres OCR)
- Synchronisation bidirectionnelle Fabric <-> app
- Cache avance avec invalidation automatique
- Matching flou (distance de Levenshtein sur les noms de camion)

---

## Score de Confiance

**Score: 7/10**

**Points forts:**
- Les vues Fabric sont deja pretes (CVENCOURS, CV_CLOTURE)
- La logique de matching est connue et documentee (extraite du N8N)
- Le mapping est simple (10 champs)

**Risques:**
- Auth Entra ID dans WebView2/Tauri peut etre complexe
- Firewall Azure Virtual Desktop peut bloquer les requetes
- Performances des requetes Fabric (latence reseau)

**Mitigation:**
- Prevoir un mode "connexion string" pour le dev/test
- Tester l'auth Entra ID en priorite (PoC avant le reste)
- Timeout configurable + retry sur erreurs reseau
