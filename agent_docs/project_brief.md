# Project Brief - Woody (Compte de Vente)

## Vision

**Woody** est une application desktop standalone pour Windows qui centralise le traitement des comptes de vente (CDV) de GRLOG. Elle remplace le workflow N8N "Woody IA v1.0" par une interface professionnelle permettant l'import de documents, l'OCR automatique, la correction des donnees, la generation de liasses documentaires et le suivi via un dashboard.

- **Probleme** : Le processus actuel repose sur un workflow N8N fragile, sans interface de correction, avec des allers-retours entre N8N, Excel, OneDrive et Outlook. Les utilisateurs ne peuvent pas verifier/corriger les donnees OCR avant generation.
- **Pour qui** : Equipe operations GRLOG (commissionnaires en douane / logistique)
- **Proposition de valeur** : Un outil unique, visuel et autonome qui gere tout le cycle de vie d'un compte de vente, de la reception du document a la generation de la liasse finale.

---

## Proposition de Valeur

### Pour les utilisateurs
- Interface visuelle claire pour visualiser les documents PDF et les donnees extraites
- Correction en temps reel des donnees OCR (formulaires editables + tableaux)
- Outil de split PDF integre (un PDF contenant 10-15 CDV peut etre decoupe)
- Generation automatique de la liasse complete (document de calcul + CDV + fiche de lot)
- Dashboard de suivi des CDV en cours et clotures
- Pas d'installation requise : executable portable (.exe)

### Probleme actuel (process chronophage)
1. Les documents (Compte de vente + Fiche de lot) arrivent par email a `cdv@grlog.com`
2. L'utilisateur doit manuellement telecharger les pieces jointes
3. Il lance le workflow N8N via un formulaire web (Woody IA v1.0)
4. N8N envoie les PDFs a Google Gemini pour OCR
5. Les donnees sont injectees dans un template Excel sur OneDrive
6. L'Excel genere est envoye par email
7. **Aucune possibilite de corriger les erreurs OCR avant generation**
8. **Aucun dashboard de suivi** - il faut aller dans Power BI separement
9. **Les PDFs multi-CDV doivent etre splits manuellement**
10. **Processus fragile** : si N8N plante, tout est a refaire

### Solution proposee
Application Tauri v2 (Rust + React) qui integre tout le processus :
- Import PDF par drag & drop
- Viewer PDF integre avec outil de split
- OCR via Google Gemini avec affichage des resultats
- Interface de correction editable (formulaires + tableaux)
- Enrichissement automatique depuis Fabric Warehouse
- Generation de la liasse documentaire (HTML → PDF)
- Dashboard connecte aux vues Fabric (CDV en cours / clotures)

---

## Fonctionnalites Principales

| # | Feature | Description | Priorite | PRP |
|---|---------|-------------|----------|-----|
| 1 | Foundation & Scaffolding | Structure Tauri v2 + React, layout, routing, config | Critique | PRP #1 |
| 2 | Import PDF & Viewer | Drag & drop, viewer PDF, split multi-CDV | Haute | PRP #2 |
| 3 | OCR Gemini | Envoi PDF a Gemini, parsing JSON, sauvegarde | Haute | PRP #3 |
| 4 | Editeur CDV | Formulaire informations + tableau lignes de vente editables | Haute | PRP #4 |
| 5 | Integration Fabric | Connexion warehouse, enrichissement donnees, matching | Haute | PRP #5 |
| 6 | Calcul & Generation | Moteur de calcul, generation liasse PDF | Haute | PRP #6 |
| 7 | Dashboard | Tableau de bord CDV avec filtres, stats, actions | Moyenne | PRP #7 |
| 8 | Integration Email | Connexion Outlook (Graph API) pour import auto | Basse (v2) | - |
| 9 | Ecart poids | Calcul differences poids declare/vendu + logique conditionnelle | Basse (v2) | - |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (React)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Dashboard │ │ Import   │ │ Editeur  │ │ Config │ │
│  │   Page   │ │  & OCR   │ │  CDV     │ │  Page  │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│          ↕ Zustand Store (etat global)              │
│  ┌──────────────────────────────────────────────┐   │
│  │              Services Layer                   │   │
│  │  gemini.service │ fabric.service │ pdf.service│   │
│  │  calc.engine    │ db.service     │ auth       │   │
│  └──────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│              TAURI BACKEND (Rust)                    │
│  ┌─────────────┐ ┌────────────┐ ┌───────────────┐  │
│  │ File System  │ │  SQLite    │ │  Systeme      │  │
│  │  Commands   │ │  Plugin    │ │  (dialog,etc) │  │
│  └─────────────┘ └────────────┘ └───────────────┘  │
└─────────────────────────────────────────────────────┘
         ↕                    ↕                ↕
   Google Gemini API    Fabric SQL         Fichiers
   (OCR documents)      Endpoint           locaux
                        (donnees CDV)      (PDFs, cache)
