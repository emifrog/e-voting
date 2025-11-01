# Installation Complète - E-Voting v2.1.0

Guide complet pour installer et configurer la plateforme E-Voting avec toutes les fonctionnalités de la version 2.1.0.

## Table des Matières

1. [Prérequis](#prérequis)
2. [Installation Backend](#installation-backend)
3. [Installation Frontend](#installation-frontend)
4. [Configuration](#configuration)
5. [Base de Données](#base-de-données)
6. [Notifications Temps Réel](#notifications-temps-réel)
7. [Web Push](#web-push)
8. [Production](#production)
9. [Vérification](#vérification)

---

## Prérequis

### Logiciels Requis

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **SQLite**: >= 3.35.0 (ou PostgreSQL pour production)
- **Git**: >= 2.30.0

### Vérifier les Versions

```bash
node --version   # v18.0.0+
npm --version    # 9.0.0+
sqlite3 --version # 3.35.0+
```

---

## Installation Backend

### 1. Cloner le Projet

```bash
git clone https://github.com/votre-org/evoting.git
cd evoting
```

### 2. Installer les Dépendances

```bash
npm install
```

**Dépendances principales**:
- `express` - Framework web
- `socket.io` - WebSocket temps réel
- `web-push` - Notifications Push
- `jsonwebtoken` - Authentification JWT
- `bcrypt` - Hachage des mots de passe
- `nodemailer` - Envoi d'emails
- `helmet` - Sécurité HTTP
- `express-rate-limit` - Rate limiting
- `speakeasy` - 2FA/TOTP
- `qrcode` - Génération QR codes

---

## Installation Frontend

Les dépendances frontend sont incluses dans le même `package.json`.

**Dépendances principales**:
- `react` - UI framework
- `react-router-dom` - Routing
- `socket.io-client` - Client WebSocket
- `axios` - HTTP client
- `lucide-react` - Icônes
- `recharts` - Graphiques
- `vite` - Build tool

---

## Configuration

### 1. Créer le Fichier .env

Copiez le template et modifiez les valeurs:

```bash
cp .env.example .env
```

### 2. Configurer les Variables d'Environnement

Éditez `.env`:

```env
# === Application ===
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:5173

# === Base de Données ===
DATABASE_URL=./server/database/database.db
# Pour PostgreSQL (production):
# DATABASE_URL=postgresql://user:password@localhost:5432/evoting

# === Sécurité ===
# Génération: openssl rand -base64 32
JWT_SECRET=votre-secret-jwt-32-caracteres-minimum

# Génération: node -e "console.log(require('crypto').randomBytes(32).toString('utf8'))"
ENCRYPTION_KEY=exactement-32-bytes-pour-AES256

# === Email ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-app
EMAIL_FROM=E-Voting <noreply@evoting.com>

# === Rate Limiting ===
RATE_LIMIT_WINDOW_MS=900000        # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100        # 100 requêtes

# === Web Push (VAPID) ===
# Génération: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=votre-cle-publique-vapid
VAPID_PRIVATE_KEY=votre-cle-privee-vapid
ADMIN_EMAIL=admin@evoting.com
```

### 3. Générer les Clés de Sécurité

**JWT Secret**:
```bash
openssl rand -base64 32
```

**Encryption Key (exactement 32 bytes)**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('utf8').substring(0, 32))"
```

**VAPID Keys (Web Push)**:
```bash
npx web-push generate-vapid-keys
```

Copiez les résultats dans `.env`.

---

## Base de Données

### 1. Créer la Base de Données

```bash
cd server/database
sqlite3 database.db < schema.sql
```

### 2. Créer les Tables Supplémentaires

```bash
# Table des notifications
sqlite3 database.db < create-notifications-table.sql

# Table des subscriptions Push
sqlite3 database.db < create-push-subscriptions-table.sql
```

### 3. Vérifier la Structure

```bash
sqlite3 database.db ".schema"
```

**Tables attendues**:
- `users` - Comptes administrateurs
- `elections` - Élections
- `election_options` - Options de vote
- `voters` - Électeurs
- `ballots` - Bulletins anonymes
- `public_votes` - Votes publics
- `attendance_list` - Liste d'émargement
- `audit_logs` - Logs d'audit
- `observers` - Observateurs
- `notifications` - Notifications
- `push_subscriptions` - Subscriptions Push

---

## Notifications Temps Réel

### 1. Installer Socket.IO

```bash
npm install socket.io socket.io-client
```

### 2. Vérifier l'Intégration

Fichiers à vérifier:
- ✅ `server/services/websocket.js` - Service WebSocket
- ✅ `server/index.js` - Initialisation WebSocket
- ✅ `src/contexts/NotificationContext.jsx` - Client WebSocket
- ✅ `src/App.jsx` - Provider intégré

### 3. Tester la Connexion

Démarrez le serveur et vérifiez les logs:

```bash
npm run dev
# Chercher: "🚀 WebSocket server initialized"
```

**Voir**: [NOTIFICATIONS_TEMPS_REEL.md](./NOTIFICATIONS_TEMPS_REEL.md) pour la documentation complète.

---

## Web Push

### 1. Installer web-push

```bash
npm install web-push
```

### 2. Générer les Clés VAPID

```bash
npx web-push generate-vapid-keys
```

Ajoutez dans `.env`:
```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
ADMIN_EMAIL=admin@evoting.com
```

### 3. Vérifier l'Intégration

Fichiers à vérifier:
- ✅ `public/sw.js` - Service Worker
- ✅ `server/services/webPush.js` - Service Push backend
- ✅ `server/routes/push.js` - Routes API Push
- ✅ `src/utils/webPush.js` - Utilitaires frontend
- ✅ `src/contexts/NotificationContext.jsx` - Intégration Push

### 4. Tester Push

```bash
# Démarrer l'application
npm run dev

# Activer Push dans l'interface
# Tester via API:
curl -X POST http://localhost:3000/api/push/test \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

**Voir**: [WEB_PUSH_IMPLEMENTATION.md](./WEB_PUSH_IMPLEMENTATION.md) pour la documentation complète.

---

## Production

### 1. Build Frontend

```bash
npm run build
```

Cela créé `dist/` avec les fichiers statiques optimisés.

### 2. Variables d'Environnement Production

```env
NODE_ENV=production
PORT=3000
APP_URL=https://votre-domaine.com

# Base de données PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/evoting

# Sécurité renforcée
JWT_SECRET=secret-tres-securise-64-caracteres-minimum
ENCRYPTION_KEY=exactement-32-bytes-tres-securises

# SMTP production
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASSWORD=votre-api-key-sendgrid

# Rate limiting strict
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
```

### 3. Servir l'Application

```bash
# Avec PM2 (recommandé)
npm install -g pm2
pm2 start server/index.js --name evoting
pm2 save
pm2 startup

# Ou avec Node directement
NODE_ENV=production node server/index.js
```

### 4. Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    # Redirection HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Fichiers statiques
    location / {
        root /path/to/evoting/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. Sécurité Production

**Headers HTTP** (déjà configurés dans Helmet):
- ✅ Content Security Policy
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff

**Rate Limiting** (déjà configuré):
- ✅ Général: 100 req/15min
- ✅ Auth: 5 req/15min
- ✅ Vote: 3 req/min

**Validation** (déjà implémentée):
- ✅ Variables d'environnement au démarrage
- ✅ ENCRYPTION_KEY = 32 bytes
- ✅ JWT_SECRET >= 32 caractères

---

## Vérification

### Checklist Post-Installation

**Backend**:
```bash
# Démarrer le serveur
npm start

# Vérifier les logs
✅ ✅ Validation des variables d'environnement: OK
✅ 🚀 WebSocket server initialized
✅ Server: http://localhost:3000
```

**Frontend**:
```bash
# Démarrer Vite
npm run dev

# Ouvrir http://localhost:5173
✅ Page de login s'affiche
✅ Aucune erreur console
```

**Base de Données**:
```bash
sqlite3 database.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table';"
# Résultat: 12 (nombre de tables)
```

**WebSocket**:
```bash
# Connectez-vous à l'app
# Console navigateur:
✅ ✅ WebSocket connected
```

**Web Push**:
```bash
# Activez Push dans l'interface
# Console navigateur:
✅ ✅ Service Worker registered: /
✅ ✅ Push notifications enabled
```

### Tests Fonctionnels

1. **Créer un compte admin**:
   - Aller sur `/register`
   - Créer un compte
   - Se connecter

2. **Créer une élection**:
   - Cliquer "Nouvelle élection"
   - Remplir le formulaire
   - Ajouter des options
   - Créer

3. **Ajouter des électeurs**:
   - Ouvrir l'élection
   - "Ajouter des électeurs"
   - Saisir emails
   - Sauvegarder

4. **Tester les notifications**:
   - Démarrer l'élection
   - ✅ Notification "Élection démarrée"
   - Voter (autre onglet)
   - ✅ Notification "Vote reçu"

5. **Tester Web Push**:
   - Activer Push
   - Fermer l'application
   - Voter via API
   - ✅ Notification système

**Voir**: [TEST_NOTIFICATIONS.md](./TEST_NOTIFICATIONS.md) pour les tests complets.

---

## Dépannage

### Erreur: ENCRYPTION_KEY invalide

```
❌ ENCRYPTION_KEY doit faire exactement 32 bytes (actuellement: XX bytes)
```

**Solution**:
```bash
# Générer une clé de 32 bytes exactement
node -e "console.log(require('crypto').randomBytes(32).toString('utf8').substring(0, 32))"
```

### Erreur: WebSocket CORS

```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution**: Vérifier `APP_URL` dans `.env`:
```env
APP_URL=http://localhost:5173  # Doit matcher l'URL frontend
```

### Erreur: Push subscription failed

```
❌ Push subscription failed: No valid VAPID key
```

**Solution**: Générer et configurer VAPID:
```bash
npx web-push generate-vapid-keys
# Copier dans .env
```

### Base de données verrouillée

```
SQLITE_BUSY: database is locked
```

**Solution**:
```bash
# Fermer toutes les connexions
pkill -f sqlite3

# Ou utiliser PostgreSQL en production
```

---

## Ressources

### Documentation

- [README.md](./README.md) - Vue d'ensemble
- [NOTIFICATIONS_TEMPS_REEL.md](./NOTIFICATIONS_TEMPS_REEL.md) - WebSocket
- [WEB_PUSH_IMPLEMENTATION.md](./WEB_PUSH_IMPLEMENTATION.md) - Web Push
- [TEST_NOTIFICATIONS.md](./TEST_NOTIFICATIONS.md) - Tests
- [LAZY_LOADING_IMPLEMENTATION.md](./LAZY_LOADING_IMPLEMENTATION.md) - Performance

### API

- Swagger UI: `http://localhost:3000/api-docs` (si configuré)
- Health check: `http://localhost:3000/api/health`
- VAPID key: `http://localhost:3000/api/push/vapid-public-key`

### Support

- Issues GitHub: https://github.com/anthropics/evoting/issues
- Email: support@evoting.com

---

## Mise à Jour

Pour mettre à jour vers la dernière version:

```bash
git pull origin main
npm install
npm run build
pm2 restart evoting
```

---

**Version**: 2.1.0
**Date**: 2025-10-18
**Auteur**: Claude Code
