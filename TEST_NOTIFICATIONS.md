# Guide de Test - Notifications Temps Réel

## Pré-requis

Avant de commencer les tests, assurez-vous que:

1. ✅ Les dépendances sont installées:
```bash
npm install socket.io socket.io-client web-push
```

2. ✅ La table des notifications existe:
```bash
sqlite3 database.db < server/database/create-notifications-table.sql
sqlite3 database.db < server/database/create-push-subscriptions-table.sql
```

3. ✅ Les clés VAPID sont configurées dans `.env`:
```env
VAPID_PUBLIC_KEY=votre_cle_publique
VAPID_PRIVATE_KEY=votre_cle_privee
ADMIN_EMAIL=admin@evoting.com
```

4. ✅ Le serveur est démarré:
```bash
cd server
npm start
# Vérifier: "🚀 WebSocket server initialized"
```

5. ✅ Le frontend est démarré:
```bash
cd ..
npm run dev
# Ouvrir http://localhost:5173
```

## Tests WebSocket (Notifications Temps Réel)

### Test 1: Connexion WebSocket

**Objectif**: Vérifier que le WebSocket se connecte correctement

**Étapes**:
1. Connectez-vous à l'application
2. Ouvrez la console navigateur (F12)
3. Cherchez le log: `✅ WebSocket connected`

**Résultat attendu**:
```
✅ WebSocket connected
📊 Joined election room: [si vous êtes sur une page d'élection]
```

**En cas d'échec**:
- Vérifier que le serveur WebSocket est démarré
- Vérifier les logs serveur pour des erreurs d'authentification
- Vérifier le token JWT dans localStorage

---

### Test 2: Notification de Vote Reçu

**Objectif**: Vérifier qu'une notification est envoyée quand un vote est soumis

**Étapes**:
1. Créez une élection et ajoutez des électeurs
2. Démarrez l'élection
3. Ouvrez la page ElectionDetails dans un onglet
4. Dans un autre onglet/navigateur, votez avec un lien de vote
5. Retournez sur ElectionDetails

**Résultat attendu**:
- ✅ Notification toast apparaît: "Vote reçu"
- ✅ Message: "Un nouveau vote a été enregistré pour [Titre]"
- ✅ Les statistiques se mettent à jour en temps réel

**Logs console (frontend)**:
```
📬 New notification received: {
  type: 'success',
  title: 'Vote reçu',
  message: '...'
}
```

**Logs serveur**:
```
✅ WebSocket notification sent to user abc123
```

---

### Test 3: Notification de Quorum Atteint

**Objectif**: Vérifier la notification quand le quorum est atteint

**Étapes**:
1. Créez une élection avec quorum (ex: 50%)
2. Ajoutez 4 électeurs
3. Ouvrez ElectionDetails
4. Soumettez 2 votes (atteint 50%)

**Résultat attendu**:
- ✅ Notification: "Quorum atteint!"
- ✅ Message: "Le quorum a été atteint pour [Titre]"
- ✅ QuorumIndicator devient vert
- ✅ Badge "Quorum atteint" apparaît

---

### Test 4: Synchronisation Multi-Devices

**Objectif**: Vérifier que les notifications se synchronisent entre onglets

**Étapes**:
1. Connectez-vous dans 2 onglets différents
2. Dans l'onglet 1, cliquez sur une notification pour la marquer comme lue
3. Observez l'onglet 2

**Résultat attendu**:
- ✅ Dans l'onglet 2, la notification passe automatiquement en "lue"
- ✅ Le compteur de notifications non lues se met à jour

**Logs console**:
```
Onglet 1: socket.emit('notification:read', 'notif-id')
Onglet 2: socket.on('notification:marked-read', 'notif-id')
```

---

### Test 5: Reconnexion Automatique

**Objectif**: Vérifier que le WebSocket se reconnecte après une perte de connexion

**Étapes**:
1. Ouvrez l'application et connectez-vous
2. Arrêtez le serveur: `Ctrl+C`
3. Observez la console: `❌ WebSocket disconnected`
4. Redémarrez le serveur: `npm start`
5. Attendez 5 secondes

**Résultat attendu**:
- ✅ Console: `✅ WebSocket connected` (reconnexion automatique)
- ✅ `isConnected` passe de `false` à `true`
- ✅ Les notifications reçues pendant la déconnexion sont récupérées

---

## Tests Web Push (Notifications Hors Ligne)

### Test 6: Activation Web Push

**Objectif**: Activer les notifications Push

**Étapes**:
1. Allez sur la page Security (ou Dashboard)
2. Cherchez le bouton "Activer les notifications Push"
3. Cliquez sur "Activer"
4. Acceptez la popup de permissions du navigateur

**Résultat attendu**:
- ✅ Permission acceptée
- ✅ Console: `✅ Service Worker registered: /`
- ✅ Console: `✅ Push notifications enabled`
- ✅ `isPushEnabled = true`

**Vérifier dans Chrome DevTools**:
```
Application → Service Workers → sw.js (activé)
Application → Storage → IndexedDB → push_subscriptions
```

---

### Test 7: Notification Push (Application Fermée)

**Objectif**: Recevoir une notification quand l'app est fermée

**Étapes**:
1. Activez Web Push (Test 6)
2. Fermez TOUS les onglets de l'application
3. Dans un autre terminal, votez via API ou interface
4. Observez les notifications système

**Résultat attendu**:
- ✅ Notification système native apparaît
- ✅ Titre: "Vote reçu"
- ✅ Clic sur la notification → ouvre l'application

**Commande test (alternative)**:
```bash
curl -X POST http://localhost:3000/api/push/test \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json"
```

**Logs serveur**:
```
📱 User abc123 offline, sending Push notification
✅ Push notification sent to 1 device(s)
```

