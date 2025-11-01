# 🚀 Mise à Jour vers la Version 2.0

## Nouvelles Fonctionnalités Ajoutées

Votre plateforme E-Voting a été enrichie avec trois fonctionnalités majeures :

✅ **Authentification à Deux Facteurs (2FA)**
- Sécurité renforcée avec codes TOTP
- Compatible avec Google Authenticator, Authy, etc.
- Codes de secours d'urgence

✅ **Gestion du Quorum**
- 4 types de quorum (aucun, pourcentage, absolu, pondéré)
- Suivi en temps réel de la participation
- Validation automatique

✅ **Intégrations Microsoft Teams & Zoom**
- Ajout de liens de réunion aux élections
- Envoi automatique dans les emails
- Support pour assemblées virtuelles

---

## 📋 Étapes de Mise à Jour

### Étape 1 : Installer les nouvelles dépendances

```bash
npm install speakeasy
```

> Note : `qrcode` est déjà installé

### Étape 2 : Migrer la base de données

Exécutez le script de migration automatique :

```bash
npm run migrate:v2
```

Ce script va ajouter automatiquement toutes les colonnes nécessaires dans Supabase.

**Alternative manuelle** : Si vous préférez migrer manuellement, ouvrez le Supabase Dashboard → SQL Editor et exécutez :

```sql
-- 2FA
ALTER TABLE users
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT;

-- Quorum
ALTER TABLE elections
ADD COLUMN IF NOT EXISTS quorum_type VARCHAR(50) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS quorum_value DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS quorum_reached BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quorum_reached_at TIMESTAMP WITH TIME ZONE;

-- Meetings
ALTER TABLE elections
ADD COLUMN IF NOT EXISTS meeting_platform VARCHAR(50),
ADD COLUMN IF NOT EXISTS meeting_url TEXT,
ADD COLUMN IF NOT EXISTS meeting_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS meeting_password VARCHAR(255);
```

### Étape 3 : Vérifier la migration

```bash
npm run test:supabase
```

Vous devriez voir : ✅ Toutes les tables existent

### Étape 4 : Démarrer l'application

```bash
npm run dev
```

L'application démarre sur :
- **Backend API** : http://localhost:3000
- **Frontend** : http://localhost:5173

---

## 🎯 Utilisation des Nouvelles Fonctionnalités

### 1️⃣ Activer le 2FA (Sécurité Compte Admin)

**Via API** :

```javascript
// 1. Initialiser le 2FA
const setup = await axios.post('http://localhost:3000/api/2fa/setup', {}, {
  headers: { Authorization: `Bearer ${votre_token}` }
});

// Afficher le QR code : setup.data.qrCode
// Scanner avec Google Authenticator

// 2. Vérifier et activer
const verify = await axios.post('http://localhost:3000/api/2fa/verify', {
  token: '123456' // Code de l'app authenticator
}, {
  headers: { Authorization: `Bearer ${votre_token}` }
});

// Sauvegarder les codes de secours : verify.data.backupCodes
```

**Via Frontend** : Vous devrez créer une page de paramètres avec un composant de configuration 2FA.

### 2️⃣ Configurer un Quorum pour une Élection

**Lors de la création d'élection** :

```javascript
await axios.post('http://localhost:3000/api/elections', {
  title: "Assemblée Générale 2024",
  description: "Vote du budget annuel",
  voting_type: "simple",
  is_secret: true,

  // NOUVEAU : Quorum
  quorum_type: "percentage",  // ou "absolute", "weighted", "none"
  quorum_value: 50,           // 50% des électeurs doivent voter

  // ... autres champs
  options: [
    { option_text: "Approuver" },
    { option_text: "Rejeter" }
  ]
}, {
  headers: { Authorization: `Bearer ${votre_token}` }
});
```

**Suivre le quorum en temps réel** :

```javascript
const status = await axios.get(
  `http://localhost:3000/api/quorum/${electionId}/status`,
  { headers: { Authorization: `Bearer ${votre_token}` }}
);

