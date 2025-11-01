# 🗳️ E-Voting Platform avec Supabase

Plateforme de vote en ligne sécurisée, fiable et démocratique pour tous types de scrutins, utilisant **Supabase** (PostgreSQL) comme base de données.

## ✨ Fonctionnalités

### 📊 Capacités
- ✅ Jusqu'à 30 000 votants
- ✅ Votes secrets (ultra-sécurisé avec chiffrement)
- ✅ Votes non anonymes (publics)
- ✅ Votes pondérés (poids différents par électeur)
- ✅ Contrôle automatique de l'intégrité
- ✅ Personnalisation avancée
- ✅ Import de fichiers CSV
- ✅ QR Codes pour voter
- ✅ Envoi d'emails automatique
- ✅ **Base de données cloud Supabase**
- ✅ **Scalabilité illimitée**

### 🗳️ Types de vote
- **Question simple** : Un seul choix parmi plusieurs options
- **Vote par approbation** : Plusieurs choix possibles
- **Vote par ordre de préférence** : Classement des options (méthode Borda)
- **Scrutin de liste** : Vote pour une liste complète

### ⚙️ Administration
- 👁️ Observateurs / Scrutateurs avec accès contrôlé
- 📝 Liste d'émargement automatique
- 📧 Envoi de rappels automatique
- ⏰ Démarrage planifié
- 🔒 Dépouillement différé
- 📊 Statistiques en temps réel
- 🔍 Audit trail complet

## 🚀 Installation

### Prérequis
- Node.js 18+
- npm ou yarn
- Un compte Supabase (gratuit)

### Étape 1 : Cloner le projet

```bash
git clone <repository-url>
cd Evoting
```

### Étape 2 : Installer les dépendances

```bash
npm install
```

### Étape 3 : Configurer Supabase

