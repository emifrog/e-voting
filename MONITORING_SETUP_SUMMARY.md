# 📊 Résumé de l'Intégration du Monitoring - E-Voting Platform

## ✅ Tâches Complétées

### 1. ✅ Métriques de Performance (server/middleware/metrics.js)
- **DÉJÀ FAIT** - Middleware existant pour capturer les métriques de performance HTTP

### 2. ✅ Intégration Sentry (Monitoring des Erreurs)

#### Backend
- ✅ Installation du package `@sentry/node`
- ✅ Création de [server/config/sentry.js](server/config/sentry.js)
- ✅ Intégration dans [server/index.js](server/index.js)
- ✅ Configuration des handlers pour capturer les erreurs automatiquement
- ✅ Filtrage des informations sensibles (tokens, passwords, etc.)

#### Frontend
- ✅ Installation du package `@sentry/react`
- ✅ Création de [src/config/sentry.js](src/config/sentry.js)
- ✅ Intégration dans [src/main.jsx](src/main.jsx)
- ✅ ErrorBoundary pour capturer les erreurs React
- ✅ Session Replay pour les sessions avec erreurs
- ✅ Performance monitoring avec Browser Tracing

### 3. ✅ Intégration Prometheus + Grafana (Métriques)

#### Prometheus Client
- ✅ Installation du package `prom-client`
- ✅ Création de [server/config/prometheus.js](server/config/prometheus.js)
- ✅ Middleware pour capturer les métriques HTTP automatiquement
- ✅ Métriques personnalisées pour :
  - Votes (counter)
  - Authentifications (counter)
  - Connexions WebSocket (gauge)
  - Élections (counter)
  - Rate limiting (counter)
  - Authentification 2FA (counter)
  - Latence base de données (histogram)
  - Erreurs (counter)

#### Docker Configuration
- ✅ [docker-compose.monitoring.yml](docker-compose.monitoring.yml) créé
- ✅ Services configurés :
  - Prometheus (port 9090)
  - Grafana (port 3001)
  - Node Exporter (port 9100) - optionnel pour métriques système

#### Prometheus Configuration
- ✅ [monitoring/prometheus/prometheus.yml](monitoring/prometheus/prometheus.yml)
- ✅ Configuration du scraping de l'application (toutes les 10s)
- ✅ Target configuré : `host.docker.internal:3000/metrics`

#### Grafana Configuration
- ✅ Datasource Prometheus auto-provisionné
- ✅ Dashboard E-Voting Platform créé avec 10 panels :
  1. Taux de requêtes HTTP
  2. Latence P95
  3. Votes par minute
  4. Connexions WebSocket actives
  5. Taux d'erreurs
  6. Latence base de données P95
  7. Tentatives d'authentification
  8. Rate limiting
  9. CPU Usage
  10. Memory Usage

### 4. ✅ Documentation

- ✅ [MONITORING.md](MONITORING.md) - Guide complet de monitoring
  - Configuration Sentry
  - Configuration Prometheus + Grafana
  - Utilisation des dashboards
  - Requêtes PromQL
  - Dépannage
  - Meilleures pratiques production

- ✅ [monitoring/README.md](monitoring/README.md) - Guide rapide

- ✅ Scripts de démarrage :
  - [scripts/start-monitoring.sh](scripts/start-monitoring.sh) (Linux/Mac)
  - [scripts/start-monitoring.ps1](scripts/start-monitoring.ps1) (Windows)

- ✅ Scripts NPM ajoutés au [package.json](package.json) :
  ```bash
  npm run monitoring:start    # Démarrer
  npm run monitoring:stop     # Arrêter
  npm run monitoring:logs     # Voir les logs
  npm run monitoring:restart  # Redémarrer
  ```

- ✅ [.env.example](.env.example) mis à jour avec variables Sentry

---

## 🚀 Comment Utiliser

### Démarrage Complet

1. **Configurer Sentry** (optionnel mais recommandé)
   ```bash
   # Créer un compte sur https://sentry.io
   # Créer 2 projets : Backend (Node.js) et Frontend (React)
   # Ajouter les DSN dans .env
   SENTRY_DSN=https://...
   VITE_SENTRY_DSN=https://...
   ```

2. **Démarrer le monitoring**
   ```bash
   npm run monitoring:start
   ```

3. **Démarrer l'application**
   ```bash
   npm run dev
   ```

4. **Accéder aux interfaces**
   - Application : http://localhost:5173
   - Métriques : http://localhost:3000/metrics
   - Prometheus : http://localhost:9090
   - Grafana : http://localhost:3001 (admin / admin123)

---

## 📊 Architecture du Monitoring

```
┌─────────────────────────────────────────────────────────────┐
│                     E-Voting Application                     │
│  ┌─────────────────┐              ┌─────────────────┐      │
│  │   Frontend      │              │    Backend      │      │
│  │   (React)       │              │   (Express)     │      │
│  │                 │              │                 │      │
│  │ • Sentry SDK    │              │ • Sentry SDK    │      │
│  │ • Error tracking│              │ • Error Handler │      │
│  │ • Performance   │              │ • Prometheus    │      │
│  └────────┬────────┘              │   Metrics       │      │
│           │                       └────────┬────────┘      │
│           │                                │               │
│           │ Errors                         │ Metrics       │
│           ▼                                ▼               │
│  ┌─────────────────────────────────────────────────┐      │
│  │              Sentry.io (Cloud)                   │      │
│  │  • Error Aggregation                             │      │
│  │  • Performance Monitoring                        │      │
│  │  • Session Replay                                │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                                   │
                                   │ HTTP /metrics
                                   ▼
                    ┌──────────────────────────┐
                    │      Prometheus          │
                    │  • Time-series DB        │
                    │  • Scraping /metrics     │
                    │  • Storage               │
                    └────────────┬─────────────┘
                                 │
                                 │ PromQL
                                 ▼
                    ┌──────────────────────────┐
                    │        Grafana           │
                    │  • Dashboards            │
                    │  • Visualizations        │
                    │  • Alerting              │
                    └──────────────────────────┘
```

