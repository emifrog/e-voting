#!/bin/bash

# Script pour démarrer la stack de monitoring
# E-Voting Platform

set -e

echo "🚀 Démarrage de la stack de monitoring E-Voting..."
echo ""

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez installer Docker Desktop."
    exit 1
fi

# Vérifier que Docker Compose est installé
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé."
    exit 1
fi

# Créer les répertoires nécessaires s'ils n'existent pas
echo "📁 Vérification des répertoires..."
mkdir -p monitoring/prometheus
mkdir -p monitoring/grafana/provisioning/datasources
mkdir -p monitoring/grafana/provisioning/dashboards
mkdir -p monitoring/grafana/dashboards

# Démarrer les conteneurs
echo "🐳 Démarrage des conteneurs Docker..."
if docker compose version &> /dev/null; then
    docker compose -f docker-compose.monitoring.yml up -d
else
    docker-compose -f docker-compose.monitoring.yml up -d
fi

echo ""
echo "✅ Stack de monitoring démarrée avec succès !"
echo ""
echo "📊 Accès aux services :"
echo "  - Prometheus : http://localhost:9090"
echo "  - Grafana    : http://localhost:3001 (admin / admin123)"
echo "  - Métriques  : http://localhost:3000/metrics"
echo ""
echo "📖 Pour plus d'informations, consultez MONITORING.md"
echo ""
echo "💡 Commandes utiles :"
echo "  - Arrêter     : docker-compose -f docker-compose.monitoring.yml down"
echo "  - Logs        : docker-compose -f docker-compose.monitoring.yml logs -f"
echo "  - Redémarrer  : docker-compose -f docker-compose.monitoring.yml restart"
echo ""
