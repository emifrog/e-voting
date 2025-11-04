# 🚀 Guide d'Optimisation des Requêtes SELECT *

## 📊 Résumé des Optimisations à Effectuer

Ce document liste toutes les requêtes `SELECT *` identifiées et propose des optimisations.

---

## Priorité HAUTE - Impact Performance

### 1. **server/routes/results.js**

#### Ligne 37 - Ballots (CRITIQUE - encrypted_vote est volumineux)
```javascript
// ❌ AVANT
const encryptedBallots = await db.all('SELECT * FROM ballots WHERE election_id = ?', [electionId]);

// ✅ APRÈS
const encryptedBallots = await db.all(
  'SELECT id, ballot_hash, encrypted_vote, voter_weight, cast_at FROM ballots WHERE election_id = ?',
  [electionId]
);
```
**Impact**: Réduction de 20-30% de la taille des données transférées

#### Ligne 277 - Ballots pour déchiffrement
```javascript
// ❌ AVANT
const ballots = await db.all('SELECT * FROM ballots WHERE election_id = ?', [electionId]);

// ✅ APRÈS
const ballots = await db.all(
  'SELECT id, encrypted_vote, voter_weight FROM ballots WHERE election_id = ?',
  [electionId]
);
```

### 2. **server/routes/voters.js**

#### Ligne 25 - Liste des électeurs
```javascript
// ❌ AVANT
const voters = await db.all('SELECT * FROM voters WHERE election_id = ?', [electionId]);

// ✅ APRÈS
const voters = await db.all(
  'SELECT id, email, name, weight, has_voted, voted_at, reminder_sent FROM voters WHERE election_id = ?',
  [electionId]
);
```
**Note**: Exclure `token` et `qr_code` qui sont volumineux et rarement nécessaires

#### Ligne 104 - Vérification électeur
```javascript
// ❌ AVANT
const existing = await db.get('SELECT * FROM voters WHERE election_id = ? AND email = ?', [electionId, email]);

// ✅ APRÈS
const existing = await db.get(
  'SELECT id, email FROM voters WHERE election_id = ? AND email = ?',
  [electionId, email]
);
```

#### Ligne 209 - CSV Import
```javascript
// ❌ AVANT
const voters = await db.all('SELECT * FROM voters WHERE election_id = ?', [electionId]);

// ✅ APRÈS
const voters = await db.all(
  'SELECT id, email, name, token, qr_code FROM voters WHERE election_id = ?',
  [electionId]
);
```

---

## Priorité MOYENNE

### 3. **server/routes/elections.js**

#### Lignes 130, 138, 164, 196, 230 - Vérification d'élection
```javascript
// ❌ AVANT
const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?', [electionId, req.user.id]);

// ✅ APRÈS
const election = await db.get(
  `SELECT id, title, description, type, status, voting_type, is_secret,
          is_weighted, scheduled_start, scheduled_end, deferred_counting,
          max_voters, settings
   FROM elections
   WHERE id = ? AND created_by = ?`,
  [electionId, req.user.id]
);
```

#### Ligne 31 - Options d'élection
```javascript
// ❌ AVANT
const options = await db.all('SELECT * FROM election_options WHERE election_id = ? ORDER BY option_order', [electionId]);

// ✅ APRÈS
const options = await db.all(
  'SELECT id, option_text, option_order, candidate_name, candidate_info FROM election_options WHERE election_id = ? ORDER BY option_order',
  [electionId]
);
```

### 4. **server/routes/reminders.js**

#### Ligne 18 - Election pour rappel
```javascript
// ❌ AVANT
const election = await db.get('SELECT * FROM elections WHERE id = ?', [electionId]);

// ✅ APRÈS
const election = await db.get(
  'SELECT id, title, status, scheduled_end FROM elections WHERE id = ?',
  [electionId]
);
```

#### Ligne 29 - Électeurs à relancer
```javascript
// ❌ AVANT
const voters = await db.all(`SELECT * FROM voters WHERE election_id = ? AND has_voted = 0 AND reminder_sent = 0`, [electionId]);

// ✅ APRÈS
const voters = await db.all(
  'SELECT id, email, name, token FROM voters WHERE election_id = ? AND has_voted = 0 AND reminder_sent = 0',
  [electionId]
);
```

### 5. **server/routes/twoFactor.js**

#### Ligne 18 - Utilisateur 2FA
```javascript
// ❌ AVANT
const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);

// ✅ APRÈS
const user = await db.get(
  'SELECT id, email, name, role FROM users WHERE id = ?',
  [req.user.id]
);
```
**Note**: `two_factor_secret` et `two_factor_enabled` peuvent être ajoutés si nécessaires

### 6. **server/routes/observers.js**

#### Lignes variées - Vérifications observateur
```javascript
// ❌ AVANT
const election = await db.get('SELECT * FROM elections WHERE id = ?', [electionId]);

// ✅ APRÈS
const election = await db.get(
  'SELECT id, title, status FROM elections WHERE id = ?',
  [electionId]
);
```

