# 🛠️ Scripts E-Voting Platform

Ce répertoire contient tous les scripts d'administration et de maintenance de la plateforme.

## 📁 Organisation

### 🔧 Scripts de Configuration
- `generate-keys.js` - Génère les clés de chiffrement
- `generate-vapid.js` - Génère les clés VAPID pour push notifications

### 🗄️ Scripts de Base de Données
- `init-db.js` - Initialise la base de données SQLite
- `init-db-supabase.js` - Initialise Supabase
- `migrate.js` - Migration v1
- `migrate-v2.js` - Migration v2 avec nouvelles features
- `migrate-notifications.js` - Ajoute le système de notifications
- `migrate-indexes.js` - Ajoute les index manquants (optimisation)
- `add-indexes.sql` - SQL pour ajouter les index dans Supabase
- `test-supabase.js` - Teste la connexion Supabase

### 📊 Scripts de Monitoring
- `start-monitoring.sh` - Démarre le stack monitoring (Linux/Mac)
- `start-monitoring.ps1` - Démarre le stack monitoring (Windows)

### 📖 Documentation
- `optimize-queries.md` - Guide d'optimisation des requêtes SELECT *

---

## 🚀 Utilisation

### Configuration Initiale

```bash
# 1. Générer les clés de chiffrement
node scripts/generate-keys.js

# 2. Générer les clés VAPID pour notifications push
node scripts/generate-vapid.js

# 3. Initialiser la base de données Supabase
npm run init-db
# ou
node scripts/init-db-supabase.js
```

### Migrations

```bash
# Migration v2 (nouvelles fonctionnalités)
npm run migrate:v2

# Migration notifications
npm run migrate:notifications

# Ajouter les index d'optimisation
node scripts/migrate-indexes.js
# ou appliquer directement dans Supabase:
# Copier le contenu de add-indexes.sql dans SQL Editor
```

### Monitoring

```bash
# Linux/Mac
./scripts/start-monitoring.sh

# Windows
.\scripts\start-monitoring.ps1

# Ou via NPM
npm run monitoring:start
```

### Tests

```bash
# Tester la connexion Supabase
npm run test:supabase
# ou
node scripts/test-supabase.js
```

---

## 📝 Description Détaillée

### generate-keys.js
Génère une clé de chiffrement AES-256 (32 bytes) pour chiffrer les votes.

**Usage**:
```bash
node scripts/generate-keys.js
```

**Sortie**: Affiche la clé à ajouter dans `.env` comme `ENCRYPTION_KEY`

---

### generate-vapid.js
Génère les clés VAPID (Voluntary Application Server Identification) pour les push notifications Web Push.

**Usage**:
```bash
node scripts/generate-vapid.js
```

**Sortie**: Clés publique/privée à ajouter dans `.env`:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

---

### init-db-supabase.js
Initialise le schéma de base de données dans Supabase PostgreSQL.

**Usage**:
```bash
npm run init-db
```

**Actions**:
- Crée toutes les tables (users, elections, voters, etc.)
- Crée les index de base
- Vérifie la connexion

---

### migrate-v2.js
Migration majeure ajoutant:
- Support du vote pondéré
- Système de quorum
- Liste d'émargement
- Logs d'audit améliorés

**Usage**:
```bash
npm run migrate:v2
```

---

### migrate-notifications.js
Ajoute le système de notifications temps réel.

**Usage**:
```bash
npm run migrate:notifications
```

**Actions**:
- Crée la table `notifications`
- Configure les triggers
- Active les subscriptions

---

### migrate-indexes.js
Script Node.js pour ajouter 32 index d'optimisation.

**Usage**:
```bash
node scripts/migrate-indexes.js
```

**Actions**:
- Génère le fichier SQL `add-indexes.sql`
- Liste tous les index à créer
- Affiche les instructions pour Supabase

**Note**: Les index doivent être appliqués manuellement dans Supabase SQL Editor.

---

### add-indexes.sql
Fichier SQL prêt à l'emploi avec 32 index d'optimisation.

**Usage**:
1. Ouvrir Supabase SQL Editor
2. Copier/coller le contenu complet
3. Exécuter

**Impact**: Amélioration de 30-50% des performances des requêtes fréquentes.

---

### start-monitoring.sh / .ps1
Scripts pour démarrer le stack de monitoring (Prometheus + Grafana).

**Usage**:
```bash
# Linux/Mac
chmod +x scripts/start-monitoring.sh
./scripts/start-monitoring.sh

# Windows PowerShell
.\scripts\start-monitoring.ps1
```

**Actions**:
- Vérifie Docker
- Crée les répertoires nécessaires
- Lance `docker-compose -f docker-compose.monitoring.yml up -d`
- Affiche les URLs d'accès

---

### test-supabase.js
Teste la connexion à Supabase et affiche des statistiques.

**Usage**:
```bash
npm run test:supabase
```

**Affiche**:
- Status de connexion
- Nombre d'élections
- Nombre d'utilisateurs
- Nombre de votes
- Configuration réseau

---

## 🔒 Sécurité

### Fichiers Sensibles
**NE JAMAIS COMMITTER**:
- Clés générées (ENCRYPTION_KEY, VAPID_PRIVATE_KEY)
- Fichiers .env avec secrets réels

### Bonnes Pratiques
1. Générer de nouvelles clés pour chaque environnement (dev/staging/prod)
2. Sauvegarder les clés de production dans un vault sécurisé
3. Ne pas partager les clés via Slack/Email
4. Utiliser des variables d'environnement, jamais hardcoded

---

## 📚 Ressources

- [Documentation principale](../README.md)
- [Guide d'optimisation DB](../DATABASE_OPTIMIZATION_SUMMARY.md)
- [Guide monitoring](../MONITORING.md)
- [Guide rapide](../QUICK_START_OPTIMIZATIONS.md)

---

## 🆘 Problèmes Courants

### "Module not found"
```bash
# Installer les dépendances
npm install
```

### "Permission denied" (Linux/Mac)
```bash
# Rendre le script exécutable
chmod +x scripts/start-monitoring.sh
```

### "Connection refused" (Supabase)
```bash
# Vérifier .env
cat .env | grep SUPABASE

# Tester la connexion
npm run test:supabase
```

### Docker not found
```bash
# Installer Docker Desktop
# https://www.docker.com/products/docker-desktop
```

---

**Dernière mise à jour**: 2025-01-04
