# 🧪 Tests API - Nouvelles Fonctionnalités v2.0

Ce guide vous permet de tester rapidement toutes les nouvelles fonctionnalités via **curl** ou **Postman**.

---

## 🚀 Préparation

1. Démarrez le serveur :
```bash
npm run dev
```

2. Créez un compte admin et récupérez le token JWT :
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@evoting.local",
    "password": "admin123"
  }'
```

Sauvegardez le `token` retourné :
```json
{
  "token": "eyJhbGc..."
}
```

**Pour les tests suivants, remplacez `YOUR_TOKEN` par votre token.**

---

## 1️⃣ Tests Authentification 2FA

### A. Initialiser le 2FA

```bash
curl -X POST http://localhost:3000/api/2fa/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse attendue** :
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KG...",
  "message": "Scannez le QR code..."
}
```

📱 **Action** : Scannez le QR code avec Google Authenticator ou copiez le `secret` manuellement.

### B. Vérifier et activer le 2FA

```bash
curl -X POST http://localhost:3000/api/2fa/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "token": "123456"
  }'
```

Remplacez `123456` par le code affiché dans votre app authenticator.

**Réponse attendue** :
```json
{
  "success": true,
  "message": "2FA activé avec succès",
  "backupCodes": [
    "A1B2C3D4",
    "E5F6G7H8",
    ...
  ],
  "warning": "Conservez ces codes de secours..."
}
```

⚠️ **Important** : Sauvegardez les `backupCodes` !

### C. Vérifier le statut 2FA

```bash
curl -X GET http://localhost:3000/api/2fa/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse attendue** :
```json
{
  "enabled": true
}
```

### D. Tester la connexion avec 2FA

```bash
# 1. Première tentative sans code 2FA
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@evoting.local",
    "password": "admin123"
  }'
```

**Réponse attendue** :
```json
{
  "require2FA": true,
  "userId": "uuid-here",
  "message": "Code d'authentification à deux facteurs requis"
}
```

```bash
# 2. Deuxième tentative avec code 2FA
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@evoting.local",
    "password": "admin123",
    "twoFactorToken": "123456"
  }'
```

Remplacez `123456` par le code actuel de votre app.

**Réponse attendue** :
```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "admin@evoting.local",
    "name": "Admin",
    "role": "admin",
    "twoFactorEnabled": true
  }
}
```

### E. Régénérer les codes de secours

```bash
curl -X POST http://localhost:3000/api/2fa/regenerate-backup-codes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "token": "123456"
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "backupCodes": ["...", "..."],
  "message": "Nouveaux codes de secours générés",
  "warning": "Les anciens codes ne fonctionnent plus..."
}
```

### F. Désactiver le 2FA

```bash
curl -X POST http://localhost:3000/api/2fa/disable \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "password": "admin123",
    "token": "123456"
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "2FA désactivé avec succès"
}
```

---

## 2️⃣ Tests Gestion du Quorum

### A. Créer une élection avec quorum

```bash
curl -X POST http://localhost:3000/api/elections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Quorum - AG 2024",
    "description": "Vote avec quorum de 50%",
    "voting_type": "simple",
    "is_secret": false,
    "is_weighted": false,
    "allow_anonymity": false,
    "quorum_type": "percentage",
    "quorum_value": 50,
    "options": [
      {"option_text": "Pour"},
      {"option_text": "Contre"}
    ]
  }'
```

**Réponse attendue** :
```json
{
  "message": "Élection créée avec succès",
  "electionId": "uuid-here"
}
```

Sauvegardez l'`electionId`.

### B. Vérifier le statut du quorum

```bash
curl -X GET "http://localhost:3000/api/quorum/ELECTION_ID/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Remplacez `ELECTION_ID` par l'ID de l'élection.

**Réponse attendue** :
```json
{
  "required": true,
  "reached": false,
  "current": 0,
  "target": 5,
  "percentage": 0,
  "type": "percentage",
  "totalVoters": 10
}
```

### C. Obtenir la progression du quorum

```bash
curl -X GET "http://localhost:3000/api/quorum/ELECTION_ID/progress" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse attendue** :
```json
{
  "current": {
    "required": true,
    "reached": false,
    "current": 3,
    "target": 5,
    "percentage": 30
  },
  "history": [
    {
      "timestamp": "2024-10-10T10:00:00Z",
      "count": 1,
      "percentage": 10
    },
    {
      "timestamp": "2024-10-10T10:05:00Z",
      "count": 2,
      "percentage": 20
    }
  ]
}
```

### D. Obtenir les types de quorum disponibles

```bash
curl -X GET http://localhost:3000/api/quorum/types
```

**Réponse attendue** :
```json
{
  "types": [
    {
      "value": "none",
      "label": "Aucun quorum"
    },
    {
      "value": "percentage",
      "label": "Pourcentage des électeurs inscrits"
    },
    {
      "value": "absolute",
      "label": "Nombre absolu d'électeurs"
    },
    {
      "value": "weighted",
      "label": "Pourcentage du poids total (vote pondéré)"
    }
  ]
}
```

### E. Simuler des votes pour atteindre le quorum

1. Créer des électeurs
2. Démarrer l'élection
3. Faire voter jusqu'à atteindre le quorum
4. Vérifier que `quorum.reached = true`

---

## 3️⃣ Tests Intégrations Teams/Zoom

### A. Créer une élection avec lien Zoom

```bash
curl -X POST http://localhost:3000/api/elections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Assemblée en ligne",
    "description": "Vote via Zoom",
    "voting_type": "simple",
    "is_secret": false,
    "meeting_platform": "zoom",
    "meeting_url": "https://zoom.us/j/123456789",
    "meeting_id": "123 456 789",
    "meeting_password": "secret123",
    "options": [
      {"option_text": "Oui"},
      {"option_text": "Non"}
    ]
  }'
```