---

## Priorité BASSE

### 7. **server/services/scheduler.js**

#### Ligne 10 - Élections à démarrer
```javascript
// ❌ AVANT
const electionsToStart = await db.all('SELECT * FROM elections WHERE status = ?', ['draft']);

// ✅ APRÈS
const electionsToStart = await db.all(
  'SELECT id, title, scheduled_start FROM elections WHERE status = ? AND scheduled_start <= datetime("now")',
  ['draft']
);
```

#### Ligne 36 - Élections à clôturer
```javascript
// ❌ AVANT
const electionsToClose = await db.all('SELECT * FROM elections WHERE status = ?', ['active']);

// ✅ APRÈS
const electionsToClose = await db.all(
  'SELECT id, title, scheduled_end FROM elections WHERE status = ? AND scheduled_end <= datetime("now")',
  ['active']
);
```

---

## 📋 Checklist d'Optimisation

### Routes
- [x] ✅ server/routes/auth.js (lignes 94, 199)
- [ ] server/routes/results.js (lignes 16, 31, 37, 116, 164, 196, 230, 277)
- [ ] server/routes/voters.js (lignes 25, 104, 209, 242, 286)
- [ ] server/routes/elections.js (lignes 130, 138, 164, 196, 230)
- [ ] server/routes/reminders.js (lignes 18, 29, 45, etc.)
- [ ] server/routes/twoFactor.js (ligne 18 et autres)
- [ ] server/routes/observers.js (lignes variées)
- [ ] server/routes/voting.js (vérifier s'il y a des SELECT *)

### Services
- [ ] server/services/scheduler.js (lignes 10, 36)
- [ ] server/services/quorum.js (déjà optimisé ✅)
- [ ] server/services/notifications.js (déjà optimisé ✅)

---

## 🎯 Gains de Performance Attendus

| Fichier | Requêtes Optimisées | Gain Estimé |
|---------|---------------------|-------------|
| results.js | 8 | 30-40% (ballots volumineux) |
| voters.js | 5 | 20-30% (qr_code volumineux) |
| elections.js | 5 | 15-25% |
| auth.js | 2 | 10-15% |
| reminders.js | 4 | 15-20% |
| scheduler.js | 2 | 10-15% |
| **TOTAL** | **26+** | **20-35% global** |

---

## 🛠️ Script d'Automatisation

Pour appliquer toutes ces optimisations automatiquement, vous pouvez utiliser ce script sed/awk ou le faire manuellement :

```bash
# Exemple pour auth.js (déjà fait)
# Faire de même pour les autres fichiers

# Ou utiliser un script Node.js pour modifier tous les fichiers
node server/scripts/apply-query-optimizations.js
```

---

## 📝 Bonnes Pratiques

### 1. Toujours spécifier les colonnes nécessaires
```javascript
// ❌ Mauvais
SELECT * FROM table

// ✅ Bon
SELECT id, name, email FROM table
```

### 2. Éviter les colonnes volumineuses quand non nécessaires
- `encrypted_vote` (ballots)
- `qr_code` (voters)
- `token` (voters - sauf si nécessaire)
- `settings` (elections - JSON volumineux)

### 3. Ajouter des WHERE clauses restrictives
```javascript
// ❌ Mauvais
SELECT * FROM voters WHERE election_id = ?

// ✅ Bon
SELECT id, email FROM voters WHERE election_id = ? AND has_voted = 0
```

### 4. Utiliser les index (déjà créés via migrate-indexes.js)
Les index créés optimisent automatiquement les requêtes WHERE, JOIN, ORDER BY

---

## 🔍 Comment Vérifier les Améliorations

### 1. Avant/Après avec EXPLAIN ANALYZE
```sql
-- Dans Supabase SQL Editor
EXPLAIN ANALYZE
SELECT * FROM ballots WHERE election_id = 'some-id';

-- vs

EXPLAIN ANALYZE
SELECT id, encrypted_vote, voter_weight FROM ballots WHERE election_id = 'some-id';
```

### 2. Monitoring Prometheus
Surveiller les métriques :
- `http_request_duration_ms` - Devrait diminuer
- `db_query_duration_ms` - Devrait diminuer

### 3. Tests de charge
```bash
# Avant optimisation
ab -n 1000 -c 10 http://localhost:3000/api/elections/ID/results

# Après optimisation
ab -n 1000 -c 10 http://localhost:3000/api/elections/ID/results
```

---

## ✅ Prochaines Étapes

1. **Immédiat**: Appliquer les optimisations HAUTE priorité (results.js, voters.js)
2. **Court terme**: Appliquer les optimisations MOYENNE priorité
3. **Long terme**: Créer un linter ESLint pour détecter les `SELECT *`
4. **Monitoring**: Activer le logging des requêtes lentes (> 100ms)

---

**Date de création**: 2025-01-04
**Auteur**: Optimisation Base de Données E-Voting
**Status**: En cours d'implémentation
