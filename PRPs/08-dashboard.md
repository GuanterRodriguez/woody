# PRP #8: Dashboard

> **Status:** A FAIRE | Date: 2026-02-13
> **Prerequis:** PRP #1 (Foundation), PRP #5 (Editeur), PRP #6 (Integration Fabric)

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
Implementer la page Dashboard comme page d'accueil de l'application. Elle affiche un tableau de bord avec les dossiers locaux (SQLite) et optionnellement les donnees Fabric (CVENCOURS + CV_CLOTURE), des indicateurs statistiques, des filtres de recherche, et des actions rapides.

**Etat final desire:**
- Le dashboard est la premiere page visible au lancement
- Un tableau liste tous les dossiers avec leur statut, client, camion, produit, date
- Des cartes affichent les compteurs cles (en cours, a corriger, generes, clotures)
- Des filtres permettent de chercher par statut, client, date, produit
- Un clic sur un dossier ouvre l'editeur
- Les donnees combinent sessions locales (SQLite) et vues Fabric si connecte

---

## Why

**Valeur business et impact utilisateur:**
Le dashboard offre une vue d'ensemble de l'activite. Actuellement, les utilisateurs doivent aller sur Power BI pour voir l'etat des CDV. L'app centralise cette vue directement dans l'outil de travail, avec la possibilite d'agir (ouvrir, editer, generer).

