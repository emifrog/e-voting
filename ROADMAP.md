# 📊 E-VOTING PLATFORM - ROADMAP COMPLET

## Version Actuelle
- **Version:** 2.1.0
- **Date:** 2024-11-02
- **Status:** Production Ready (Rating: 8.5/10)

---

## 🎯 VISION GLOBALE

Transformer la plateforme e-voting en solution **enterprise-grade** avec:
- ✅ Support de 100,000+ votants
- ✅ Sécurité bancaire (zero-knowledge voting)
- ✅ Conformité GDPR/Compliance
- ✅ UX accessible et intuitif (WCAG 2.1 AA)
- ✅ Analytics et reporting avancés
- ✅ Intégrations écosystème (Slack, Teams, CRM, SSO)

**Timeline Total:** 6 mois (26 sprints de 1 semaine)

---

## 📅 ROADMAP DÉTAILLÉE PAR SPRINT

### ⚡ SPRINT 1 (Semaine 1) - SÉCURITÉ CRITIQUE
**Durée:** 5 jours | **Effort:** 40 heures | **Priorité:** 🔴 CRITIQUE

#### Objectifs
- [ ] Sécuriser authentification utilisateur
- [ ] Implémenter session expiration
- [ ] Renforcer validation des données

#### Tâches

**1.1 - Validation des mots de passe (8h)**
- **Fichiers affectés:** `server/routes/auth.js`, `src/pages/Register.jsx`
- **Description:** Augmenter force des mots de passe
  - Minimum 12 caractères (actuellement 6)
  - Exiger: 1 majuscule, 1 chiffre, 1 caractère spécial
  - Vérifier contre liste de mots de passe courants (npm: bad-passwords)
  - Ajouter compteur de force en temps réel au formulaire
- **Fichiers à modifier:**
  ```
  server/routes/auth.js (lignes 20-35)
  src/pages/Register.jsx (ajouter validation)
  src/components/PasswordStrengthMeter.jsx (nouveau)
  ```
- **Tests:** Tester min/maj/chiffre/spécial/length
- **Risque:** Peut invalider comptes existants faibles - migration requise

