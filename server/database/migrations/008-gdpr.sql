-- =====================================================
-- Migration 008: GDPR Compliance Tables
-- Date: 2025-11-10
-- Description: Create tables for GDPR/RGPD compliance
--              - Data categories
--              - Processing activities registry
--              - Data subject requests
--              - Consents management
-- =====================================================

-- Table 1: GDPR Data Categories
-- Purpose: Define categories of personal data processed
CREATE TABLE IF NOT EXISTS gdpr_data_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  legal_basis TEXT NOT NULL CHECK (
    legal_basis IN (
      'consent',                  -- Consentement (Art. 6.1.a)
      'contract',                 -- Exécution d'un contrat (Art. 6.1.b)
      'legal_obligation',         -- Obligation légale (Art. 6.1.c)
      'vital_interests',          -- Sauvegarde intérêts vitaux (Art. 6.1.d)
      'public_interest',          -- Mission d'intérêt public (Art. 6.1.e)
      'legitimate_interests'      -- Intérêts légitimes (Art. 6.1.f)
    )
  ),
  retention_period TEXT NOT NULL,
  is_sensitive BOOLEAN DEFAULT false,
  data_examples TEXT,
  security_measures TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_gdpr_data_categories_name
  ON gdpr_data_categories(category_name);

-- Table 2: GDPR Processing Activities Registry
-- Purpose: Article 30 - Record of processing activities
CREATE TABLE IF NOT EXISTS gdpr_processing_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  description TEXT,
  data_categories TEXT[] NOT NULL,
  data_subjects TEXT NOT NULL,
  legal_basis TEXT NOT NULL CHECK (
    legal_basis IN (
      'consent',
      'contract',
      'legal_obligation',
      'vital_interests',
      'public_interest',
      'legitimate_interests'
    )
  ),
  recipients TEXT,
  international_transfers BOOLEAN DEFAULT false,
  transfer_safeguards TEXT,
  retention_period TEXT NOT NULL,
  security_measures TEXT,
  dpo_contact TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for active activities
CREATE INDEX IF NOT EXISTS idx_gdpr_processing_activities_active
  ON gdpr_processing_activities(is_active);

