-- ============================================
-- ACTIVER ROW LEVEL SECURITY (RLS) SUR TOUTES LES TABLES
-- ============================================
-- Ce script active RLS et crée des politiques restrictives
-- pour empêcher l'accès direct via l'API Supabase PostgREST
--
-- L'application continue de fonctionner normalement car elle utilise
-- une connexion PostgreSQL directe avec les credentials postgres
-- ============================================

-- 1. USERS - Accès restreint aux admins seulement
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Politique: Personne ne peut accéder via PostgREST (l'app utilise pg direct)
CREATE POLICY "Deny all access via PostgREST" ON public.users
  FOR ALL
  USING (false);

-- 2. ELECTIONS
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access via PostgREST" ON public.elections
  FOR ALL
  USING (false);

-- 3. ELECTION_OPTIONS
ALTER TABLE public.election_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access via PostgREST" ON public.election_options
  FOR ALL
  USING (false);

-- 4. VOTERS
ALTER TABLE public.voters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access via PostgREST" ON public.voters
  FOR ALL
  USING (false);

-- 5. BALLOTS (bulletins de vote secrets)
ALTER TABLE public.ballots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access via PostgREST" ON public.ballots
  FOR ALL
  USING (false);

-- 6. PUBLIC_VOTES
ALTER TABLE public.public_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access via PostgREST" ON public.public_votes
  FOR ALL
  USING (false);

-- 7. OBSERVERS
ALTER TABLE public.observers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access via PostgREST" ON public.observers
  FOR ALL
  USING (false);

-- 8. ATTENDANCE_LIST
ALTER TABLE public.attendance_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access via PostgREST" ON public.attendance_list
  FOR ALL
  USING (false);

-- 9. AUDIT_LOGS (logs d'audit immuables)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access via PostgREST" ON public.audit_logs
  FOR ALL
  USING (false);

-- 10. SCHEDULED_TASKS
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access via PostgREST" ON public.scheduled_tasks
  FOR ALL
  USING (false);

-- 11. NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access via PostgREST" ON public.notifications
  FOR ALL
  USING (false);

-- 12. PUSH_SUBSCRIPTIONS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access via PostgREST" ON public.push_subscriptions
  FOR ALL
  USING (false);

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Exécuter cette requête pour vérifier que RLS est activé:
/*
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
*/

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
/*
1. RLS est maintenant activé sur toutes les tables
2. Les politiques empêchent tout accès via l'API PostgREST
3. Votre application Node.js continue de fonctionner normalement
   car elle utilise une connexion PostgreSQL directe (DATABASE_URL)
4. Cette configuration maximise la sécurité en empêchant
   les accès non autorisés via l'API Supabase
*/