**1.2 - Session Expiration (6h)**
- **Fichiers affectés:** `src/pages/Login.jsx`, `server/routes/auth.js`, `src/utils/api.js`
- **Description:** Implémenter gestion de session avec expiration
  - Token JWT: TTL 1 heure (actuellement pas d'expiration)
  - Refresh token: TTL 7 jours
  - Ajouter checkbox "Se souvenir de moi" → session 30 jours
  - Logout automatique après inactivité 1h
  - Toast notification avant expiration (-5 min)
- **Détails d'implémentation:**
  ```javascript
  // Token actuel: pas d'exp
  // Nouveau:
  jwt.sign(payload, secret, { expiresIn: '1h' });
  // Ajouter refresh token endpoint: POST /api/auth/refresh
  ```
- **Test:** Vérifier expiration automatique, refresh token valide

**1.3 - Rate Limiting Amélioré (6h)**
- **Fichiers affectés:** `server/index.js` (lignes 124-139), `server/middleware/rateLimit.js`
- **Description:** Renforcer protection contre brute-force
  - Rate limit par voter token (pas seulement IP)
  - Endpoints distincts:
    - Login: 5 tentatives/15 min par IP
    - Vote: 3 tentatives/1 min par voter token
    - Registration: 3/1h par IP
  - Exponential backoff après dépassement (15s, 30s, 1m, 5m)
  - CAPTCHA après 3 tentatives failed
- **Nouvelle structure:**
  ```javascript
  // Login limit
  rateLimit({ windowMs: 15*60*1000, max: 5 })
  // Vote limit - par voter token
  rateLimit.perVoter({ windowMs: 60*1000, max: 3 })
  ```
- **Dépendance nouvelle:** `npm install express-rate-limit`
- **Test:** Tester IP spoofing impossible, token limits work

**1.4 - Input Validation Standardisée (8h)**
- **Fichiers affectés:** `server/middleware/validation.js`, tous routes, frontend
- **Description:** Centraliser et standardiser validation
  - Créer schéma Joi central pour toutes validations
  - Validator middleware appliqué à tous endpoints
  - Frontend: même règles que backend (synchronisées)
  - Messages d'erreur spécifiques à chaque champ
- **Validations à ajouter:**
  ```
  election_title: max 200 chars, min 5, alphanumeric + spaces
  election_description: max 5000 chars
  option_text: max 500 chars
  email: valid format, max 255 chars
  password: 12+ chars, uppercase, digit, special
  csv_file: max 5MB, valid format
  ```
- **Fichier structure:**
  ```
  server/middleware/validation.js
    - createElectionSchema
    - createVoterSchema
    - castVoteSchema
    - etc.
  ```
- **Test:** Valider rejets pour données invalides

**1.5 - CSRF Protection (4h)**
- **Fichiers affectés:** `server/index.js`, `server/middleware/csrf.js`, tous forms
- **Description:** Ajouter protection CSRF
  - Express CSRF middleware (npm: `csurf`)
  - Token CSRF dans tous forms et AJAX POST/PUT/DELETE
  - SameSite cookie attribute
- **Implémentation:**
  ```javascript
  // server/middleware/csrf.js
  app.use(csrf({ cookie: { httpOnly: true, sameSite: 'strict' } }));
  // Frontend: inclure token dans requests
  ```
- **Test:** Vérifier token requis, reject sans token

**1.6 - Logging Sécurisé (6h)**
- **Fichiers affectés:** `server/index.js`, tous endpoints
- **Description:** Implémenter structured logging sécurisé
  - Installer Winston logger (npm: `winston`)
  - Ne jamais logger: tokens, mots de passe, emails de votants
  - Format: JSON avec timestamps
  - Levels: info, warn, error, debug
  - Rotation logs tous les jours
- **Configuration:**
  ```javascript
  // server/utils/logger.js (nouveau)
  const winston = require('winston');
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.json(),
    transports: [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error'
      }),
      new winston.transports.File({ filename: 'logs/combined.log' })
    ]
  });
  ```
- **Test:** Vérifier pas de sensitive data en logs

#### Acceptance Criteria
- ✅ Tous mots de passe ancien < 12 char rejetés
- ✅ Tokens expirent après 1h inactivité
- ✅ Session prolongée avec "Se souvenir" (30j)
- ✅ Brute-force impossible (exponential backoff)
- ✅ CAPTCHA déclenché après 3 échecs
- ✅ Validation centralisée fonctionnelle
- ✅ CSRF token requis sur tous forms
- ✅ Logs sans données sensibles

#### Dépendances Nouvelles
```json
"bad-passwords": "^1.0.0",
"winston": "^3.11.0",
"csurf": "^1.11.0",
"express-validator": "^7.0.0"
```

#### Fichiers à Créer
```
server/middleware/csrf.js
server/utils/logger.js
src/components/PasswordStrengthMeter.jsx
```

#### Fichiers à Modifier
```
server/routes/auth.js (validation + session)
src/pages/Register.jsx (password strength)
src/pages/Login.jsx (session)
src/utils/api.js (token refresh)
server/index.js (logging + csrf)
```

---

### 🚀 SPRINT 2 (Semaines 2-3) - PERFORMANCE CRITIQUE
**Durée:** 10 jours | **Effort:** 80 heures | **Priorité:** 🔴 CRITIQUE

#### Objectifs
- [ ] Implémenter pagination voter list
- [ ] Optimiser requêtes database N+1
- [ ] Ajouter caching résultats
- [ ] Enforcer quorum validation

#### Tâches

**2.1 - Pagination VotersTable (12h)**
- **Fichiers affectés:** `src/components/VotersTable.jsx`, `server/routes/voters.js`
- **Description:** Éliminer freezes UI avec 1000+ votants
  - Backend: Implémenter pagination (25/50/100 par page)
  - Frontend: Ajouter contrôles pagination (prev/next/goto page)
  - API: `GET /api/elections/:id/voters?page=1&limit=50`
  - Ajouter total count dans réponse
  - Lazy load: charger page suivante on scroll 80%
- **Détails:**
  ```javascript
  // Backend: server/routes/voters.js
  router.get('/:electionId/voters', async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { data: voters, count } = await db
      .from('voters')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);

    res.json({ voters, total: count, page, limit });
  });
  ```
  - Recharts peut virtualize long lists
- **Migration:** Ajouter offset/limit progressivement
- **Test:** Tester avec 10k votants, 0 lag

**2.2 - Optimisation N+1 Queries (10h)**
- **Fichiers affectés:** `server/routes/elections.js`, `server/database/schema.js`
- **Description:** Réduire requêtes database de 100x
  - Problem: Récupérer list élections + N requêtes pour compter votants
  - Solution: SQL JOIN/aggregation
  - Avant: `SELECT * FROM elections` + boucle `COUNT(*) FROM voters WHERE election_id = X`
  - Après: Une seule requête avec COUNT()
- **Implémentation:**
  ```sql
  -- Avant (N+1)
  SELECT * FROM elections; -- requête 1
  -- Puis pour chaque: SELECT COUNT(*) FROM voters WHERE election_id = ?

  -- Après (optimisé)
  SELECT
    e.*,
    COUNT(DISTINCT v.id) as voter_count,
    COUNT(DISTINCT b.id) as vote_count,
    MAX(b.created_at) as last_vote_time
  FROM elections e
  LEFT JOIN voters v ON e.id = v.election_id
  LEFT JOIN ballots b ON e.id = b.election_id
  GROUP BY e.id;
  ```
- **Endpoints optimisés:**
  - `GET /api/elections` - list avec stats
  - `GET /api/elections/:id` - detail avec stats
  - `GET /api/elections/:id/voters` - list votants
- **Index database:**
  ```sql
  CREATE INDEX idx_voters_election_id ON voters(election_id);
  CREATE INDEX idx_ballots_election_id ON ballots(election_id);
  CREATE INDEX idx_ballots_created_at ON ballots(election_id, created_at DESC);
  CREATE INDEX idx_voters_email_election ON voters(election_id, email);
  CREATE INDEX idx_public_votes_election ON public_votes(election_id, created_at);
  ```
- **Benchmark:** Avant/après load time

**2.3 - Result Caching (8h)**
- **Fichiers affectés:** `server/routes/results.js`, `server/utils/cache.js`
- **Description:** Cacher résultats pour élections fermées
  - Créer cache in-memory ou Redis
  - Élections fermées: cache permanent (jamais expire)
  - Élections actives: cache 10 secondes (refresh on new vote)
  - Invalidate cache quand vote ajouté
- **Implémentation:**
  ```javascript
  // server/utils/cache.js (nouveau)
  const NodeCache = require('node-cache');
  const cache = new NodeCache({ stdTTL: 10 }); // 10 sec default

  exports.getResults = (electionId) => {
    const cached = cache.get(`results_${electionId}`);
    if (cached) return cached;

    // Sinon calculer et cacher
    const results = calculateResults(electionId);
    // Si élection fermée: cache permanent
    const isClosed = checkIfClosed(electionId);
    cache.set(`results_${electionId}`, results, isClosed ? 0 : 10);
    return results;
  };
  ```
- **Invalidation:** Quand vote soumis → `cache.del(key)`
- **Dépendance:** `npm install node-cache` ou `redis`

**2.4 - Quorum Enforcement (8h)**
- **Fichiers affectés:** `server/routes/elections.js`, `server/services/quorum.js`, `src/pages/ElectionDetails.jsx`
- **Description:** Empêcher fermeture sans quorum
  - Actuellement: quorum calculé mais pas enforced
  - Nouvelle: Validation pré-fermeture
  - Si `deferred_counting = false` ET quorum non atteint → bloquer fermeture
  - Message d'erreur: "Quorum non atteint. Impossible de fermer."
  - Si `deferred_counting = true` → autoriser (peut compter plus tard)
- **Implémentation:**
  ```javascript
  // server/routes/elections.js (closeElection endpoint)
  router.put('/:id/close', authenticateToken, async (req, res) => {
    const election = await db.getElection(req.params.id);

    if (!election.deferred_counting) {
      const quorumReached = await checkQuorum(election.id);
      if (!quorumReached) {
        return res.status(400).json({
          error: 'QUORUM_NOT_REACHED',
          message: 'Quorum non atteint. Impossible de fermer l\'élection.'
        });
      }
    }

    // Fermer élection
    await db.closeElection(req.params.id);
  });
  ```
- **Frontend:** Afficher bouton "Fermer" désactivé si quorum non OK
- **Test:** Vérifier fermeture impossible sans quorum

**2.5 - Database Indexes (6h)**
- **Fichiers affectés:** `server/database/schema.js`, migrations SQL
- **Description:** Ajouter indexes manquants pour queries rapides
  - Créer migration: `server/scripts/add-indexes.sql`
  - Index pour votants: `(election_id, email)` composite
  - Index pour ballots: `(election_id, created_at DESC)`
  - Index pour audit logs: `(user_id, action, created_at)`
  - Index pour public votes: `(election_id, created_at DESC)`
- **SQL:**
  ```sql
  CREATE INDEX CONCURRENTLY idx_voters_election_email
    ON voters(election_id, email);
  CREATE INDEX CONCURRENTLY idx_ballots_election_date
    ON ballots(election_id, created_at DESC);
  CREATE INDEX CONCURRENTLY idx_audit_user_action
    ON audit_logs(user_id, action, created_at DESC);
  CREATE INDEX CONCURRENTLY idx_public_votes_election_date
    ON public_votes(election_id, created_at DESC);
  ```
- **Test:** Expliquer requêtes pour vérifier indexes utilisés

**2.6 - Voter Table Optimization (10h)**
- **Fichiers affectés:** `src/components/VotersTable.jsx`
- **Description:** Améliorer performance table avec 1000+ votants
  - Implémenter virtualisation avec `react-window` ou `react-table` v8
  - Afficher seulement votants visibles (virtualization)
  - Ajouter sticky header
  - Ajouter search/filter avec backend (pas client-side)
  - Ajouter inline edit pour poids/groupe
- **Dépendance:** `npm install react-window react-table`
- **Détails:**
  ```jsx
  import { useVirtualizer } from '@tanstack/react-virtual';

  // Render seulement visible rows
  const virtualizer = useVirtualizer({
    count: voters.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // height par row
  });
  ```
- **Avant:** 10k votants = 5+ sec render
- **Après:** 10k votants = instant

**2.7 - Scheduled Tasks (6h)**
- **Fichiers affectés:** `server/services/scheduler.js`
- **Description:** Auto-start/stop élections planifiées
  - Actuellement: `scheduled_start` et `scheduled_end` stockés mais inutilisés
  - Nouvelle: Cron jobs pour déclencher automatiquement
  - Check toutes les minutes: élections à démarrer/arrêter
  - Envoyer notifications WebSocket quand statut change
- **Implémentation:**
  ```javascript
  // server/services/scheduler.js
  const cron = require('node-cron');

  // Check toutes les minutes
  cron.schedule('* * * * *', async () => {
    const now = new Date();

    // Auto-start
    const toStart = await db.query(
      'SELECT * FROM elections WHERE scheduled_start <= $1 AND status = $2',
      [now, 'draft']
    );
    for (const election of toStart) {
      await startElection(election.id);
      notifyClients(`election_started`, election);
    }

    // Auto-stop
    const toStop = await db.query(
      'SELECT * FROM elections WHERE scheduled_end <= $1 AND status = $2',
      [now, 'in_progress']
    );
    for (const election of toStop) {
      await stopElection(election.id);
      notifyClients(`election_stopped`, election);
    }
  });
  ```
- **Test:** Vérifier start/stop au bon moment

#### Acceptance Criteria
- ✅ Pagination VotersTable pour 10k votants sans lag
- ✅ Elections list charge 10x plus vite (une seule requête)
- ✅ Résultats cachés 10s (fermés: permanent)
- ✅ Quorum enforcement: fermeture impossible sans quorum
- ✅ Tous indexes database créés
- ✅ Table render optimisé (virtualization)
- ✅ Élections auto-start/stop au moment planifié

#### Dépendances Nouvelles
```json
"node-cache": "^5.1.2",
"react-window": "^1.8.8",
"react-table": "^8.11.3"
```

#### Fichiers à Créer
```
server/utils/cache.js
server/scripts/add-indexes.sql
```

---

### 📊 SPRINT 3 (Semaines 4-5) - ANALYTICS & AUTOMATION
**Durée:** 10 jours | **Effort:** 75 heures | **Priorité:** 🟡 MOYEN-HAUT

#### Objectifs
- [ ] Créer dashboard analytics temps réel
- [ ] Auto-send reminders/invitations
- [ ] Email template customization
- [ ] Export avec métadonnées

#### Tâches

**3.1 - Real-time Analytics Dashboard (12h)**
- **Fichiers affectés:** `src/pages/Dashboard.jsx`, `src/components/AnalyticsPanel.jsx` (nouveau), `server/routes/analytics.js` (nouveau)
- **Description:** Ajouter tableau de bord avec statistiques en temps réel
  - Graphiques: votes/minute, participation %, temps moyen vote
  - Mise à jour en temps réel via WebSocket
  - Afficher: total votes, quorum %, peak time, device breakdown
  - Metriques par heure/jour
- **Détails:**
  ```jsx
  // src/components/AnalyticsPanel.jsx (nouveau)
  import { AreaChart, LineChart } from 'recharts';

  export function AnalyticsPanel({ electionId }) {
    const [stats, setStats] = useState({
      votesPerMinute: [],
      totalVotes: 0,
      quorumPercent: 0,
      deviceBreakdown: {}
    });

    useEffect(() => {
      // WebSocket pour real-time
      socket.on(`analytics_${electionId}`, (data) => {
        setStats(data);
      });
    }, [electionId]);

    return (
      <div className="analytics">
        <AreaChart data={stats.votesPerMinute}>
          <CartesianGrid />
          <XAxis dataKey="time" />
          <YAxis />
          <Area type="monotone" dataKey="votes" fill="#8884d8" />
        </AreaChart>
        {/* Plus de charts */}
      </div>
    );
  }
  ```
- **Backend events:**
  ```javascript
  // server/services/websocket.js
  // Emit analytics update toutes les 30 sec
  setInterval(() => {
    const stats = calculateAnalytics(electionId);
    io.to(`election_${electionId}`).emit(`analytics_${electionId}`, stats);
  }, 30000);
  ```
- **Dépendance:** Recharts déjà inclus ✅

**3.2 - Automated Email Reminders (10h)**
- **Fichiers affectés:** `server/services/scheduler.js`, `server/services/email.js`, `server/routes/reminders.js`
- **Description:** Auto-send reminders à votants
  - T-7 jours: invitation à voter
  - T-1 jour: rappel (24h avant fermeture)
  - T-1 heure: dernier appel
  - Configurable par élection (enable/disable)
  - Track qui a reçu email
- **Implémentation:**
  ```javascript
  // server/services/scheduler.js
  cron.schedule('0 * * * *', async () => { // Chaque heure
    const elections = await db.getElections({ status: 'in_progress' });

    for (const election of elections) {
      const hoursUntilEnd = getHoursUntil(election.end_time);

      if (hoursUntilEnd === 168) { // 7 jours
        await sendReminders(election.id, 'week_before');
      } else if (hoursUntilEnd === 24) { // 1 jour
        await sendReminders(election.id, 'day_before');
      } else if (hoursUntilEnd === 1) { // 1 heure
        await sendReminders(election.id, 'hour_before');
      }
    }
  });

  async function sendReminders(electionId, type) {
    const election = await db.getElection(electionId);
    const voters = await db.query(
      'SELECT * FROM voters WHERE election_id = $1 AND has_voted = false',
      [electionId]
    );

    for (const voter of voters) {
      const template = getTemplate(type);
      await sendEmail(voter.email, template);

      // Track
      await db.saveReminderLog({
        voter_id: voter.id,
        type,
        sent_at: new Date()
      });
    }
  }
  ```
- **Modèles d'emails:** templates pour chaque rappel
- **Configuration:** Election settings `reminder_enabled`, `reminder_schedule`

**3.3 - Email Template Builder (12h)**
- **Fichiers affectés:** `src/pages/EmailTemplates.jsx` (nouveau), `server/routes/templates.js` (nouveau), `server/database/schema.js`
- **Description:** Permettre admins de customizer emails
  - Interface: drag-drop editor ou WYSIWYG
  - Variables: {election_title}, {voter_name}, {vote_link}, {deadline}
  - Prévisualiser avant sauvegarder
  - HTML + plain text
  - Templates par défaut
- **Base de données:**
  ```sql
  CREATE TABLE email_templates (
    id UUID PRIMARY KEY,
    election_id UUID REFERENCES elections(id),
    type VARCHAR(50), -- 'invitation', 'reminder_week', 'reminder_day', etc
    subject TEXT,
    html_body TEXT,
    plain_text_body TEXT,
    variables JSONB, -- {token: '{voter_token}', name: '{voter_name}'}
    created_at TIMESTAMP,
    updated_at TIMESTAMP
  );
  ```
- **UI Components:**
  - Template list + edit button
  - Editor avec live preview
  - Variable selector (drag variables into template)
  - Test send button
- **Dépendance:** `npm install react-quill` (WYSIWYG)

**3.4 - Export avec Métadonnées (8h)**
- **Fichiers affectés:** `server/routes/results.js`, `src/pages/Results.jsx`
- **Description:** Ajouter metadata à tous exports
  - Metadata: election_id, exported_by, export_timestamp, total_votes, sha256_hash
  - Checksum pour vérifier intégrité
  - Inclure audit trail info
- **Structure export (CSV):**
  ```
  # METADATA
  election_id,exported_by,export_timestamp,total_votes,sha256_hash
  550e8400-e29b-41d4-a716-446655440000,admin@example.com,2024-11-02T10:30:00Z,150,abc123...

  # RESULTS
  option,votes,percentage,timestamp
  Candidate A,75,50%,2024-11-02T10:30:00Z
  ```
- **JSON export:**
  ```json
  {
    "metadata": {
      "election_id": "550e8400-...",
      "election_title": "Board Election 2024",
      "exported_by": "admin@example.com",
      "export_timestamp": "2024-11-02T10:30:00Z",
      "total_votes": 150,
      "voter_count": 200,
      "quorum": "75",
      "quorum_met": true,
      "sha256_hash": "abc123..."
    },
    "results": [...]
  }
  ```
- **Implémentation:**
  ```javascript
  // server/routes/results.js
  router.get('/:id/export', async (req, res) => {
    const { format = 'csv' } = req.query;
    const results = await getResults(req.params.id);

    const metadata = {
      election_id: req.params.id,
      exported_by: req.user.email,
      export_timestamp: new Date().toISOString(),
      total_votes: results.total_votes,
      sha256_hash: calculateHash(results)
    };

    if (format === 'csv') {
      const csv = generateCSV(metadata, results);
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    }
  });
  ```
- **Test:** Vérifier integrity hash, metadata complète

**3.5 - Bulk Voter Operations (10h)**
- **Fichiers affectés:** `src/components/VotersTable.jsx`, `server/routes/voters.js`
- **Description:** Bulk edit/delete votants
  - Checkboxes pour sélectionner votants
  - Actions groupées: update weight, delete, send reminder, export
  - Confirmation dialog pour destructive actions
  - Progress bar pour opérations longues
  - Undo option (soft delete avec recovery window)
- **Détails:**
  ```jsx
  // VotersTable.jsx
  const [selectedVoters, setSelectedVoters] = useState([]);

  const handleBulkUpdate = async (weight) => {
    const ids = selectedVoters.map(v => v.id);
    await api.post(`/elections/${electionId}/voters/bulk-update`, {
      voter_ids: ids,
      updates: { weight }
    });
  };
  ```
- **Endpoints:**
  ```
  POST /api/elections/:id/voters/bulk-update
  DELETE /api/elections/:id/voters/bulk-delete
  POST /api/elections/:id/voters/bulk-send-reminder
  ```
- **Database:**
  ```sql
  ALTER TABLE voters ADD COLUMN deleted_at TIMESTAMP;
  -- Soft delete au lieu de hard delete
  UPDATE voters SET deleted_at = NOW() WHERE id IN (...)
  ```

**3.6 - Observer Reports (8h)**
- **Fichiers affectés:** `src/pages/ObserverDashboard.jsx`, `server/routes/observers.js`
- **Description:** Permettre observers de générer rapports
  - Rapport observateur: timeline des actions observées
  - Quorum status au moment de fermeture
  - Rapport de conformité (pour régulateurs)
  - Export en PDF/CSV
  - Sign rapport (optionnel)
- **Détails:**
  ```javascript
  // server/routes/observers.js
  router.get('/:token/report', async (req, res) => {
    const observer = await getObserver(req.params.token);
    const election = await getElection(observer.election_id);

    const report = {
      observer_name: observer.name,
      election_title: election.title,
      observation_period: {
        start: election.start_time,
        end: election.end_time
      },
      final_results: await getResults(election.id),
      audit_trail: await getAuditLog(election.id),
      signature: observer.signature || null
    };

    res.json(report);
  });
  ```
- **PDF generation:** `npm install pdfkit`

#### Acceptance Criteria
- ✅ Dashboard affiche analytics en temps réel
- ✅ Reminders auto-envoyés aux bons moments
- ✅ Admins peuvent customizer emails
- ✅ Exports contiennent metadata + hash
- ✅ Bulk operations pour voter management
- ✅ Observers peuvent générer rapports

#### Dépendances Nouvelles
```json
"react-quill": "^2.0.0",
"pdfkit": "^0.13.0"
```

#### Fichiers à Créer
```
src/pages/EmailTemplates.jsx
src/components/AnalyticsPanel.jsx
server/routes/templates.js
server/routes/analytics.js
```

---

### 🔐 SPRINT 4 (Semaines 6-7) - SÉCURITÉ AVANCÉE
**Durée:** 10 jours | **Effort:** 70 heures | **Priorité:** 🟡 MOYEN-HAUT

#### Objectifs
- [ ] 2FA SMS alternative
- [ ] Encryption key management
- [ ] Audit trail immuable
- [ ] Voter IP whitelisting

#### Tâches

**4.1 - SMS 2FA Implementation (12h)**
- **Fichiers affectés:** `server/routes/twoFactor.js`, `server/services/sms.js` (nouveau), `src/pages/Security.jsx`
- **Description:** Ajouter SMS comme option 2FA (backup TOTP)
  - Intégration Twilio ou Vonage
  - SMS code à 6 chiffres, valide 5 minutes
  - Rate limit: max 3 SMS/5 min
  - Fallback si TOTP authenticator perdu
- **Implémentation:**
  ```javascript
  // server/services/sms.js
  const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  exports.sendOTP = async (phone) => {
    const code = generateOTP();
    await twilio.messages.create({
      from: process.env.TWILIO_PHONE,
      to: phone,
      body: `Votre code E-voting: ${code}. Valide 5 minutes.`
    });
    return code;
  };

  exports.verifyOTP = (code, storedCode) => {
    return code === storedCode && !isExpired();
  };
  ```
- **Database:**
  ```sql
  ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
  ALTER TABLE users ADD COLUMN sms_2fa_enabled BOOLEAN DEFAULT false;
  ALTER TABLE two_factor_secrets ADD COLUMN method VARCHAR(20) -- 'totp' ou 'sms'
  ```
- **Dépendance:** `npm install twilio`

**4.2 - Encryption Key Management (10h)**
- **Fichiers affectés:** `server/utils/crypto.js`, `server/middleware/keyRotation.js` (nouveau)
- **Description:** Gérer clés de chiffrement de manière sécurisée
  - Actuellement: clé en .env (risqué)
  - Nouvelle: Version multiple des clés pour rotation
  - Auto-rotate clés tous les 90 jours
  - Marquer votes avec version de clé utilisée
  - Déchiffrer avec la bonne version
- **Schema:**
  ```sql
  CREATE TABLE encryption_keys (
    id SERIAL PRIMARY KEY,
    version INT UNIQUE,
    key_hash VARCHAR(255),
    created_at TIMESTAMP,
    rotated_at TIMESTAMP,
    is_active BOOLEAN,
    purpose VARCHAR(50) -- 'ballot_encryption', 'data_at_rest'
  );

  -- Ajouter colonne aux ballots
  ALTER TABLE ballots ADD COLUMN encryption_key_version INT;
  ```
- **Process:**
  ```javascript
  // Chaque 90 jours:
  // 1. Générer nouvelle clé
  // 2. INSERT encryption_keys avec version++
  // 3. UPDATE SET is_active=false pour ancienne version
  // 4. Garder anciennes versions pour déchiffrement

  exports.decrypt = (encryptedData, keyVersion) => {
    const keyInfo = db.getEncryptionKey(keyVersion);
    return crypto.decrypt(encryptedData, keyInfo.key);
  };
  ```
- **Dépendance:** Crypto existant, ajouter versioning logic

**4.3 - Immutable Audit Trail (10h)**
- **Fichiers affectés:** `server/database/schema.js`, `server/middleware/audit.js`, `server/services/auditLog.js` (nouveau)
- **Description:** Rendre audit logs tamper-proof
  - Table audit_logs append-only (pas de delete/update)
  - Hash chain: chaque entrée = hash(previous entry)
  - Impossible modifier sans détecter
  - Stockage append-only (peut utiliser separate partition)
- **Implementation:**
  ```sql
  CREATE TABLE audit_logs_immutable (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(100),
    user_id UUID,
    election_id UUID,
    resource_type VARCHAR(50),
    resource_id VARCHAR(50),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    previous_hash VARCHAR(256),
    current_hash VARCHAR(256), -- SHA256(id + action + user_id + ... + previous_hash)
    created_at TIMESTAMP,
    CONSTRAINT audit_logs_immutable_no_update_delete
      CHECK (true) -- Empêcher updates/deletes
  );

  -- Trigger pour empêcher modifications
  CREATE RULE audit_logs_immutable_no_delete AS ON DELETE
    TO audit_logs_immutable DO INSTEAD NOTHING;
  CREATE RULE audit_logs_immutable_no_update AS ON UPDATE
    TO audit_logs_immutable DO INSTEAD NOTHING;
  ```
- **Middleware:**
  ```javascript
  // server/middleware/audit.js
  exports.auditLog = async (req, res, next) => {
    res.on('finish', async () => {
      if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        const previousLog = await getLastAuditLog();
        const currentHash = crypto
          .createHash('sha256')
          .update(JSON.stringify({
            id: newId,
            action: `${req.method} ${req.path}`,
            user_id: req.user?.id,
            previous_hash: previousLog?.current_hash,
            timestamp: new Date()
          }))
          .digest('hex');

        await saveAuditLog({
          previous_hash: previousLog?.current_hash,
          current_hash: currentHash
        });
      }
    });
    next();
  };
  ```
- **Vérification:**
  ```javascript
  exports.verifyAuditIntegrity = async () => {
    const logs = await getAllAuditLogs();
    let previousHash = null;

    for (const log of logs) {
      const calculatedHash = calculateHash(log.data + (previousHash || ''));
      if (calculatedHash !== log.current_hash) {
        throw new Error(`Audit trail compromised at log ${log.id}`);
      }
      previousHash = log.current_hash;
    }
    return true;
  };
  ```

**4.4 - IP Whitelisting (8h)**
- **Fichiers affectés:** `src/pages/CreateElection.jsx`, `server/routes/elections.js`, `server/middleware/ipWhitelist.js` (nouveau)
- **Description:** Restreindre accès vote par IP
  - Admin peut configurer IPs autorisées par élection
  - Surtout pour élections sensibles
  - Whitelist ou Blacklist mode
  - Logs de tentatives rejetées
- **Database:**
  ```sql
  CREATE TABLE election_ip_restrictions (
    id UUID PRIMARY KEY,
    election_id UUID REFERENCES elections(id),
    ip_address INET,
    restriction_type VARCHAR(20), -- 'whitelist' ou 'blacklist'
    created_at TIMESTAMP
  );

  ALTER TABLE elections ADD COLUMN ip_restriction_enabled BOOLEAN DEFAULT false;
  ALTER TABLE elections ADD COLUMN ip_restriction_type VARCHAR(20);
  ```
- **Middleware:**
  ```javascript
  // server/middleware/ipWhitelist.js
  exports.checkIPRestriction = async (req, res, next) => {
    const electionId = req.params.electionId;
    const election = await getElection(electionId);
    const clientIP = req.ip;

    if (!election.ip_restriction_enabled) {
      return next();
    }

    const restrictions = await getIPRestrictions(electionId);
    const allowed = restrictions.some(r => matchIP(clientIP, r.ip_address));

    if (!allowed) {
      logIPReject(electionId, clientIP);
      return res.status(403).json({ error: 'IP not allowed' });
    }

    next();
  };
  ```

**4.5 - GDPR Data Retention (8h)**
- **Fichiers affectés:** `server/services/dataRetention.js` (nouveau), `server/database/schema.js`
- **Description:** Implémenter GDPR right-to-be-forgotten
  - Elections: auto-delete après 2 ans
  - Voter data: anonymiser après 1 an (delete emails, etc)
  - Destroy encryption keys pour votes anciens
  - Generate GDPR compliance reports
- **Implementation:**
  ```sql
  ALTER TABLE elections ADD COLUMN retention_period_days INT DEFAULT 730; -- 2 ans
  ALTER TABLE voters ADD COLUMN anonymized_at TIMESTAMP;

  -- Anonymiser votants après 1 an
  UPDATE voters
  SET email = CONCAT('deleted_', voter_id),
      anonymized_at = NOW()
  WHERE created_at < NOW() - INTERVAL '365 days'
  AND anonymized_at IS NULL;
  ```
- **Scheduler:**
  ```javascript
  cron.schedule('0 0 * * *', async () => { // Chaque jour 00:00
    // Auto-delete elections > 2 ans
    await db.query(
      'DELETE FROM elections WHERE created_at < NOW() - INTERVAL \'730 days\''
    );

    // Anonymize voters > 1 an
    await db.query(
      'UPDATE voters SET email = NULL WHERE created_at < NOW() - INTERVAL \'365 days\' AND anonymized_at IS NULL'
    );
  });
  ```
- **Report:**
  ```javascript
  exports.generateGDPRReport = async (userId) => {
    return {
      personal_data: await getPersonalData(userId),
      elections_participated: await getElectionsParticipated(userId),
      data_processed: [...],
      deletion_date: null
    };
  };
  ```

**4.6 - Rate Limit Per Voter Token (8h)**
- **Fichiers affectés:** `server/middleware/rateLimit.js`
- **Description:** Rate limit par token votant, pas seulement IP
  - Actuellement: 3 votes/min par IP (contournable)
  - Nouvelle: 1 vote max par voter token (impossible duplicate)
  - Exponential backoff: 15s, 30s, 1m après tentatives
  - Log tentatives suspectes pour audit
- **Implementation:**
  ```javascript
  // server/middleware/rateLimit.js
  const voterTokenRateLimit = new Map();

  exports.checkVoterTokenLimit = (req, res, next) => {
    const voterToken = req.headers['x-voter-token'];
    const now = Date.now();

    const record = voterTokenRateLimit.get(voterToken) || {
      attempts: 0,
      lastAttempt: 0,
      resetTime: now + 60000
    };

    if (now > record.resetTime) {
      record.attempts = 0;
      record.resetTime = now + 60000;
    }

    record.attempts++;

    if (record.attempts > 1) {
      const backoffMs = [15000, 30000, 60000][Math.min(record.attempts - 2, 2)];
      return res.status(429).json({
        error: 'TOO_MANY_REQUESTS',
        retry_after: Math.ceil(backoffMs / 1000)
      });
    }

    voterTokenRateLimit.set(voterToken, record);
    next();
  };
  ```

#### Acceptance Criteria
- ✅ SMS 2FA fonctionne, rate limited
- ✅ Clés de chiffrement versionées et rotées
- ✅ Audit logs immuables + vérification hash chain
- ✅ IP whitelist configurable par élection
- ✅ Auto-anonymize données > 1 an
- ✅ GDPR report générables
- ✅ Rate limit per voter token

#### Dépendances Nouvelles
```json
"twilio": "^4.0.0"
```

---

### 🎨 SPRINT 5 (Semaines 8-9) - UX & ACCESSIBILITY
**Durée:** 10 jours | **Effort:** 65 heures | **Priorité:** 🟡 MOYEN

#### Objectifs
- [ ] Validation formulaire temps réel
- [ ] Conformité WCAG 2.1 AA
- [ ] Breadcrumb navigation
- [ ] Gestionnaire d'erreurs amélioré

#### Tâches

**5.1 - Real-time Form Validation (8h)**
- **Fichiers affectés:** `src/pages/CreateElection.jsx`, `src/pages/Register.jsx`, `src/pages/Login.jsx`
- **Description:** Feedback validation en temps réel
  - Checkmark vert si valide
  - Erreur rouge + message si invalide
  - Help text contextuel
  - Disable submit button si erreurs
- **Exemple:**
  ```jsx
  function CreateElectionForm() {
    const [form, setForm] = useState({ title: '', description: '' });
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
      const { name, value } = e.target;
      setForm(prev => ({ ...prev, [name]: value }));

      // Validate on change
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    };

    const validateField = (name, value) => {
      if (name === 'title') {
        if (value.length < 5) return 'Minimum 5 caractères';
        if (value.length > 200) return 'Maximum 200 caractères';
        return null;
      }
      // ...
    };

    return (
      <div>
        <label>Titre de l'élection</label>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          className={errors.title ? 'input-error' : 'input-success'}
        />
        {errors.title && <span className="error">{errors.title}</span>}
        {!errors.title && form.title && <span className="success">✓</span>}
      </div>
    );
  }
  ```
- **CSS:**
  ```css
  input.input-success {
    border-color: #22c55e;
    background: #f0fdf4;
  }

  input.input-error {
    border-color: #ef4444;
    background: #fef2f2;
  }
  ```

**5.2 - WCAG 2.1 AA Compliance (15h)**
- **Fichiers affectés:** Tous composants
- **Description:** Rendre app accessible WCAG 2.1 AA
  - Audit avec axe-core
  - Ajouter ARIA labels
  - Contraste couleur 4.5:1 pour texte normal
  - Focus indicators visibles
  - Semantic HTML
  - Alt text pour images
- **Checklist:**
  ```
  [ ] ARIA labels sur tous inputs
  [ ] ARIA labels sur tous buttons (icones)
  [ ] Headings structure valide (h1 > h2 > h3)
  [ ] Alt text sur images (non-empty pour decoratif)
  [ ] Focus outline visible (2px solid #0066cc)
  [ ] Tab order logique
  [ ] Colour contrast >= 4.5:1
  [ ] Font size minimum 16px on mobile
  [ ] Touch targets >= 44x44px
  [ ] Keyboard shortcuts documentés
  [ ] Form labels associées (<label for="">)
  [ ] Error messages clairs
  [ ] Loading state communiqué (aria-live)
  ```
- **Outils:**
  - axe-core npm package
  - WAVE browser extension
  - Lighthouse audit
- **Implémentation exemple:**
  ```jsx
  <button
    aria-label="Download results as CSV"
    onClick={handleDownload}
  >
    <Download size={18} />
  </button>

  <input
    id="email-input"
    type="email"
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby={hasError ? "email-error" : undefined}
  />
  <label htmlFor="email-input">Email address</label>
  {hasError && <span id="email-error" role="alert">{error}</span>}
  ```
- **Dépendance:** `npm install @axe-core/react`

**5.3 - Breadcrumb Navigation (6h)**
- **Fichiers affectés:** `src/components/Breadcrumb.jsx` (nouveau), tous pages
- **Description:** Ajouter breadcrumbs pour orientation
  - Structure: Dashboard > Elections > [Election] > Details
  - Clickable paths
  - Mobile: collapse si trop long
- **Composant:**
  ```jsx
  // src/components/Breadcrumb.jsx
  export function Breadcrumb() {
    const location = useLocation();
    const navigate = useNavigate();

    const paths = [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Elections', path: '/elections' },
      // Parse from location.pathname
    ];

    return (
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          {paths.map((p, i) => (
            <li key={i}>
              {i < paths.length - 1 ? (
                <button onClick={() => navigate(p.path)}>{p.label}</button>
              ) : (
                <span aria-current="page">{p.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  }
  ```
- **CSS:**
  ```css
  .breadcrumb {
    display: flex;
    gap: 0.5rem;
    list-style: none;
  }

  .breadcrumb li:not(:last-child)::after {
    content: "/";
    margin: 0 0.5rem;
  }
  ```

**5.4 - Enhanced Error Handling UI (10h)**
- **Fichiers affectés:** `src/utils/api.js`, `src/components/NotificationCenter.jsx`, tous pages
- **Description:** Améliorer présentation erreurs
  - Toast notifications avec types (error, warning, info, success)
  - Erreurs avec codes spécifiques + recovery actions
  - Fallback UI si erreur
  - No silent failures
- **Example:**
  ```javascript
  // API error interceptor
  api.interceptors.response.use(
    response => response,
    error => {
      const errorCode = error.response?.data?.error || 'UNKNOWN_ERROR';
      const errorMessage = error.response?.data?.message || 'An error occurred';

      const errorConfig = {
        'QUORUM_NOT_REACHED': {
          title: 'Cannot close election',
          message: 'Quorum not reached. Election cannot be closed.',
          action: { label: 'View quorum status', fn: () => navigate('/quorum') }
        },
        'DUPLICATE_EMAIL': {
          title: 'Voter already exists',
          message: `Email already registered. Click to edit.`,
          action: { label: 'Edit voter', fn: () => {} }
        }
      };

      const config = errorConfig[errorCode] || {
        title: 'Error',
        message: errorMessage
      };

      showNotification({
        type: 'error',
        ...config,
        autoClose: false
      });

      throw error;
    }
  );
  ```
- **Notification types:**
  ```jsx
  // Success
  showNotification({
    type: 'success',
    title: 'Voter added',
    message: 'John Doe has been added.',
    autoClose: 3000 // auto-dismiss après 3s
  });

  // Error (require dismiss)
  showNotification({
    type: 'error',
    title: 'Failed to create election',
    message: 'Invalid title. Minimum 5 characters.',
    autoClose: false // user must dismiss
  });

  // Warning
  showNotification({
    type: 'warning',
    title: 'Large voter list',
    message: 'Importing 5000 voters. This may take a few minutes.',
    action: { label: 'Continue', fn: () => {} }
  });
  ```

**5.5 - Mobile Responsive Improvements (8h)**
- **Fichiers affectés:** CSS pour tous composants
- **Description:** Améliorer expérience mobile
  - VotersTable: stack columns sur mobile
  - Modals: responsive width
  - Touch targets: >= 44px
  - Horizontal scroll indicator
  - Bottom sheet pour modals
- **CSS Exemple:**
  ```css
  /* Table responsive */
  @media (max-width: 768px) {
    table thead {
      display: none;
    }

    table tbody, tr, td {
      display: block;
      width: 100%;
    }

    tr {
      margin-bottom: 1rem;
      border: 1px solid #ddd;
      padding: 1rem;
    }

    td::before {
      content: attr(data-label);
      font-weight: bold;
      display: block;
    }
  }

  /* Modal responsive */
  .modal {
    width: min(95vw, 500px);
    max-height: 95vh;
  }

  @media (max-width: 640px) {
    .modal {
      position: fixed;
      bottom: 0;
      width: 100%;
      border-radius: 1rem 1rem 0 0;
      max-height: 90vh;
    }
  }
  ```

**5.6 - Search & Filter Dashboard (6h)**
- **Fichiers affectés:** `src/pages/Dashboard.jsx`
- **Description:** Permettre search/filter élections
  - Search box: match title/description
  - Filters: status, date range, type
  - Save filter presets
  - Sort: date, name, status
- **UI:**
  ```jsx
  function Dashboard() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ status: 'all', dateRange: 'all' });

    const filteredElections = elections.filter(e => {
      const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filters.status === 'all' || e.status === filters.status;
      return matchesSearch && matchesStatus;
    });

    return (
      <div>
        <input
          type="search"
          placeholder="Search elections..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search elections"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))}
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>
        {/* Elections list */}
      </div>
    );
  }
  ```

#### Acceptance Criteria
- ✅ Tous formulaires validés en temps réel
- ✅ WCAG 2.1 AA audit passé (axe-core)
- ✅ Breadcrumbs présents partout
- ✅ Erreurs spécifiques avec actions recovery
- ✅ Mobile responsive entièrement
- ✅ Search/filter élections fonctionne
- ✅ Touch targets >= 44px

#### Dépendances Nouvelles
```json
"@axe-core/react": "^4.8.0"
```

#### Fichiers à Créer
```
src/components/Breadcrumb.jsx
```

---

### 📈 SPRINT 6 (Semaines 10-11) - COMPLIANCE & REPORTING
**Durée:** 10 jours | **Effort:** 60 heures | **Priorité:** 🟡 MOYEN

#### Objectifs
- [ ] Audit trail visualization
- [ ] Compliance reports (GDPR, regulators)
- [ ] Election templates
- [ ] Data export certification

#### Tâches

**6.1 - Audit Trail Visualization (10h)**
- **Fichiers affectés:** `src/pages/AuditTrail.jsx` (nouveau), `server/routes/auditLog.js` (nouveau)
- **Description:** Interface pour visualiser et examiner audit logs
  - Timeline visuelle des actions
  - Filtres: user, action type, date range, resource
  - Detail view pour chaque log
  - Export audit logs en PDF
  - Vérification intégrité hash chain
- **UI Components:**
  ```jsx
  // src/pages/AuditTrail.jsx
  export function AuditTrailPage() {
    const [logs, setLogs] = useState([]);
    const [filters, setFilters] = useState({});
    const [integrityStatus, setIntegrityStatus] = useState(null);

    useEffect(() => {
      verifyAuditIntegrity().then(setIntegrityStatus);
    }, []);

    return (
      <div>
        <Alert type={integrityStatus ? 'success' : 'error'}>
          {integrityStatus
            ? '✓ Audit trail integrity verified'
            : '✗ Audit trail has been tampered with!'}
        </Alert>

        <AuditLogFilters onChange={setFilters} />
        <AuditLogTimeline logs={logs} />
        <button onClick={exportAuditLogsPDF}>Export as PDF</button>
      </div>
    );
  }
  ```
- **Timeline component:**
  ```jsx
  function AuditLogTimeline({ logs }) {
    return (
      <div className="timeline">
        {logs.map(log => (
          <div key={log.id} className="timeline-event">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <time>{formatTime(log.created_at)}</time>
              <h4>{log.action}</h4>
              <p>{log.user_id} - {log.ip_address}</p>
              <details>
                <summary>View changes</summary>
                <pre>{JSON.stringify(log.changes, null, 2)}</pre>
              </details>
            </div>
          </div>
        ))}
      </div>
    );
  }
  ```

**6.2 - Compliance Reports (12h)**
- **Fichiers affectés:** `server/routes/compliance.js` (nouveau), `src/pages/ComplianceReports.jsx` (nouveau)
- **Description:** Générer rapports de conformité
  - GDPR Data Processing Agreement
  - Election Integrity Report
  - Accessibility Compliance Report
  - Security Audit Trail Report
  - Exporter en PDF signé
- **Endpoints:**
  ```
  GET /api/compliance/gdpr-report/:electionId
  GET /api/compliance/integrity-report/:electionId
  GET /api/compliance/accessibility-report/:electionId
  POST /api/compliance/sign-report
  ```
- **Contenu rapport:**
  ```
  ELECTION INTEGRITY REPORT
  Generated: 2024-11-02
  Election: Board Election 2024

  1. SECURITY MEASURES
  - Encryption: AES-256
  - Authentication: 2FA enabled
  - Rate limiting: Enabled
  - IP restrictions: Enabled (whitelist)

  2. AUDIT TRAIL
  - Total actions: 1250
  - Last verified: 2024-11-02 10:30:00
  - Integrity: ✓ VERIFIED

  3. RESULTS
  - Total votes: 150
  - Quorum: 75 (50%)
  - Quorum met: ✓ YES

  4. OBSERVERS
  - Assigned: 3
  - Verified: 3

  5. COMPLIANCE
  - WCAG 2.1: ✓ AA
  - GDPR: ✓ COMPLIANT
  - Data retention: ✓ VERIFIED
  ```
- **Dépendance:** `npm install pdfkit` (si pas déjà présent)

**6.3 - Election Templates (10h)**
- **Fichiers affectés:** `src/pages/ElectionTemplates.jsx` (nouveau), `server/routes/templates.js`, `server/database/schema.js`
- **Description:** Sauvegarder et réutiliser configurations élections
  - Template builder
  - Library de templates pré-construits
  - Clone from template
  - Save custom template
  - Share templates entre administrateurs
- **Database:**
  ```sql
  CREATE TABLE election_templates (
    id UUID PRIMARY KEY,
    organization_id UUID,
    name VARCHAR(255),
    description TEXT,
    config JSONB, -- titre, type, options, quorum, meeting, etc
    is_public BOOLEAN,
    created_by UUID,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
  );
  ```
- **UI:**
  ```jsx
  function ElectionTemplates() {
    const [templates, setTemplates] = useState([]);

    const useTemplate = async (templateId) => {
      const template = await api.get(`/templates/${templateId}`);
      navigate('/elections/create', { state: { template: template.data.config } });
    };

    const saveAsTemplate = async (election) => {
      await api.post('/templates', {
        name: `${election.title} Template`,
        config: election
      });
    };

    return (
      <div>
        <h2>Election Templates</h2>
        {templates.map(t => (
          <Card key={t.id}>
            <h3>{t.name}</h3>
            <p>{t.description}</p>
            <button onClick={() => useTemplate(t.id)}>Use Template</button>
          </Card>
        ))}
      </div>
    );
  }
  ```

**6.4 - Certified Results Export (8h)**
- **Fichiers affectés:** `server/routes/results.js`, `src/pages/Results.jsx`
- **Description:** Exporter résultats certifiés et signés
  - Ajouter certificat numérique
  - Signature PDF (admin ou observer)
  - Tamper-proof markers
  - Verification QR code
- **Implémentation:**
  ```javascript
  // server/routes/results.js
  router.post('/:id/export-certified', authenticateToken, async (req, res) => {
    const election = await getElection(req.params.id);
    const results = await getResults(req.params.id);

    // Generate certificate
    const certificate = {
      election_id: election.id,
      election_title: election.title,
      export_date: new Date().toISOString(),
      exported_by: req.user.email,
      signer: req.user.name,
      total_votes: results.total_votes,
      voter_count: election.voter_count,
      quorum_met: results.quorum_met,
      integrity_hash: calculateHash(results)
    };

    // Sign PDF
    const pdf = await generateCertifiedPDF(results, certificate);
    const signedPDF = await signPDF(pdf, req.user.privateKey);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="results-certified.pdf"');
    res.send(signedPDF);
  });
  ```

**6.5 - Data Integrity Checks (8h)**
- **Fichiers affectés:** `server/services/dataIntegrity.js` (nouveau), `server/routes/admin.js`
- **Description:** Vérifications régulières intégrité données
  - Checksum ballot vs stored
  - Audit log hash chain
  - Voter count vs ballot count
  - Quorum calculations
  - Orphaned records detection
- **Scheduler:**
  ```javascript
  // Vérifier intégrité tous les jours
  cron.schedule('0 3 * * *', async () => { // 3:00 AM
    const elections = await getAllElections();

    for (const election of elections) {
      const integrity = await checkElectionIntegrity(election.id);

      if (integrity.issues.length > 0) {
        // Log issues
        logger.error('Data integrity issues found', {
          election_id: election.id,
          issues: integrity.issues
        });

        // Alert admin
        await notifyAdmin({
          type: 'data_integrity_alert',
          election_id: election.id,
          issues: integrity.issues
        });
      }
    }
  });
  ```

#### Acceptance Criteria
- ✅ Audit trail timeline interactive
- ✅ Compliance reports générables (GDPR, integrity)
- ✅ Templates sauvegardables et réutilisables
- ✅ Résultats exportables avec certificat
- ✅ Intégrité données vérifiée automatiquement

#### Fichiers à Créer
```
src/pages/AuditTrail.jsx
src/pages/ComplianceReports.jsx
src/pages/ElectionTemplates.jsx
server/routes/compliance.js
server/routes/auditLog.js
server/services/dataIntegrity.js
```

---

### 🔌 SPRINT 7 (Semaines 12-13) - INTEGRATIONS
**Durée:** 10 jours | **Effort:** 70 heures | **Priorité:** 🟠 MOYEN

#### Objectifs
- [ ] Slack/Teams notifications
- [ ] SSO (OAuth + SAML)
- [ ] Calendar sync
- [ ] CRM voter sync
- [ ] Webhooks for external systems

#### Tâches

**7.1 - Slack Notifications (8h)**
- **Fichiers affectés:** `server/services/integrations/slack.js` (nouveau), `src/pages/IntegrationSettings.jsx`
- **Description:** Notifier Slack lors d'événements importants
  - Quorum reached
  - Election started/ended
  - Error alerts
  - Configurable par canal
- **Implémentation:**
  ```javascript
  // server/services/integrations/slack.js
  const axios = require('axios');

  exports.sendSlackNotification = async (webhookUrl, message) => {
    await axios.post(webhookUrl, {
      text: message.title,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: message.body }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View' },
              url: message.actionUrl
            }
          ]
        }
      ]
    });
  };

  // Emit when quorum reached
  socket.on('quorum_reached', async (data) => {
    await sendSlackNotification(
      election.slack_webhook_url,
      {
        title: 'Quorum Reached',
        body: `Élection "${election.title}" a atteint le quorum (${data.percentage}%)`,
        actionUrl: `${APP_URL}/elections/${election.id}`
      }
    );
  });
  ```

**7.2 - OAuth 2.0 SSO (12h)**
- **Fichiers affectés:** `server/routes/auth.js`, `src/pages/Login.jsx`
- **Description:** SSO avec Google, Microsoft, GitHub
  - Login via provider
  - Auto-create account
  - Link existing account
  - Manage connected accounts
- **Dépendances:** `npm install passport passport-google-oauth20 passport-microsoft-identity-platform`
- **Implémentation:**
  ```javascript
  // server/routes/auth.js
  const passport = require('passport');
  const GoogleStrategy = require('passport-google-oauth20').Strategy;

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    let user = await db.getUserByEmail(profile.emails[0].value);

    if (!user) {
      // Auto-create
      user = await db.createUser({
        email: profile.emails[0].value,
        name: profile.displayName,
        oauth_provider: 'google',
        oauth_id: profile.id
      });
    }

    done(null, user);
  }));

  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      const token = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET);
      res.redirect(`/auth?token=${token}`);
    }
  );
  ```

**7.3 - SAML for Enterprise (10h)**
- **Fichiers affectés:** `server/routes/auth.js`
- **Description:** SAML 2.0 pour authentification enterprise
  - Azure AD, Okta, OneLogin support
  - Auto-sync user attributes
  - Group mapping for permissions
- **Dépendance:** `npm install passport-saml`

**7.4 - Calendar Integration (8h)**
- **Fichiers affectés:** `server/services/integrations/calendar.js` (nouveau), `src/pages/CreateElection.jsx`
- **Description:** Sync élections vers Google Calendar / Outlook
  - Generate .ics file
  - Send calendar invite aux votants
  - Auto-update si dates changent
- **Implémentation:**
  ```javascript
  // server/services/integrations/calendar.js
  const icalendar = require('ical.js');

  exports.generateCalendarEvent = (election) => {
    const event = new icalendar.Event();
    event.summary = election.title;
    event.description = election.description;
    event.startDate = new icalendar.Time.fromDatetime(election.start_time);
    event.endDate = new icalendar.Time.fromDatetime(election.end_time);
    event.attendees = election.voters.map(v => ({
      email: v.email,
      role: 'REQ-PARTICIPANT',
      rsvp: false
    }));

    return event.toJCal();
  };
  ```

**7.5 - Webhooks System (10h)**
- **Fichiers affectés:** `server/routes/webhooks.js` (nouveau), `server/services/webhooks.js` (nouveau)
- **Description:** Permettre intégrations externes via webhooks
  - Register webhook endpoints
  - Events: election.created, election.started, election.closed, quorum.reached
  - Retry logic with exponential backoff
  - Webhook signatures (HMAC)
  - Admin UI pour gérer webhooks
- **Database:**
  ```sql
  CREATE TABLE webhooks (
    id UUID PRIMARY KEY,
    organization_id UUID,
    event_type VARCHAR(50),
    url TEXT,
    secret VARCHAR(255), -- For HMAC signature
    is_active BOOLEAN,
    created_at TIMESTAMP
  );

  CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY,
    webhook_id UUID,
    payload JSONB,
    response_status INT,
    attempt INT,
    next_retry TIMESTAMP,
    created_at TIMESTAMP
  );
  ```
- **Implémentation:**
  ```javascript
  // server/services/webhooks.js
  const crypto = require('crypto');

  exports.deliverWebhook = async (webhook, event) => {
    const payload = JSON.stringify({ event, timestamp: Date.now() });
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(payload)
      .digest('hex');

    try {
      const response = await axios.post(webhook.url, event, {
        headers: {
          'X-Webhook-Signature': signature,
          'X-Event-Type': event.type
        },
        timeout: 5000
      });

      return { success: true, status: response.status };
    } catch (error) {
      // Retry logic
      const delivery = await db.createWebhookDelivery({
        webhook_id: webhook.id,
        status: error.response?.status,
        attempt: 1,
        next_retry: calculateRetryTime(1)
      });

      return { success: false, deliveryId: delivery.id };
    }
  };

  // Retry failed deliveries
  cron.schedule('*/5 * * * *', async () => {
    const failedDeliveries = await db.query(
      'SELECT * FROM webhook_deliveries WHERE next_retry <= NOW() AND attempt < 5'
    );

    for (const delivery of failedDeliveries) {
      const webhook = await db.getWebhook(delivery.webhook_id);
      const event = delivery.payload;

      const result = await exports.deliverWebhook(webhook, event);

      if (!result.success) {
        await db.update('webhook_deliveries', delivery.id, {
          attempt: delivery.attempt + 1,
          next_retry: calculateRetryTime(delivery.attempt + 1)
        });
      }
    }
  });
  ```

**7.6 - CRM Sync (10h)**
- **Fichiers affectés:** `server/services/integrations/crm.js` (nouveau), `src/pages/CRMIntegration.jsx`
- **Description:** Sync voter lists avec CRM (Salesforce, HubSpot)
  - Import voter from CRM
  - Two-way sync (update CRM when vote complete)
  - Scheduled syncs
  - Conflict resolution
- **Endpoints:**
  ```
  POST /api/crm/sync/import
  POST /api/crm/sync/export
  GET /api/crm/sync/status
  ```

#### Acceptance Criteria
- ✅ Slack notifications pour events clés
- ✅ OAuth login avec Google/Microsoft
- ✅ Calendar invites envoyées aux votants
- ✅ Webhooks système fonctionnel
- ✅ CRM two-way sync fonctionnel

#### Dépendances Nouvelles
```json
"passport": "^0.7.0",
"passport-google-oauth20": "^2.0.0",
"passport-microsoft-identity-platform": "^0.1.6",
"passport-saml": "^3.2.1",
"ical.js": "^1.5.0"
```

---

### 📚 SPRINT 8 (Semaines 14-15) - DOCUMENTATION & DEPLOYMENT
**Durée:** 10 jours | **Effort:** 55 heures | **Priorité:** 🟡 MOYEN

#### Objectifs
- [ ] Documentation complète
- [ ] API reference
- [ ] Deployment guides
- [ ] Migration guides
- [ ] Security hardening guide

---

### ⚡ SPRINTS 9-13 (Semaines 16-26) - OPTIMIZATION & SCALING
**Durée:** 55 jours | **Effort:** 400+ heures | **Priorité:** 🟠 MOYEN

#### Focus Areas
- Performance optimization (CDN, caching, compression)
- Monitoring & alerting (DataDog, Sentry)
- Load testing (100,000+ voters)
- Kubernetes deployment
- Multi-region failover
- Advanced analytics (Mixpanel, Amplitude)
- Machine learning (fraud detection, behavior analysis)

---

## 📊 TIMELINE GANTT

```
SPRINT  TITRE                                SEMAINE    STATUS
────────────────────────────────────────────────────────────────
1       SÉCURITÉ CRITIQUE                   S1-S1      📋 TODO
2       PERFORMANCE CRITIQUE                S2-S3      📋 TODO
3       ANALYTICS & AUTOMATION              S4-S5      📋 TODO
4       SÉCURITÉ AVANCÉE                    S6-S7      📋 TODO
5       UX & ACCESSIBILITY                  S8-S9      📋 TODO
6       COMPLIANCE & REPORTING              S10-S11    📋 TODO
7       INTEGRATIONS                        S12-S13    📋 TODO
8       DOCUMENTATION & DEPLOYMENT          S14-S15    📋 TODO
9-13    OPTIMIZATION & SCALING              S16-S26    📋 TODO
```

---

## 🎯 KEY MILESTONES

| Milestone | Date | Description |
|-----------|------|-------------|
| **M1: Security Baseline** | Week 2 | Password validation, sessions, CSRF |
| **M2: Performance Ready** | Week 4 | Pagination, N+1 fixes, caching |
| **M3: Enterprise Ready** | Week 7 | Analytics, automation, security |
| **M4: WCAG Compliant** | Week 10 | Full accessibility audit |
| **M5: Compliance Ready** | Week 12 | GDPR, audit trail, reports |
| **M6: Integration Hub** | Week 14 | Webhooks, SSO, 3rd-party APIs |
| **M7: Production Ready** | Week 16 | Documentation, monitoring, deployment |
| **M8: Scale to 100K** | Week 26 | Performance, load testing, failover |

---

## 📈 METRICS & KPIs

### Performance Targets
```
Initial Bundle Size:        90KB    → 45KB
Page Load Time:             3.5s    → <1.5s
VotersTable Render (10K):   5s      → <500ms
API Response Time:          200ms   → <100ms
Database Query (N+1):       1000ms  → <100ms
```

### Security Targets
```
OWASP Top 10:              Fix all
WCAG 2.1:                  AA level
Password Strength:         12+ chars
Session Expiration:        1 hour
Rate Limit Protection:     Enabled
Audit Trail:               Immutable
```

### User Experience Targets
```
Task Completion Rate:       >95%
Time to Create Election:    <5 min (was 15 min)
Voter Registration:         <2 min
Vote Submission:            <1 min
Mobile Satisfaction:        >4.5/5 stars
Accessibility Score:        >95/100
```

---

## 💰 RESOURCE ALLOCATION

| Role | Sprint 1 | Sprint 2 | Sprint 3-8 | Total |
|------|----------|----------|-----------|-------|
| Backend Dev | 30h | 40h | 35h/sprint | ~280h |
| Frontend Dev | 25h | 30h | 30h/sprint | ~260h |
| QA | 15h | 20h | 20h/sprint | ~180h |
| DevOps | 5h | 5h | 10h/sprint | ~80h |
| PM/Design | 10h | 10h | 10h/sprint | ~90h |
| **Total** | **85h** | **105h** | **105h/sprint** | **890h** |

---

## 🚨 RISKS & MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Breaking changes impact users | High | High | Feature flags + gradual rollout |
| Performance regression | Medium | High | Load testing before release |
| Security vulnerabilities | Medium | Critical | Code review + pen testing |
| Accessibility non-compliance | Low | Medium | Audit with professionals |
| Integration failures | Medium | Medium | Robust error handling + fallbacks |
| Data loss during migration | Low | Critical | Full backups + rollback plan |

---

## 📞 SUPPORT & MAINTENANCE

### Post-Release
- Week 1: Critical hotfixes only
- Week 2-4: Bug fixes + minor features
- Month 2+: Regular maintenance + feature requests

### Monitoring
- Sentry for error tracking
- DataDog for performance
- Pingdom for uptime
- Google Analytics for user behavior

### Documentation
- User guides
- Admin guides
- Developer API docs
- Architecture documentation
- Deployment runbooks

---

## 🎓 LEARNING RESOURCES

- WCAG 2.1 Guidelines
- OWASP Top 10
- GDPR Compliance
- Node.js Best Practices
- React Performance Optimization
- Database Indexing Strategies
- Microservices Architecture
- DevOps & CI/CD

---

**Generated:** 2024-11-02
**Version:** 1.0
**Status:** Active Roadmap
**Last Updated:** 2024-11-02

