# 🔒 Guide de Sécurité - E-Voting Platform

## Principes de sécurité

### Vote secret et anonymat

#### Comment ça fonctionne ?

1. **Séparation des données**
   ```
   Table "voters"          Table "ballots"
   ├─ ID électeur         ├─ ID bulletin
   ├─ Email               ├─ Vote chiffré
   ├─ A voté ? (oui/non)  ├─ Hash d'intégrité
   └─ Date de vote        └─ Poids

   ❌ Aucun lien direct entre les deux tables
   ```

2. **Chiffrement AES-256**
   ```javascript
   Vote original:  { option_id: "abc123", timestamp: "..." }
   ↓ Chiffrement
   Vote chiffré:   "U2FsdGVkX1+3xK9..."
   ```

3. **Hash d'intégrité**
   ```javascript
   Hash = SHA256(electionId + voterToken + timestamp)
   → Permet de vérifier qu'un bulletin n'a pas été modifié
   ```

#### Garanties

✅ **Anonymat total** : Impossible de relier un vote à un électeur, même pour l'administrateur
✅ **Intégrité** : Impossible de modifier un vote sans invalider le hash
✅ **Non-répudiation** : L'électeur ne peut pas nier avoir voté (liste d'émargement)
✅ **Unicité** : Un électeur = un vote maximum

### Authentification

#### Administrateurs (JWT)

```javascript
Token JWT contient:
{
  id: "user_id",
  email: "admin@example.com",
  role: "admin",
  exp: 1234567890  // Expiration 24h
}
```

**Protection :**
- Token signé avec `JWT_SECRET`
- Durée de vie limitée (24h)
- Stocké côté client uniquement
- Vérifié à chaque requête API

#### Électeurs (Token unique)

```javascript
Token électeur:
- Généré cryptographiquement (32 bytes aléatoires)
- Unique par électeur et par élection
- Valable une seule fois
- Pas d'expiration (mais lié à l'élection)
```

**Exemple de token :**
```
a3f7b8c9d2e1f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0
```

### Protection contre les attaques

#### 1. Rate Limiting

Limite le nombre de requêtes par IP :

```javascript
Limite par défaut:
- Fenêtre : 15 minutes
- Max requêtes : 100

Après dépassement:
→ HTTP 429 "Too Many Requests"
```

**Protection contre :**
- Attaques par force brute
- Spam de votes
- DoS (Denial of Service)

#### 2. Validation des données

Toutes les entrées utilisateur sont validées avec **Joi** :

```javascript
Élection:
✓ Titre : 3-200 caractères
✓ Type : ['simple', 'approval', 'preference', 'list']
✓ Options : min 2, max 100
✓ Max voters : 1-30000

Électeur:
✓ Email : format valide
✓ Poids : 0.1-10
```

#### 3. Helmet.js

Headers de sécurité HTTP :

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

#### 4. CORS

Contrôle strict des origines autorisées :

```javascript
Production:
origin: process.env.APP_URL  // Uniquement votre domaine

Développement:
origin: '*'  // Toutes origines (à changer en prod)
```

### Audit et traçabilité

#### Logs d'audit

Toutes les actions importantes sont tracées :

```sql
audit_logs:
├─ ID de l'élection
├─ ID de l'utilisateur
├─ Action effectuée
├─ Détails (JSON)
├─ Adresse IP
└─ Horodatage
```

**Actions tracées :**
- Création/modification/suppression d'élection
- Ajout/suppression d'électeurs
- Démarrage/clôture de vote
- Envoi d'emails/rappels
- Consultation des résultats

#### Liste d'émargement

Pour chaque vote, enregistrement de :

```sql
attendance_list:
├─ ID électeur (référence)
├─ Date et heure exacte
├─ Adresse IP
└─ User-Agent (navigateur)
```

⚠️ **Important :** La liste d'émargement ne contient PAS le contenu du vote (si vote secret).

### Vérification d'intégrité

Contrôles automatiques disponibles :

#### 1. Cohérence des comptages

```javascript
Vérifications:
✓ Nombre de votes = Nombre d'électeurs ayant voté
✓ Pas de doublons de tokens
✓ Tous les bulletins déchiffrables
```

#### 2. Hash des bulletins

Chaque bulletin a un hash unique :

```javascript
Hash = SHA256(electionId + voterToken + timestamp)

Permet de détecter:
❌ Modification du bulletin
❌ Bulletin injecté
❌ Réutilisation de token
```

#### 3. API de vérification

```bash
POST /api/elections/:id/verify-integrity

Réponse:
{
  "integrity_check": "passed",
  "voters_voted": 150,
  "ballots_count": 150,
  "issues": []
}
```

## Bonnes pratiques

### En production

#### 1. Variables d'environnement

**OBLIGATOIRES à changer :**

