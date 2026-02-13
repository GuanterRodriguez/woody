# PRP: [Nom de la Feature]

> Ce template est optimise pour que les agents IA implementent des features avec suffisamment de contexte pour reussir du premier coup.

> **Status:** EN COURS | Date: YYYY-MM-DD

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
<!-- Description claire et specifique de la feature -->

**Etat final desire:**
<!-- Ce qui sera vrai quand c'est termine -->

---

## Why

**Valeur business et impact utilisateur:**
<!-- Pourquoi cette feature est importante -->

**Integration avec l'existant:**
<!-- Comment ca s'integre dans l'application -->

**Problemes resolus:**
<!-- Pour qui et quels problemes -->

---

## What

### Comportement Visible
<!-- Ce que l'utilisateur verra/fera. Inclure des schemas ASCII si utile -->

### Requirements Techniques
<!-- Specifications techniques detaillees -->

---

## Success Criteria

- [ ] Critere mesurable 1
- [ ] Critere mesurable 2
- [ ] Critere mesurable 3
- [ ] Lint et build passent sans erreur

---

## All Needed Context

### Documentation & References

| Resource | URL/Chemin | Pourquoi |
|----------|------------|----------|
| <!-- Doc 1 --> | <!-- Lien --> | <!-- Raison --> |

### Arborescence Codebase Actuelle

```
src/
├── ...    # Fichiers existants pertinents pour cette feature
```

### Arborescence Cible (Fichiers a Ajouter/Modifier)

```
src/
├── ...    # Nouveaux fichiers et modifications
```

### Known Gotchas & Library Quirks

1. <!-- Gotcha 1 -->
2. <!-- Gotcha 2 -->

---

## Implementation Blueprint

### Data Models

```
// Types a creer/utiliser
// Adapter au langage de la stack choisie
```

### Liste des Taches (dans l'ordre)

#### Phase 1: [Nom] (estimation temps)

1. **[Tache 1]**
   - Fichier: `src/...`
   - Action: Creer/Modifier
   - Details: ...

2. **[Tache 2]**
   - Fichier: `src/...`
   - Action: Creer/Modifier
   - Details: ...

#### Phase 2: [Nom] (estimation temps)

3. **[Tache 3]**
   - Fichier: `src/...`
   - Action: Creer/Modifier
   - Details: ...

### Pseudocode

```
// Approche haut niveau
// Adapter au langage de la stack choisie
```

### Integration Points

| Element | Fichier | Action |
|---------|---------|--------|
| <!-- Element 1 --> | <!-- Fichier --> | <!-- Action --> |

---

## Validation Loop

### Level 1: Syntax & Style

```bash
# Commandes de verification technique
# (adapter selon la stack)
```

### Level 2: Test Manuel

```bash
# Lancer l'application
```

Verifier:
- [ ] La feature fonctionne comme decrit
- [ ] Pas de regression sur l'existant
- [ ] Gestion des erreurs correcte
- [ ] Performance acceptable

### Level 3: Integration

- [ ] Navigation/flux utilisateur fonctionne
- [ ] Donnees persistees correctement
- [ ] Pas de regression sur les autres features

---

## Final Validation Checklist

- [ ] Lint passe sans erreur
- [ ] Build/compilation passe sans erreur
- [ ] Tests manuels OK
- [ ] Gestion des erreurs implementee
- [ ] Types corrects (pas de contournement)
- [ ] Patterns du projet respectes (voir code_patterns.md)
- [ ] code_patterns.md mis a jour si nouveau pattern
- [ ] AGENTS.md > Current State mis a jour

---

## Anti-Patterns to Avoid

- Ne pas creer de patterns nouveaux quand des existants marchent
- Ne pas skipper la validation
- Ne pas ignorer les erreurs de compilation
- Ne pas hardcoder des valeurs qui devraient etre configurables
- Ne pas modifier l'existant sans raison liee a ce PRP

---

## Evolutions Futures (Hors Scope)

<!-- Lister ici les idees qui ne font PAS partie de ce PRP mais pourraient venir ensuite -->

---

## Score de Confiance

**Score: X/10**

**Points forts:**
<!-- Ce qui rend l'implementation probable -->

**Risques:**
<!-- Ce qui pourrait poser probleme -->

**Mitigation:**
<!-- Comment reduire les risques -->
