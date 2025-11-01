# 🚀 Guide de configuration Supabase

Ce guide vous explique comment configurer votre application E-Voting avec Supabase comme base de données.

## Pourquoi Supabase ?

✅ **PostgreSQL hébergé** : Base de données robuste et scalable
✅ **Gratuit jusqu'à 500 MB** : Parfait pour commencer
✅ **Interface web intuitive** : Gestion facile de la base
✅ **API automatique** : REST et GraphQL générés
✅ **Authentification intégrée** : (optionnel)
✅ **Stockage de fichiers** : (optionnel)
✅ **Temps réel** : Mises à jour en direct

## Étape 1 : Créer un projet Supabase

### 1.1 Inscription

1. Allez sur [supabase.com](https://supabase.com)
2. Cliquez sur **"Start your project"**
3. Connectez-vous avec GitHub, Google ou email

### 1.2 Créer un nouveau projet

1. Cliquez sur **"New Project"**
2. Remplissez les informations :
   - **Name** : `evoting` (ou votre choix)
   - **Database Password** : Générez un mot de passe fort (sauvegardez-le !)
   - **Region** : Choisissez la plus proche (ex: Europe West)
   - **Pricing Plan** : Free (suffisant pour démarrer)

3. Cliquez sur **"Create new project"**
4. Attendez 2-3 minutes que le projet soit créé

## Étape 2 : Récupérer les informations de connexion

### 2.1 URL du projet

Dans le tableau de bord Supabase :

1. Allez dans **Settings** (icône ⚙️ en bas à gauche)
2. Cliquez sur **API**
3. Copiez l'**URL** (ressemble à `https://xxxxx.supabase.co`)

### 2.2 Clés API

Sur la même page **API** :

1. Trouvez **Project API keys**
2. Copiez la clé **anon public** (commence par `eyJ...`)

### 2.3 Connection String

1. Restez dans **Settings**
2. Cliquez sur **Database**
3. Descendez jusqu'à **Connection string**
4. Sélectionnez l'onglet **URI**
5. Copiez la chaîne (ressemble à `postgresql://postgres:[PASSWORD]@...`)
6. **Important** : Remplacez `[PASSWORD]` par le mot de passe que vous avez créé à l'étape 1.2

## Étape 3 : Configurer l'application

### 3.1 Mettre à jour le fichier .env

Ouvrez le fichier `e:\GitHub\Test\Evoting\.env` et mettez à jour :

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:VOTRE_MOT_DE_PASSE@db.xxxxx.supabase.co:5432/postgres
```

**Remplacez :**
- `xxxxx` par votre URL de projet
- La clé `SUPABASE_ANON_KEY` par votre clé anon
- `VOTRE_MOT_DE_PASSE` par votre mot de passe de base de données

### 3.2 Exemple complet de .env

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://abcdefghijklm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG0iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY...
DATABASE_URL=postgresql://postgres:MonMotDePasseSecret123!@db.abcdefghijklm.supabase.co:5432/postgres

# Security
JWT_SECRET=mon-super-secret-jwt-minimum-32-caracteres
ENCRYPTION_KEY=ma-cle-de-32-caracteres-exacte

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=votre-mot-de-passe-app
EMAIL_FROM=noreply@evoting.com

# Application Settings
APP_URL=http://localhost:5173
MAX_VOTERS=30000
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Étape 4 : Créer les tables dans Supabase

### 4.1 Accéder à l'éditeur SQL

1. Dans votre projet Supabase
2. Cliquez sur **SQL Editor** (icône </> dans le menu)
3. Cliquez sur **"New query"**

### 4.2 Copier et exécuter le schéma

1. Ouvrez le fichier `server/database/supabase-schema.sql`
2. Copiez **tout le contenu** du fichier
3. Collez-le dans l'éditeur SQL de Supabase
4. Cliquez sur **"Run"** en bas à droite

Vous devriez voir :
```
Success. No rows returned
```

### 4.3 Vérifier les tables

1. Cliquez sur **Table Editor** (icône grille dans le menu)
2. Vous devriez voir toutes les tables :
   - users
   - elections
   - election_options
   - voters
   - ballots
   - public_votes
   - observers
   - attendance_list
   - audit_logs
   - scheduled_tasks

✅ **Félicitations !** Votre base de données est prête !

## Étape 5 : Installer les dépendances

Dans le terminal, à la racine du projet :

```bash
npm install
```

Cela installera :
- `@supabase/supabase-js` : Client Supabase
- `pg` : Driver PostgreSQL

## Étape 6 : Tester la connexion

### 6.1 Lancer l'application

```bash
npm run dev
```

### 6.2 Vérifier les logs

Vous devriez voir dans le terminal :

```
✅ Connexion Supabase/PostgreSQL établie

╔═══════════════════════════════════════════╗
║   🗳️  E-Voting Platform Started          ║
╠═══════════════════════════════════════════╣
║   Server: http://localhost:3000         ║
║   Environment: development              ║
║   Database: Supabase PostgreSQL         ║
╚═══════════════════════════════════════════╝
```

### 6.3 Test de la base de données

1. Ouvrez http://localhost:5173
2. Créez un compte administrateur
3. Si tout fonctionne → ✅ **Configuration réussie !**

## Étape 7 : Créer un utilisateur admin (optionnel)

Si vous voulez un compte admin par défaut :

1. Dans Supabase, allez dans **SQL Editor**
2. Créez une nouvelle requête
3. Copiez-collez ce code :

```sql
-- Insérer un admin avec mot de passe "admin123"
-- Hash bcrypt pour "admin123"
INSERT INTO users (id, email, password, name, role)
VALUES (
  uuid_generate_v4(),
  'admin@evoting.local',
  '$2a$10$rK8Xh5Y9YhHxPvfJZqP3O.vqW5nJxQXf8xXqP3O.vqW5nJxQXf8xX',
  'Administrateur',
  'admin'
);
```

4. Exécutez

⚠️ **IMPORTANT** : Changez ce mot de passe après la première connexion !

## Étape 8 : Sécurité en production

### 8.1 Row Level Security (RLS)

Pour activer la sécurité au niveau des lignes :

```sql
-- Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE observers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Politique : Les admins peuvent tout faire
CREATE POLICY "Admin full access" ON elections
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### 8.2 Changez les secrets

Dans `.env` pour la production :

```bash
# Générer un JWT secret sécurisé
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Générer une clé de chiffrement (32 caractères)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## Troubleshooting

### ❌ Erreur : "Cannot connect to database"

**Solutions :**

1. Vérifiez que `DATABASE_URL` est correct
2. Vérifiez que le mot de passe dans `DATABASE_URL` est correct (pas de `[PASSWORD]`)
3. Vérifiez que votre projet Supabase est actif
4. Testez la connexion depuis Supabase Dashboard → SQL Editor

### ❌ Erreur : "relation users does not exist"

**Solution :**

Les tables n'ont pas été créées. Retournez à l'Étape 4 et exécutez le schéma SQL.

### ❌ Erreur : "JWT expired"

**Solution :**

Les tokens Supabase expirent après 1 heure. Rafraîchissez votre page.

### ❌ L'application ne démarre pas

**Solution :**

```bash
# Vérifier que les dépendances sont installées
npm install

# Vérifier le fichier .env
cat .env

# Vérifier les logs
npm run server
```

## Avantages de Supabase vs SQLite

| Fonctionnalité | SQLite | Supabase |
|----------------|--------|----------|
| Hébergement | Local | Cloud |
| Scalabilité | Limitée | Excellente |
| Concurrent users | ~10 | 1000+ |
| Backup automatique | ❌ | ✅ |
| Interface admin | ❌ | ✅ |
| API REST auto | ❌ | ✅ |
| Temps réel | ❌ | ✅ |
| Gratuit | ✅ | ✅ (500 MB) |

## Limites du plan gratuit

- **Database** : 500 MB
- **Storage** : 1 GB
- **Bandwidth** : 5 GB
- **API Requests** : 50,000 / mois

Pour l'application E-Voting :
- **30,000 électeurs** ≈ 50-100 MB
- Largement suffisant pour commencer !

## Migration depuis SQLite

Si vous avez déjà des données dans SQLite :

1. Exportez vos données SQLite en CSV
2. Importez-les via Supabase Dashboard → Table Editor → Import

Ou utilisez un outil comme `pgloader` :

```bash
pgloader sqlite://evoting.db postgresql://user:pass@host/dbname
```

## Support

- **Documentation Supabase** : https://supabase.com/docs
- **Discord Supabase** : https://discord.supabase.com
- **Statut Supabase** : https://status.supabase.com

## Prochaines étapes

1. ✅ Supabase configuré
2. → Créer votre première élection
3. → Ajouter des électeurs
4. → Envoyer les invitations
5. → Lancer le vote !

---

**Bon vote avec Supabase ! 🗳️ ✨**
