# 📱 Guide d'Utilisation des QR Codes

## 🎯 Où Trouver les QR Codes ?

Les QR codes sont désormais **facilement accessibles** dans votre application E-Voting !

---

## 📍 **Emplacements des QR Codes**

### **1️⃣ Dans la Liste des Électeurs** ✅ NOUVEAU

**Emplacement :** `Dashboard > Élection > Onglet "Électeurs"`

**Comment y accéder :**
1. Connectez-vous à votre compte admin
2. Cliquez sur une élection
3. Dans l'onglet **"Électeurs"**, vous verrez une colonne **"Actions"**
4. Cliquez sur le bouton **QR Code** (icône) pour chaque électeur

**Ce que vous pouvez faire :**
- 👁️ **Visualiser** le QR code en grand format
- 💾 **Télécharger** le QR code en PNG
- 📋 **Copier** le lien de vote
- 📧 **Voir** les informations de l'électeur

---

### **2️⃣ Dans les Emails Envoyés** ✅ ACTIF

**Emplacement :** Emails d'invitation automatiques

**Comment ça marche :**
1. Ajoutez des électeurs à votre élection
2. Cliquez sur **"Envoyer les emails"**
3. Chaque électeur reçoit un email avec :
   - 📧 Lien de vote personnel
   - 📱 QR code intégré dans l'email
   - ℹ️ Instructions de vote

**Note :** Les QR codes sont automatiquement générés et stockés lors de l'envoi des emails.

---

### **3️⃣ Dans la Base de Données** (pour développeurs)

**Table :** `voters`
**Colonne :** `qr_code` (TEXT)
**Format :** Data URL (image/png en base64)

```sql
SELECT qr_code FROM voters WHERE id = 'voter-id';
```

---

## 🎨 **Fonctionnalités du Modal QR Code**

Quand vous cliquez sur le bouton QR code d'un électeur, un modal s'ouvre avec :

### **Affichage**
- 📱 **QR Code en haute qualité** (256x256px)
- 🔍 **Niveau de correction d'erreur élevé** (Level H)
- 🎨 **Design moderne** avec fond blanc et ombres

### **Informations Affichées**
- 👤 **Nom** de l'électeur
- 📧 **Email** de l'électeur
- ⚖️ **Poids** du vote
- 🔗 **Lien de vote complet**

### **Actions Disponibles**
- 💾 **Télécharger PNG** - Enregistre le QR code en image
- 📋 **Copier le lien** - Copie l'URL de vote dans le presse-papier

---

## 📸 **À Quoi Ressemble le QR Code ?**

```
┌─────────────────────────────────┐
│  ██████████████    ████████     │
│  ██          ██    ██    ████   │
│  ██  ██████  ██    ██  ██  ██   │
│  ██  ██████  ██    ██████  ██   │
│  ██  ██████  ██    ████    ██   │
│  ██          ██    ██  ████ ██  │
│  ██████████████    ████████     │
│                                  │
│  🗳️ QR Code de Vote             │
│  voter-token-unique-id           │
└─────────────────────────────────┘
```

**Quand on le scanne :**
➡️ Redirige vers : `https://votre-app.com/vote/{TOKEN}`

---

## 🔐 **Sécurité des QR Codes**

### ✅ **Caractéristiques de Sécurité**

1. **Token Unique** - Chaque électeur a un token UUID v4 unique
2. **Usage Unique** - Le QR code ne fonctionne qu'une seule fois
3. **Non Transférable** - Lié à l'électeur spécifique
4. **Tracé** - Tous les scans sont enregistrés dans les logs d'audit
5. **Expire** - Invalide après la clôture de l'élection

### 🛡️ **Ce qui est Inclus dans le QR Code**

Le QR code encode uniquement :
```
https://votre-app.com/vote/abc-123-def-456-ghi
```

**Il NE contient PAS :**
- ❌ Mot de passe
- ❌ Informations personnelles
- ❌ Données de vote
- ❌ Informations de l'élection

---

## 📱 **Comment Scanner un QR Code ?**

### **Sur Smartphone**

#### **iPhone (iOS 11+)**
1. Ouvrez l'application **Appareil Photo**
2. Pointez vers le QR code
3. Une notification apparaît en haut
4. Tapez pour ouvrir le lien

#### **Android**
1. Ouvrez l'application **Appareil Photo** ou **Google Lens**
2. Pointez vers le QR code
3. Tapez sur le lien qui apparaît

### **Sur Ordinateur**
1. Téléchargez le QR code (bouton "Télécharger PNG")
2. Transférez sur votre smartphone
3. Ou affichez à l'écran et scannez avec un autre appareil

### **Applications Recommandées**
- 📱 **Lecteur QR natif** (iOS Camera, Android Camera)
- 🔍 **Google Lens** (Android/iOS)
- 📷 **QR Code Reader** (gratuit sur App Store/Play Store)

