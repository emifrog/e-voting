-- Migration: Ajout des index manquants pour optimisation des performances
-- Date: 2025-11-09T09:57:01.882Z
--
-- Instructions:
-- 1. Connectez-vous à votre base de données Supabase
-- 2. Allez dans SQL Editor
-- 3. Exécutez ce script

-- Optimise les requêtes de scheduler (draft, active, closed)
CREATE INDEX IF NOT EXISTS idx_elections_status
ON elections (status);

-- Optimise la récupération des élections par administrateur
CREATE INDEX IF NOT EXISTS idx_elections_created_by
ON elections (created_by);

-- Optimise les requêtes de démarrage automatique
CREATE INDEX IF NOT EXISTS idx_elections_status_start
ON elections (status, scheduled_start);

-- Optimise les requêtes de clôture automatique
CREATE INDEX IF NOT EXISTS idx_elections_status_end
ON elections (status, scheduled_end);

-- Optimise la récupération des options par élection
CREATE INDEX IF NOT EXISTS idx_election_options_election
ON election_options (election_id);

-- Optimise le calcul du taux de participation
CREATE INDEX IF NOT EXISTS idx_voters_election_voted
ON voters (election_id, has_voted);

-- Optimise la vérification de doublons et recherche
CREATE INDEX IF NOT EXISTS idx_voters_election_email
ON voters (election_id, email);

-- Optimise les filtres sur statut de vote
CREATE INDEX IF NOT EXISTS idx_voters_has_voted
ON voters (has_voted);

-- Optimise la sélection des électeurs à relancer
CREATE INDEX IF NOT EXISTS idx_voters_reminder_sent
ON voters (reminder_sent);

-- Optimise la vérification des bulletins uniques
CREATE INDEX IF NOT EXISTS idx_ballots_hash
ON ballots (ballot_hash);

-- Optimise les requêtes de timeline de votes
CREATE INDEX IF NOT EXISTS idx_ballots_cast_at
ON ballots (cast_at);

-- Optimise la récupération des votes par électeur
CREATE INDEX IF NOT EXISTS idx_public_votes_voter
ON public_votes (voter_id);

-- Optimise l'authentification des observateurs
CREATE INDEX IF NOT EXISTS idx_observers_token
ON observers (access_token);

-- Optimise la récupération de l'historique d'émargement
CREATE INDEX IF NOT EXISTS idx_attendance_voter
ON attendance_list (voter_id);

-- Optimise les requêtes de timeline d'émargement
CREATE INDEX IF NOT EXISTS idx_attendance_marked_at
ON attendance_list (marked_at);

-- Optimise la récupération des logs par élection
CREATE INDEX IF NOT EXISTS idx_audit_logs_election
ON audit_logs (election_id);

-- Optimise la récupération des logs par utilisateur
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
ON audit_logs (user_id);

-- Optimise le nettoyage des anciens logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
ON audit_logs (created_at);

-- Optimise les requêtes par type d'action
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
ON audit_logs (action);

-- Optimise la récupération des tâches par élection
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_election
ON scheduled_tasks (election_id);

-- Optimise la récupération des tâches en attente
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_exec_time
ON scheduled_tasks (executed, scheduled_for);

-- Optimise l'authentification par email
CREATE INDEX IF NOT EXISTS idx_users_email
ON users (email);

-- Optimise les requêtes par rôle
CREATE INDEX IF NOT EXISTS idx_users_role
ON users (role);


-- Vérifier les index créés
SELECT
  tablename,
  indexname,
  indexdef
FROM
  pg_indexes
WHERE
  schemaname = 'public'
  AND tablename IN ('users', 'elections', 'election_options', 'voters', 'ballots', 'public_votes', 'observers', 'attendance_list', 'audit_logs', 'scheduled_tasks')
ORDER BY
  tablename, indexname;