---

### Test 8: Clic sur Notification Push

**Objectif**: Vérifier que cliquer ouvre la bonne page

**Étapes**:
1. Recevez une notification Push d'un vote (Test 7)
2. Cliquez sur la notification

**Résultat attendu**:
- ✅ Navigateur ouvre automatiquement
- ✅ Page ouverte: `/elections/[election-id]`
- ✅ Focus sur l'onglet si déjà ouvert

---

### Test 9: Désactivation Web Push

**Objectif**: Désactiver les notifications Push

**Étapes**:
1. Allez sur Security/Dashboard
2. Cliquez sur "Désactiver les notifications Push"

**Résultat attendu**:
- ✅ Console: `✅ Push notifications disabled`
- ✅ `isPushEnabled = false`
- ✅ Subscription supprimée du serveur
- ✅ Plus de notifications Push reçues

---

## Tests d'Intégration

### Test 10: Scénario Complet - Élection avec Notifications

**Objectif**: Tester le flux complet d'une élection avec toutes les notifications

**Étapes**:

1. **Création** (Admin):
   - Créer une élection "Test Notifications"
   - Ajouter 3 électeurs
   - **Attendre**: Notification "Électeurs ajoutés" (3 électeurs)

2. **Démarrage** (Admin):
   - Cliquer "Démarrer l'élection"
   - **Attendre**: Notification "Élection démarrée"

3. **Vote 1** (Électeur):
   - Voter avec le premier lien
   - **Attendre** (Admin): Notification "Vote reçu"
   - **Vérifier**: Stats se mettent à jour (1/3)

4. **Vote 2** (Électeur):
   - Voter avec le second lien
   - **Attendre** (Admin): Notification "Vote reçu"
   - **Si quorum = 66%**: Notification "Quorum atteint!"

5. **Rappels** (Admin):
   - Cliquer "Envoyer rappels"
   - **Attendre**: Notification "Rappels envoyés" (1 rappel)

6. **Clôture** (Admin):
   - Cliquer "Clôturer l'élection"
   - **Attendre**: Notification "Élection clôturée"

**Résultat attendu**:
- ✅ 6 notifications reçues dans l'ordre
- ✅ Toutes les notifications affichées en temps réel
- ✅ Compteur de notifications non lues = 6 (si non ouvertes)
- ✅ Historique complet dans NotificationCenter

---

### Test 11: Performance - 100 Votes Simultanés

**Objectif**: Vérifier la performance avec un volume élevé

**Prérequis**: Script de test de charge

```javascript
// test-load.js
async function simulateVotes(electionId, count) {
  for (let i = 0; i < count; i++) {
    await fetch(`http://localhost:3000/api/vote/${tokens[i]}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote: { selected: 0 } })
    });
  }
}
```

**Résultat attendu**:
- ✅ Toutes les notifications reçues
- ✅ Pas de perte de messages
- ✅ Latence moyenne < 200ms
- ✅ Pas de crash serveur

---

## Checklist Finale

Avant de considérer les notifications comme complètes, vérifiez:

**WebSocket**:
- [ ] Connexion automatique au login
- [ ] Reconnexion après perte réseau
- [ ] Notifications temps réel < 100ms
- [ ] Synchronisation multi-devices
- [ ] Déconnexion propre au logout

**Web Push**:
- [ ] Service Worker enregistré
- [ ] Permission demandée et acceptée
- [ ] Subscription enregistrée en BD
- [ ] Notifications reçues app fermée
- [ ] Clic ouvre la bonne page
- [ ] Désactivation fonctionne

**Notifications Automatiques**:
- [ ] Vote reçu → Admin
- [ ] Quorum atteint → Admin
- [ ] Élection démarrée → Admin
- [ ] Élection clôturée → Admin + Participants
- [ ] Électeurs ajoutés → Admin
- [ ] Rappels envoyés → Admin

**UI/UX**:
- [ ] NotificationCenter affiche toutes les notifs
- [ ] Toast pour notifs locales
- [ ] Compteur de non-lues
- [ ] Marquer comme lu
- [ ] Marquer tout comme lu
- [ ] Supprimer notification

**Sécurité**:
- [ ] Authentification JWT WebSocket
- [ ] Isolation des notifications par user
- [ ] VAPID keys configurées
- [ ] Permissions browser respectées

---

## Dépannage

### WebSocket ne se connecte pas

```bash
# Vérifier le serveur
curl http://localhost:3000/api/health

# Vérifier les logs
tail -f server/logs/websocket.log

# Tester la connexion
wscat -c ws://localhost:3000 --auth token="votre-token"
```

### Push ne fonctionne pas

```bash
# Vérifier le Service Worker
chrome://serviceworker-internals/

# Tester manuellement
curl -X POST http://localhost:3000/api/push/test \
  -H "Authorization: Bearer TOKEN"

# Logs backend
grep "Push" server/logs/*.log
```

### Notifications en double

- Vérifier qu'une seule connexion WebSocket existe
- Vérifier les subscriptions: `GET /api/push/subscriptions`
- Nettoyer les subscriptions expirées

---

## Métriques de Succès

**Performance**:
- Latence WebSocket: < 100ms (95th percentile)
- Latence Push: < 5s (95th percentile)
- Taux de delivery: > 99%

**Fiabilité**:
- Uptime WebSocket: > 99.9%
- Reconnexion: < 5s après perte réseau
- Perte de messages: 0%

**Adoption**:
- % utilisateurs avec Push activé: > 60%
- % notifications lues: > 80%
- % clics sur notifications: > 40%

---

**Version**: 2.1.0
**Date**: 2025-10-18
**Auteur**: Claude Code
