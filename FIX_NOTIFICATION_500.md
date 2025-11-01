# Fix: Erreur 500 sur GET /api/notifications

## Problème

```
GET http://localhost:5173/api/notifications 500 (Internal Server Error)
```

La table `notifications` n'existe pas dans la base de données.

## Solution Rapide

### Étape 1 : Initialiser la Base de Données

```bash
npm run init-db
```

**Ou manuellement :**

```bash
npm run migrate:notifications
```

### Étape 2 : Redémarrer le Serveur

```bash
npm run dev
```

### Étape 3 : Vérifier

La console devrait afficher :
```
✅ Validation des variables d'environnement: OK
🚀 WebSocket server initialized
```

Et dans l'application :
- Console navigateur : `✅ WebSocket connected`
- Pas d'erreur 500 sur `/api/notifications`

---

## Détails Techniques

### Qu'est-ce qui s'est passé ?

Le système de notifications v2.1 nécessite 2 tables :
1. **notifications** - Pour stocker les notifications persistantes
2. **push_subscriptions** - Pour stocker les subscriptions Web Push

Ces tables n'ont pas été créées par la migration principale (`migrate.js` ou `migrate:v2`).

### Fichiers SQL Impliqués

```
server/database/
├── create-notifications-table.sql        ← Table notifications
└── create-push-subscriptions-table.sql   ← Table push_subscriptions
```

### Scripts Disponibles

| Script | Fonction |
|--------|----------|
| `npm run init-db` | **Recommandé** - Crée les 2 tables |
| `npm run migrate` | Migration principale |
| `npm run migrate:notifications` | Migration notifications seulement |

---

## Solution Complète Pas à Pas

### 1. Vérifier l'État Actuel

```bash
# Voir les tables existantes
sqlite3 server/database/database.db ".tables"

# Devrait afficher quelque chose comme:
# users elections voters ballots audit_logs...
# (notifications et push_subscriptions manquent)
```

### 2. Initialiser les Tables

```bash
# Option A : Script automatique (recommandé)
npm run init-db

# Option B : Migration spécifique
npm run migrate:notifications

# Option C : Manuellement
sqlite3 server/database/database.db < server/database/create-notifications-table.sql
sqlite3 server/database/database.db < server/database/create-push-subscriptions-table.sql
```

### 3. Vérifier la Création

```bash
# Vérifier les tables créées
sqlite3 server/database/database.db ".tables"

# Devrait maintenant inclure:
# - notifications
# - push_subscriptions

# Vérifier la structure
sqlite3 server/database/database.db ".schema notifications"
sqlite3 server/database/database.db ".schema push_subscriptions"
```

### 4. Redémarrer l'Application

```bash
# Arrêter le serveur actuel (Ctrl+C)

# Redémarrer
npm run dev
```

### 5. Tester

**Dans la console navigateur** :
```javascript
// Devrait afficher les logs de connexion WebSocket
✅ WebSocket connected
```

**Faire une requête test** :
```bash
# Remplacer TOKEN par votre token JWT
curl http://localhost:3000/api/notifications \
  -H "Authorization: Bearer TOKEN"

# Devrait retourner:
# {
#   "notifications": [],
#   "unreadCount": 0
# }
```

---

## Prévention

Pour éviter ce problème à l'avenir :

### 1. Modifier le Startup du Serveur (server/index.js)

```javascript
// Au démarrage du serveur, vérifier les tables
async function initializeDatabase() {
  try {
    const tables = await db.all(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name IN ('notifications', 'push_subscriptions')
    `);

    if (tables.length < 2) {
      console.warn('⚠️  Tables manquantes, veuillez exécuter: npm run init-db');
    }
  } catch (err) {
    console.error('Erreur vérification BD:', err);
  }
}
```

### 2. Documentation README

Ajouter au README.md :

```markdown
## Initialisation

Après installation, initialiser la base de données :

```bash
npm install
npm run init-db          # Créer les tables
npm run generate-keys    # Générer les clés
npm run dev             # Démarrer l'app
```
```

### 3. GitHub Actions / CI/CD

```yaml
- name: Initialize Database
  run: npm run init-db

- name: Verify Database
  run: sqlite3 database.db ".tables" | grep notifications
```

---

## Tableau de Résolution

| Symptôme | Cause | Solution |
|----------|-------|----------|
| 500 sur GET /api/notifications | Table manquante | `npm run init-db` |
| 500 sur POST /api/push/subscribe | Table manquante | `npm run init-db` |
| Notifications vides | Table vide (normal) | Créer une élection |
| WebSocket déconnecté | Erreur auth | Vérifier le token JWT |
| Erreur "table already exists" | Table déjà créée | Ignorer, c'est normal |

---

## FAQ

**Q: Faut-il exécuter les deux migrations (notifications + push)?**
A: Non, `npm run init-db` les crée toutes les deux automatiquement.

**Q: Est-ce que cela supprime les autres données?**
A: Non, `init-db` crée uniquement les nouvelles tables.

**Q: Que faire si je reçois l'erreur "table already exists"?**
A: C'est normal! Les tables existent déjà. Ignorez le message et continuez.

**Q: Est-ce sûr de relancer init-db plusieurs fois?**
A: Oui, les tables ont des contraintes IF NOT EXISTS.

**Q: Pourquoi n'était-ce pas créé automatiquement?**
A: Les tables v2.1 (notifications, push) sont nouvelles et ne sont pas incluses dans la migration v2.0.

---

## Commandes Complètes de Configuration

```bash
# 1. Installation complète (recommandé)
npm install
npm run init-db
npm run generate-keys
npm run dev

# 2. Ou étape par étape
npm install                      # Installer les dépendances
npm run migrate                  # Migration principale
npm run migrate:notifications    # Tables notifications
npm run generate-keys           # Générer clés sécurité
npm run generate-vapid          # Générer clés Web Push (optionnel)
npm run dev                     # Démarrer l'app
```

---

**Version** : 2.1.0
**Date** : 2025-10-18
**Statut** : ✅ Résolu
