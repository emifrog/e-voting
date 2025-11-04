# Script PowerShell pour démarrer la stack de monitoring
# E-Voting Platform

Write-Host "🚀 Démarrage de la stack de monitoring E-Voting..." -ForegroundColor Cyan
Write-Host ""

# Vérifier que Docker est installé
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerInstalled) {
    Write-Host "❌ Docker n'est pas installé. Veuillez installer Docker Desktop." -ForegroundColor Red
    exit 1
}

# Vérifier que Docker Compose est disponible
$composeInstalled = (docker compose version 2>&1) -or (Get-Command docker-compose -ErrorAction SilentlyContinue)
if (-not $composeInstalled) {
    Write-Host "❌ Docker Compose n'est pas disponible." -ForegroundColor Red
    exit 1
}

# Créer les répertoires nécessaires s'ils n'existent pas
Write-Host "📁 Vérification des répertoires..." -ForegroundColor Yellow
$directories = @(
    "monitoring\prometheus",
    "monitoring\grafana\provisioning\datasources",
    "monitoring\grafana\provisioning\dashboards",
    "monitoring\grafana\dashboards"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Démarrer les conteneurs
Write-Host "🐳 Démarrage des conteneurs Docker..." -ForegroundColor Yellow

try {
    docker compose -f docker-compose.monitoring.yml up -d
} catch {
    docker-compose -f docker-compose.monitoring.yml up -d
}

Write-Host ""
Write-Host "✅ Stack de monitoring démarrée avec succès !" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Accès aux services :" -ForegroundColor Cyan
Write-Host "  - Prometheus : http://localhost:9090"
Write-Host "  - Grafana    : http://localhost:3001 (admin / admin123)"
Write-Host "  - Métriques  : http://localhost:3000/metrics"
Write-Host ""
Write-Host "📖 Pour plus d'informations, consultez MONITORING.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Commandes utiles :" -ForegroundColor Cyan
Write-Host "  - Arrêter     : docker-compose -f docker-compose.monitoring.yml down"
Write-Host "  - Logs        : docker-compose -f docker-compose.monitoring.yml logs -f"
Write-Host "  - Redémarrer  : docker-compose -f docker-compose.monitoring.yml restart"
Write-Host ""
