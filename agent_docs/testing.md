# Strategie de Tests - Woody (Compte de Vente)

## Etat Actuel

> Aucun test automatise n'existe encore. Ce document definit la strategie a appliquer des le PRP #1.

---

## Stack de Tests

| Outil | Usage |
|-------|-------|
| **Vitest** | Test runner + tests unitaires (compatible Vite) |
| **@testing-library/react** | Tests composants React (rendu, interactions) |
| **MSW (Mock Service Worker)** | Mock des API externes (Gemini, Fabric) en tests |
| **cargo test** | Tests unitaires Rust (commandes Tauri) |

---

## Verification Actuelle (3 Couches)

### Layer 1 - Verification Technique (Automatisee)
```bash
npm run typecheck        # TypeScript strict (tsc --noEmit)
npm run lint             # ESLint
npm run build            # Build Vite production
cargo check              # Compilation Rust
cargo clippy             # Linting Rust
```
**Objectif :** Zero erreur de syntaxe, typage, et style.

### Layer 2 - Verification Fonctionnelle (IA + Tests auto)
```bash
npm run test             # Vitest (unitaires + integration)
```
- Verifier que la logique metier est correcte (moteur de calcul, parsing OCR)
- Tester les edge cases identifies dans le PRP
- Valider la gestion des erreurs (WoodyError)
- Verifier la coherence avec les patterns existants

### Layer 3 - Verification Manuelle (Humain)
```bash
npm run tauri dev        # Lancer l'application en mode dev
```
- Lancer l'application
- Tester le flow principal de la feature
- Verifier le comportement sur differents cas d'usage
- Valider l'UX et l'ergonomie
- Tester avec de vrais PDFs CDV et fiches de lot

---

## Structure des Tests

```
src/
├── services/
│   ├── gemini.service.ts
│   ├── gemini.service.test.ts        # Co-localise
│   ├── fabric.service.ts
│   ├── fabric.service.test.ts
│   ├── calculation.engine.ts
│   └── calculation.engine.test.ts
├── components/
│   ├── editor/
│   │   ├── InformationsForm.tsx
│   │   └── InformationsForm.test.tsx
│   └── ...
tests/
├── setup.ts                          # Config globale Vitest
├── fixtures/                         # Donnees de test
│   ├── ocr-response-cdv.json        # Reponse Gemini simulee (CDV)
│   ├── ocr-response-fiche.json      # Reponse Gemini simulee (fiche lot)
│   ├── fabric-cvencours.json        # Donnees Fabric simulees
│   └── sample.pdf                    # PDF de test
└── mocks/                            # Mocks MSW
    └── handlers.ts                   # Handlers API mock
```

---

## Tests a Implementer (Priorite)

### Haute Priorite
1. **Moteur de calcul** (`calculation.engine.ts`)
   - Calcul des totaux (somme lignes de vente)
   - Calcul des frais (transit + commission + autres + UE + INT)
   - Montants nets
   - Edge cases : valeurs nulles, nombres negatifs, arrondis

2. **Parsing OCR** (`gemini.service.ts`)
   - Parsing reponse Gemini CDV (extraction camion, date, frais)
   - Parsing reponse Gemini fiche de lot (extraction lignes JSON)
   - Gestion reponses malformees / incompletes
   - Validation Zod des schemas

3. **Manipulation PDF** (`pdf.service.ts`)
   - Split PDF en pages individuelles
   - Extraction de plages de pages
   - Gestion PDFs corrompus ou vides

### Moyenne Priorite
4. **Service Fabric** (`fabric.service.ts`)
   - Construction requete SQL (matching camion + date ±3j + client)
   - Mapping des champs Fabric → TypeScript
   - Gestion connexion perdue / timeout

5. **Formulaire Editeur** (`InformationsForm.tsx`)
   - Affichage des donnees pre-remplies
   - Modification et sauvegarde
   - Validation des champs requis

### Basse Priorite
6. **Composants UI** - Rendu correct, interactions de base
7. **Dashboard** - Affichage donnees, filtres

---

## Donnees de Test (Fixtures)

### Reponse OCR CDV simulee
```json
{
  "camion": "AB123CD",
  "date_arrivee": "2026-01-15",
  "frais_transit": 1500.50,
  "frais_commission": 2000.00,
  "autre_frais": 350.00
}
```

### Reponse OCR Fiche de lot simulee
```json
{
  "documents": [
    {
      "type": "fiche_de_lot",
      "lignes": [
        {
          "client": "Client A",
          "produit": "Mangues",
          "colis": 50,
          "poids_brut": 5500.0,
          "poids_net": 5000.0,
          "prix_unitaire_net": 2.50
        },
        {
          "client": "Client B",
          "produit": "Mangues",
          "colis": 30,
          "poids_brut": 3300.0,
          "poids_net": 3000.0,
          "prix_unitaire_net": 2.75
        }
      ]
    }
  ]
}
```

### Donnees Fabric simulees
```json
{
  "FRAISUEP": 300.00,
  "FRAISINTP": 200.00,
  "PDSN_30": 8000.0,
  "VALEUR_COMPTE_VENTE_30": 2.60,
  "DATEHEUREBAE": "2026-01-12T00:00:00",
  "REFINTERNE": "2026-0042-GR",
  "EXPIMPNOM": "Client A",
  "CLIFOUNOM": "Fournisseur XYZ",
  "ORDRE": "2026-000156",
  "TPFRTIDENT": "AB123CD"
}
```

---

## Checklist Pre-Commit

- [ ] `npm run typecheck` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] `npm run build` passe sans erreur
- [ ] `npm run test` passe (si tests existants)
- [ ] `cargo check` passe sans erreur (si modif Rust)
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
- Utiliser les fixtures pour les donnees de test (pas de donnees inline)
- Les tests de services utilisent des mocks MSW pour les API externes
- Les tests de composants utilisent @testing-library (pas d'access DOM direct)
