# Phase 4 : Webhooks Slack/Teams - Documentation Technique

**Date**: 9 novembre 2025
**Statut**: ✅ Complété
**Sprint**: 7

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Base de données](#base-de-données)
4. [API Backend](#api-backend)
5. [Service Webhooks](#service-webhooks)
6. [Interface utilisateur](#interface-utilisateur)
7. [Tests](#tests)
8. [Guide d'utilisation](#guide-dutilisation)
9. [Sécurité](#sécurité)
10. [Dépannage](#dépannage)

---

## Vue d'ensemble

La Phase 4 ajoute l'intégration de webhooks pour Slack et Microsoft Teams, permettant aux créateurs d'élections de recevoir des notifications en temps réel sur les événements importants de leurs élections.

### Fonctionnalités implémentées

- ✅ Configuration de webhooks Slack
- ✅ Configuration de webhooks Microsoft Teams
- ✅ Gestion CRUD des webhooks (Create, Read, Update, Delete)
- ✅ Sélection d'événements à surveiller
- ✅ Test de webhooks
- ✅ Activation/désactivation de webhooks
- ✅ Notifications en temps réel
- ✅ Audit logging des opérations
- ✅ Tests unitaires complets

### Événements supportés

1. **election_created** : Une nouvelle élection a été créée
2. **election_started** : Une élection a été démarrée
3. **election_closed** : Une élection a été fermée
4. **quorum_reached** : Le quorum a été atteint
5. **vote_cast** : Un vote a été enregistré
6. **voter_added** : Des votants ont été ajoutés
7. **security_alert** : Une alerte de sécurité a été déclenchée

---

## Architecture

### Stack technique

```
Frontend:
- React 18
- React Router v6
- TanStack Query (React Query)
- Lucide React (icônes)
- Tailwind CSS

Backend:
- Node.js + Express
- PostgreSQL (Supabase)
- UUID v4 pour les identifiants
- Axios pour les requêtes HTTP

Plateformes supportées:
- Slack Incoming Webhooks
- Microsoft Teams Incoming Webhooks
```

### Flux de données

```
┌─────────────┐       ┌──────────────┐       ┌────────────────┐
│  Frontend   │──────▶│  API Routes  │──────▶│  Webhook       │
│  (React)    │       │  (Express)   │       │  Service       │
└─────────────┘       └──────────────┘       └────────────────┘
                              │                       │
                              ▼                       ▼
                      ┌──────────────┐       ┌────────────────┐
                      │  PostgreSQL  │       │  Slack/Teams   │
                      │  (Supabase)  │       │  Webhooks      │
                      └──────────────┘       └────────────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │  Audit Log   │
                      └──────────────┘
```

---

## Base de données

### Table: `webhook_configurations`

```sql
CREATE TABLE IF NOT EXISTS webhook_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('slack', 'teams')),
  webhook_url TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON array
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Index

```sql
CREATE INDEX idx_webhook_election ON webhook_configurations(election_id);
CREATE INDEX idx_webhook_active ON webhook_configurations(is_active);
CREATE INDEX idx_webhook_platform ON webhook_configurations(platform);
```

### Migration

```bash
# Exécuter la migration
npm run migrate:webhooks
```

Fichiers:
- `server/database/migrations/007-webhooks.sql` (SQL de référence)
- `server/scripts/migrate-webhooks.js` (script d'exécution)

---

## API Backend

### Routes disponibles

#### 1. Lister les webhooks

```http
GET /api/webhooks/:electionId
Authorization: Bearer <token>
```

**Réponse** :
```json
{
  "webhooks": [
    {
      "id": "uuid",
      "platform": "slack",
      "webhook_url": "https://hooks.slack.com/services/...",
      "events": ["election_started", "election_closed"],
      "is_active": true,
      "last_triggered_at": "2025-11-09T10:00:00Z",
      "created_at": "2025-11-08T10:00:00Z"
    }
  ]
}
```

#### 2. Créer un webhook

```http
POST /api/webhooks/:electionId
Authorization: Bearer <token>
Content-Type: application/json

{
  "platform": "slack",
  "webhookUrl": "https://hooks.slack.com/services/...",
  "events": ["election_started", "quorum_reached"]
}
```

**Validation** :
- `platform` doit être "slack" ou "teams"
- `webhookUrl` doit commencer par "https://"
- `events` doit contenir au moins un événement valide

#### 3. Modifier un webhook

```http
PUT /api/webhooks/:electionId/:webhookId
Authorization: Bearer <token>
Content-Type: application/json

{
  "webhookUrl": "https://...",
  "events": ["election_closed"],
  "isActive": false
}
```

#### 4. Supprimer un webhook

```http
DELETE /api/webhooks/:electionId/:webhookId
Authorization: Bearer <token>
```

#### 5. Tester un webhook

```http
POST /api/webhooks/test
Authorization: Bearer <token>
Content-Type: application/json

{
  "platform": "slack",
  "webhookUrl": "https://hooks.slack.com/services/..."
}
```

#### 6. Lister les événements disponibles

```http
GET /api/webhooks/events/list
Authorization: Bearer <token>
```

**Réponse** :
```json
{
  "events": [
    {
      "id": "election_started",
      "name": "Election Started",
      "description": "Une élection a été démarrée"
    }
  ]
}
```

---

## Service Webhooks

### Fichier: `server/services/webhookService.js`

#### Fonctions principales

##### `triggerWebhooks(electionId, event, data)`

Déclenche tous les webhooks actifs pour un événement donné.

```javascript
import { triggerWebhooks, WEBHOOK_EVENTS } from '../services/webhookService.js';

// Exemple d'utilisation
await triggerWebhooks('election-123', WEBHOOK_EVENTS.ELECTION_STARTED, {
  title: 'Élection démarrée',
  message: 'L\'élection "Mon Élection" est maintenant ouverte',
  election: {
    id: 'election-123',
    title: 'Mon Élection',
    status: 'active'
  },
  statistics: {
    totalVoters: 100,
    votedCount: 0,
    participation: 0
  }
});
```

**Paramètres** :
- `electionId` (string) : ID de l'élection
- `event` (string) : Type d'événement (utiliser `WEBHOOK_EVENTS`)
- `data` (object) : Données de l'événement avec les propriétés :
  - `title` : Titre du message
  - `message` : Corps du message
  - `election` : Informations sur l'élection
  - `statistics` : Statistiques (optionnel)

**Retour** :
```javascript
{
  triggered: 2,        // Nombre de webhooks déclenchés
  successful: 2,       // Nombre de succès
  failed: 0            // Nombre d'échecs
}
```

##### `testWebhook(platform, webhookUrl)`

Teste un webhook en envoyant un message de test.

```javascript
const result = await testWebhook('slack', 'https://hooks.slack.com/...');
if (result.success) {
  console.log('Webhook testé avec succès');
}
```

#### Formats de messages

**Slack** : Format avec attachments et couleurs
```javascript
{
  username: 'E-Voting Bot',
  attachments: [{
    color: '#2ecc71',
    title: 'Élection démarrée',
    text: 'L\'élection est maintenant ouverte',
    fields: [
      { title: 'Élection', value: 'Mon Élection', short: true },
      { title: 'Statut', value: 'Active', short: true }
    ],
    actions: [
      {
        type: 'button',
        text: 'Voir l\'élection',
        url: 'https://...'
      }
    ]
  }]
}
```

**Microsoft Teams** : Format MessageCard
```javascript
{
  '@type': 'MessageCard',
  '@context': 'https://schema.org/extensions',
  themeColor: '2ecc71',
  title: 'Élection démarrée',
  text: 'L\'élection est maintenant ouverte',
  sections: [{
    facts: [
      { name: 'Élection', value: 'Mon Élection' },
      { name: 'Statut', value: 'Active' }
    ]
  }]
}
```

---

## Interface utilisateur

### Page: `/elections/:id/webhooks`

Fichier: `src/pages/WebhookSettings.jsx`

#### Composants

1. **WebhookSettings** : Page principale
2. **WebhookCard** : Carte d'affichage d'un webhook
3. **WebhookFormModal** : Formulaire de création/édition
4. **TestWebhookModal** : Modal de test

#### Navigation

Depuis la page d'élection ([ElectionDetails.jsx:224](src/pages/ElectionDetails.jsx#L224)), un bouton "Webhooks" est disponible :

```jsx
<button onClick={() => navigate(`/elections/${id}/webhooks`)}>
  <Webhook size={18} />
  Webhooks
</button>
```

#### Fonctionnalités UI

- ✅ Liste des webhooks avec statut actif/inactif
- ✅ Création de webhooks avec sélection de plateforme
- ✅ Édition d'URL et d'événements
- ✅ Test de webhooks en un clic
- ✅ Suppression avec confirmation
- ✅ Toggle actif/inactif rapide
- ✅ Affichage des événements surveillés sous forme de badges
- ✅ Bannière d'information avec instructions
- ✅ État vide avec appel à l'action

---

## Tests

### Tests frontend

Fichier: `src/pages/__tests__/WebhookSettings.test.jsx`

**Couverture** :
- ✅ Rendu de la page
- ✅ Affichage des webhooks existants
- ✅ État vide
- ✅ Création de webhooks
- ✅ Validation du formulaire
- ✅ Édition de webhooks
- ✅ Suppression avec confirmation
- ✅ Test de webhooks
- ✅ Toggle statut actif/inactif
- ✅ Gestion des erreurs
- ✅ Accessibilité (ARIA, labels)

**Exécution** :
```bash
npm test -- WebhookSettings.test.jsx
```

### Tests backend

Fichier: `server/routes/__tests__/webhooks.test.js`

**Couverture** :
- ✅ GET /api/webhooks/:electionId
- ✅ POST /api/webhooks/:electionId
- ✅ PUT /api/webhooks/:electionId/:webhookId
- ✅ DELETE /api/webhooks/:electionId/:webhookId
- ✅ POST /api/webhooks/test
- ✅ GET /api/webhooks/events/list
- ✅ Validation des entrées
- ✅ Authentification
- ✅ Autorisation (propriété d'élection)
- ✅ Gestion des erreurs

**Exécution** :
```bash
npm test -- webhooks.test.js
```

---

## Guide d'utilisation

### Configuration Slack

1. **Créer un Incoming Webhook dans Slack** :
   - Aller dans votre workspace Slack
   - Chercher "Incoming Webhooks" dans les Apps
   - Cliquer sur "Add to Slack"
   - Sélectionner le canal où recevoir les notifications
   - Copier l'URL du webhook

2. **Configurer dans E-Voting** :
   - Aller sur la page de votre élection
   - Cliquer sur "Webhooks"
   - Cliquer sur "Ajouter un webhook"
   - Sélectionner "Slack"
   - Coller l'URL du webhook
   - Sélectionner les événements à surveiller
   - Cliquer sur "Tester" pour vérifier
   - Cliquer sur "Enregistrer"

### Configuration Microsoft Teams

1. **Créer un Incoming Webhook dans Teams** :
   - Ouvrir le canal Teams où recevoir les notifications
   - Cliquer sur "⋯" (Plus d'options)
   - Sélectionner "Connecteurs"
   - Chercher "Incoming Webhook"
   - Cliquer sur "Configurer"
   - Donner un nom au webhook
   - Copier l'URL

2. **Configurer dans E-Voting** :
   - Aller sur la page de votre élection
   - Cliquer sur "Webhooks"
   - Cliquer sur "Ajouter un webhook"
   - Sélectionner "Microsoft Teams"
   - Coller l'URL du webhook
   - Sélectionner les événements à surveiller
   - Cliquer sur "Tester" pour vérifier
   - Cliquer sur "Enregistrer"

### Déclencher des webhooks depuis le code

```javascript
// Dans votre code backend
import { triggerWebhooks, WEBHOOK_EVENTS } from './services/webhookService.js';

// Lors du démarrage d'une élection
await triggerWebhooks(electionId, WEBHOOK_EVENTS.ELECTION_STARTED, {
  title: `Élection démarrée : ${election.title}`,
  message: `L'élection "${election.title}" est maintenant ouverte au vote.`,
  election: {
    id: election.id,
    title: election.title,
    status: 'active',
    startedAt: new Date().toISOString()
  },
  statistics: {
    totalVoters: voters.length,
    votedCount: 0,
    participation: 0
  }
});

// Lors de l'atteinte du quorum
await triggerWebhooks(electionId, WEBHOOK_EVENTS.QUORUM_REACHED, {
  title: `Quorum atteint : ${election.title}`,
  message: `Le quorum de ${election.quorum}% a été atteint.`,
  election: {
    id: election.id,
    title: election.title,
    quorum: election.quorum
  },
  statistics: {
    totalVoters: voters.length,
    votedCount: stats.votedCount,
    participation: stats.participation
  }
});
```

---

## Sécurité

### Validation

✅ **URLs** :
- Doivent commencer par `https://`
- Validées au niveau backend

✅ **Événements** :
- Liste blanche d'événements autorisés
- Validation contre `WEBHOOK_EVENTS`

✅ **Authentification** :
- Toutes les routes nécessitent un token JWT valide
- Middleware `authenticateToken` appliqué

✅ **Autorisation** :
- Vérification que l'utilisateur possède l'élection
- Requête SQL avec `created_by = $userId`

### Audit Logging

Toutes les opérations sont enregistrées dans l'audit log :
- ✅ Création de webhook (`webhook_created`)
- ✅ Modification de webhook (`webhook_updated`)
- ✅ Suppression de webhook (`webhook_deleted`)

Les logs incluent :
- ID de l'élection
- ID de l'utilisateur
- Action effectuée
- Détails (plateforme, événements, webhookId)
- Adresse IP

### Limites de débit

⚠️ **Recommandations** :
- Implémenter un rate limiting pour éviter les abus
- Limiter le nombre de webhooks par élection
- Timeout de 10 secondes pour les requêtes webhook
- Retry avec backoff exponentiel en cas d'échec

---

## Dépannage

### Problème : Webhook ne reçoit pas de notifications

**Solutions** :
1. Vérifier que le webhook est actif (`is_active = true`)
2. Vérifier que les événements sont bien sélectionnés
3. Tester le webhook avec le bouton "Tester"
4. Vérifier que l'URL est correcte
5. Consulter les logs serveur pour les erreurs

### Problème : Test de webhook échoue

**Solutions** :
1. Vérifier que l'URL commence par `https://`
2. Vérifier que l'URL n'a pas expiré (Slack/Teams peuvent régénérer les URLs)
3. Tester l'URL manuellement avec curl :

```bash
# Slack
curl -X POST -H 'Content-Type: application/json' \
  -d '{"text":"Test"}' \
  https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Teams
curl -X POST -H 'Content-Type: application/json' \
  -d '{"text":"Test"}' \
  https://outlook.office.com/webhook/YOUR/WEBHOOK/URL
```

### Problème : Erreur 404 "Élection non trouvée"

**Solutions** :
1. Vérifier que l'utilisateur est bien le créateur de l'élection
2. Vérifier l'ID de l'élection dans l'URL
3. Vérifier le token d'authentification

### Logs de débogage

Activer les logs détaillés :
```javascript
// Dans server/services/webhookService.js
console.log('[Webhook] Triggering:', { electionId, event, webhookCount });
console.log('[Webhook] Response:', { status, data });
```

---

## Statistiques d'implémentation

### Code ajouté

```
Backend:
- server/services/webhookService.js       : 331 lignes
- server/routes/webhooks.js               : 344 lignes
- server/scripts/migrate-webhooks.js      : 95 lignes
- server/database/migrations/007-webhooks.sql : 32 lignes
- server/routes/__tests__/webhooks.test.js : 600+ lignes

Frontend:
- src/pages/WebhookSettings.jsx           : 680+ lignes
- src/pages/__tests__/WebhookSettings.test.jsx : 700+ lignes

Total: ~2800+ lignes de code
```

### Base de données

```
Tables ajoutées: 1
Index ajoutés: 3
Colonnes: 10
```

### Routes API

```
Endpoints ajoutés: 6
- GET    /api/webhooks/:electionId
- POST   /api/webhooks/:electionId
- PUT    /api/webhooks/:electionId/:webhookId
- DELETE /api/webhooks/:electionId/:webhookId
- POST   /api/webhooks/test
- GET    /api/webhooks/events/list
```

---

## Prochaines améliorations possibles

### Court terme

- [ ] Rate limiting pour éviter les abus
- [ ] Historique des déclenchements de webhooks
- [ ] Retry automatique en cas d'échec
- [ ] Gestion des webhooks désactivés automatiquement après X échecs

### Moyen terme

- [ ] Support de Discord webhooks
- [ ] Templates de messages personnalisables
- [ ] Webhooks globaux (au niveau du compte)
- [ ] Webhooks conditionnels (déclencher uniquement si conditions)

### Long terme

- [ ] Webhooks bidirectionnels (recevoir des commandes)
- [ ] Intégration Zapier/Make
- [ ] Analytics des webhooks (taux de succès, latence)
- [ ] Support de signatures HMAC pour la sécurité

---

## Références

- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Microsoft Teams Incoming Webhooks](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook)
- [AMELIORATIONS.md Section 22](AMELIORATIONS.md#22-intégrations-slackteams)

---

## Changelog

### Version 1.0 (9 novembre 2025)
- ✅ Implémentation initiale
- ✅ Support Slack et Microsoft Teams
- ✅ Interface utilisateur complète
- ✅ Tests unitaires
- ✅ Documentation

---

**Auteur**: Claude Code
**Date de création**: 9 novembre 2025
**Dernière mise à jour**: 9 novembre 2025