---

## 📈 Métriques Collectées

### Métriques HTTP
- `http_requests_total` - Nombre total de requêtes
- `http_request_duration_ms` - Durée des requêtes (histogram)

### Métriques E-Voting
- `votes_total` - Votes enregistrés
- `auth_attempts_total` - Tentatives d'authentification
- `websocket_connections_active` - Connexions WebSocket
- `elections_total` - Élections créées
- `voters_registered_total` - Électeurs enregistrés

### Métriques de Sécurité
- `rate_limit_hits_total` - Requêtes bloquées par rate limiting
- `two_factor_auth_total` - Tentatives 2FA
- `errors_total` - Erreurs par type

### Métriques Système
- `process_cpu_seconds_total` - CPU
- `process_resident_memory_bytes` - Mémoire
- `nodejs_heap_size_total_bytes` - Heap Node.js

---

## 🔧 Configuration Avancée

### Ajouter une métrique personnalisée

```javascript
// Dans server/config/prometheus.js
import client from 'prom-client';

export const myMetric = new client.Counter({
  name: 'my_custom_metric',
  help: 'Description',
  labelNames: ['label1'],
  registers: [register]
});

// Utilisation
myMetric.inc({ label1: 'value1' });
```

### Capturer une erreur manuellement

```javascript
// Backend
import { captureException } from './config/sentry.js';
captureException(new Error('Something went wrong'), {
  extra: { context: 'Additional info' }
});

// Frontend
import { captureException } from './config/sentry';
captureException(error, { extra: { userId: user.id } });
```

---

## 🔍 Troubleshooting

### Prometheus ne collecte pas de métriques
1. Vérifier que l'app tourne : http://localhost:3000/metrics
2. Vérifier les logs : `npm run monitoring:logs`
3. Vérifier les targets dans Prometheus : http://localhost:9090/targets

### Grafana n'affiche pas de données
1. Vérifier la datasource : Configuration → Data Sources → Test
2. Vérifier que Prometheus a des données : http://localhost:9090
3. Générer du trafic sur l'application

### Sentry ne capture pas d'erreurs
1. Vérifier les variables d'environnement `.env`
2. Vérifier la console navigateur pour warnings
3. Tester manuellement : `captureException(new Error('test'))`

---

## 📦 Fichiers Créés/Modifiés

### Nouveaux Fichiers
- `server/config/sentry.js`
- `server/config/prometheus.js`
- `src/config/sentry.js`
- `docker-compose.monitoring.yml`
- `monitoring/prometheus/prometheus.yml`
- `monitoring/grafana/provisioning/datasources/prometheus.yml`
- `monitoring/grafana/provisioning/dashboards/dashboard.yml`
- `monitoring/grafana/dashboards/evoting-dashboard.json`
- `monitoring/README.md`
- `monitoring/.gitignore`
- `scripts/start-monitoring.sh`
- `scripts/start-monitoring.ps1`
- `MONITORING.md`
- `MONITORING_SETUP_SUMMARY.md` (ce fichier)

### Fichiers Modifiés
- `server/index.js` - Intégration Sentry + Prometheus
- `src/main.jsx` - Intégration Sentry frontend
- `package.json` - Ajout des scripts monitoring
- `.env.example` - Ajout variables Sentry

---

## 🎯 Prochaines Étapes Recommandées

### Production Ready
1. **Sécurité**
   - [ ] Changer le mot de passe Grafana par défaut
   - [ ] Ajouter l'authentification sur `/metrics`
   - [ ] Configurer HTTPS pour Grafana
   - [ ] Limiter l'accès réseau (firewall)

2. **Alerting**
   - [ ] Configurer des alertes Grafana
   - [ ] Configurer des alertes Sentry
   - [ ] Intégrer avec Slack/PagerDuty/Email

3. **Rétention des Données**
   - [ ] Configurer la rétention Prometheus
   - [ ] Configurer des backups Grafana
   - [ ] Mettre en place une politique de rétention

4. **Performance**
   - [ ] Ajuster les intervalles de scraping
   - [ ] Optimiser les requêtes PromQL
   - [ ] Ajouter des indexes sur les métriques fréquentes

---

## 📚 Documentation de Référence

- **Guide Complet** : [MONITORING.md](MONITORING.md)
- **Guide Rapide** : [monitoring/README.md](monitoring/README.md)
- **Sentry Docs** : https://docs.sentry.io/
- **Prometheus Docs** : https://prometheus.io/docs/
- **Grafana Docs** : https://grafana.com/docs/
- **prom-client** : https://github.com/siimon/prom-client

---

**✅ L'intégration du monitoring est complète et prête à l'emploi !**

Pour démarrer : `npm run monitoring:start` puis `npm run dev`
