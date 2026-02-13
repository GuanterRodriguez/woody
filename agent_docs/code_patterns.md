# Patterns de Code - Compte de Vente

> Ce document est **evolutif**. Il sera enrichi apres chaque PRP implemente.
> Chaque nouveau pattern etabli doit etre documente ici pour assurer la coherence du codebase.

---

## Comment utiliser ce fichier

1. **Avant de coder** : consulter les patterns existants pour rester coherent
2. **Apres implementation** : ajouter tout nouveau pattern utilise
3. **En cas de doute** : suivre le pattern existant le plus proche

---

## Patterns etablis

> **Aucun pattern n'est encore etabli.** Ce fichier sera rempli au fur et a mesure du developpement.

### Structure a venir

Les sections suivantes seront ajoutees selon les besoins :

- **Pattern Module/Composant** - Structure standard d'un module
- **Pattern Service/Logique metier** - Organisation de la logique
- **Pattern Acces Donnees** - Lecture/ecriture des donnees
- **Pattern Gestion d'Erreurs** - Strategie d'error handling
- **Pattern UI** - Composants d'interface (si applicable)
- **Pattern Tests** - Structure des tests

---

## Classes/Styles communs

> A remplir selon la stack technique choisie.

---

## Conventions de fichiers

| Type de fichier | Emplacement | Convention |
|-----------------|-------------|------------|
| Modules principaux | `src/` | PascalCase |
| Utilitaires | `src/utils/` ou `src/lib/` | camelCase |
| Types/Interfaces | `src/types/` | PascalCase |
| Tests | `tests/` ou co-localises | `.test.` ou `.spec.` |
| Config | racine du projet | selon convention de l'outil |
