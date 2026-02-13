# AGENTS.md - Compte de Vente - Master Plan

## Project Overview

| Aspect | Detail |
|--------|--------|
| **App** | [NOM DE L'APPLICATION - À DÉFINIR] |
| **Type** | Application desktop locale (compilee) |
| **Stack** | [À DÉFINIR] |
| **Phase** | Initialisation |
| **Status** | Framework pret - En attente de definition projet |

---

## Architecture Applicative

> **Section a completer** une fois le projet defini par l'utilisateur.
>
> Decrire ici :
> - Les modules principaux de l'application
> - Les interfaces utilisateur
> - Les flux de donnees
> - Les integrations externes (si applicable)

---

## How I Should Think

1. **Comprendre le contexte** - Lire AGENTS.md + agent_docs/ avant toute action
2. **Respecter les patterns existants** - Consulter `agent_docs/code_patterns.md`
3. **Planifier avant de coder** - Proposer un plan, attendre approbation explicite
4. **Une feature a la fois** - Utiliser les PRPs pour guider l'implementation
5. **Verifier apres chaque changement** - Suivre la boucle de validation
6. **Mettre a jour le contexte** - Enrichir code_patterns.md et Current State apres chaque session

---

## Workflow: Plan -> Execute -> Verify

### Plan
- Decrire l'approche proposee
- Identifier les fichiers a modifier/creer
- Lister les dependances
- Attendre l'approbation explicite de l'utilisateur

### Execute
- Une feature a la fois
- Commits atomiques
- Respecter les patterns existants
- Suivre le PRP associe si disponible

### Verify
- Verification technique (lint, build, compilation)
- Verification fonctionnelle (logique metier, edge cases)
- Test manuel (lancer l'application, verifier le comportement)

---

## Context Files

| Fichier | Contenu |
|---------|---------|
| `CLAUDE.md` | Regles de developpement pour Claude Code |
| `agent_docs/project_brief.md` | Vue d'ensemble du projet |
| `agent_docs/code_patterns.md` | Patterns de code etablis |
| `agent_docs/tech_stack.md` | Stack technique detaillee |
| `agent_docs/testing.md` | Strategie de tests |
| `PRPs/templates/prp_base.md` | Template pour nouvelles features |
| `PRPs/` | Product Requirements Prompts par feature |
| `docs/` | Research, PRD, TechDesign |

---

## Current State

> **Mettre a jour cette section apres chaque session de travail**

- **Last Updated:** 2026-02-13
- **Working On:** Initialisation du framework projet
- **Recently Completed:** Scaffolding initial (AGENTS.md, CLAUDE.md, agent_docs, PRPs)
- **Blocked By:** Definition du projet par l'utilisateur
- **Next Steps:** Definir le projet, choisir la stack technique, creer le premier PRP

---

## Roadmap

### Phase 1: Foundation
- [x] Structure du repo
- [x] Fichiers de contexte (AGENTS.md, CLAUDE.md, agent_docs)
- [x] Template PRP
- [ ] Definition du projet (brief, objectifs, utilisateurs cibles)
- [ ] Choix de la stack technique
- [ ] Setup de l'environnement de developpement

### Phase 2: Core Features
- [ ] PRP #1 - [Premiere feature a definir]
- [ ] PRP #2 - [Deuxieme feature a definir]
- [ ] ...

### Phase 3: Polish & Testing
- [ ] Tests automatises
- [ ] Optimisation performance
- [ ] UX polish

### Phase 4: Release
- [ ] Build de production
- [ ] Packaging / distribution
- [ ] Documentation utilisateur

---

## What NOT To Do

- Ne pas coder sans plan approuve
- Ne pas ignorer les patterns etablis dans code_patterns.md
- Ne pas skipper les verifications (lint + build + test)
- Ne pas committer de credentials ou secrets dans le code
- Ne pas ajouter de features hors du scope du PRP en cours
- Ne pas modifier les fichiers de contexte (AGENTS.md, CLAUDE.md) sans discussion
- Ne pas introduire de dependances sans justification

---

## Notes pour les Agents

1. **Toujours lire CLAUDE.md** avant de commencer une session
2. **Consulter les patterns** dans `agent_docs/code_patterns.md`
3. **Proposer un plan** avant d'ecrire du code
4. **Utiliser les PRPs** pour les nouvelles features
5. **Verifier** avec les outils de la stack apres chaque modification
6. **Mettre a jour Current State** a la fin de chaque session