-- Table 3: GDPR Data Subject Requests
-- Purpose: Track data subject rights requests (Art. 15-22)
CREATE TABLE IF NOT EXISTS gdpr_data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE NOT NULL,
  requester_email TEXT NOT NULL,
  requester_name TEXT,
  request_type TEXT NOT NULL CHECK (
    request_type IN (
      'access',           -- Art. 15: Right of access
      'rectification',    -- Art. 16: Right to rectification
      'erasure',          -- Art. 17: Right to erasure ('right to be forgotten')
      'restriction',      -- Art. 18: Right to restriction of processing
      'portability',      -- Art. 20: Right to data portability
      'objection'         -- Art. 21: Right to object
    )
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'rejected', 'expired')
  ),
  priority TEXT DEFAULT 'normal' CHECK (
    priority IN ('low', 'normal', 'high', 'urgent')
  ),
  details TEXT,
  response TEXT,
  attachments TEXT,
  rejection_reason TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deadline_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES users(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for request tracking
CREATE INDEX IF NOT EXISTS idx_gdpr_data_requests_email
  ON gdpr_data_requests(requester_email);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_requests_status
  ON gdpr_data_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_requests_type
  ON gdpr_data_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_requests_deadline
  ON gdpr_data_requests(deadline_at) WHERE status IN ('pending', 'in_progress');

-- Table 4: GDPR Consents
-- Purpose: Track user consents (Art. 7)
CREATE TABLE IF NOT EXISTS gdpr_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  purpose TEXT NOT NULL,
  granted BOOLEAN DEFAULT false,
  granted_at TIMESTAMP WITH TIME ZONE,
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for consent management
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_user_id
  ON gdpr_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_type
  ON gdpr_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_granted
  ON gdpr_consents(granted) WHERE granted = true;

-- Table 5: GDPR Data Breaches
-- Purpose: Track data breaches (Art. 33-34)
CREATE TABLE IF NOT EXISTS gdpr_data_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breach_number TEXT UNIQUE NOT NULL,
  breach_type TEXT NOT NULL CHECK (
    breach_type IN (
      'confidentiality',  -- Accès non autorisé
      'integrity',        -- Modification non autorisée
      'availability'      -- Perte de disponibilité
    )
  ),
  severity TEXT NOT NULL CHECK (
    severity IN ('low', 'medium', 'high', 'critical')
  ),
  discovered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reported_to_authority_at TIMESTAMP WITH TIME ZONE,
  reported_to_subjects_at TIMESTAMP WITH TIME ZONE,
  description TEXT NOT NULL,
  affected_data_categories TEXT[] NOT NULL,
  number_affected_subjects INTEGER,
  consequences TEXT,
  measures_taken TEXT,
  measures_planned TEXT,
  authority_reference TEXT,
  status TEXT NOT NULL DEFAULT 'investigating' CHECK (
    status IN ('investigating', 'contained', 'resolved', 'closed')
  ),
  reported_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for breach management
CREATE INDEX IF NOT EXISTS idx_gdpr_data_breaches_severity
  ON gdpr_data_breaches(severity);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_breaches_status
  ON gdpr_data_breaches(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_breaches_discovered
  ON gdpr_data_breaches(discovered_at DESC);

-- Table 6: GDPR Audit Log (specific to GDPR actions)
-- Purpose: Log all GDPR-related actions for accountability
CREATE TABLE IF NOT EXISTS gdpr_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL CHECK (
    action_type IN (
      'data_request_created',
      'data_request_processed',
      'data_exported',
      'data_deleted',
      'consent_granted',
      'consent_withdrawn',
      'breach_reported',
      'report_generated',
      'retention_applied'
    )
  ),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_log_timestamp
  ON gdpr_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_log_entity
  ON gdpr_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_log_user
  ON gdpr_audit_log(user_id);

-- =====================================================
-- Initial Data Seeding
-- =====================================================

-- Seed: Data Categories
INSERT INTO gdpr_data_categories (category_name, description, legal_basis, retention_period, is_sensitive, data_examples, security_measures)
VALUES
  (
    'user_identity',
    'Données d''identification des administrateurs',
    'contract',
    'Durée du compte + 1 an',
    false,
    'Email, nom, mot de passe (hashé)',
    'Hachage bcrypt, chiffrement en base, audit logs'
  ),
  (
    'voter_identity',
    'Données d''identification des électeurs',
    'public_interest',
    'Fin de l''élection + 1 an',
    false,
    'Email, nom, code unique',
    'Codes UUID, anonymisation post-élection'
  ),
  (
    'vote_data',
    'Données de vote',
    'public_interest',
    'Fin de l''élection + 5 ans',
    true,
    'Choix de vote, horodatage, hash blockchain',
    'Anonymisation voter_id, blockchain pour intégrité'
  ),
  (
    'authentication_data',
    'Données d''authentification',
    'contract',
    'Durée du compte',
    true,
    '2FA secrets, backup codes, sessions',
    'Secrets chiffrés, rotation régulière'
  ),
  (
    'audit_logs',
    'Journaux d''audit',
    'legal_obligation',
    '5 ans',
    false,
    'Actions, IP, timestamps',
    'Logs immuables, accès restreint'
  ),
  (
    'observer_data',
    'Données des observateurs',
    'public_interest',
    'Fin de l''élection + 6 mois',
    false,
    'Email, nom, token d''accès',
    'Tokens révocables, accès limité'
  )
ON CONFLICT (category_name) DO NOTHING;

-- Seed: Processing Activities
INSERT INTO gdpr_processing_activities (
  activity_name,
  purpose,
  description,
  data_categories,
  data_subjects,
  legal_basis,
  recipients,
  retention_period,
  security_measures
)
VALUES
  (
    'Gestion des comptes administrateurs',
    'Permettre aux administrateurs de créer et gérer des élections',
    'Traitement des données d''identification et d''authentification des administrateurs de la plateforme E-Voting',
    ARRAY['user_identity', 'authentication_data', 'audit_logs'],
    'Administrateurs de la plateforme',
    'contract',
    'Aucun transfert à des tiers',
    'Durée du compte + 1 an après fermeture',
    'Authentification 2FA, hachage bcrypt, sessions sécurisées, audit complet'
  ),
  (
    'Gestion des listes électorales',
    'Constituer et gérer les listes d''électeurs pour chaque élection',
    'Traitement des données des électeurs inscrits sur les listes électorales',
    ARRAY['voter_identity', 'audit_logs'],
    'Électeurs inscrits',
    'public_interest',
    'Administrateurs d''élection, observateurs autorisés',
    'Fin de l''élection + 1 an',
    'Codes uniques UUID, accès restreint, logs d''accès'
  ),
  (
    'Traitement des votes',
    'Enregistrer et comptabiliser les votes de manière sécurisée et anonyme',
    'Traitement des votes exprimés avec garantie de secret du vote et vérifiabilité',
    ARRAY['vote_data', 'audit_logs'],
    'Électeurs ayants voté',
    'public_interest',
    'Aucun (secret du vote)',
    'Fin de l''élection + 5 ans',
    'Anonymisation voter_id, blockchain Ethereum, chiffrement, hash vérifiable'
  ),
  (
    'Supervision des élections',
    'Permettre aux observateurs de superviser le bon déroulement des élections',
    'Gestion des accès observateurs avec permissions limitées',
    ARRAY['observer_data', 'audit_logs'],
    'Observateurs désignés',
    'public_interest',
    'Administrateurs d''élection',
    'Fin de l''élection + 6 mois',
    'Tokens d''accès temporaires, permissions granulaires, révocation possible'
  ),
  (
    'Traçabilité et audit',
    'Garantir la transparence et la traçabilité des opérations',
    'Enregistrement de toutes les actions critiques pour audit et conformité',
    ARRAY['audit_logs'],
    'Tous les utilisateurs',
    'legal_obligation',
    'Auditeurs internes, autorités de contrôle (sur demande)',
    '5 ans',
    'Logs immuables, horodatage précis, accès restreint, intégrité blockchain'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- Functions for GDPR Compliance
-- =====================================================

-- Function: Generate unique request number
CREATE OR REPLACE FUNCTION generate_gdpr_request_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  counter := (SELECT COUNT(*) FROM gdpr_data_requests) + 1;
  new_number := 'REQ-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate unique breach number
CREATE OR REPLACE FUNCTION generate_gdpr_breach_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  counter := (SELECT COUNT(*) FROM gdpr_data_breaches) + 1;
  new_number := 'BREACH-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-set deadline (1 month from request)
CREATE OR REPLACE FUNCTION set_gdpr_request_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deadline_at IS NULL THEN
    NEW.deadline_at := NEW.requested_at + INTERVAL '1 month';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-generate request number and set deadline
CREATE TRIGGER before_insert_gdpr_data_request
  BEFORE INSERT ON gdpr_data_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_gdpr_request_deadline();

-- Function: Update timestamp on record update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers: Update updated_at on all GDPR tables
CREATE TRIGGER update_gdpr_data_categories_updated_at
  BEFORE UPDATE ON gdpr_data_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gdpr_processing_activities_updated_at
  BEFORE UPDATE ON gdpr_processing_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gdpr_data_requests_updated_at
  BEFORE UPDATE ON gdpr_data_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gdpr_consents_updated_at
  BEFORE UPDATE ON gdpr_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gdpr_data_breaches_updated_at
  BEFORE UPDATE ON gdpr_data_breaches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Views for Reporting
-- =====================================================

-- View: Active data requests summary
CREATE OR REPLACE VIEW gdpr_active_requests_summary AS
SELECT
  status,
  request_type,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, CURRENT_TIMESTAMP) - requested_at)) / 86400)::NUMERIC(10,2) as avg_days_to_complete