**Integration avec l'existant:**
- Utilise `listCdvSessions()` pour les donnees locales
- Utilise `fabric.service.ts` (PRP #6) pour les donnees Fabric
- Navigue vers l'editeur (PRP #5) au clic sur un dossier
- Navigue vers l'import (PRP #4) pour creer de nouveaux dossiers

---

## What

### Comportement Visible

```
┌─────────────────────────────────────────────────────────────────────┐
│  Dashboard                                      [🔄 Actualiser]     │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │    12    │  │     5    │  │     3    │  │     4    │           │
│  │ En cours │  │A corriger│  │ Generes  │  │ Clotures │           │
│  │ ce mois  │  │          │  │          │  │ ce mois  │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
│                                                                      │
│  --- Filtres ---                                                     │
│  Statut: [Tous      ▾]  Client: [Tous   ▾]  Recherche: [________]  │
│  Periode: [Ce mois  ▾]  Produit: [Tous  ▾]                         │
│                                                                      │
│  ┌────────┬──────────┬──────────┬────────┬──────────┬────────────┐  │
│  │Dossier │ Client   │ Camion   │Produit │ Date arr.│ Statut     │  │
│  ├────────┼──────────┼──────────┼────────┼──────────┼────────────┤  │
│  │2026-042│ Client A │ AB123CD  │Mangues │ 15/01/26 │ ● Valide   │  │
│  │2026-043│ Client B │ EF456GH  │Bananes │ 16/01/26 │ ◐ A corr.  │  │
│  │  —     │ Client A │ IJ789KL  │Mangues │ 17/01/26 │ ○ Brouillon│  │
│  │2026-045│ Client C │ MN012OP  │Ananas  │ 18/01/26 │ ✓ Genere   │  │
│  └────────┴──────────┴──────────┴────────┴──────────┴────────────┘  │
│                                                                      │
│  Page 1 / 3    ◄ Precedent  │  Suivant ►   10 par page ▾           │
└─────────────────────────────────────────────────────────────────────┘
```

### Requirements Techniques

1. **Donnees hybrides** : Combiner sessions locales (SQLite) avec donnees Fabric (si connecte)
2. **TanStack Table** : Tableau avec tri, filtres, pagination
3. **Cartes statistiques** : 4 cartes compteurs (shadcn Card)
4. **Filtres** : Statut, client, produit, periode
5. **Recherche** : Recherche textuelle sur dossier, camion, client
6. **Pagination** : 10/25/50 par page
7. **Actions** : Clic sur une ligne → ouvre l'editeur

---

## Success Criteria

- [ ] Le dashboard affiche la liste des dossiers locaux
- [ ] Les cartes statistiques affichent les bons compteurs
- [ ] Les filtres (statut, client, produit) fonctionnent
- [ ] La recherche textuelle fonctionne
- [ ] La pagination fonctionne
- [ ] Le tri par colonne fonctionne
- [ ] Un clic sur un dossier ouvre l'editeur
- [ ] L'app demarre sur le dashboard par defaut
- [ ] Si Fabric est connecte, les donnees Fabric apparaissent aussi
- [ ] `npm run typecheck` + `npm run lint` + `npm run build`

---

## All Needed Context

### Documentation & References

| Resource | URL/Chemin | Pourquoi |
|----------|------------|----------|
| TanStack Table | https://tanstack.com/table/latest | Tableau avec filtres |
| shadcn DataTable | https://ui.shadcn.com/docs/components/data-table | Pattern shadcn |
| shadcn Card | https://ui.shadcn.com/docs/components/card | Cartes stats |
| Database service | `src/services/database.service.ts` | Requetes locales |
| Fabric service | `src/services/fabric.service.ts` | Donnees Fabric (PRP #6) |
| Patterns | `agent_docs/code_patterns.md` | Patterns du projet |

### Arborescence Cible

```
src/
├── pages/
│   └── DashboardPage.tsx               # MODIFIER : implementer le dashboard
├── components/
│   └── dashboard/
│       ├── StatsCards.tsx               # CREER : cartes statistiques
│       ├── DossierTable.tsx             # CREER : tableau des dossiers
│       ├── DossierFilters.tsx           # CREER : barre de filtres
│       └── DossierActions.tsx           # CREER : actions contextuelles
├── services/
│   └── database.service.ts             # MODIFIER : requetes dashboard avec filtres
└── stores/
    └── dashboard.store.ts              # CREER : etat du dashboard
```

### Known Gotchas & Library Quirks

1. **Donnees hybrides** : Les dossiers locaux et Fabric ont des formats differents. Normaliser dans un type `DashboardRow` commun.
2. **TanStack Table + shadcn** : shadcn fournit un composant DataTable base sur TanStack Table. L'utiliser comme point de depart.
3. **Performance** : Si beaucoup de dossiers, utiliser la pagination. Pour les donnees locales, paginer cote SQLite (LIMIT/OFFSET). Pour Fabric, limiter a 100 resultats.
4. **Chargement asynchrone** : Charger d'abord les donnees locales (rapide), puis les donnees Fabric (lent). Afficher les donnees locales immediatement.

---

## Implementation Blueprint

### Data Models

```typescript
// Type unifie pour le dashboard
interface DashboardRow {
  id: string;
  source: "local" | "fabric";
  dossier: string;
  client: string;
  camion: string;
  produit: string;
  dateArrivee: string;
  statut: string;
  canEdit: boolean;       // true si local
  canGenerate: boolean;   // true si valide
}

interface DashboardFilters {
  statut: string | null;
  client: string | null;
  produit: string | null;
  search: string;
  periode: "all" | "this_month" | "last_month" | "this_year";
}

interface DashboardStats {
  enCours: number;
  aCorriger: number;
  generes: number;
  clotures: number;
}
```

### Liste des Taches (dans l'ordre)

#### Phase 1 : Store + Donnees

1. **Creer `src/stores/dashboard.store.ts`**
   - Etat : rows, filters, stats, isLoading
   - Actions : loadData, setFilter, clearFilters, refresh

2. **Modifier `src/services/database.service.ts`**
   - Ajouter `listCdvSessionsWithFilters(filters)` : requete SQLite avec WHERE dynamique
   - Ajouter `getDashboardStats()` : compteurs par statut

3. **Validation intermediaire**

#### Phase 2 : Composants UI

4. **Creer `src/components/dashboard/StatsCards.tsx`**
   - 4 cartes shadcn Card
   - Calcul des stats depuis les donnees chargees

5. **Creer `src/components/dashboard/DossierFilters.tsx`**
   - Selects : statut, client (valeurs uniques), produit (valeurs uniques)
   - Input recherche textuelle
   - Select periode
   - Bouton reset

6. **Creer `src/components/dashboard/DossierTable.tsx`**
   - TanStack Table avec shadcn DataTable
   - Colonnes : dossier, client, camion, produit, date, statut
   - Tri par colonne, pagination
   - Clic sur ligne → navigation editeur

7. **Implementer `src/pages/DashboardPage.tsx`**
   - Assembler : StatsCards + DossierFilters + DossierTable
   - Chargement initial des donnees
   - Bouton actualiser

8. **Validation finale**
   ```bash
   npm run typecheck && npm run lint && npm run build
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

Verifier:
- [ ] Le dashboard s'affiche au lancement
- [ ] Les cartes statistiques affichent les bons chiffres
- [ ] Le tableau liste les dossiers locaux
- [ ] Les filtres fonctionnent
- [ ] La pagination fonctionne
- [ ] Un clic sur un dossier ouvre l'editeur
- [ ] L'actualisation recharge les donnees

### Level 3: Integration

- [ ] Les dossiers crees dans ImportPage apparaissent
- [ ] La navigation editeur → dashboard → editeur fonctionne
- [ ] Si Fabric est connecte, les donnees Fabric apparaissent

---

## Anti-Patterns to Avoid

- Ne pas charger toutes les donnees d'un coup (pagination)
- Ne pas bloquer l'UI pendant le chargement Fabric (afficher d'abord les donnees locales)
- Ne pas creer un dashboard trop complexe (pas de graphiques en v1)

---

## Evolutions Futures (Hors Scope)

- Graphiques (evolution par mois, repartition par client)
- Export CSV/Excel du tableau
- Vue Kanban (colonnes par statut)
- Notifications (CDV en attente depuis X jours)

---

## Score de Confiance

**Score: 9/10**

**Points forts:**
- TanStack Table + shadcn DataTable sont bien documentes
- Pattern dashboard classique
- Les donnees sont deja disponibles

**Risques:**
- Fusion donnees locales + Fabric
- Performance si beaucoup de dossiers

**Mitigation:**
- Type normalise `DashboardRow`
- Pagination et limites
