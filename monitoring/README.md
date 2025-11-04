# 📊 Monitoring Configuration

Ce répertoire contient toute la configuration pour le monitoring de l'application E-Voting.

## 📁 Structure

```
monitoring/
├── prometheus/
│   └── prometheus.yml          # Configuration Prometheus
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/        # Sources de données Grafana
│   │   │   └── prometheus.yml
│   │   └── dashboards/         # Configuration auto-provisioning
│   │       └── dashboard.yml
│   └── dashboards/             # Dashboards Grafana JSON
│       └── evoting-dashboard.json
└── README.md                   # Ce fichier
```

## 🚀 Démarrage Rapide

### 1. Démarrer tous les services

```bash
# Depuis la racine du projet
npm run monitoring:start

# Ou directement avec Docker Compose
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. Accéder aux interfaces

- **Prometheus** : http://localhost:9090
- **Grafana** : http://localhost:3001
  - Utilisateur : `admin`
  - Mot de passe : `admin123`
- **Métriques App** : http://localhost:3000/metrics

### 3. Arrêter les services

```bash
npm run monitoring:stop
```

## 🔧 Configuration

### Prometheus

Le fichier `prometheus/prometheus.yml` définit :
- Les targets à scraper
- L'intervalle de scraping (15s par défaut)
- Les labels des métriques

Pour modifier la configuration, éditez ce fichier puis redémarrez :
```bash
npm run monitoring:restart
```

### Grafana

Les dashboards sont automatiquement provisionnés au démarrage depuis `grafana/dashboards/`.

Pour ajouter un nouveau dashboard :
1. Créez-le dans l'interface Grafana
2. Exportez-le en JSON
3. Placez le fichier dans `grafana/dashboards/`
4. Redémarrez Grafana

## 📈 Métriques Disponibles

Consultez le fichier `MONITORING.md` à la racine du projet pour la liste complète des métriques.

## 🔍 PromQL Exemples

```promql
# Taux de requêtes HTTP
rate(http_requests_total[5m])

# Latence P95
histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))

# Votes par minute
rate(votes_total[5m]) * 60

# Taux d'erreur
sum(rate(errors_total[5m])) / sum(rate(http_requests_total[5m]))
```

## 📚 Ressources

- [Documentation complète](../MONITORING.md)
- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [PromQL Guide](https://prometheus.io/docs/prometheus/latest/querying/basics/)