FROM gdpr_data_requests
WHERE status IN ('pending', 'in_progress')
GROUP BY status, request_type;

-- View: Consents summary
CREATE OR REPLACE VIEW gdpr_consents_summary AS
SELECT
  consent_type,
  COUNT(*) as total_consents,
  SUM(CASE WHEN granted = true AND withdrawn_at IS NULL THEN 1 ELSE 0 END) as active_consents,
  SUM(CASE WHEN withdrawn_at IS NOT NULL THEN 1 ELSE 0 END) as withdrawn_consents
FROM gdpr_consents
GROUP BY consent_type;

-- View: Breaches summary
CREATE OR REPLACE VIEW gdpr_breaches_summary AS
SELECT
  breach_type,
  severity,
  COUNT(*) as count,
  MAX(discovered_at) as last_breach_date
FROM gdpr_data_breaches
GROUP BY breach_type, severity;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE gdpr_data_categories IS 'RGPD: Catégories de données personnelles traitées';
COMMENT ON TABLE gdpr_processing_activities IS 'RGPD Art. 30: Registre des activités de traitement';
COMMENT ON TABLE gdpr_data_requests IS 'RGPD Art. 15-22: Demandes d''exercice des droits des personnes';
COMMENT ON TABLE gdpr_consents IS 'RGPD Art. 7: Gestion des consentements';
COMMENT ON TABLE gdpr_data_breaches IS 'RGPD Art. 33-34: Registre des violations de données';
COMMENT ON TABLE gdpr_audit_log IS 'RGPD: Journal d''audit spécifique aux actions GDPR';

-- =====================================================
-- Migration Complete
-- =====================================================

SELECT 'Migration 008: GDPR Compliance Tables - Completed Successfully' as status;
