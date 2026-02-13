# Compte de Vente - Regles Claude Code

## Conscience du Projet

**Application:** [NOM - A DEFINIR]
**Type:** Application desktop locale (compilee, executee en local)
**Stack:** [A DEFINIR]

---

## Avant de Coder (CRITIQUE)

1. **Consulter AGENTS.md** pour le contexte global du projet
2. **Consulter agent_docs/code_patterns.md** pour les patterns etablis
3. **Proposer un plan detaille** et attendre approbation explicite
4. **Pour features complexes:** creer un PRP dans `PRPs/` en utilisant le template

---

## Standards Code

### Generaux (applicables quelle que soit la stack)
- Mode strict active (pas de types implicites, pas de `any` si TypeScript)
- Types explicites pour les fonctions publiques et interfaces
- Gestion systematique des erreurs
- Separation des responsabilites (UI / logique metier / donnees)
- Pas de code mort, pas de commentaires inutiles
- Noms de variables et fonctions descriptifs

### Specifiques a la Stack
> **A completer** une fois la stack technique choisie.
> Ajouter ici les regles specifiques au framework/langage selectionne.

---

## Structure Fichiers

```
Compte de vente/
├── AGENTS.md              # Master plan projet
├── CLAUDE.md              # Ce fichier - regles developpement
├── agent_docs/            # Documentation de contexte
│   ├── project_brief.md   # Brief projet
│   ├── code_patterns.md   # Patterns de code
│   ├── tech_stack.md      # Stack technique
│   └── testing.md         # Strategie de tests
├── PRPs/                  # Product Requirements Prompts
│   └── templates/
│       └── prp_base.md    # Template PRP
├── docs/                  # Documents projet (research, PRD, TechDesign)
└── src/                   # Code source de l'application
```

---

## Verification (3 Couches)

Apres chaque generation de code :

### Layer 1 - Technique (Automatise)
```bash
# Commandes a definir selon la stack choisie
# Exemples :
# npm run lint        # Linting
# npm run build       # Compilation
# cargo check         # Rust check
# python -m mypy .    # Python type check
```

### Layer 2 - Fonctionnel (IA)
- Verifier que la logique metier est correcte
- Tester les edge cases
- Valider la gestion des erreurs

### Layer 3 - Manuel (Humain)
- Lancer l'application et tester le comportement
- Verifier l'UX
- Valider l'integration avec l'existant

---

## Conventions de Nommage

| Type | Convention | Exemple |
|------|------------|---------|
| Fichiers composants/modules | PascalCase | `SalesReport.tsx` |
| Fichiers utilitaires | camelCase | `formatDate.ts` |
| Constantes | UPPER_SNAKE | `MAX_ITEMS_PER_PAGE` |
| Types/Interfaces | PascalCase | `SaleEntry` |
| Fonctions | camelCase | `calculateTotal()` |
| Dossiers | kebab-case | `sales-reports/` |

---

## Workflow PRP (Feature par Feature)

1. **Creer un PRP** a partir de `PRPs/templates/prp_base.md`
2. **Nommer** : `PRPs/[nom-feature].md`
3. **Remplir** toutes les sections du template
4. **Faire approuver** le PRP avant implementation
5. **Implementer** en suivant le PRP
6. **Valider** avec la boucle de verification
7. **Mettre a jour** `agent_docs/code_patterns.md` si nouveaux patterns
8. **Mettre a jour** `AGENTS.md > Current State`

---

## Anti-Patterns (NE PAS FAIRE)

- Ne pas creer de nouveaux patterns quand des existants marchent
- Ne pas skipper la validation
- Ne pas ignorer les erreurs de compilation/lint
- Ne pas hardcoder des credentials, chemins absolus, ou config specifique machine
- Ne pas creer de fichiers inutiles ou de code mort
- Ne pas modifier les fichiers de contexte sans raison valide
- Ne pas ajouter de dependances sans justification claire
- Ne pas over-engineerer : solution simple d'abord

---

## Ressources Contextuelles

- `AGENTS.md` - Master plan et etat actuel
- `agent_docs/project_brief.md` - Vision et objectifs
- `agent_docs/tech_stack.md` - Stack technique detaillee
- `agent_docs/code_patterns.md` - Patterns de code
- `agent_docs/testing.md` - Strategie de tests
- `PRPs/` - Product Requirements Prompts par feature