---

## 🎯 **Cas d'Usage des QR Codes**

### **1. Événements en Présentiel**
- Imprimez les QR codes individuels
- Distribuez aux participants
- Scan rapide pour voter

### **2. Assemblées Hybrides**
- Email le QR code aux participants distants
- Affichage en présentiel pour les autres
- Vote via smartphone

### **3. Bureaux de Vote Numériques**
- Affichage des QR codes sur tablettes
- Scan avec le smartphone personnel
- Vote sécurisé et tracé

### **4. Votes Anticipés**
- Envoi par email avant l'événement
- Les électeurs peuvent voter à leur convenance
- Suivi en temps réel

---

## 💡 **Conseils d'Utilisation**

### ✅ **Bonnes Pratiques**

1. **Testez avant l'élection**
   - Scannez un QR code de test
   - Vérifiez que le lien fonctionne
   - Testez sur différents appareils

2. **Communiquez clairement**
   - Expliquez comment scanner
   - Donnez des instructions simples
   - Prévoyez un support technique

3. **Prévoyez des alternatives**
   - Lien direct en plus du QR code
   - Token manuel en cas de problème
   - Support téléphonique disponible

4. **Sécurisez les QR codes**
   - Ne les partagez pas publiquement
   - Envoyez uniquement aux électeurs concernés
   - Surveillez les accès non autorisés

### ⚠️ **À Éviter**

1. ❌ **Ne pas imprimer en trop petit**
   - Minimum 3x3 cm pour un scan facile
   - Privilégiez 5x5 cm ou plus

2. ❌ **Ne pas utiliser de papier brillant**
   - Le reflet peut empêcher le scan
   - Préférez le papier mat

3. ❌ **Ne pas endommager le QR code**
   - Évitez les pliures
   - Protégez contre l'eau
   - Gardez propre

4. ❌ **Ne pas réutiliser les QR codes**
   - Un QR code = un vote
   - Générez de nouveaux codes pour chaque élection

---

## 📊 **Statistiques et Suivi**

### **Informations Disponibles**

Vous pouvez suivre :
- ✅ Qui a scanné le QR code
- ✅ Quand il a été scanné
- ✅ Si le vote a été complété
- ✅ Combien de tentatives

**Emplacement :** Dashboard > Élection > Statistiques

---

## 🔧 **Dépannage**

### **Problème : QR code ne s'affiche pas**

❓ **Cause possible :**
- Les emails n'ont pas encore été envoyés
- Le QR code n'est pas encore généré

✅ **Solution :**
1. Allez dans l'élection
2. Cliquez sur "Envoyer les emails"
3. Les QR codes seront générés automatiquement
4. Rafraîchissez la page des électeurs

---

### **Problème : QR code ne scanne pas**

❓ **Causes possibles :**
- QR code trop petit
- Image floue
- Mauvais éclairage
- Appareil photo ne fonctionne pas

✅ **Solutions :**
1. Agrandissez le QR code (zoom)
2. Améliorez l'éclairage
3. Téléchargez en PNG et réimprimez
4. Utilisez le lien de vote direct

---

### **Problème : Lien expiré après scan**

❓ **Cause possible :**
- L'élection est clôturée
- Le token a déjà été utilisé

✅ **Solution :**
1. Vérifiez le statut de l'élection
2. Contactez l'administrateur
3. Générez un nouveau token si nécessaire

---

## 📚 **Documentation Technique**

### **Format du QR Code**

**Type :** QR Code (Quick Response Code)
**Version :** Automatique (selon longueur de l'URL)
**Niveau de correction :** H (High) - 30% de restauration
**Encodage :** UTF-8
**Taille :** 300x300px (génération), 256x256px (affichage)
**Format d'export :** PNG

### **Structure de l'URL**

```
https://[DOMAIN]/vote/[TOKEN]

Où :
- DOMAIN = votre domaine d'application
- TOKEN = UUID v4 unique (36 caractères)
```

**Exemple :**
```
https://evoting.example.com/vote/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

---

## 🎉 **Résumé**

### ✅ **Vous pouvez maintenant :**

1. **Visualiser** tous les QR codes depuis la liste des électeurs
2. **Télécharger** chaque QR code individuellement en PNG
3. **Copier** les liens de vote facilement
4. **Envoyer** les QR codes automatiquement par email
5. **Imprimer** les QR codes pour des événements en présentiel

### 🚀 **Prochaines Étapes**

1. Testez en ajoutant un électeur de test
2. Cliquez sur l'icône QR code dans la table
3. Téléchargez et scannez avec votre smartphone
4. Vérifiez que le lien fonctionne

---

**🎯 Les QR codes sont maintenant entièrement fonctionnels et accessibles dans votre application !** 📱✨
