# Fix: ENCRYPTION_KEY Configuration Error

## Erreur

```
ERREURS DE CONFIGURATION CRITIQUES DÉTECTÉES:
1. ENCRYPTION_KEY doit faire exactement 32 bytes (actuellement: X bytes)
```

## Solution Rapide

### Option 1: Générer Toutes les Clés (Recommandé)

```bash
npm run generate-keys
```

Ce script génère **toutes** les clés nécessaires :
- ✅ JWT_SECRET (64 bytes)
- ✅ ENCRYPTION_KEY (exactement 32 bytes)
- ✅ VAPID_PUBLIC_KEY
- ✅ VAPID_PRIVATE_KEY

**Instructions** :
1. Exécutez `npm run generate-keys`
2. Copiez toutes les lignes affichées
3. Ouvrez le fichier `.env` à la racine du projet
4. Remplacez ou ajoutez les lignes copiées
5. Redémarrez le serveur : `npm start` ou `npm run dev`

---

### Option 2: Générer Manuellement

Si vous voulez juste corriger ENCRYPTION_KEY :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64').substring(0, 32))"
```

Copiez le résultat dans `.env` :
```env
ENCRYPTION_KEY=la-cle-generee-exactement-32-bytes
```

---

## Vérification

Après correction, le fichier `.env` devrait contenir :

```env
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:5173

# Sécurité (longueurs importantes!)
JWT_SECRET=votre-secret-jwt-64-bytes-base64
ENCRYPTION_KEY=exactement-32-caracteres-ici!

# Base de données
DATABASE_URL=./server/database/database.db

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe

# Web Push
VAPID_PUBLIC_KEY=votre-cle-publique-vapid
VAPID_PRIVATE_KEY=votre-cle-privee-vapid
ADMIN_EMAIL=admin@evoting.com
```

---

## Démarrer le Serveur

Après correction :

```bash
npm start
```

Vous devriez voir :
```
✅ Validation des variables d'environnement: OK
🚀 WebSocket server initialized
╔═══════════════════════════════════════════╗
║   🗳️  E-Voting Platform Started          ║
║   WebSocket: ✅ Enabled                   ║
╚═══════════════════════════════════════════╝
```

---

## Pourquoi 32 Bytes ?

L'application utilise **AES-256** pour chiffrer les votes. AES-256 nécessite **exactement 32 bytes** (256 bits / 8 = 32 bytes).

Une clé trop courte ou trop longue causera des erreurs de chiffrement.

---

## Autres Erreurs Possibles

### JWT_SECRET trop court

```
JWT_SECRET doit faire au moins 32 caractères
```

**Solution** : Utilisez `npm run generate-keys` pour générer toutes les clés.

### Variables manquantes

Si d'autres variables sont manquantes, créez un fichier `.env` complet basé sur `.env.example` :

```bash
cp .env.example .env
npm run generate-keys
# Copiez les clés générées dans .env
```

---

## Support

- **Documentation** : [INSTALLATION_COMPLETE.md](./INSTALLATION_COMPLETE.md)
- **Quick Start** : [QUICK_START.md](./QUICK_START.md)
- **GitHub Issues** : https://github.com/votre-org/evoting/issues

---

**Version** : 2.1.0
**Date** : 2025-10-18