```env
# ❌ NE PAS utiliser les valeurs par défaut
JWT_SECRET=clé-super-secrète-min-32-caractères-aléatoires
ENCRYPTION_KEY=exactement-32-caracteres-aleat

# ✅ Générer des clés sécurisées
# Utilisez : node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 2. HTTPS obligatoire

```bash
# Rediriger tout le trafic HTTP vers HTTPS
# Exemple avec Nginx:

server {
    listen 80;
    server_name evoting.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name evoting.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Configuration SSL sécurisée
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}
```

#### 3. Sauvegardes de la base de données

```bash
# Sauvegarde quotidienne automatique
# Crontab : 0 3 * * * /path/to/backup.sh

#!/bin/bash
DB_PATH="/path/to/database/evoting.db"
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Copier la base
cp $DB_PATH $BACKUP_DIR/evoting_$DATE.db

# Compresser
gzip $BACKUP_DIR/evoting_$DATE.db

# Garder 30 jours de backups
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

#### 4. Logs serveur

```javascript
// Winston ou autre système de logs
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

#### 5. Firewall

```bash
# UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### Configuration email sécurisée

#### Gmail

1. **Activer l'authentification à 2 facteurs**
2. **Créer un mot de passe d'application**
   - Compte Google → Sécurité → Mots de passe d'application
   - Générer un mot de passe
   - Utiliser ce mot de passe dans `.env`

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false  # STARTTLS
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=mot-de-passe-application-16-caracteres
```

#### Autres fournisseurs

**SendGrid, Mailgun, etc. :**
- Utiliser une clé API plutôt qu'un mot de passe
- Configurer SPF/DKIM pour éviter le spam

### Protection des données personnelles (RGPD)

#### Consentement

Informez les électeurs :
```
"En participant à ce vote, vous acceptez que:
- Votre email soit utilisé pour l'envoi d'invitations
- Votre participation soit enregistrée (émargement)
- Vos données soient conservées [durée] pour audit"
```

#### Durée de conservation

Définissez une politique :
```javascript
// Supprimer les données après X mois
const RETENTION_MONTHS = 12;

// Tâche planifiée
cron.schedule('0 0 1 * *', () => {
  db.prepare(`
    DELETE FROM elections
    WHERE created_at < datetime('now', '-${RETENTION_MONTHS} months')
  `).run();
});
```

#### Droit d'accès et suppression

Permettez aux électeurs de :
- Consulter leurs données
- Demander la suppression (après clôture)

## Checklist sécurité

### Avant déploiement

- [ ] Changé `JWT_SECRET`
- [ ] Changé `ENCRYPTION_KEY`
- [ ] HTTPS configuré
- [ ] Firewall activé
- [ ] Rate limiting vérifié
- [ ] CORS configuré correctement
- [ ] Sauvegardes automatiques
- [ ] Logs activés
- [ ] Variables d'environnement sécurisées
- [ ] Email sécurisé (mot de passe app)

### Maintenance régulière

- [ ] Vérifier les logs d'erreur
- [ ] Tester les sauvegardes
- [ ] Mettre à jour les dépendances
- [ ] Auditer les accès
- [ ] Surveiller les anomalies

## En cas de problème de sécurité

### Fuite de token électeur

1. **Supprimer l'électeur concerné**
2. **Recréer avec nouveau token**
3. **Renvoyer l'invitation**
4. **Vérifier les logs pour vote frauduleux**

### Suspicion de fraude

1. **Vérifier l'intégrité** : `POST /api/elections/:id/verify-integrity`
2. **Consulter les logs d'audit**
3. **Vérifier la liste d'émargement** (IP, timestamps)
4. **Comparer nombre de votes vs nombre d'électeurs**

### Compromission du serveur

1. **Arrêter immédiatement le serveur**
2. **Changer tous les secrets** (JWT_SECRET, ENCRYPTION_KEY)
3. **Régénérer tous les tokens**
4. **Analyser les logs**
5. **Restaurer depuis backup**

## Questions fréquentes

### Peut-on relier un vote à un électeur ?

**Vote secret :** NON, impossible même pour l'administrateur.
**Vote public :** OUI, c'est le principe (transparence).

### Les votes sont-ils modifiables après envoi ?

NON. Une fois soumis, le vote est :
- Chiffré (si secret)
- Hashé pour intégrité
- Horodaté
- Immuable

### L'administrateur peut-il modifier les résultats ?

NON. Les bulletins sont :
- Chiffrés avec clé secrète
- Hashés individuellement
- Vérifiables par intégrité

Toute modification invaliderait les hash.

### Que se passe-t-il si la clé de chiffrement est perdue ?

⚠️ **CRITIQUE** : Impossible de déchiffrer les votes secrets.

**Solution :** Sauvegardez `ENCRYPTION_KEY` de manière sécurisée et séparée.

---

**Sécurité = Confiance = Démocratie** 🔒
