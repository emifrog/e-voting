# Nouvelles Fonctionnalités - E-Voting Platform

## Version 2.0 - Authentification 2FA, Gestion du Quorum & Intégrations Meetings

---

## 📋 Table des matières

1. [Authentification à Deux Facteurs (2FA)](#1-authentification-à-deux-facteurs-2fa)
2. [Gestion du Quorum](#2-gestion-du-quorum)
3. [Intégrations Teams/Zoom](#3-intégrations-teamszoom)
4. [Migration de la Base de Données](#4-migration-de-la-base-de-données)
5. [API Documentation](#5-api-documentation)
6. [Guide Utilisateur](#6-guide-utilisateur)

---

## 1. Authentification à Deux Facteurs (2FA)

### 📌 Présentation

L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire en exigeant un code temporaire en plus du mot de passe lors de la connexion.

### ✨ Fonctionnalités

- **TOTP (Time-based One-Time Password)** : Compatible avec Google Authenticator, Authy, Microsoft Authenticator
- **QR Code** : Configuration rapide via scan
- **Codes de secours** : 10 codes d'urgence en cas de perte du téléphone
- **Activation/désactivation** : Contrôle total par l'utilisateur

### 🔧 Configuration Backend

#### Nouvelles colonnes dans la table `users`

```sql
two_factor_enabled BOOLEAN DEFAULT false
two_factor_secret VARCHAR(255)
two_factor_backup_codes TEXT
```

#### Endpoints API

**POST /api/2fa/setup**
- Génère un secret 2FA et un QR code
- Requiert : Token d'authentification
- Retourne : `{ secret, qrCode, message }`

**POST /api/2fa/verify**
- Active le 2FA après vérification du code
- Requiert : `{ token }` (code à 6 chiffres)
- Retourne : `{ success, backupCodes, warning }`

**POST /api/2fa/validate**
- Valide un code 2FA lors de la connexion
- Requiert : `{ userId, token, useBackupCode }`
- Retourne : `{ success, message }`

**POST /api/2fa/disable**
- Désactive le 2FA
- Requiert : `{ password, token }`
- Retourne : `{ success, message }`

**GET /api/2fa/status**
- Vérifie si le 2FA est activé
- Requiert : Token d'authentification
- Retourne : `{ enabled: boolean }`

**POST /api/2fa/regenerate-backup-codes**
- Génère de nouveaux codes de secours
- Requiert : `{ token }`
- Retourne : `{ success, backupCodes, message, warning }`

### 🎨 Utilisation Frontend

```javascript
// 1. Activer le 2FA
const setupResponse = await axios.post('/api/2fa/setup', {}, {
  headers: { Authorization: `Bearer ${token}` }
});

// Afficher le QR code
<img src={setupResponse.data.qrCode} alt="QR Code 2FA" />

// 2. Vérifier le code
const verifyResponse = await axios.post('/api/2fa/verify', {
  token: userInput // Code à 6 chiffres
}, {
  headers: { Authorization: `Bearer ${token}` }
});

// Sauvegarder les codes de secours
console.log(verifyResponse.data.backupCodes);

// 3. Connexion avec 2FA
const loginResponse = await axios.post('/api/auth/login', {
  email,
  password,
  twoFactorToken: code2FA // Optionnel si 2FA activé
});

if (loginResponse.data.require2FA) {
  // Demander le code 2FA à l'utilisateur
}
```

---

## 2. Gestion du Quorum

### 📌 Présentation

Le quorum permet de définir un seuil minimum de participation pour qu'un vote soit valide.

### ✨ Types de Quorum

1. **Aucun** (`none`) : Pas de quorum requis
2. **Pourcentage** (`percentage`) : % des électeurs inscrits
3. **Absolu** (`absolute`) : Nombre fixe d'électeurs
4. **Pondéré** (`weighted`) : % du poids total (pour votes pondérés)

### 🔧 Configuration Backend

#### Nouvelles colonnes dans la table `elections`

```sql
quorum_type VARCHAR(50) DEFAULT 'none'
quorum_value DECIMAL(5,2) DEFAULT 0
quorum_reached BOOLEAN DEFAULT false
quorum_reached_at TIMESTAMP WITH TIME ZONE
```

#### Endpoints API

**GET /api/quorum/:electionId/status**
- Obtenir le statut actuel du quorum
- Retourne :
```json
{
  "required": true,
  "reached": false,
  "current": 150,
  "target": 200,
  "percentage": 75.0,
  "type": "percentage",
  "totalVoters": 500
}
```

**GET /api/quorum/:electionId/progress**
- Historique de progression
- Retourne : Chronologie des votes avec pourcentages

**POST /api/quorum/:electionId/update**
- Met à jour le statut (appelé automatiquement après chaque vote)

**GET /api/quorum/types**
- Liste des types de quorum disponibles

### 🎨 Configuration lors de la création d'élection

```javascript
await axios.post('/api/elections', {
  title: "Assemblée Générale 2024",
  // ... autres champs
  quorum_type: 'percentage',  // 'none' | 'percentage' | 'absolute' | 'weighted'
  quorum_value: 50.0,         // 50% des électeurs
  // ...
});
```

### 📊 Suivi en Temps Réel

Le quorum est automatiquement recalculé après chaque vote :

```javascript
// Après un vote
{
  "message": "Vote enregistré avec succès",
  "quorum": {
    "reached": true,
    "current": 201,
    "target": 200,
    "percentage": 50.25
  }
}
```

---

## 3. Intégrations Teams/Zoom

### 📌 Présentation

Permet d'associer une réunion Microsoft Teams ou Zoom à une élection pour faciliter les assemblées virtuelles.

### ✨ Fonctionnalités

- **Configuration de lien de réunion** : Ajout manuel du lien Teams/Zoom
- **Inclusion dans les emails** : Lien envoyé automatiquement aux électeurs
- **Affichage dans l'interface** : Bouton "Rejoindre la réunion"
- **Stockage sécurisé** : ID et mot de passe de réunion

### 🔧 Configuration Backend

#### Nouvelles colonnes dans la table `elections`

```sql
meeting_platform VARCHAR(50)      -- 'teams' ou 'zoom'
meeting_url TEXT                  -- URL de la réunion
meeting_id VARCHAR(255)           -- ID de réunion (optionnel)
meeting_password VARCHAR(255)     -- Mot de passe (optionnel)
```

#### Service `meetings.js`

```javascript
import { MEETING_PLATFORMS, validateMeetingLink, formatMeetingInfo } from '../services/meetings.js';

// Valider un lien
const isValid = validateMeetingLink('teams', 'https://teams.microsoft.com/...');

// Formater les infos pour affichage
const info = formatMeetingInfo(election);
// { platform, url, meetingId, password, platformName, joinText }
```

### 🎨 Configuration lors de la création/modification d'élection

```javascript
await axios.post('/api/elections', {
  title: "Vote du Budget 2024",
  // ... autres champs
  meeting_platform: 'zoom',  // ou 'teams'
  meeting_url: 'https://zoom.us/j/123456789',
  meeting_id: '123 456 789',
  meeting_password: 'secret123',
  // ...
});
```

### 📧 Email avec Lien de Réunion

Les emails envoyés aux électeurs incluent automatiquement :

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📹 RÉUNION EN LIGNE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cette élection se déroulera en ligne via Microsoft Teams.

🔗 Lien de connexion:
https://teams.microsoft.com/l/meetup-join/...

📋 ID de réunion: 123 456 789
🔐 Mot de passe: secret123

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 🔗 Intégration API Complète (Optionnel)

Pour une intégration automatique avec création de réunion :

**Microsoft Teams**
1. Créer une app Azure AD
2. Configurer permissions Microsoft Graph `OnlineMeetings.ReadWrite`
3. Ajouter credentials dans `.env`
4. Utiliser Microsoft Graph API

**Zoom**
1. Créer une app sur marketplace.zoom.us
2. Choisir Server-to-Server OAuth
3. Ajouter credentials dans `.env`
4. Utiliser Zoom API v2

Voir `server/services/meetings.js` → `getAPIIntegrationInstructions()`

---

## 4. Migration de la Base de Données

### 📝 Script de Migration

Un nouveau fichier SQL a été créé : `server/database/supabase-schema.sql`

#### Étapes de migration :

1. **Ouvrir Supabase Dashboard** → SQL Editor

2. **Exécuter le script complet** ou seulement les nouvelles colonnes :

```sql
-- Pour users (2FA)
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT;

-- Pour elections (Quorum + Meetings)
ALTER TABLE elections ADD COLUMN IF NOT EXISTS quorum_type VARCHAR(50) DEFAULT 'none';
ALTER TABLE elections ADD COLUMN IF NOT EXISTS quorum_value DECIMAL(5,2) DEFAULT 0;
ALTER TABLE elections ADD COLUMN IF NOT EXISTS quorum_reached BOOLEAN DEFAULT false;
ALTER TABLE elections ADD COLUMN IF NOT EXISTS quorum_reached_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE elections ADD COLUMN IF NOT EXISTS meeting_platform VARCHAR(50);
ALTER TABLE elections ADD COLUMN IF NOT EXISTS meeting_url TEXT;
ALTER TABLE elections ADD COLUMN IF NOT EXISTS meeting_id VARCHAR(255);
ALTER TABLE elections ADD COLUMN IF NOT EXISTS meeting_password VARCHAR(255);
```

3. **Vérifier la migration** :

```bash
npm run test:supabase
```

---

## 5. API Documentation

### Résumé des Nouveaux Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/2fa/setup` | Initialiser 2FA |
| POST | `/api/2fa/verify` | Activer 2FA |
| POST | `/api/2fa/validate` | Valider code 2FA |
| POST | `/api/2fa/disable` | Désactiver 2FA |
| GET | `/api/2fa/status` | Statut 2FA |
| POST | `/api/2fa/regenerate-backup-codes` | Nouveaux codes de secours |
| GET | `/api/quorum/:electionId/status` | Statut du quorum |
| GET | `/api/quorum/:electionId/progress` | Progression du quorum |
| POST | `/api/quorum/:electionId/update` | Mettre à jour quorum |
| GET | `/api/quorum/types` | Types de quorum |

### Modifications des Endpoints Existants

**POST /api/auth/login**
- Nouveau champ optionnel : `twoFactorToken`
- Nouvelle réponse si 2FA activé :
```json
{
  "require2FA": true,
  "userId": "uuid",
  "message": "Code d'authentification à deux facteurs requis"
}
```

**POST /api/elections**
- Nouveaux champs optionnels :
  - `quorum_type`, `quorum_value`
  - `meeting_platform`, `meeting_url`, `meeting_id`, `meeting_password`

**POST /api/vote/:token**
- Nouvelle réponse incluant statut du quorum :
```json
{
  "message": "Vote enregistré",
  "quorum": {
    "reached": true,
    "current": 150,
    "target": 100,
    "percentage": 150.0
  }
}
```

---

## 6. Guide Utilisateur

### 🔐 Activer le 2FA (Administrateur)

1. Se connecter au compte admin
2. Aller dans **Paramètres** → **Sécurité**
3. Cliquer sur "Activer l'authentification à deux facteurs"
4. Scanner le QR code avec Google Authenticator / Authy
5. Entrer le code à 6 chiffres
6. **IMPORTANT** : Sauvegarder les 10 codes de secours

### 📊 Configurer un Quorum

1. Lors de la création d'une élection :
   - **Type de quorum** : Choisir parmi Aucun/Pourcentage/Absolu/Pondéré
   - **Valeur** : Entrer le seuil (ex: 50 pour 50%)
2. Le quorum sera calculé automatiquement pendant le vote
3. Affichage en temps réel sur le dashboard

### 📹 Ajouter un Lien de Réunion

1. Créer une réunion Teams ou Zoom manuellement
2. Copier le lien de la réunion
3. Dans l'édition de l'élection :
   - **Plateforme** : Teams ou Zoom
   - **URL** : Coller le lien
   - **ID/Mot de passe** : (Optionnel)
4. Le lien sera envoyé automatiquement par email aux électeurs

---

## 📦 Installation des Dépendances

Nouvelles dépendances ajoutées :

```bash
npm install speakeasy qrcode
```

---

## 🎯 Comparaison avec Voteer.com

Après ces ajouts, votre plateforme dispose maintenant de :

| Fonctionnalité | Votre App | Voteer |
|----------------|-----------|---------|
| 2FA | ✅ | ✅ |
| Gestion du quorum | ✅ | ✅ |
| Intégration Teams/Zoom | ✅ | ✅ |
| Vote pondéré | ✅ | ❌ |
| Open source | ✅ | ❌ |
| Auto-hébergeable | ✅ | ❌ |
| Gratuit | ✅ | ❌ |
| Support multilingue | ❌ | ✅ |
| Certification CNIL | ❌ | ✅ |
| Gestion des procurations | ❌ | ✅ |

---

## 🚀 Prochaines Étapes

Pour aller plus loin :

1. **Frontend** : Créer les composants React pour :
   - Page de configuration 2FA
   - Widget d'affichage du quorum en temps réel
   - Formulaire d'ajout de lien de réunion

2. **Intégration API automatique** :
   - Microsoft Graph API pour créer des réunions Teams
   - Zoom API pour créer des réunions Zoom automatiquement

3. **Support multilingue** :
   - Ajouter i18n pour FR/EN/ES
   - Traduire les emails

4. **Tests** :
   - Tests unitaires pour les services 2FA et quorum
   - Tests d'intégration pour les flux complets

---

## 🆘 Support

Pour toute question ou problème :
- Vérifier la console backend pour les erreurs
- Tester la connexion Supabase : `npm run test:supabase`
- Vérifier que les migrations ont été appliquées
- S'assurer que les variables d'environnement sont configurées

---

**Date de création** : 10 Octobre 2025
**Version** : 2.0.0
**Auteur** : E-Voting Platform Development Team
