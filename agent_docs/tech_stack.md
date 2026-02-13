# Stack Technique - Compte de Vente

## Status: A DEFINIR

> La stack technique sera choisie une fois le projet defini.
> Ce document sera complete avec les choix techniques definitifs.

---

## Type d'application

**Application desktop locale** - compilee et executee directement sur le poste de travail.

### Options de stack a considerer

| Option | Langage | Avantages | Inconvenients |
|--------|---------|-----------|---------------|
| **Electron** | JS/TS + HTML/CSS | Ecosysteme riche, cross-platform | Lourd (Chromium embarque), RAM |
| **Tauri** | Rust + JS/TS frontend | Leger, performant, securise | Ecosysteme plus jeune |
| **Python + PyQt/PySide** | Python | Rapide a developper, bonnes libs | Distribution plus complexe |
| **Python + Tkinter** | Python | Inclus dans Python, simple | UI limitee, look natif basique |
| **C# + WPF/WinUI** | C# | Natif Windows, performant | Windows seulement |
| **Swift + SwiftUI** | Swift | Natif macOS, performant | macOS seulement |

---

## Stack choisie

> **A completer** apres la decision.

### Core
| Package | Version | Usage |
|---------|---------|-------|
| <!-- Package 1 --> | <!-- Version --> | <!-- Usage --> |

### UI / Frontend
| Package | Version | Usage |
|---------|---------|-------|
| <!-- Package 1 --> | <!-- Version --> | <!-- Usage --> |

### Donnees / Stockage
| Package | Version | Usage |
|---------|---------|-------|
| <!-- Package 1 --> | <!-- Version --> | <!-- Usage --> |

### Utilitaires
| Package | Version | Usage |
|---------|---------|-------|
| <!-- Package 1 --> | <!-- Version --> | <!-- Usage --> |

### Developpement
| Package | Version | Usage |
|---------|---------|-------|
| <!-- Package 1 --> | <!-- Version --> | <!-- Usage --> |

---

## Scripts / Commandes

```bash
# A definir selon la stack choisie
# Exemples :
# npm run dev        # Demarrer en mode developpement
# npm run build      # Build de production
# npm run lint       # Verification du code
# npm run test       # Lancer les tests
# npm run package    # Packager l'application
```

---

## Variables d'Environnement

```env
# A definir si necessaire
# Pas de credentials en dur dans le code
```

---

## Considerations Desktop

### Stockage local
- Fichiers de configuration : `~/.config/[app-name]/` ou equivalent OS
- Donnees utilisateur : a definir (SQLite, fichiers JSON, etc.)
- Logs : emplacement standard de l'OS

### Distribution
- Build pour l'OS cible (macOS dans un premier temps)
- Packaging : DMG, .app, ou installeur selon les besoins
- Auto-update : a considerer pour les versions futures

### Performance
- Pas de latence reseau (donnees locales)
- Utilisation memoire a surveiller
- Temps de demarrage rapide

---

## Dependances critiques

> A completer apres le choix de stack. Lister ici les packages essentiels
> au fonctionnement, a ne pas mettre a jour sans tests approfondis.
