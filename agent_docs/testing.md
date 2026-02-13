# Strategie de Tests - Compte de Vente

## Etat Actuel

> Aucun test automatise n'existe encore. Ce document definit la strategie a appliquer.

---

## Stack de Tests

> **A definir** selon la stack technique choisie.

| Outil | Usage |
|-------|-------|
| <!-- Outil 1 --> | Test runner |
| <!-- Outil 2 --> | Tests unitaires |
| <!-- Outil 3 --> | Tests d'integration |
| <!-- Outil 4 --> | Tests E2E (optionnel) |

---

## Verification Actuelle (3 Couches)

### Layer 1 - Verification Technique (Automatisee)
```bash
# Commandes a definir selon la stack
# Exemples :
# npm run lint     # Linting
# npm run build    # Compilation
```
**Objectif :** Zero erreur de syntaxe, typage, et style.

### Layer 2 - Verification Fonctionnelle (IA)
- Verifier que la logique metier est correcte
- Tester les edge cases identifies dans le PRP
- Valider la gestion des erreurs
- Verifier la coherence avec les patterns existants

### Layer 3 - Verification Manuelle (Humain)
- Lancer l'application
- Tester le flow principal de la feature
- Verifier le comportement sur differents cas d'usage
- Valider l'UX et l'ergonomie

---

## Structure des Tests

```
tests/
├── setup.*                  # Configuration globale des tests
├── unit/                    # Tests unitaires
│   ├── services/            # Tests logique metier
│   └── utils/               # Tests utilitaires
├── integration/             # Tests d'integration
│   └── ...                  # Interactions entre modules
└── e2e/                     # Tests end-to-end (optionnel)
    └── ...                  # Scenarios utilisateur complets
```

---

## Tests a Implementer (Priorite)

### Haute Priorite
1. **Logique metier critique** - Calculs, transformations de donnees
2. **Acces aux donnees** - Lecture/ecriture, cas d'erreur
3. **Validation d'entrees** - Donnees utilisateur

### Moyenne Priorite
4. **Modules utilitaires** - Fonctions helpers
5. **Integration entre modules** - Communication interne

### Basse Priorite
6. **UI/Composants** - Rendu, interactions
7. **Edge cases rares** - Cas limites

---

## Checklist Pre-Commit

- [ ] Verification technique passe sans erreur (lint + build)
- [ ] Tests manuels effectues pour les changements
- [ ] Pas de regression sur les features existantes
- [ ] Code patterns respectes (voir code_patterns.md)
- [ ] (Futur) Tests automatises passent

---

## Bonnes Pratiques

- Ecrire les tests en meme temps que le code (pas apres)
- Chaque PRP inclut une section "Validation Loop" avec les criteres
- Tester les cas d'erreur, pas seulement le happy path
- Garder les tests rapides et independants
- Ne pas mocker ce qu'on peut tester directement