console.log(status.data);
// {
//   "required": true,
//   "reached": false,
//   "current": 45,
//   "target": 100,
//   "percentage": 45.0
// }
```

### 3️⃣ Ajouter un Lien Teams/Zoom

**Option 1 : Lors de la création**

```javascript
await axios.post('http://localhost:3000/api/elections', {
  title: "Conseil d'Administration",
  // ... autres champs

  // NOUVEAU : Meeting
  meeting_platform: "teams",  // ou "zoom"
  meeting_url: "https://teams.microsoft.com/l/meetup-join/...",
  meeting_id: "123 456 789",
  meeting_password: "secret123"
}, {
  headers: { Authorization: `Bearer ${votre_token}` }
});
```

**Option 2 : Mise à jour d'une élection existante**

```javascript
await axios.put(`http://localhost:3000/api/elections/${electionId}`, {
  meeting_platform: "zoom",
  meeting_url: "https://zoom.us/j/123456789",
  meeting_id: "123 456 789",
  meeting_password: "vote2024"
}, {
  headers: { Authorization: `Bearer ${votre_token}` }
});
```

Le lien sera automatiquement inclus dans les emails envoyés aux électeurs !

---

## 📚 Documentation Complète

Pour plus de détails, consultez :

📖 **[NOUVELLES_FONCTIONNALITES_2FA_QUORUM_MEETINGS.md](./NOUVELLES_FONCTIONNALITES_2FA_QUORUM_MEETINGS.md)**

Ce document contient :
- Explication détaillée de chaque fonctionnalité
- Documentation complète des API
- Exemples de code frontend
- Guide d'intégration Teams/Zoom avec API officielles
- Comparaison avec Voteer.com

---

## 🏗️ Développement Frontend (À Faire)

Les fonctionnalités backend sont prêtes ! Pour une expérience complète, il faudra créer :

### Page Paramètres 2FA
- Composant React pour afficher le QR code
- Interface pour entrer le code de vérification
- Gestion des codes de secours
- Bouton activer/désactiver

### Widget Quorum
- Jauge de progression visuelle
- Affichage en temps réel sur le dashboard admin
- Notification quand le quorum est atteint

### Formulaire Élection Étendu
- Champ sélection type de quorum
- Input pour la valeur du quorum
- Section "Réunion en ligne" avec :
  - Sélection Teams/Zoom
  - Champ URL de réunion
  - Champs optionnels ID/mot de passe

### Page de Vote Étendue
- Affichage du lien de réunion si configuré
- Bouton "Rejoindre la réunion"
- Indication du statut du quorum pour l'électeur

---

## 🧪 Tests

### Tester le 2FA

1. Créer un compte admin
2. Appeler `/api/2fa/setup`
3. Scanner le QR code avec Google Authenticator
4. Tester la connexion avec 2FA activé

### Tester le Quorum

1. Créer une élection avec quorum 50%
2. Créer 10 électeurs
3. Faire voter 5 électeurs
4. Vérifier `/api/quorum/:electionId/status` → `reached: true`

### Tester les Meetings

1. Créer une réunion Zoom/Teams
2. Ajouter le lien à une élection
3. Envoyer les invitations par email
4. Vérifier que le lien apparaît dans l'email

---

## ❓ FAQ

**Q : Dois-je migrer ma base de données existante ?**
A : Oui, exécutez `npm run migrate:v2` pour ajouter les nouvelles colonnes.

**Q : Le 2FA est-il obligatoire ?**
A : Non, il est optionnel et désactivé par défaut.

**Q : Puis-je utiliser Zoom ET Teams ?**
A : Non, une seule plateforme par élection.

**Q : Le quorum fonctionne-t-il avec le vote pondéré ?**
A : Oui ! Utilisez le type "weighted" pour calculer par poids.

**Q : Que se passe-t-il si je perds mon téléphone avec le 2FA ?**
A : Utilisez les codes de secours fournis lors de l'activation.

---

## 🆘 Dépannage

### Erreur lors de la migration

```
❌ Erreur lors de la migration
```

**Solutions** :
- Vérifiez votre `.env` (SUPABASE_URL, DATABASE_URL)
- Testez la connexion : `npm run test:supabase`
- Vérifiez que les tables `users` et `elections` existent

### Le 2FA ne fonctionne pas

**Vérifications** :
- L'heure système est correcte (TOTP est sensible au temps)
- Le secret est bien stocké en base
- Le code est saisi rapidement (expire après 30s)

### Le quorum ne se met pas à jour

**Vérifications** :
- La route de vote appelle bien `updateQuorumStatus`
- Le type de quorum est correct
- La valeur est > 0

---

## 📞 Support

En cas de problème :
1. Vérifiez les logs du serveur
2. Testez avec `npm run test:supabase`
3. Consultez la documentation complète
4. Vérifiez que toutes les dépendances sont installées

---

**Version** : 2.0.0
**Date** : 10 Octobre 2025
**Compatibilité** : Node.js 18+, PostgreSQL (Supabase)

---

🎉 **Félicitations ! Votre plateforme est maintenant au niveau de Voteer.com !**
