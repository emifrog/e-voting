# Web Push API - Documentation Complète

## Vue d'ensemble

Le système Web Push permet d'envoyer des notifications **même quand l'application est fermée**. Cette fonctionnalité complète le système WebSocket temps réel pour garantir que les utilisateurs reçoivent toujours leurs notifications.

## Architecture

### Stratégie Hybride: WebSocket + Web Push

```
Utilisateur CONNECTÉ → WebSocket (temps réel, < 100ms latence)
Utilisateur DÉCONNECTÉ → Web Push (notifications persistantes)
```

Le système détecte automatiquement l'état de connexion et choisit le canal approprié.

## Composants

### 1. Service Worker (`public/sw.js`)

Le Service Worker est un script qui tourne en arrière-plan et intercepte les notifications Push.

**Fonctionnalités**:
- ✅ Cache des ressources statiques
- ✅ Réception des notifications Push
- ✅ Affichage des notifications natives
- ✅ Gestion des clics (ouvre l'application)
- ✅ Stratégie Network First

**Enregistrement**:
```javascript
navigator.serviceWorker.register('/sw.js', { scope: '/' })
```

### 2. Utilitaires Frontend (`src/utils/webPush.js`)

Module contenant toutes les fonctions pour gérer Web Push côté client.

**Fonctions principales**:
- `registerServiceWorker()` - Enregistre le Service Worker
- `requestNotificationPermission()` - Demande la permission
- `subscribeToPush(vapidKey)` - S'abonne aux Push
- `unsubscribeFromPush()` - Se désabonne
- `getCurrentSubscription()` - Récupère la subscription active
- `showTestNotification()` - Teste une notification

### 3. Service Backend (`server/services/webPush.js`)

Gère l'envoi des notifications Push via la bibliothèque `web-push`.

**Fonctions principales**:
- `getVapidPublicKey()` - Retourne la clé publique VAPID
- `registerPushSubscription()` - Enregistre une subscription
- `removePushSubscription()` - Supprime une subscription
- `sendPushNotification()` - Envoie une notification
- `generateVapidKeys()` - Génère des clés VAPID

### 4. Routes API (`server/routes/push.js`)

Endpoints pour gérer les subscriptions Push.

```
GET  /api/push/vapid-public-key       - Récupérer la clé publique
POST /api/push/subscribe              - S'abonner aux Push
POST /api/push/unsubscribe            - Se désabonner
GET  /api/push/subscriptions          - Liste des subscriptions
POST /api/push/test                   - Envoyer un push de test
```

### 5. Context React (`src/contexts/NotificationContext.jsx`)

Intègre Web Push dans le contexte React global.

**Nouvelles propriétés**:
- `isPushEnabled` - État de l'activation Push
- `enablePushNotifications()` - Activer Push
- `disablePushNotifications()` - Désactiver Push

## Configuration

### Variables d'Environnement

Ajoutez ces variables dans `.env`:

```env
# Email de contact pour VAPID
ADMIN_EMAIL=admin@votredomaine.com

# Clés VAPID (générez-les avec le script ci-dessous)
VAPID_PUBLIC_KEY=votre_cle_publique
VAPID_PRIVATE_KEY=votre_cle_privee
```

### Générer les Clés VAPID

Exécutez ce script une seule fois pour générer vos clés:

```javascript
// generate-vapid-keys.js
import { generateVapidKeys } from './server/services/webPush.js';
generateVapidKeys();
```

Ou utilisez la CLI web-push:
```bash
npx web-push generate-vapid-keys
```

### Base de Données

Créez la table des subscriptions:

```bash
sqlite3 database.db < server/database/create-push-subscriptions-table.sql
```

## Installation

### Backend

```bash
npm install web-push
```

### Frontend

Aucune dépendance supplémentaire (Web Push API native du navigateur)

## Utilisation

### Activer les Notifications Push (Frontend)

```javascript
import { useNotifications } from '../contexts/NotificationContext';

function NotificationSettings() {
  const { isPushEnabled, enablePushNotifications, disablePushNotifications } = useNotifications();

  const handleTogglePush = async () => {
    if (isPushEnabled) {
      await disablePushNotifications();
    } else {
      await enablePushNotifications();
    }
  };

  return (
    <button onClick={handleTogglePush}>
      {isPushEnabled ? 'Désactiver' : 'Activer'} les notifications Push
    </button>
  );
}
```

### Envoyer une Notification (Backend)

Le système envoie automatiquement des Push quand l'utilisateur est déconnecté.

Exemple manuel:
```javascript
import { sendPushNotification } from './services/webPush.js';

await sendPushNotification('user-id-123', {
  title: 'Nouvelle notification',
  message: 'Vous avez un nouveau vote',
  type: 'success',
  election_id: 'election-abc'
});
```

## Flux Complet

### 1. Initialisation (Premier chargement)

```
User accède à l'app
     ↓
Service Worker s'enregistre automatiquement
     ↓
Context vérifie si Push est déjà activé
     ↓
isPushEnabled = true/false
```

### 2. Activation Push (User action)

```
User clique "Activer Push"
     ↓
requestNotificationPermission() → Popup navigateur
     ↓
User accepte → permission = 'granted'
     ↓
subscribeToPush(vapidKey) → Crée PushSubscription
     ↓
POST /api/push/subscribe → Enregistre en BD
     ↓
isPushEnabled = true
```

### 3. Envoi Notification (Backend événement)

```
Événement: Vote reçu
     ↓
notifyVoteReceived(electionId, adminId, title)
     ↓
sendRealtimeNotification(userId, notification)
     ↓
Vérifier: User connecté via WebSocket?
     ↓
├─ OUI → socket.emit('notification')
     ↓
└─ NON → sendPushNotification(userId)
              ↓
         web-push.sendNotification(subscription, payload)
              ↓
         Service Push du navigateur
              ↓
         Service Worker: event 'push'
              ↓
         sw.showNotification(title, options)
              ↓
         Notification native s'affiche
```

### 4. Clic sur Notification

```
User clique sur la notification
     ↓
Service Worker: event 'notificationclick'
     ↓
notification.close()
     ↓
Récupérer URL depuis notification.data
     ↓
Chercher fenêtre déjà ouverte
     ↓
├─ Trouvée → client.focus()
     ↓
└─ Pas trouvée → clients.openWindow(url)
```

## Format de Notification Push

```javascript
{
  title: "Vote reçu",
  body: "Un nouveau vote pour 'Élection 2024'",
  icon: "/favicon.ico",
  badge: "/favicon.ico",
  tag: "vote-abc123",
  requireInteraction: false,
  data: {
    election_id: "abc123",
    type: "success",
    url: "/elections/abc123"
  },
  actions: [
    { action: "view", title: "Voir" },
    { action: "dismiss", title: "Ignorer" }
  ],
  vibrate: [200, 100, 200],
  timestamp: 1634567890000
}
```

## Sécurité

### VAPID (Voluntary Application Server Identification)

Les clés VAPID permettent d'identifier votre serveur auprès des services Push:

- ✅ **Clé publique**: Partagée avec les clients (safe)
- ✅ **Clé privée**: Gardée secrète sur le serveur (NEVER commit)
- ✅ **Email**: Utilisé pour contacter l'admin en cas de problème

### Permissions

- ✅ L'utilisateur doit **explicitement accepter** les notifications
- ✅ Permission stockée par le navigateur (persistante)
- ✅ Peut être révoquée à tout moment dans les paramètres

### Isolation

- ✅ Chaque subscription est unique par device
- ✅ Les notifications sont isolées par utilisateur
- ✅ Endpoint valide seulement pour la subscription correspondante

## Compatibilité Navigateurs

| Navigateur      | Desktop | Mobile  |
|-----------------|---------|---------|
| Chrome          | ✅ 42+  | ✅ 42+  |
| Firefox         | ✅ 44+  | ✅ 48+  |
| Safari          | ✅ 16+  | ✅ 16.4+|
| Edge            | ✅ 17+  | ✅ 17+  |
| Opera           | ✅ 29+  | ✅ 29+  |

**Note**: Safari nécessite iOS 16.4+ pour le support mobile.

## Debugging

### Console Logs

**Frontend**:
```javascript
✅ Service Worker registered: /
✅ Push notifications enabled
📱 Subscription: {...}
```

**Backend**:
```javascript
✅ Push subscription registered for user abc123
📱 User abc123 offline, sending Push notification
✅ Push notification sent to 2 device(s)
🗑️ Removing expired subscription for user abc123
```

### Tester les Notifications

1. **Tester en local**:
```javascript
// Console navigateur
const { enablePushNotifications } = useNotifications();
await enablePushNotifications();
```

2. **Envoyer un push de test**:
```bash
curl -X POST http://localhost:3000/api/push/test \
  -H "Authorization: Bearer votre-token" \
  -H "Content-Type: application/json"
```

3. **Vérifier le Service Worker**:
```
Chrome DevTools → Application → Service Workers
```

### Problèmes Courants

**1. Service Worker ne s'enregistre pas**
- ✅ Vérifier que `sw.js` est dans `/public/`
- ✅ Vérifier HTTPS (requis sauf localhost)
- ✅ Vérifier la console pour les erreurs

**2. Notifications ne s'affichent pas**
- ✅ Vérifier la permission: `Notification.permission`
- ✅ Vérifier que le Service Worker est actif
- ✅ Vérifier les logs backend pour les erreurs d'envoi

**3. Clé VAPID invalide**
- ✅ Vérifier que les clés sont bien configurées dans `.env`
- ✅ Régénérer les clés avec `generateVapidKeys()`
- ✅ Vérifier le format base64url

**4. Subscription expirée (410 Gone)**
- ✅ Normal: le système supprime automatiquement
- ✅ User doit se réabonner (automatique au prochain login)

## Performance

### Taille des Payloads

- **Maximum**: 4 KB (limite Push API)
- **Recommandé**: < 1 KB
- **Notre implémentation**: ~500 bytes

### Fréquence d'Envoi

- **Pas de limite technique**
- **Bonne pratique**: Grouper les notifications similaires
- **Notre implémentation**: Immediate send (pas de batching)

### Cache Service Worker

```javascript
CACHE_NAME: 'evoting-v2.1.0'
Stratégie: Network First (toujours frais)
Fallback: Cache (si offline)
```

## Roadmap Futur

- [ ] **Préférences utilisateur** - Choisir quels types de notifications
- [ ] **Notification grouping** - Grouper les notifs similaires
- [ ] **Actions riches** - Boutons dans les notifications
- [ ] **Badges** - Compteur de notifs sur l'icône
- [ ] **Synchronisation** - Sync en arrière-plan avec Background Sync API

## Ressources

- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [web-push library](https://github.com/web-push-libs/web-push)

---

**Version**: 2.1.0
**Date**: 2025-10-18
**Auteur**: Claude Code