📘 **Guide complet** : Consultez [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

**Résumé rapide :**

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Récupérez vos informations de connexion :
   - URL du projet
   - Clé anon publique
   - Connection string

3. Copiez le fichier d'exemple :
```bash
cp .env.example .env
```

4. Modifiez `.env` avec vos informations :
```env
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
DATABASE_URL=postgresql://postgres:VOTRE_PASSWORD@db.xxxxx.supabase.co:5432/postgres

# Email (Gmail exemple)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=votre-mot-de-passe-app

# Sécurité (changez en production!)
JWT_SECRET=votre-secret-jwt-tres-long
ENCRYPTION_KEY=votre-cle-32-caracteres-exact
```

### Étape 4 : Créer les tables

1. Ouvrez Supabase Dashboard → **SQL Editor**
2. Copiez le contenu de `server/database/supabase-schema.sql`
3. Collez et exécutez le script

### Étape 5 : Lancer la migration

```bash
npm run migrate
```

Cela va :
- Vérifier la connexion
- Créer un compte admin par défaut
- Afficher les statistiques

### Étape 6 : Démarrer l'application

```bash
npm run dev
```

L'application sera accessible à :
- Frontend : **http://localhost:5173**
- Backend API : **http://localhost:3000**

## 📖 Guide d'utilisation rapide

### 1. Première connexion

- Email : `admin@evoting.local`
- Mot de passe : `admin123`

⚠️ **Changez ce mot de passe immédiatement !**

### 2. Créer une élection

1. Cliquez sur **"Nouvelle élection"**
2. Remplissez le formulaire
3. Choisissez le type de scrutin
4. Ajoutez les options de vote

### 3. Ajouter des électeurs

**Option A** : Manuellement via l'interface

**Option B** : Import CSV

Créez un fichier `electeurs.csv` :
```csv
email,name,weight
voter1@example.com,Jean Dupont,1.0
voter2@example.com,Marie Martin,1.0
```

Importez-le dans l'interface.

### 4. Envoyer les invitations

1. Configurez l'email dans `.env`
2. Cliquez sur **"Envoyer les emails"**
3. Chaque électeur reçoit :
   - Un lien personnel
   - Un QR Code

### 5. Démarrer et gérer le vote

- **Démarrer** : Clic sur "Démarrer"
- **Suivre** : Statistiques en temps réel
- **Rappels** : Envoi automatique aux non-votants
- **Clôturer** : Arrêt et calcul des résultats

## 🔐 Sécurité avec Supabase

### Avantages

✅ **PostgreSQL** : Base de données robuste et sécurisée
✅ **Chiffrement** : SSL/TLS par défaut
✅ **Backups automatiques** : Sauvegarde quotidienne
✅ **Row Level Security** : Permissions granulaires
✅ **Audit logs** : Traçabilité complète
✅ **Isolation** : Chaque projet est isolé

### Configuration de sécurité

**Pour la production, CHANGEZ :**

```env
# Générées aléatoirement
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")

# Utilisez HTTPS
APP_URL=https://votre-domaine.com
NODE_ENV=production
```

## 📊 Architecture

### Backend (Node.js + Express)
```
server/
├── database/
│   ├── supabase.js          # Client Supabase
│   ├── db.js                # Adaptateur SQLite → PostgreSQL
│   └── supabase-schema.sql  # Schéma PostgreSQL
├── middleware/              # Auth, validation
├── routes/                  # API REST
├── services/                # Email, QR, vote, scheduler
└── utils/                   # Crypto, helpers
```

### Frontend (React + Vite)
```
src/
├── pages/                   # Login, Dashboard, Vote...
├── utils/                   # API client
└── index.css                # Styles
```

### Base de données (Supabase/PostgreSQL)
- `users` : Administrateurs
- `elections` : Élections/scrutins
- `election_options` : Options de vote
- `voters` : Liste électorale
- `ballots` : Bulletins secrets (chiffrés)
- `public_votes` : Votes publics
- `observers` : Observateurs
- `attendance_list` : Émargement
- `audit_logs` : Journaux d'audit
- `scheduled_tasks` : Tâches planifiées

## 🌐 Déploiement

### Variables d'environnement

```env
NODE_ENV=production
APP_URL=https://votre-domaine.com

# Supabase (depuis le dashboard)
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
DATABASE_URL=...

# Secrets (générés aléatoirement)
JWT_SECRET=...
ENCRYPTION_KEY=...

# Email (configuré avec votre fournisseur)
EMAIL_HOST=...
EMAIL_USER=...
EMAIL_PASSWORD=...
```

### Build

```bash
npm run build
```

### Démarrer en production

```bash
NODE_ENV=production node server/index.js
```

## 📈 Monitoring avec Supabase

### Dashboard Supabase

- **Table Editor** : Voir les données en direct
- **SQL Editor** : Requêtes personnalisées
- **Database** : Statistiques et performances
- **Logs** : Logs de requêtes SQL
- **Reports** : Rapport d'utilisation

### Statistiques disponibles

```sql
-- Nombre total de votes
SELECT COUNT(*) FROM ballots;

-- Taux de participation par élection
SELECT
  e.title,
  COUNT(DISTINCT v.id) as total_voters,
  COUNT(DISTINCT CASE WHEN v.has_voted THEN v.id END) as voted,
  ROUND(COUNT(DISTINCT CASE WHEN v.has_voted THEN v.id END) * 100.0 / COUNT(DISTINCT v.id), 2) as participation_rate
FROM elections e
LEFT JOIN voters v ON e.id = v.election_id
GROUP BY e.id, e.title;
```

## 🛠️ Scripts disponibles

```bash
# Développement
npm run dev          # Lance backend + frontend
npm run server       # Backend seul
npm run client       # Frontend seul

# Production
npm run build        # Build du frontend
npm start            # Lance le serveur de production

# Base de données
npm run migrate      # Vérification et migration Supabase
```

## 📚 Documentation

- 📘 [SUPABASE_SETUP.md](SUPABASE_SETUP.md) - Guide de configuration Supabase
- 📗 [GUIDE_UTILISATION.md](GUIDE_UTILISATION.md) - Guide utilisateur complet
- 📙 [SECURITE.md](SECURITE.md) - Guide de sécurité

## 🆘 Support & Dépannage

### Problèmes courants

**❌ Erreur de connexion**
```bash
# Vérifier la configuration
npm run migrate
```

**❌ Tables inexistantes**
```
Exécutez supabase-schema.sql dans Supabase Dashboard
```

**❌ Emails non envoyés**
```
Vérifiez EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD dans .env
```

### Ressources

- Documentation Supabase : https://supabase.com/docs
- PostgreSQL : https://www.postgresql.org/docs/
- Node.js : https://nodejs.org/docs/

## 💾 Backup et restauration

### Backup automatique

Supabase effectue des backups automatiques quotidiens (plan Pro).

### Backup manuel

```bash
# Export SQL via Supabase Dashboard
# Database → Backups → Create backup

# Ou via pg_dump
pg_dump $DATABASE_URL > backup.sql
```

### Restauration

```bash
psql $DATABASE_URL < backup.sql
```

## 📊 Limites Supabase

### Plan gratuit

- Database : 500 MB
- Storage : 1 GB
- Bandwidth : 5 GB/mois
- API Requests : 50,000/mois

### Estimation pour E-Voting

**30,000 électeurs** ≈ 50-100 MB

Largement suffisant pour démarrer !

## 🎯 Cas d'usage

- Élections associatives
- Votes en assemblée générale
- Sondages internes d'entreprise
- Consultations citoyennes
- Votes d'étudiants
- Décisions collectives

## 📄 Licence

MIT License - Libre d'utilisation

---

**Construit avec ❤️ pour la démocratie participative**

**Propulsé par Supabase 🚀**
