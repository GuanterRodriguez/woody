# PRP #10: Fix Authentification Fabric (MSAL)

> **Status:** A FAIRE | Date: 2026-02-16
> **Prerequis:** PRP #6 (Integration Fabric)

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
Fixer le bug "Impossible de s'authentifier aupres de Microsoft Entra ID" en corrigeant le `redirectUri` MSAL qui ne fonctionne pas dans Tauri WebView2.

**Etat final desire:**
- L'authentification MSAL popup fonctionne dans Tauri WebView2
- Le bouton "Tester la connexion" dans Settings connecte l'utilisateur via Microsoft
- L'enrichissement Fabric dans l'editeur fonctionne
- Pas besoin de creer une App Registration Azure AD custom

---

## Why

**Valeur business et impact utilisateur:**
L'enrichissement Fabric est crucial pour recuperer automatiquement les frais UE/INT, le poids declare, le numero de declaration, et le fournisseur. Sans authentification, l'utilisateur doit saisir ces donnees manuellement.

**Integration avec l'existant:**
- Modifie uniquement `fabric.service.ts` (1 ligne)
- Aucun changement de store, UI, ou types
- Le reste du flow Fabric (matching, enrichissement, selector) est inchange

**Problemes resolus:**
- Erreur `FABRIC_AUTH_FAILED` lors du `testConnection`
- Erreur `FABRIC_AUTH_FAILED` lors du `enrichFromFabric` dans l'editeur

---

## What

### Diagnostic du Bug

```
Flux actuel (KO) :
1. App appelle acquireTokenPopup()
2. MSAL ouvre un popup vers login.microsoftonline.com
3. L'utilisateur se connecte
4. Azure AD redirige le popup vers window.location.origin = "https://tauri.localhost"
5. Azure AD REFUSE car "https://tauri.localhost" n'est PAS enregistre
   comme redirect URI dans l'app registration du client ID public
6. Erreur AADSTS50011 → catch → WoodyError("Impossible de s'authentifier...")

Flux corrige (OK) :
1. App appelle acquireTokenPopup()
2. MSAL ouvre un popup vers login.microsoftonline.com
3. L'utilisateur se connecte
4. Azure AD redirige vers "https://login.microsoftonline.com/common/oauth2/nativeclient"
   (URI enregistree par defaut pour les public client apps)
5. MSAL detecte le redirect, extrait le token, ferme le popup
6. Token retourne avec succes
```

### Cause Racine

**Fichier** : `src/services/fabric.service.ts`, ligne 36

```typescript
// AVANT (KO)
function getMsalConfig(): Configuration {
  return {
    auth: {
      clientId: MSAL_CLIENT_ID,
      authority: MSAL_AUTHORITY,
      redirectUri: window.location.origin,  // ← "https://tauri.localhost" - NON ENREGISTRE
    },
    cache: {
      cacheLocation: "sessionStorage",
    },
  };
}
```

### Fix

```typescript
// APRES (OK)
function getMsalConfig(): Configuration {
  return {
    auth: {
      clientId: MSAL_CLIENT_ID,
      authority: MSAL_AUTHORITY,
      redirectUri: "https://login.microsoftonline.com/common/oauth2/nativeclient",
    },
    cache: {
      cacheLocation: "sessionStorage",
    },
  };
}
```

### Requirements Techniques

1. Changer `redirectUri` de `window.location.origin` vers une URI enregistree
2. URI primaire : `https://login.microsoftonline.com/common/oauth2/nativeclient`
3. Fallback si ca ne marche pas : `http://localhost`
4. Pas de changement dans les stores, types, ou composants UI

---

## Success Criteria

- [ ] Le bouton "Tester la connexion" dans Settings ouvre le popup Microsoft
- [ ] L'utilisateur peut se connecter avec son compte Microsoft
- [ ] Le popup se ferme automatiquement apres connexion
- [ ] Le message "Connexion reussie" s'affiche
- [ ] L'enrichissement Fabric dans l'editeur fonctionne
- [ ] Le token est cache correctement (pas de re-auth a chaque appel)
- [ ] `npm run typecheck && npm run lint && npm run build` passent

---

## All Needed Context

### Documentation & References

| Resource | URL/Chemin | Pourquoi |
|----------|------------|----------|
| Fabric service | `src/services/fabric.service.ts` | Fichier a modifier |
| MSAL redirect URIs | docs Microsoft | URIs enregistrees par defaut |
| MSAL browser popup | @azure/msal-browser docs | Fonctionnement popup flow |

### Arborescence Cible

```
src/
└── services/
    └── fabric.service.ts    # MODIFIER : ligne 36, redirectUri
```

### Known Gotchas & Library Quirks

