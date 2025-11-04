# 📊 Guide de Monitoring E-Voting Platform

Ce document décrit la configuration et l'utilisation des outils de monitoring de la plateforme E-Voting.

## 🎯 Vue d'ensemble

La plateforme intègre deux solutions de monitoring complémentaires :

### 1. **Sentry** - Monitoring des Erreurs
- Capture et suivi des erreurs frontend et backend
- Profiling des performances
- Session Replay pour les sessions avec erreurs
- Alertes en temps réel

### 2. **Prometheus + Grafana** - Métriques et Observabilité
- Métriques système (CPU, mémoire, etc.)
- Métriques applicatives (requêtes HTTP, votes, authentifications)
- Métriques de sécurité (rate limiting, 2FA)
- Tableaux de bord visuels avec Grafana

---

## 🚀 Démarrage Rapide

### Étape 1 : Configuration Sentry

1. **Créer un compte Sentry**
   - Rendez-vous sur [https://sentry.io/](https://sentry.io/)
   - Créez un nouveau projet pour le backend (Node.js/Express)
   - Créez un nouveau projet pour le frontend (React)

2. **Configurer les variables d'environnement**

   Ajoutez à votre fichier `.env` :
   ```bash
   # Backend Sentry DSN
   SENTRY_DSN=https://your-backend-dsn@sentry.io/your-project-id

   # Frontend Sentry DSN (pour Vite)
   VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/your-project-id
   ```

3. **Redémarrer l'application**
   ```bash
   npm run dev
   ```

### Étape 2 : Lancer Prometheus + Grafana

1. **Démarrer les services Docker**
   ```bash
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

2. **Accéder aux interfaces**
   - **Prometheus** : [http://localhost:9090](http://localhost:9090)
   - **Grafana** : [http://localhost:3001](http://localhost:3001)
   - **Métriques de l'app** : [http://localhost:3000/metrics](http://localhost:3000/metrics)

3. **Se connecter à Grafana**
   - Utilisateur : `admin`
   - Mot de passe : `admin123`

   ⚠️ **Changez le mot de passe en production !**

---

## 📈 Métriques Disponibles

### Métriques HTTP
- `http_requests_total` - Nombre total de requêtes HTTP
- `http_request_duration_ms` - Durée des requêtes HTTP (histogramme)

### Métriques E-Voting
- `votes_total` - Nombre de votes enregistrés
- `auth_attempts_total` - Tentatives d'authentification
- `websocket_connections_active` - Connexions WebSocket actives
- `elections_total` - Nombre d'élections créées
- `voters_registered_total` - Électeurs enregistrés

### Métriques de Sécurité
- `rate_limit_hits_total` - Requêtes bloquées par rate limiting
- `two_factor_auth_total` - Tentatives d'authentification 2FA
- `errors_total` - Nombre d'erreurs par type

### Métriques Base de Données
- `db_query_duration_ms` - Latence des requêtes DB

### Métriques Système
- `process_cpu_seconds_total` - Utilisation CPU
- `process_resident_memory_bytes` - Mémoire utilisée
- `nodejs_heap_size_total_bytes` - Taille du heap Node.js

---

## 🎨 Dashboards Grafana

### Dashboard Principal : E-Voting Platform

Le dashboard principal inclut :

1. **Performance HTTP**
   - Taux de requêtes par seconde
   - Latence P95
   - Distribution des codes de statut

2. **Métriques Métier**
   - Votes par minute
   - Connexions WebSocket actives
   - Électeurs actifs

3. **Sécurité**
   - Tentatives d'authentification
   - Rate limiting
   - Authentification 2FA

4. **Infrastructure**
   - CPU et mémoire
   - Latence base de données
   - Taux d'erreurs

### Accéder au Dashboard

1. Connectez-vous à Grafana : [http://localhost:3001](http://localhost:3001)
2. Menu : **Dashboards** → **E-Voting** → **E-Voting Platform Dashboard**

---

## 🔧 Configuration Avancée

### Personnaliser Prometheus

Éditez `monitoring/prometheus/prometheus.yml` pour :
- Modifier l'intervalle de scraping (par défaut : 15s)
- Ajouter de nouveaux targets
- Configurer des alertes

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'evoting-app'
    static_configs:
      - targets: ['host.docker.internal:3000']
```

### Ajouter des Métriques Personnalisées

Dans votre code backend :

```javascript
import { votesCounter, recordVote } from './config/prometheus.js';

// Incrémenter un compteur
recordVote(electionId, 'success');

// Créer une nouvelle métrique
import client from 'prom-client';
const myMetric = new client.Counter({
  name: 'my_custom_metric',
  help: 'Description de ma métrique',
  labelNames: ['label1', 'label2'],
  registers: [register]
});

myMetric.inc({ label1: 'value1', label2: 'value2' });
```

### Configurer les Alertes Sentry

1. Dans votre projet Sentry, allez dans **Alerts**
2. Créez des règles d'alerte :
   - Erreur de type spécifique
   - Augmentation du taux d'erreur
   - Erreurs affectant plusieurs utilisateurs

3. Configurez les notifications :
   - Email
   - Slack
   - PagerDuty
   - Webhooks

---

## 🔍 Utilisation en Production

### Meilleures Pratiques

1. **Sentry**
   - Utilisez des `tracesSampleRate` plus bas (0.1 = 10%)
   - Activez les alertes pour les erreurs critiques
   - Configurez les releases pour tracker les déploiements
   - Filtrez les informations sensibles avec `beforeSend`

2. **Prometheus**
   - Ajustez les intervalles de scraping selon vos besoins
   - Configurez la rétention des données
   - Utilisez un stockage persistant (volumes Docker)

3. **Grafana**
   - Changez les credentials par défaut
   - Configurez l'authentification SSO
   - Créez des dashboards par équipe/service
   - Configurez les alertes Grafana

### Sécurité

1. **Protéger les endpoints de métriques**

   Ajoutez une authentification à `/metrics` :

   ```javascript
   app.get('/metrics', authenticateMetrics, async (req, res) => {
     res.set('Content-Type', register.contentType);
     res.end(await register.metrics());
   });
   ```

2. **Configurer HTTPS pour Grafana**

   Dans `docker-compose.monitoring.yml` :
   ```yaml
   grafana:
     environment:
       - GF_SERVER_PROTOCOL=https
       - GF_SERVER_CERT_FILE=/etc/grafana/ssl/cert.pem
       - GF_SERVER_CERT_KEY=/etc/grafana/ssl/key.pem
   ```

3. **Limiter l'accès réseau**

   Utilisez des règles de pare-feu pour restreindre l'accès à :
   - Grafana (port 3001)
   - Prometheus (port 9090)

---

## 📊 Exemples de Requêtes PromQL

### Taux de requêtes par endpoint
```promql
rate(http_requests_total[5m])
```

### Latence P95 par route
```promql
histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))
```

### Taux d'erreurs
```promql
sum(rate(http_requests_total{status_code=~"5.."}[5m])) /
sum(rate(http_requests_total[5m]))
```

### Votes par élection
```promql
sum by (election_id) (votes_total)
```

### Connexions WebSocket
```promql
websocket_connections_active
```

### Mémoire utilisée
```promql
process_resident_memory_bytes / 1024 / 1024
```

---

## 🐛 Dépannage

### Prometheus ne scrape pas les métriques

1. Vérifiez que l'application tourne sur le port 3000
2. Testez l'accès direct : `curl http://localhost:3000/metrics`
3. Sur Windows/Mac, utilisez `host.docker.internal` au lieu de `localhost`
4. Vérifiez les logs : `docker logs evoting-prometheus`

### Grafana n'affiche pas de données

1. Vérifiez que Prometheus est connecté :
   - **Configuration** → **Data Sources** → **Prometheus**
   - Testez la connexion

2. Vérifiez les requêtes dans Prometheus :
   - Ouvrez [http://localhost:9090](http://localhost:9090)
   - Testez vos requêtes PromQL

3. Vérifiez que des données existent :
   - Il faut générer du trafic sur l'application

### Sentry ne capture pas les erreurs

1. Vérifiez les variables d'environnement :
   ```bash
   echo $SENTRY_DSN
   echo $VITE_SENTRY_DSN
   ```

2. Vérifiez la console du navigateur pour les warnings Sentry

3. Testez manuellement :
   ```javascript
   import { captureException } from './config/sentry';
   captureException(new Error('Test error'));
   ```

---

## 📚 Ressources

- [Documentation Sentry](https://docs.sentry.io/)
- [Documentation Prometheus](https://prometheus.io/docs/)
- [Documentation Grafana](https://grafana.com/docs/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)

---

## 🆘 Support

Pour toute question ou problème :
1. Consultez les logs : `docker-compose -f docker-compose.monitoring.yml logs`
2. Vérifiez la configuration dans `monitoring/`
3. Ouvrez une issue sur GitHub

---

**Version** : 1.0
**Dernière mise à jour** : 2025-01-04
