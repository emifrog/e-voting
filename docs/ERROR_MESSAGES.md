# Système de Messages d'Erreur Amélioré

## Vue d'ensemble

Le système de messages d'erreur a été amélioré pour fournir des messages clairs, spécifiques et actionables aux utilisateurs. Au lieu de messages génériques comme "Erreur lors de l'ajout des électeurs", les utilisateurs reçoivent maintenant des messages contextualisés avec des hints pour les aider à résoudre le problème.

## Architecture

### Côté Serveur

**File:** `server/utils/errorMessages.js`

Centralise tous les messages d'erreur possibles organisés par catégorie :

```javascript
export const errorMessages = {
  AUTH: { ... },        // Erreurs d'authentification
  ELECTIONS: { ... },   // Erreurs liées aux élections
  VOTERS: { ... },      // Erreurs liées aux électeurs
  VOTING: { ... },      // Erreurs liées au vote
  QUORUM: { ... },      // Erreurs de quorum
  SERVER: { ... },      // Erreurs serveur
  FILE: { ... },        // Erreurs de fichier
  EMAIL: { ... }        // Erreurs d'email
}
```

**Fonction principale:**
```javascript
getErrorMessage(category, key, context)
// Ex: getErrorMessage('VOTERS', 'EMAIL_ALREADY_USED')
```

### Côté Client

**File:** `src/utils/errorHandler.js`

Analyse les erreurs reçues du serveur et mappe les messages bruts à des messages conviviaux avec des hints.

**Fonctions principales:**
- `parseError(error)` - Analyse l'erreur et retourne message + hint + sévérité
- `getUserFriendlyError(error)` - Retourne le message utilisateur
- `getErrorHint(error)` - Retourne un hint utile
- `getErrorSeverity(error)` - Retourne la sévérité (error, warning, critical)
- `formatValidationErrors(details)` - Formate les erreurs de validation

**Component:** `src/components/ErrorAlert.jsx`

Affiche les erreurs de manière cohérente avec :
- Message d'erreur principal (clair et court)
- Hint d'action (comment résoudre)
- Détails supplémentaires (optionnels)
- Styling basé sur la sévérité

## Exemples d'Utilisation

### Côté Serveur - Envoyer une erreur

```javascript
import { getErrorMessage } from '../utils/errorMessages.js';

// Retourner une erreur avec message spécifique
res.status(400).json({
  error: getErrorMessage('VOTERS', 'EMAIL_ALREADY_USED')
  // Retourne: "Cet email est déjà utilisé pour cette élection"
});
```

### Côté Client - Afficher une erreur

```javascript
import ErrorAlert from '../components/ErrorAlert';
import { getErrorHint } from '../utils/errorHandler';

// Dans le JSX
{error && (
  <ErrorAlert
    error={error}
    actionHint={getErrorHint(error)}
    onDismiss={() => setError('')}
  />
)}
```

## Catégories d'Erreurs

### AUTH (Authentification)
- `INVALID_CREDENTIALS` - Email ou mot de passe incorrect
- `EMAIL_ALREADY_EXISTS` - Cet email est déjà enregistré
- `WEAK_PASSWORD` - Le mot de passe ne respecte pas les critères
- `TOKEN_EXPIRED` - Session expirée

### ELECTIONS
- `NOT_FOUND` - Élection non trouvée
- `ALREADY_STARTED` - Impossible de modifier une élection déjà démarrée
- `CANNOT_CLOSE` - Impossible de fermer : quorum non atteint
- `NO_OPTIONS` - L'élection doit avoir au moins 2 options

### VOTERS
- `EMAIL_ALREADY_USED` - Cet email est déjà utilisé pour cette élection
- `INVALID_EMAIL` - Format email invalide
- `INVALID_WEIGHT` - Le poids doit être un nombre positif
- `DUPLICATE_EMAIL` - Cet email est en doublon

### VOTING
- `NOT_ACTIVE` - Le vote n'est pas actif
- `ALREADY_VOTED` - Vous avez déjà voté
- `INVALID_TOKEN` - Token de vote invalide ou expiré

## Sévérité des Erreurs

Les erreurs sont classées en 3 niveaux de sévérité:

### Error (Rouge)
```
Utilisé pour: Erreurs de validation, mauvaises données
Exemple: "Format email invalide"
```

### Warning (Orange)
```
Utilisé pour: Entrées dupliquées, session expirée
Exemple: "Vous avez déjà voté"
```

### Critical (Rouge foncé)
```
Utilisé pour: Erreurs serveur, problèmes de base de données
Exemple: "Erreur de base de données"
```

## Hints d'Actions

Chaque erreur inclut un hint pour aider l'utilisateur:

```
Message: "Cet email existe déjà pour cette élection"
Hint: "Vérifiez que vous n'ajoutez pas de doublons"
```

## Migration Vers le Nouveau Système

Pour mettre à jour un composant à utiliser le nouveau système:

1. **Importer le composant ErrorAlert:**
```javascript
import ErrorAlert from '../components/ErrorAlert';
import { getErrorHint } from '../utils/errorHandler';
```

2. **Remplacer l'affichage d'erreur:**
```javascript
// Avant
{error && <div className="alert alert-error">{error}</div>}

// Après
{error && (
  <ErrorAlert
    error={error}
    actionHint={getErrorHint(error)}
    onDismiss={() => setError('')}
  />
)}
```

3. **Améliorer le parsing des erreurs côté client:**
```javascript
// Avant
catch (err) {
  setError(err.response?.data?.error || 'Erreur générale');
}

// Après
catch (err) {
  const parsedError = parseError(err);
  setError(parsedError.message);
  // Le hint s'affiche automatiquement dans ErrorAlert
}
```

## Checklist de Déploiement

- [ ] Tous les routes serveur envoient des messages spécifiques
- [ ] Tous les formulaires affichent ErrorAlert au lieu du message brut
- [ ] Les hints sont contextuels et utiles
- [ ] Les sévérités sont appropriées
- [ ] Test avec erreurs courantes (email doublon, validation, timeout, etc.)

## Avantages

✅ **Messages Clairs** - Les utilisateurs comprennent ce qui a échoué
✅ **Hints Utiles** - Les utilisateurs savent comment corriger
✅ **Cohérence** - Tous les messages suivent le même format
✅ **Maintenabilité** - Messages centralisés, faciles à mettre à jour
✅ **Debugging** - Messages aident les développeurs aussi
✅ **UX Améliorée** - Moins de frustration, plus de résolution

## Exemples Pratiques

### Scénario 1: Email Doublon

**Avant:**
```
❌ Erreur lors de l'ajout des électeurs
```

**Après:**
```
❌ Cet email existe déjà pour cette élection
💡 Vérifiez que vous n'ajoutez pas de doublons
```

### Scénario 2: Format Email Invalide

**Avant:**
```
❌ Erreur lors de l'ajout des électeurs
```

**Après:**
```
❌ Format email invalide détecté
💡 Vérifiez que les adresses email sont au bon format: user@domain.com
```

### Scénario 3: Quorum Non Atteint

**Avant:**
```
❌ Impossible de fermer l'élection
```

**Après:**
```
⚠️ Le quorum n'est pas atteint
💡 Attendez plus de votes ou diminuez le quorum requis
```