1. **`nativeclient` URI** : L'URI `https://login.microsoftonline.com/common/oauth2/nativeclient` est enregistree par defaut sur les public client apps Microsoft. Elle affiche une page blanche que MSAL detecte et ferme.

2. **MSAL singleton** : Le `msalInstance` est un singleton. Si le redirect URI change, il faut reinitialiser l'instance. Comme on change en dur dans le code (pas en runtime), ce n'est pas un probleme.

3. **Cache sessionStorage** : Les tokens sont caches dans `sessionStorage`. Si l'utilisateur ferme l'app et la reouvre, il devra se reconnecter (normal car sessionStorage est efface).

4. **Popup bloque** : Si WebView2 bloque les popups, MSAL echouera quand meme. Mais c'est un probleme different de l'URI (et generalement WebView2 ne bloque pas les popups par defaut).

5. **Fallback `http://localhost`** : Si `nativeclient` ne fonctionne pas, essayer `http://localhost`. Cette URI est aussi enregistree par defaut pour les public clients. MSAL ouvrira la popup, Azure AD redirigera vers `http://localhost?code=...`, et MSAL extraira le code avant que la page ne charge.

---

## Implementation Blueprint

### Liste des Taches (dans l'ordre)

#### Phase 1 : Fix (1 fichier, 1 ligne)

1. **Modifier `src/services/fabric.service.ts`**
   - Fichier: `src/services/fabric.service.ts`
   - Action: Modifier
   - Details: Changer `redirectUri: window.location.origin` en `redirectUri: "https://login.microsoftonline.com/common/oauth2/nativeclient"` dans `getMsalConfig()`

2. **Validation**
   ```bash
   npm run typecheck && npm run lint && npm run build
   ```

#### Phase 2 : Test (si fallback necessaire)

3. **Si nativeclient echoue, essayer localhost**
   - Fichier: `src/services/fabric.service.ts`
   - Action: Modifier
   - Details: Changer `redirectUri` en `"http://localhost"` comme fallback

### Integration Points

| Element | Fichier | Action |
|---------|---------|--------|
| MSAL config | `fabric.service.ts:36` | Changer redirectUri |

---

## Validation Loop

### Level 1: Syntax & Style

```bash
npm run typecheck
npm run lint
npm run build
```

### Level 2: Test Manuel

```bash
npm run tauri dev
```

Verifier:
- [ ] Aller dans Settings > Microsoft Fabric
- [ ] Saisir un SQL Endpoint et un Database valides
- [ ] Cliquer "Tester la connexion"
- [ ] Le popup Microsoft s'ouvre
- [ ] Se connecter avec un compte autorise
- [ ] Le popup se ferme automatiquement
- [ ] Le message "Connexion reussie" s'affiche (vert)
- [ ] Re-tester : la connexion est instantanee (token cache)

### Level 3: Integration

- [ ] Ouvrir un dossier dans l'editeur
- [ ] Cliquer "Enrichir depuis Fabric"
- [ ] Les donnees Fabric sont recuperees et appliquees
- [ ] Les champs enrichis (frais UE/INT, poids declare, etc.) sont corrects

---

## Final Validation Checklist

- [ ] Lint passe sans erreur
- [ ] Build/compilation passe sans erreur
- [ ] Test manuel OK (connexion reussie)
- [ ] Token cache fonctionne (pas de re-auth)
- [ ] Enrichissement Fabric fonctionne dans l'editeur
- [ ] Patterns du projet respectes
- [ ] AGENTS.md > Current State mis a jour

---

## Anti-Patterns to Avoid

- Ne pas creer une App Registration Azure AD custom (pas d'acces)
- Ne pas utiliser le device code flow (MSAL browser ne le supporte pas)
- Ne pas utiliser redirect flow (popup est prefere dans Tauri)
- Ne pas changer le client ID (le public Power BI client ID est correct)
- Ne pas modifier d'autres fichiers que `fabric.service.ts`

---

## Evolutions Futures (Hors Scope)

- App Registration Azure AD custom avec redirect URI `https://tauri.localhost`
- Gestion multi-tenant (authority configurable)
- Refresh token persistant (au lieu de sessionStorage)
- Deconnexion explicite (bouton logout)

---

## Score de Confiance

**Score: 8/10**

**Points forts:**
- Fix simple (1 ligne)
- URI `nativeclient` est un standard Microsoft
- Le reste du flow Fabric est deja fonctionnel

**Risques:**
- L'URI `nativeclient` pourrait ne pas etre enregistree sur ce client ID specifique
- WebView2 pourrait avoir des problemes avec le popup cross-origin

**Mitigation:**
- Fallback avec `http://localhost`
- Si les deux echouent, envisager un client ID Power BI Desktop (`cf710c6e-...`)
