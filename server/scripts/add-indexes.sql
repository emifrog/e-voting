-- ============================================================================
-- Migration: Ajout des index manquants pour optimisation des performances
-- Date: 2025-01-04
-- Description: Améliore les performances des requêtes les plus fréquentes
-- ============================================================================

-- Instructions:
-- 1. Connectez-vous à votre base de données Supabase
-- 2. Allez dans SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)
-- 3. Copiez/collez ce script complet
-- 4. Cliquez sur "Run" pour exécuter

-- ============================================================================
-- INDEX SUR LA TABLE USERS
-- ============================================================================

-- Optimise l'authentification par email (login fréquent)
CREATE INDEX IF NOT EXISTS idx_users_email
ON users (email);

-- Optimise les requêtes par rôle (filtrage admin/user)
CREATE INDEX IF NOT EXISTS idx_users_role
ON users (role);

-- ============================================================================
-- INDEX SUR LA TABLE ELECTIONS
-- ============================================================================

-- Optimise les requêtes de scheduler (draft, active, closed)
CREATE INDEX IF NOT EXISTS idx_elections_status
ON elections (status);

-- Optimise la récupération des élections par administrateur
CREATE INDEX IF NOT EXISTS idx_elections_created_by
ON elections (created_by);

-- Optimise les requêtes de démarrage automatique (scheduler vérifie toutes les minutes)
CREATE INDEX IF NOT EXISTS idx_elections_status_start
ON elections (status, scheduled_start);

-- Optimise les requêtes de clôture automatique (scheduler vérifie toutes les minutes)
CREATE INDEX IF NOT EXISTS idx_elections_status_end
ON elections (status, scheduled_end);

-- ============================================================================
-- INDEX SUR LA TABLE ELECTION_OPTIONS
-- ============================================================================

-- Optimise la récupération des options par élection (JOIN fréquent)
CREATE INDEX IF NOT EXISTS idx_election_options_election
ON election_options (election_id);

-- Optimise le tri par ordre
CREATE INDEX IF NOT EXISTS idx_election_options_order
ON election_options (election_id, option_order);

-- ============================================================================
-- INDEX SUR LA TABLE VOTERS
-- ============================================================================

-- Index déjà existants (conservés):
-- - idx_voters_election (election_id)
-- - idx_voters_token (token)

-- Optimise le calcul du taux de participation et quorum
CREATE INDEX IF NOT EXISTS idx_voters_election_voted
ON voters (election_id, has_voted);

-- Optimise la vérification de doublons et recherche d'électeurs
CREATE INDEX IF NOT EXISTS idx_voters_election_email
ON voters (election_id, email);

-- Optimise les filtres sur statut de vote
CREATE INDEX IF NOT EXISTS idx_voters_has_voted
ON voters (has_voted);

-- Optimise la sélection des électeurs à relancer
CREATE INDEX IF NOT EXISTS idx_voters_reminder_sent
ON voters (reminder_sent);

-- Optimise les requêtes combinées pour rappels
CREATE INDEX IF NOT EXISTS idx_voters_election_reminder
ON voters (election_id, reminder_sent, has_voted);

-- ============================================================================
-- INDEX SUR LA TABLE BALLOTS
-- ============================================================================

-- Index déjà existant (conservé):
-- - idx_ballots_election (election_id)

-- Optimise la vérification des bulletins uniques (hash unique)
CREATE INDEX IF NOT EXISTS idx_ballots_hash
ON ballots (ballot_hash);

-- Optimise les requêtes de timeline de votes et statistiques temporelles
CREATE INDEX IF NOT EXISTS idx_ballots_cast_at
ON ballots (cast_at);

-- Optimise les requêtes combinées élection + temps
CREATE INDEX IF NOT EXISTS idx_ballots_election_cast
ON ballots (election_id, cast_at DESC);

-- ============================================================================
-- INDEX SUR LA TABLE PUBLIC_VOTES
-- ============================================================================

-- Index déjà existant (conservé):
-- - idx_public_votes_election (election_id)

-- Optimise la récupération des votes par électeur (votes non anonymes)
CREATE INDEX IF NOT EXISTS idx_public_votes_voter
ON public_votes (voter_id);

-- Optimise les requêtes de timeline pour votes publics
CREATE INDEX IF NOT EXISTS idx_public_votes_cast_at
ON public_votes (cast_at);

-- Optimise les requêtes combinées
CREATE INDEX IF NOT EXISTS idx_public_votes_election_cast
ON public_votes (election_id, cast_at DESC);

-- ============================================================================
-- INDEX SUR LA TABLE OBSERVERS
-- ============================================================================

