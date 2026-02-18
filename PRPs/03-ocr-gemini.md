# PRP #3: OCR Gemini

> **Status:** TERMINE | Date completion: 2026-02-13
> **Prerequis:** PRP #1 (Foundation), PRP #2 (Import PDF)

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
Integrer l'API Google Gemini pour l'OCR des documents. Deux prompts distincts : un pour le Compte de vente (extraction camion, date, frais) et un pour la Fiche de lot (extraction lignes de vente en JSON). Les resultats sont affiches, valides avec Zod, et sauvegardes dans la session CDV en base SQLite.

**Etat final desire:**
- Un bouton "Lancer l'OCR" sur la page Import declenche l'analyse Gemini
- L'utilisateur voit un indicateur de progression pendant le traitement
- Les donnees extraites sont affichees en apercu (preview JSON formate)
- Les resultats sont sauvegardes en base (champs OCR brut + donnees structurees)
- Le statut de la session CDV passe de "brouillon" a "a_corriger"
- Les erreurs OCR sont gerees proprement (retry, message d'erreur clair)

---

## Why

**Valeur business et impact utilisateur:**
L'OCR est le coeur du processus. Sans extraction automatique, les utilisateurs devraient saisir manuellement toutes les donnees des documents. Gemini permet d'extraire les informations en quelques secondes.

**Integration avec l'existant:**
S'appuie sur les PDFs importes (PRP #2) et la cle API Gemini configuree (PRP #1). Les donnees extraites seront editees dans le PRP #4 (Editeur CDV).

**Problemes resolus:**
- Saisie manuelle longue et error-prone
- Pas de visibilite sur les donnees extraites avant generation
- Remplace l'integration Gemini du workflow N8N

---

## What

### Comportement Visible

```
┌─────────────────────────────────────────────────────┐
│  Import & OCR                                       │
│                                                     │
│  Documents importes:                                │
│  ┌──────────────────────────────────────────────┐   │
│  │ CDV_Jan.pdf (CDV)   │ 3p │ ● OCR OK   │ 👁 ✏️│   │
│  │ Fiche_A.pdf (Lot)   │ 5p │ ◐ OCR...   │ 👁   │   │
│  │ CDV_Fev.pdf (CDV)   │ 2p │ ○ En attente│ 👁 ▶️│   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  [Lancer OCR sur tous les documents en attente]     │
│                                                     │
│  --- Apercu OCR : CDV_Jan.pdf ---                   │
│  ┌──────────────────────────────────────────────┐   │
│  │ Camion: AB123CD                              │   │
│  │ Date arrivee: 2026-01-15                     │   │
│  │ Frais transit: 1 500.50 EUR                  │   │
│  │ Frais commission: 2 000.00 EUR               │   │
│  │ Autre frais: 350.00 EUR                      │   │
│  │                                              │   │
│  │ [Ouvrir dans l'editeur →]                    │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Requirements Techniques

1. **Service Gemini** : Appel a l'API Google Gemini avec envoi de fichier PDF en base64
2. **Deux prompts distincts** :
   - Prompt CDV : extraction camion, date arrivee, frais (transit, commission, autres)
   - Prompt Fiche de lot : extraction lignes de vente en JSON structure
3. **Validation Zod** : Schemas de validation pour les reponses Gemini
4. **Progression** : Indicateur visuel pendant le traitement OCR
5. **Retry logic** : Retry automatique en cas d'echec (max 2 retries)
6. **Sauvegarde** : Reponse brute + donnees parsees en base SQLite
7. **Statut** : Mise a jour du statut CDV (brouillon → ocr_en_cours → a_corriger)

---

## Success Criteria

- [ ] Le bouton OCR envoie le PDF a Gemini et recoit une reponse
- [ ] Les donnees CDV sont correctement extraites (camion, date, frais)
- [ ] Les lignes de vente sont correctement extraites (client, produit, poids, prix)
- [ ] La validation Zod rejette les reponses malformees
- [ ] L'indicateur de progression est visible pendant le traitement
- [ ] Les resultats sont affiches en apercu
- [ ] Les donnees sont sauvegardees en base SQLite
- [ ] Le retry fonctionne en cas d'erreur temporaire
- [ ] Un message d'erreur clair s'affiche si l'OCR echoue
- [ ] Tests unitaires sur le parsing des reponses Gemini

---

## All Needed Context

### Documentation & References

| Resource | URL/Chemin | Pourquoi |
|----------|------------|----------|
| Gemini API Files | https://ai.google.dev/gemini-api/docs/document-processing | Upload et analyse de documents |
| Gemini REST API | https://ai.google.dev/api/generate-content | Endpoint generateContent |
| Workflow N8N | `docs/AutomatisationN8N.json` | Prompts OCR originaux |
| Patterns de code | `agent_docs/code_patterns.md` | Pattern Service |

### Prompts OCR (extraits du workflow N8N, a adapter)

**Prompt Compte de Vente :**
```
Analyse ce document de type "Compte de vente".
Extrais les informations suivantes au format JSON strict :
- camion : matricule du camion (alphanumerique uniquement, sans points ni tirets)
- date_arrivee : date d'arrivee du camion (format YYYY-MM-DD)
- frais_transit : montant des frais de transit (nombre decimal)
- frais_commission : montant de la commission (nombre decimal)
- autre_frais : total des autres frais hors commission et transit (nombre decimal)

Reponds UNIQUEMENT avec le JSON, sans texte additionnel.
Format attendu :
{
  "camion": "",
  "date_arrivee": "",
  "frais_transit": 0.0,
  "frais_commission": 0.0,
  "autre_frais": 0.0
}
```

**Prompt Fiche de lot :**
```
Analyse ce document de type "Fiche de lot".
Extrais UNIQUEMENT les lignes de VENTE (ignore les lignes d'arrivage) pour le produit specifie.
Pour les prix unitaires, privilegie toujours le prix NET au kilogramme.
Ignore les valeurs negatives et les frais.
Le poids net est toujours present mais peut ne pas etre adjacent au poids brut.

Reponds UNIQUEMENT avec le JSON, sans texte additionnel.
Format attendu :
{
  "lignes": [
    {
      "client": "",
      "produit": "",
      "colis": 0,
      "poids_brut": 0.0,
      "poids_net": 0.0,
      "prix_unitaire_net": 0.0
    }
  ]
}
```

### Arborescence Cible

```
src/
├── services/
│   ├── gemini.service.ts           # CREER : appels API Gemini
│   ├── gemini.service.test.ts      # CREER : tests parsing reponses
│   └── database.service.ts        # MODIFIER : sauvegarde OCR
├── types/
│   ├── cdv.types.ts               # Existant
│   └── ocr.types.ts               # CREER : schemas Zod OCR
├── components/
│   └── ocr/
│       ├── OcrButton.tsx           # CREER : bouton + progression
│       └── OcrPreview.tsx          # CREER : apercu resultats
├── pages/
│   └── ImportPage.tsx             # MODIFIER : integrer OCR
└── stores/
    └── import.store.ts            # MODIFIER : ajouter etat OCR
```

### Known Gotchas & Library Quirks

1. **Gemini API et PDF** : L'API Gemini accepte les PDFs en base64 dans le champ `inlineData` avec mimeType `application/pdf`. Taille max : 20MB.
2. **Reponse JSON** : Gemini peut ajouter du texte autour du JSON (```json ... ```). Il faut extraire le JSON du texte de la reponse.
3. **Rate limiting** : L'API Gemini a des limites de requetes. Espacer les appels si plusieurs documents.
4. **Modele** : Utiliser `gemini-2.0-flash` pour le meilleur rapport qualite/vitesse sur les documents.
5. **Produit** : Pour la fiche de lot, le prompt original inclut le nom du produit a analyser. L'utilisateur doit le specifier avant l'OCR ou on l'extrait du CDV d'abord.

---

## Implementation Blueprint

### Data Models

```typescript
// src/types/ocr.types.ts
import { z } from "zod";

export const OcrCdvSchema = z.object({
  camion: z.string().min(1),
  date_arrivee: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  frais_transit: z.number().min(0),
  frais_commission: z.number().min(0),
  autre_frais: z.number().min(0),
});
export type OcrCdvResult = z.infer<typeof OcrCdvSchema>;

export const LigneVenteOcrSchema = z.object({
  client: z.string(),
  produit: z.string(),
  colis: z.number().int().min(0),
  poids_brut: z.number().min(0),
  poids_net: z.number().min(0),
  prix_unitaire_net: z.number().min(0),
});

export const OcrFicheLotSchema = z.object({
  lignes: z.array(LigneVenteOcrSchema).min(1),
});
export type OcrFicheLotResult = z.infer<typeof OcrFicheLotSchema>;
```

### Liste des Taches (dans l'ordre)

#### Phase 1: Service Gemini

1. **Creer les schemas Zod OCR**
   - Fichier: `src/types/ocr.types.ts`
   - Schemas pour CDV et Fiche de lot

2. **Creer le service Gemini**
   - Fichier: `src/services/gemini.service.ts`
   - Fonctions: `ocrCompteDeVente(pdfBytes, apiKey)`, `ocrFicheDeLot(pdfBytes, apiKey, produit)`
   - Envoi PDF en base64, parsing JSON de la reponse, validation Zod
   - Retry logic (max 2 retries avec delai exponentiel)
   - Extraction JSON du texte (gestion des blocs ```json```)

3. **Ecrire les tests du service Gemini**
   - Fichier: `src/services/gemini.service.test.ts`
   - Tests du parsing (reponse valide, reponse avec backticks, reponse invalide)
   - Tests de la validation Zod (champs manquants, types incorrects)

#### Phase 2: UI OCR

4. **Creer le bouton OCR avec progression**
   - Fichier: `src/components/ocr/OcrButton.tsx`
   - Etats : idle, loading (spinner), success (check), error (message)

5. **Creer l'apercu des resultats OCR**
   - Fichier: `src/components/ocr/OcrPreview.tsx`
   - Affichage formate des donnees extraites
   - Bouton "Ouvrir dans l'editeur" (lien vers PRP #4)

6. **Integrer dans la page Import**
   - Modifier: `src/pages/ImportPage.tsx`
   - Bouton OCR par document + bouton "OCR tous"
   - Indicateurs de statut OCR dans la liste

#### Phase 3: Persistence

7. **Sauvegarder les resultats OCR**
   - Modifier: `src/services/database.service.ts`
   - Fonctions: `saveOcrResult()`, `getOcrResult()`
   - Stockage de la reponse brute + donnees parsees
   - Mise a jour du statut CDV

---

## Validation Loop

### Level 1: Syntax & Style

```bash
npm run typecheck
npm run lint
npm run build
npm run test             # Tests du parsing Gemini
```

### Level 2: Test Manuel

```bash
npm run tauri dev
```

Verifier:
- [ ] Le bouton OCR envoie le PDF et affiche la progression
- [ ] Les donnees extraites s'affichent en apercu
- [ ] Les erreurs sont affichees clairement
- [ ] Le retry fonctionne (couper/retablir le reseau)
- [ ] Les donnees sont sauvegardees (verifier en base)

### Level 3: Integration

- [ ] Le statut CDV passe bien de "brouillon" a "a_corriger"
- [ ] Les donnees OCR brutes sont conservees (pour debug)
- [ ] Apres redemarrage, les resultats OCR sont toujours la

---

## Anti-Patterns to Avoid

- Ne pas hardcoder la cle API Gemini (utiliser le store settings)
- Ne pas ignorer les erreurs de parsing (logguer + afficher a l'utilisateur)
- Ne pas envoyer des PDFs > 20MB a Gemini sans avertissement
- Ne pas faire d'appels API synchrones bloquants (toujours async)
- Ne pas stocker les reponses Gemini non validees comme donnees finales

---

## Evolutions Futures (Hors Scope)

- Edition des donnees extraites (PRP #4)
- Enrichissement Fabric (PRP #5)
- OCR automatique a l'import (v2)
- Support d'autres providers OCR (Azure Document Intelligence)

---

## Score de Confiance

**Score: 8/10**

**Points forts:**
- L'API Gemini est bien documentee et les prompts sont deja testes via N8N
- La validation Zod garantit la qualite des donnees

**Risques:**
- Qualite variable de l'OCR selon les documents
- Rate limiting Gemini sur les gros volumes
- Le JSON retourne par Gemini peut varier en format

**Mitigation:**
- Validation Zod stricte + affichage des erreurs
- Retry logic avec backoff
- Extraction robuste du JSON (regex pour trouver le bloc JSON)
