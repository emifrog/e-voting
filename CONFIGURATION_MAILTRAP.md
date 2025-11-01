# 📧 Configuration Mailtrap - Guide Complet

## 🎯 Pourquoi Mailtrap ?

Mailtrap est une **boîte de réception virtuelle** qui capture tous les emails envoyés par votre application **sans les envoyer réellement**. Parfait pour les tests !

✅ **Avantages:**
- Gratuit et illimité pour les tests
- Voir tous les emails dans une interface web
- Tester sans spammer de vrais emails
- Vérifier le HTML, les pièces jointes, etc.

---

## 📋 Étapes d'Installation

### **Étape 1 : Créer un compte Mailtrap**

1. Allez sur **https://mailtrap.io**
2. Cliquez sur **"Sign Up"** (en haut à droite)
3. Inscrivez-vous avec :
   - Votre email
   - Un mot de passe
   - Ou connectez-vous avec Google/GitHub
4. Vérifiez votre email

---

### **Étape 2 : Récupérer vos identifiants SMTP**

Une fois connecté :

1. Dans le menu de gauche, allez dans **"Email Testing"**
2. Cliquez sur **"Inboxes"**
3. Vous verrez une inbox par défaut (ou créez-en une : **"+ Add Inbox"**)
4. Cliquez sur votre inbox
5. Allez dans l'onglet **"SMTP Settings"**
6. Dans le menu déroulant, sélectionnez **"Nodemailer"** ou **"Show Credentials"**

Vous verrez quelque chose comme :

```
Host: sandbox.smtp.mailtrap.io
Port: 2525
Username: 1a2b3c4d5e6f7g    ← Copiez ce username
Password: 9h8i7j6k5l4m3n    ← Copiez ce password
Auth: Plain
```

---

### **Étape 3 : Mettre à jour le fichier .env**

Ouvrez le fichier `.env` à la racine du projet et remplacez :

```env
EMAIL_USER=REMPLACEZ_PAR_VOTRE_USERNAME_MAILTRAP
EMAIL_PASSWORD=REMPLACEZ_PAR_VOTRE_PASSWORD_MAILTRAP
```

Par vos identifiants copiés depuis Mailtrap :

```env
EMAIL_USER=1a2b3c4d5e6f7g
EMAIL_PASSWORD=9h8i7j6k5l4m3n
```

**Exemple complet :**

```env
# Email Configuration (Mailtrap - pour tests)
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_SECURE=false
EMAIL_USER=1a2b3c4d5e6f7g          ← Votre username ici
EMAIL_PASSWORD=9h8i7j6k5l4m3n      ← Votre password ici
EMAIL_FROM=noreply@evoting.local
```

---

### **Étape 4 : Redémarrer le serveur**

Dans votre terminal :

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis redémarrez :
npm run dev
```

---

## ✅ **Test : Envoyer votre premier email**

### **Depuis l'application :**

1. Ouvrez votre application : http://localhost:5173
2. Connectez-vous à votre compte admin
3. Ouvrez une élection (en statut "Brouillon")
4. Cliquez sur **"Ajouter des électeurs"**
5. Ajoutez un électeur :
   - Email : `test@example.com`
   - Nom : `Test User`
   - Poids : `1.0`
6. Cliquez sur **"Ajouter"**
7. Une fois ajouté, cliquez sur **"Envoyer les emails"**

### **Vérifier dans Mailtrap :**

1. Retournez sur https://mailtrap.io
2. Allez dans votre inbox
3. Vous verrez l'email apparaître ! 📬

---

## 🎨 **Fonctionnalités Mailtrap**

Une fois dans votre inbox Mailtrap, vous pouvez :

- **📧 Voir l'email HTML** (version visuelle)
- **📝 Voir le code source** (HTML brut)
- **📎 Télécharger les pièces jointes** (comme les QR codes)
- **🔍 Vérifier les en-têtes** (From, To, Subject, etc.)
- **📊 Tester le spam score**
- **💻 Voir en mode texte** (version text/plain)

---

## 🚨 **Dépannage**

### **Erreur : "Invalid login"**

❌ Vérifiez que :
- Le username et password sont corrects (copiez-collez depuis Mailtrap)
- Pas d'espaces avant/après dans le `.env`
- Le serveur a bien été redémarré après la modification

### **Les emails n'arrivent pas dans Mailtrap**

❌ Vérifiez que :
- Vous êtes dans la bonne inbox sur Mailtrap
- Le serveur Node.js n'a pas d'erreurs (regardez la console)
- Les électeurs ont bien été ajoutés (vérifiez la base de données)

### **Erreur : "Connection timeout"**

❌ Vérifiez votre connexion Internet
- Mailtrap nécessite une connexion pour envoyer les emails de test

---

## 🔄 **Passer en Production (plus tard)**

Quand vous voudrez envoyer de vrais emails :

1. Créez un compte sur **Brevo** (300 emails/jour gratuits)
2. Ou utilisez **Gmail avec mot de passe d'application**
3. Mettez à jour le `.env` avec les nouveaux identifiants
4. Redémarrez le serveur

**Configuration Brevo (production) :**

```env
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=votre-email@example.com
EMAIL_PASSWORD=votre-smtp-key-brevo
EMAIL_FROM=votre-email@example.com
```

---

## 📚 **Ressources**

- Documentation Mailtrap : https://mailtrap.io/docs
- Support Mailtrap : https://mailtrap.io/support
- Documentation Nodemailer : https://nodemailer.com

---

## ✅ **Checklist**

- [ ] Compte Mailtrap créé
- [ ] Username et Password copiés
- [ ] Fichier `.env` mis à jour
- [ ] Serveur redémarré avec `npm run dev`
- [ ] Électeur ajouté dans une élection
- [ ] Email de test envoyé
- [ ] Email visible dans l'inbox Mailtrap

---

🎉 **Vous êtes prêt !** Tous vos emails de test seront capturés dans Mailtrap sans être envoyés aux vraies adresses.