-- Index déjà existant (conservé):
-- - idx_observers_election (election_id)

-- Optimise l'authentification des observateurs (lookup fréquent)
CREATE INDEX IF NOT EXISTS idx_observers_token
ON observers (access_token);

-- Optimise la recherche par email
CREATE INDEX IF NOT EXISTS idx_observers_email
ON observers (email);

-- ============================================================================
-- INDEX SUR LA TABLE ATTENDANCE_LIST
-- ============================================================================

-- Index déjà existant (conservé):
-- - idx_attendance_election (election_id)

-- Optimise la récupération de l'historique d'émargement par électeur
CREATE INDEX IF NOT EXISTS idx_attendance_voter
ON attendance_list (voter_id);

-- Optimise les requêtes de timeline d'émargement
CREATE INDEX IF NOT EXISTS idx_attendance_marked_at
ON attendance_list (marked_at);

-- Optimise les requêtes combinées (liste d'émargement par élection)
CREATE INDEX IF NOT EXISTS idx_attendance_election_marked
ON attendance_list (election_id, marked_at DESC);

-- ============================================================================
-- INDEX SUR LA TABLE AUDIT_LOGS
-- ============================================================================

-- Optimise la récupération des logs par élection
CREATE INDEX IF NOT EXISTS idx_audit_logs_election
ON audit_logs (election_id);

-- Optimise la récupération des logs par utilisateur
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
ON audit_logs (user_id);

-- Optimise le nettoyage périodique des anciens logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
ON audit_logs (created_at);

-- Optimise les requêtes par type d'action (filtrage)
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
ON audit_logs (action);

-- Optimise les requêtes combinées (logs par élection et date)
CREATE INDEX IF NOT EXISTS idx_audit_logs_election_created
ON audit_logs (election_id, created_at DESC);

-- ============================================================================
-- INDEX SUR LA TABLE SCHEDULED_TASKS
-- ============================================================================

-- Optimise la récupération des tâches par élection
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_election
ON scheduled_tasks (election_id);

-- Optimise la récupération des tâches en attente (requête fréquente du scheduler)
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_exec_time
ON scheduled_tasks (executed, scheduled_for);

-- Optimise la récupération des tâches par type
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_type
ON scheduled_tasks (task_type);

-- ============================================================================
-- VÉRIFICATION DES INDEX CRÉÉS
-- ============================================================================

-- Exécutez cette requête pour vérifier que tous les index ont bien été créés
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM
  pg_indexes
WHERE
  schemaname = 'public'
  AND tablename IN (
    'users',
    'elections',
    'election_options',
    'voters',
    'ballots',
    'public_votes',
    'observers',
    'attendance_list',
    'audit_logs',
    'scheduled_tasks'
  )
ORDER BY
  tablename, indexname;

-- ============================================================================
-- ANALYSE DES TABLES (OPTIONNEL - RECOMMANDÉ)
-- ============================================================================

-- Met à jour les statistiques PostgreSQL pour une meilleure planification des requêtes
-- Cela aide PostgreSQL à choisir les bons index automatiquement

ANALYZE users;
ANALYZE elections;
ANALYZE election_options;
ANALYZE voters;
ANALYZE ballots;
ANALYZE public_votes;
ANALYZE observers;
ANALYZE attendance_list;
ANALYZE audit_logs;
ANALYZE scheduled_tasks;

-- ============================================================================
-- STATISTIQUES DES TABLES (OPTIONNEL - POUR INFORMATION)
-- ============================================================================

-- Affiche la taille des tables et le nombre de lignes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_live_tup AS rows
FROM
  pg_stat_user_tables
WHERE
  schemaname = 'public'
  AND tablename IN (
    'users',
    'elections',
    'election_options',
    'voters',
    'ballots',
    'public_votes',
    'observers',
    'attendance_list',
    'audit_logs',
    'scheduled_tasks'
  )
ORDER BY
  pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================

-- ✅ Migration terminée avec succès !
-- 📊 Impact attendu :
--    - Réduction de 30-50% du temps de réponse sur les endpoints fréquents
--    - Amélioration des performances du scheduler (vérifications toutes les minutes)
--    - Optimisation du calcul du quorum et des taux de participation
--    - Accélération des recherches d'électeurs et de votes
--
-- 🔍 Pour surveiller les performances :
--    - Utilisez EXPLAIN ANALYZE sur vos requêtes lentes
--    - Consultez pg_stat_user_indexes pour voir l'utilisation des index
--    - Activez le monitoring Prometheus/Grafana pour suivre les métriques