```

### Flux de donnees principal
```
PDF import → Gemini OCR → Donnees brutes → Correction utilisateur
                                                    ↓
Fabric Warehouse ← enrichissement ← Donnees validees
                                         ↓
                                  Moteur de calcul
                                         ↓
                                  Generation liasse (PDF)
                                         ↓
                                  Sauvegarde / Export
```

---

## Modele de Donnees

### Entites principales

**CdvSession** (session de travail sur un CDV)
- Identifiant unique (UUID)
- Statut : brouillon → ocr_en_cours → a_corriger → valide → genere
- Informations generales : produit, camion, date arrivee, frais (transit, commission, autres)
- Donnees Fabric : frais UE/INT, poids declare, prix declare, date BAE, dossier, client, fournisseur, n° declaration
- Metadonnees : chemins PDF, reponses OCR brutes, timestamps

**LigneVente** (ligne de vente extraite de la fiche de lot)
- Liee a une CdvSession
- Client, produit, colis, poids brut, poids net, prix unitaire net
- Ordre d'affichage

**DocumentGenere** (document de la liasse generee)
- Lie a une CdvSession
- Type : calcul | cdv_reconstitue | fiche_lot_reconstituee
- Chemin du fichier genere

### Sources de donnees externes (lecture seule)

**Fabric CVENCOURS** : Declarations en cours
- Champs : FRAISUEP, FRAISINTP, PDSN_30, VALEUR_COMPTE_VENTE_30, DATEHEUREBAE, REFINTERNE, EXPIMPNOM, CLIFOUNOM, ORDRE, TPFRTIDENT

**Fabric CV_CLOTURE** : Declarations cloturees
- Meme structure que CVENCOURS

---

## Utilisateurs Cibles

| Type | Description | Besoins principaux |
|------|-------------|-------------------|
| Operateur CDV | Personnel GRLOG qui traite les comptes de vente au quotidien | Interface rapide, correction facile, generation fiable |
| Superviseur | Responsable qui supervise les CDV de l'equipe | Dashboard de suivi, visibilite sur les CDV en cours/clotures |

**Profil technique** : Utilisateurs non-techniques, habitues a Excel et aux outils Microsoft. L'interface doit etre intuitive et ne pas necessiter de formation.

**Environnement** : Azure Virtual Desktop (Windows 10/11), pas de droits admin, acces reseau aux services Azure/Fabric.

---

## Contraintes

- **Type d'application** : Executable portable Windows (.exe), pas d'installeur
- **Deploiement** : Copie directe du .exe sur le poste Azure Virtual Desktop
- **Droits** : Pas de droits administrateur disponibles
- **Donnees** : SQLite local pour le cache + Fabric Warehouse pour les donnees metier
- **Performance** : Reactive, temps de reponse < 1s pour les operations locales
- **OCR** : Dependance a Google Gemini (latence reseau acceptable : 5-15s par document)
- **Securite** : Cle API Gemini stockee localement, auth Entra ID pour Fabric
- **Documents** : PDFs pouvant contenir 10-15 CDV a splitter

---

## Conventions de Developpement

- Qualite de code : strict, TypeScript strict mode, pas de `any`
- Patterns documentes dans `agent_docs/code_patterns.md`
- Features implementees via PRP (un PRP par feature)
- Git pour le versioning, commits atomiques
- Verification 3 couches apres chaque changement (technique, fonctionnel, manuel)