**Réponse attendue** :
```json
{
  "message": "Élection créée avec succès",
  "electionId": "uuid-here"
}
```

### B. Modifier le lien de réunion

```bash
curl -X PUT "http://localhost:3000/api/elections/ELECTION_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "meeting_platform": "teams",
    "meeting_url": "https://teams.microsoft.com/l/meetup-join/...",
    "meeting_id": "987 654 321",
    "meeting_password": "teams2024"
  }'
```

**Réponse attendue** :
```json
{
  "message": "Élection mise à jour avec succès"
}
```

### C. Vérifier les infos de réunion dans l'élection

```bash
curl -X GET "http://localhost:3000/api/elections/ELECTION_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse attendue** (extrait) :
```json
{
  "election": {
    "id": "...",
    "title": "Assemblée en ligne",
    "meeting_platform": "teams",
    "meeting_url": "https://teams.microsoft.com/...",
    "meeting_id": "987 654 321",
    "meeting_password": "teams2024",
    ...
  }
}
```

---

## 4️⃣ Test Complet : Vote avec Quorum

### Scénario : Election avec 10 électeurs, quorum 50%

#### Étape 1 : Créer l'élection

```bash
curl -X POST http://localhost:3000/api/elections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Budget 2024",
    "voting_type": "simple",
    "is_secret": false,
    "quorum_type": "percentage",
    "quorum_value": 50,
    "options": [
      {"option_text": "Approuver"},
      {"option_text": "Rejeter"}
    ]
  }'
```

#### Étape 2 : Créer 10 électeurs

```bash
# Utilisez votre méthode d'ajout d'électeurs
# ou importez un fichier CSV
```

#### Étape 3 : Démarrer l'élection

```bash
curl -X POST "http://localhost:3000/api/elections/ELECTION_ID/start" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Étape 4 : Voter (x5 pour atteindre le quorum)

```bash
# Utilisez le token d'un électeur
curl -X POST "http://localhost:3000/api/vote/VOTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vote": "option_id_here"
  }'
```

**Après le 5ème vote, la réponse devrait inclure** :
```json
{
  "message": "Vote enregistré avec succès",
  "timestamp": "2024-10-10T12:00:00Z",
  "is_secret": false,
  "quorum": {
    "reached": true,
    "current": 5,
    "target": 5,
    "percentage": 50.0
  }
}
```

#### Étape 5 : Vérifier le quorum

```bash
curl -X GET "http://localhost:3000/api/quorum/ELECTION_ID/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse attendue** :
```json
{
  "required": true,
  "reached": true,
  "current": 5,
  "target": 5,
  "percentage": 50.0,
  "type": "percentage",
  "totalVoters": 10
}
```

---

## 5️⃣ Test Complet : 2FA + Meeting + Quorum

### Scénario Réaliste : AG avec sécurité maximale

```bash
# 1. Activer 2FA
curl -X POST http://localhost:3000/api/2fa/setup \
  -H "Authorization: Bearer YOUR_TOKEN"

# Scanner QR code avec Google Authenticator

# 2. Vérifier 2FA
curl -X POST http://localhost:3000/api/2fa/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"token": "123456"}'

# 3. Créer une élection complète
curl -X POST http://localhost:3000/api/elections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Assemblée Générale Extraordinaire",
    "description": "Vote budget + statuts",
    "voting_type": "simple",
    "is_secret": true,
    "quorum_type": "percentage",
    "quorum_value": 66.67,
    "meeting_platform": "teams",
    "meeting_url": "https://teams.microsoft.com/l/meetup-join/...",
    "meeting_id": "AG2024",
    "meeting_password": "secure123",
    "scheduled_start": "2024-12-15T14:00:00Z",
    "scheduled_end": "2024-12-15T16:00:00Z",
    "options": [
      {"option_text": "Approuver le budget"},
      {"option_text": "Rejeter le budget"}
    ]
  }'

# 4. La suite : ajouter électeurs, envoyer emails, etc.
```

---

## 🎯 Checklist de Tests

- [ ] 2FA : Setup + Verify
- [ ] 2FA : Login avec code
- [ ] 2FA : Code de secours
- [ ] 2FA : Désactivation
- [ ] Quorum : Création avec type percentage
- [ ] Quorum : Vérification statut initial
- [ ] Quorum : Atteinte après votes
- [ ] Quorum : Progression historique
- [ ] Meeting : Création avec Zoom
- [ ] Meeting : Modification vers Teams
- [ ] Meeting : Présence dans emails
- [ ] Complet : Élection avec tout activé

---

## 🐛 Dépannage

### Erreur "Token manquant"

Vérifiez que vous avez bien ajouté `-H "Authorization: Bearer YOUR_TOKEN"`

### Erreur "2FA non configuré"

Exécutez d'abord `/api/2fa/setup`

### Code 2FA invalide

- Vérifiez l'heure système (TOTP est sensible au temps)
- Le code expire après 30 secondes
- Utilisez un nouveau code

### Quorum ne se met pas à jour

Vérifiez que vous avez bien démarré l'élection avec `/api/elections/:id/start`

---

## 📚 Documentation Complète

Pour plus de détails, consultez :
- **MISE_A_JOUR_V2.md** : Guide de démarrage
- **NOUVELLES_FONCTIONNALITES_2FA_QUORUM_MEETINGS.md** : Documentation technique
- **RESUME_IMPLEMENTATION.md** : Vue d'ensemble

---

**Version** : 2.0.0
**Date** : 10 Octobre 2025

🎉 **Bon testing !**
