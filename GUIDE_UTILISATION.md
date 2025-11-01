# 📘 Guide d'utilisation E-Voting

## Table des matières
1. [Premiers pas](#premiers-pas)
2. [Créer votre première élection](#créer-votre-première-élection)
3. [Gérer les électeurs](#gérer-les-électeurs)
4. [Envoyer les invitations](#envoyer-les-invitations)
5. [Démarrer et suivre le vote](#démarrer-et-suivre-le-vote)
6. [Consulter les résultats](#consulter-les-résultats)
7. [Fonctionnalités avancées](#fonctionnalités-avancées)

---

## Premiers pas

### Installation et configuration

1. **Installer l'application**
   ```bash
   npm install
   cp .env.example .env
   ```

2. **Configurer l'email** (dans `.env`)
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_USER=votre-email@gmail.com
   EMAIL_PASSWORD=votre-mot-de-passe-app
   ```

3. **Lancer l'application**
   ```bash
   npm run dev
   ```

4. **Accéder à l'interface**
   - Ouvrez http://localhost:5173

### Créer votre compte administrateur

1. Cliquez sur "S'inscrire"
2. Remplissez :
   - Nom complet
   - Email
   - Mot de passe (min. 6 caractères)
3. Validez

Vous êtes maintenant connecté à votre tableau de bord !

---

## Créer votre première élection

### Étape 1 : Informations générales

1. Cliquez sur **"Nouvelle élection"**
2. Remplissez :

   **Titre** (obligatoire)
   ```
   Exemple: Élection du bureau 2024
   ```

   **Description** (optionnel)
   ```
   Exemple: Élection des membres du bureau pour l'année 2024.
   Votes ouverts du 15 au 20 janvier.
   ```

### Étape 2 : Choisir le type de scrutin

#### 🗳️ Question simple
Un seul choix parmi plusieurs options.
```
Exemple: Êtes-vous pour ou contre la proposition A ?
- Pour
- Contre
- Abstention
```

#### ✅ Vote par approbation
Plusieurs choix possibles (cochez tous ceux que vous approuvez).
```
Exemple: Quelles activités souhaitez-vous pour le club ?
□ Sortie ski
□ Soirée jeux
□ Tournoi sportif
□ Conférence
```

#### 📊 Vote par ordre de préférence
Classez les options de la meilleure à la moins bonne.
```
Exemple: Classez les candidats au poste de président :
1. ___________
2. ___________
3. ___________
```

#### 📋 Scrutin de liste
Vote pour une liste complète.
```
Exemple: Votez pour une liste au conseil d'administration
- Liste A (Renouveau)
- Liste B (Continuité)
```

### Étape 3 : Paramètres de sécurité

#### Vote secret ✅ (recommandé)
- Les votes sont **chiffrés** et **anonymes**
- Impossible de savoir qui a voté quoi
- Sécurité maximale

#### Vote public ❌
- Les votes sont liés à l'identité de l'électeur
- Transparence totale
- Pour votes non sensibles

#### Vote pondéré
Activez si certains électeurs ont plus de poids.
```
Exemple:
- Membres actifs : poids 1.0
- Membres fondateurs : poids 1.5
```

#### Dépouillement différé
Les résultats sont masqués jusqu'à la clôture.
- ✅ Évite l'influence des résultats intermédiaires
- ✅ Recommandé pour élections importantes

### Étape 4 : Planification (optionnel)

**Démarrage automatique**
```
Date: 15/01/2024 09:00
```

**Clôture automatique**
```
Date: 20/01/2024 18:00
```

Si vous ne planifiez pas, vous démarrerez manuellement.

### Étape 5 : Ajouter les options

Ajoutez au moins 2 options de vote.

**Exemple pour une élection de président :**

Option 1:
- Texte : Candidat au poste de président
- Nom : Jean Dupont
- Info : "Membre actif depuis 5 ans, expérience en gestion"

Option 2:
- Texte : Candidat au poste de président
- Nom : Marie Martin
- Info : "Trésorière sortante, 3 ans d'expérience"

Cliquez sur "+ Ajouter une option" pour plus de choix.

### Étape 6 : Valider

Cliquez sur **"Créer l'élection"**

Votre élection est créée en mode **Brouillon** !

---

## Gérer les électeurs

### Méthode 1 : Ajout manuel

1. Dans les détails de l'élection, onglet **"Électeurs"**
2. Cliquez **"Ajouter un électeur"**
3. Remplissez :
   - Email (obligatoire)
   - Nom (recommandé)
   - Poids (si vote pondéré)

### Méthode 2 : Import CSV (recommandé pour grand nombre)

#### Préparer le fichier CSV

Créez un fichier `electeurs.csv` :

```csv
email,name,weight
jean.dupont@example.com,Jean Dupont,1.0
marie.martin@example.com,Marie Martin,1.0
paul.bernard@example.com,Paul Bernard,1.5
```

**Format :**
- Ligne 1 : en-têtes (email, name, weight)
- Lignes suivantes : données des électeurs
- Séparateur : virgule

#### Importer le fichier

1. Cliquez sur **"Importer CSV"**
2. Sélectionnez votre fichier
3. Validez

Tous les électeurs sont ajoutés automatiquement !

### Vérifier la liste

Consultez la liste complète dans l'onglet **"Électeurs"**.

Vous pouvez :
- ✅ Voir le statut (en attente / a voté)
- ✅ Supprimer un électeur (avant démarrage)
- ✅ Vérifier les emails

---

## Envoyer les invitations

### Envoyer les emails de vote

1. Cliquez sur **"Envoyer les emails"**
2. Confirmez l'envoi

**Chaque électeur reçoit :**

📧 Un email contenant :
- Le titre et description de l'élection
- Un lien personnel de vote (unique et sécurisé)
- Un QR Code à scanner
- Les dates importantes
- Les instructions

**Exemple d'email reçu :**

```
🗳️ Invitation à Voter

Bonjour Jean Dupont,

Vous êtes invité à participer au vote suivant :

Élection du bureau 2024
Description de l'élection...

Pour voter, deux options :

1. Lien direct :
   [Voter maintenant] → https://evoting.com/vote/abc123xyz...

2. QR Code :
   [Image du QR Code]

⚠️ Important :
- Ce lien est personnel et unique
- Ne le partagez avec personne
- Votre vote sera secret et anonyme
- Date limite : 20/01/2024 18:00
```

### QR Code

Les électeurs peuvent scanner le QR Code avec leur smartphone pour voter directement.

---

## Démarrer et suivre le vote

### Démarrer le vote

**Option 1 : Démarrage manuel**
1. Cliquez sur **"Démarrer"**
2. Confirmez
3. Le statut passe à **"En cours"**

**Option 2 : Démarrage automatique**
Si vous avez planifié une date, le vote démarre automatiquement.

### Suivre la participation en temps réel

Dans le tableau de bord de l'élection :

📊 **Statistiques affichées :**
- Total d'électeurs inscrits
- Nombre de votes reçus
- Taux de participation (%)
- Évolution dans le temps

**Exemple :**
```
Total électeurs: 150
Ont voté: 87
Participation: 58%
En attente: 63
```

### Envoyer des rappels

Pour relancer les électeurs n'ayant pas voté :

1. Cliquez sur **"Envoyer rappels"**
2. Confirmez

📧 Un email de rappel est envoyé uniquement aux électeurs n'ayant pas encore voté.

### Ajouter des observateurs

Les observateurs peuvent suivre le vote sans pouvoir voter.

1. Cliquez sur **"Ajouter un observateur"**
2. Remplissez :
   - Email
   - Nom
   - Droits : voir participation / voir résultats
3. Validez

L'observateur reçoit un lien personnel pour suivre le vote en temps réel.

---

## Vote pour les électeurs

### Comment votent les électeurs

1. **Recevoir l'invitation**
   - Par email ou QR Code

2. **Cliquer sur le lien personnel**
   - Chargement de la page de vote

3. **Voter**
   - L'électeur voit :
     - Le titre et description
     - Les options de vote
     - Le type de scrutin

   - Selon le type :
     - **Simple** : Coche 1 option
     - **Approbation** : Coche plusieurs options
     - **Préférence** : Classe les options
     - **Liste** : Choisit une liste

4. **Confirmer**
   - Clic sur "Confirmer mon vote"
   - Message de confirmation

5. **Reçu**
   - L'électeur reçoit un reçu de vote
   - Preuve de participation (si non anonyme)

### Sécurité du vote

- ✅ Lien unique et personnel
- ✅ Vote une seule fois
- ✅ Impossible de modifier après envoi
- ✅ Chiffrement (si vote secret)
- ✅ Horodatage et IP enregistrés

---

## Consulter les résultats

### Clôturer le vote

**Option 1 : Clôture manuelle**
1. Cliquez sur **"Clôturer"**
2. Confirmez (irréversible !)

**Option 2 : Clôture automatique**
Si planifiée, clôture automatique à la date définie.

### Voir les résultats

1. Cliquez sur **"Voir résultats"**
2. Les résultats s'affichent

**Résultats affichés selon le type :**

#### Question simple
```
Option A : 45 votes (30%)
Option B : 105 votes (70%)

Total : 150 votes
Participation : 100%
```

#### Vote par approbation
```
Option 1 : 89 approbations (59%)
Option 2 : 134 approbations (89%)
Option 3 : 67 approbations (45%)
```

#### Vote par préférence
```
Classement (méthode Borda) :

1. Candidat A : 450 points
2. Candidat B : 387 points
3. Candidat C : 263 points
```

#### Scrutin de liste
```
Liste A : 78 votes (52%)
Liste B : 72 votes (48%)
```

### Exporter les résultats

Cliquez sur **"Exporter"** pour télécharger :
- PDF des résultats
- CSV des données
- Liste d'émargement

---

## Fonctionnalités avancées

### Liste d'émargement

Consultez qui a voté et quand :

1. Onglet **"Émargement"**
2. Voir :
   - Nom de l'électeur
   - Date et heure du vote
   - Adresse IP (pour audit)

⚠️ **Attention :** La liste d'émargement ne révèle PAS le contenu des votes secrets.

### Vérification d'intégrité

Pour vérifier que le vote n'a pas été altéré :

1. Cliquez sur **"Vérifier l'intégrité"**
2. Le système vérifie :
   - ✅ Nombre de votes = nombre d'électeurs ayant voté
   - ✅ Pas de doublons
   - ✅ Bulletins non corrompus
   - ✅ Cohérence des données

**Résultat :**
```
✅ Intégrité vérifiée
- 150 électeurs ont voté
- 150 bulletins enregistrés
- 0 anomalie détectée
```

### Logs d'audit

Consultez toutes les actions effectuées :

1. Onglet **"Audit"**
2. Voir l'historique :
   - Création de l'élection
   - Ajout d'électeurs
   - Démarrage du vote
   - Envois d'emails
   - Clôture

**Exemple :**
```
15/01/2024 09:00 - admin@example.com - Démarrage de l'élection
15/01/2024 09:05 - système - Envoi de 150 emails
17/01/2024 14:00 - admin@example.com - Envoi de rappels
20/01/2024 18:00 - système - Clôture automatique
```

### Votes pondérés

Pour donner plus de poids à certains électeurs :

1. Activez "Vote pondéré" lors de la création
2. Assignez un poids à chaque électeur :
   - Poids 1.0 = voix normale
   - Poids 1.5 = voix comptant 1.5 fois
   - Poids 0.5 = demi-voix

**Résultat :**
```
Total votes : 150
Poids total : 175.5

Option A : 85 votes (poids: 102.5) → 58%
Option B : 65 votes (poids: 73.0) → 42%
```

---

## ✅ Checklist complète

### Avant le vote
- [ ] Élection créée
- [ ] Type de scrutin choisi
- [ ] Options ajoutées (min. 2)
- [ ] Électeurs importés
- [ ] Emails configurés
- [ ] Test d'envoi email réussi

### Démarrage
- [ ] Invitations envoyées
- [ ] Électeurs ont reçu les emails
- [ ] Vote démarré
- [ ] Premier vote test effectué

### Pendant le vote
- [ ] Suivre la participation
- [ ] Envoyer rappels si besoin
- [ ] Répondre aux questions

### Clôture
- [ ] Vote clôturé
- [ ] Résultats consultés
- [ ] Vérification d'intégrité OK
- [ ] Résultats exportés
- [ ] Communication des résultats

---

## 🆘 Dépannage

### Les électeurs ne reçoivent pas les emails

**Causes possibles :**
1. Configuration SMTP incorrecte
   - Vérifier `.env` : `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASSWORD`
2. Emails dans les spams
   - Demander aux électeurs de vérifier
3. Limite d'envoi atteinte
   - Vérifier les quotas de votre fournisseur

### Un électeur ne peut pas voter

**Vérifier :**
1. Le token est-il correct ?
2. L'élection est-elle démarrée ?
3. L'électeur a-t-il déjà voté ?
4. L'élection est-elle clôturée ?

### Erreur lors de la création d'élection

**Solutions :**
1. Vérifier qu'au moins 2 options sont remplies
2. Vérifier le titre (obligatoire)
3. Vérifier les dates (début < fin)

---

## 📞 Support

Pour toute question :
1. Consultez ce guide
2. Vérifiez les logs dans la console
3. Consultez le README.md

---

**Bon vote ! 🗳️**
