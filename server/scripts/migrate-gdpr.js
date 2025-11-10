/**
 * GDPR Database Migration Script for Supabase (PostgreSQL)
 *
 * Executes migration 008-gdpr.sql to create GDPR compliance tables
 *
 * Tables created:
 * - gdpr_data_categories
 * - gdpr_processing_activities
 * - gdpr_data_requests
 * - gdpr_consents
 * - gdpr_data_breaches
 * - gdpr_audit_log
 */

import 'dotenv/config';
import { query } from '../database/supabase.js';

async function runMigration() {
  console.log('🚀 GDPR Migration - Début\n');

  try {
    // Table 1: GDPR Data Categories
    console.log('[1/12] Création de la table gdpr_data_categories...');
    await query(`
      CREATE TABLE IF NOT EXISTS gdpr_data_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
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
        retention_period TEXT NOT NULL,
        is_sensitive BOOLEAN DEFAULT false,
        data_examples TEXT,
        security_measures TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table gdpr_data_categories créée\n');

    // Table 2: GDPR Processing Activities
    console.log('[2/12] Création de la table gdpr_processing_activities...');
    await query(`
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
      )
    `);
    console.log('✅ Table gdpr_processing_activities créée\n');

    // Table 3: GDPR Data Requests
    console.log('[3/12] Création de la table gdpr_data_requests...');
    await query(`
      CREATE TABLE IF NOT EXISTS gdpr_data_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_number TEXT UNIQUE NOT NULL,
        requester_email TEXT NOT NULL,
        requester_name TEXT,
        request_type TEXT NOT NULL CHECK (
          request_type IN (
            'access',
            'rectification',
            'erasure',
            'restriction',
            'portability',
            'objection'
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
      )
    `);
    console.log('✅ Table gdpr_data_requests créée\n');

    // Table 4: GDPR Consents
    console.log('[4/12] Création de la table gdpr_consents...');
    await query(`
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
      )
    `);
    console.log('✅ Table gdpr_consents créée\n');

    // Table 5: GDPR Data Breaches
    console.log('[5/12] Création de la table gdpr_data_breaches...');
    await query(`
      CREATE TABLE IF NOT EXISTS gdpr_data_breaches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        breach_number TEXT UNIQUE NOT NULL,
        breach_type TEXT NOT NULL CHECK (
          breach_type IN (
            'confidentiality',
            'integrity',
            'availability'
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
      )
    `);
    console.log('✅ Table gdpr_data_breaches créée\n');

    // Table 6: GDPR Audit Log
    console.log('[6/12] Création de la table gdpr_audit_log...');
    await query(`
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
      )
    `);
    console.log('✅ Table gdpr_audit_log créée\n');

    // Create indexes
    console.log('[7/12] Création des index...');
    await query(`CREATE INDEX IF NOT EXISTS idx_gdpr_data_categories_name ON gdpr_data_categories(category_name)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gdpr_processing_activities_active ON gdpr_processing_activities(is_active)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gdpr_data_requests_email ON gdpr_data_requests(requester_email)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gdpr_data_requests_status ON gdpr_data_requests(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gdpr_data_requests_type ON gdpr_data_requests(request_type)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gdpr_consents_user_id ON gdpr_consents(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gdpr_consents_type ON gdpr_consents(consent_type)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gdpr_audit_log_timestamp ON gdpr_audit_log(timestamp DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gdpr_audit_log_entity ON gdpr_audit_log(entity_type, entity_id)`);
    console.log('✅ Index créés\n');

    // Seed Data Categories
    console.log('[8/12] Insertion des catégories de données...');
    await query(`
      INSERT INTO gdpr_data_categories (category_name, description, legal_basis, retention_period, is_sensitive, data_examples, security_measures)
      VALUES
        ('user_identity', 'Données d''identification des administrateurs', 'contract', 'Durée du compte + 1 an', false, 'Email, nom, mot de passe (hashé)', 'Hachage bcrypt, chiffrement en base, audit logs'),
        ('voter_identity', 'Données d''identification des électeurs', 'public_interest', 'Fin de l''élection + 1 an', false, 'Email, nom, code unique', 'Codes UUID, anonymisation post-élection'),
        ('vote_data', 'Données de vote', 'public_interest', 'Fin de l''élection + 5 ans', true, 'Choix de vote, horodatage, hash blockchain', 'Anonymisation voter_id, blockchain pour intégrité'),
        ('authentication_data', 'Données d''authentification', 'contract', 'Durée du compte', true, '2FA secrets, backup codes, sessions', 'Secrets chiffrés, rotation régulière'),
        ('audit_logs', 'Journaux d''audit', 'legal_obligation', '5 ans', false, 'Actions, IP, timestamps', 'Logs immuables, accès restreint'),
        ('observer_data', 'Données des observateurs', 'public_interest', 'Fin de l''élection + 6 mois', false, 'Email, nom, token d''accès', 'Tokens révocables, accès limité')
      ON CONFLICT (category_name) DO NOTHING
    `);
    console.log('✅ Catégories de données insérées\n');

    // Seed Processing Activities
    console.log('[9/12] Insertion des activités de traitement...');
    await query(`
      INSERT INTO gdpr_processing_activities (
        activity_name, purpose, description, data_categories, data_subjects, legal_basis, recipients, retention_period, security_measures
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
        )
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Activités de traitement insérées\n');

    // Create Functions
    console.log('[10/12] Création des fonctions...');

    // Function: Update timestamp
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Function: Set deadline
    await query(`
      CREATE OR REPLACE FUNCTION set_gdpr_request_deadline()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.deadline_at IS NULL THEN
          NEW.deadline_at := NEW.requested_at + INTERVAL '1 month';
        END IF;
        IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
          NEW.request_number := 'REQ-' || TO_CHAR(NEW.requested_at, 'YYYYMMDD') || '-' || LPAD(NEXTVAL('gdpr_request_seq')::TEXT, 4, '0');
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create sequence for request numbers
    await query(`CREATE SEQUENCE IF NOT EXISTS gdpr_request_seq START 1`);

    console.log('✅ Fonctions créées\n');

    // Create Triggers
    console.log('[11/12] Création des triggers...');

    await query(`
      DROP TRIGGER IF EXISTS before_insert_gdpr_data_request ON gdpr_data_requests;
      CREATE TRIGGER before_insert_gdpr_data_request
        BEFORE INSERT ON gdpr_data_requests
        FOR EACH ROW
        EXECUTE FUNCTION set_gdpr_request_deadline();
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_gdpr_data_categories_updated_at ON gdpr_data_categories;
      CREATE TRIGGER update_gdpr_data_categories_updated_at
        BEFORE UPDATE ON gdpr_data_categories
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_gdpr_processing_activities_updated_at ON gdpr_processing_activities;
      CREATE TRIGGER update_gdpr_processing_activities_updated_at
        BEFORE UPDATE ON gdpr_processing_activities
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_gdpr_data_requests_updated_at ON gdpr_data_requests;
      CREATE TRIGGER update_gdpr_data_requests_updated_at
        BEFORE UPDATE ON gdpr_data_requests
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_gdpr_consents_updated_at ON gdpr_consents;
      CREATE TRIGGER update_gdpr_consents_updated_at
        BEFORE UPDATE ON gdpr_consents
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_gdpr_data_breaches_updated_at ON gdpr_data_breaches;
      CREATE TRIGGER update_gdpr_data_breaches_updated_at
        BEFORE UPDATE ON gdpr_data_breaches
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Triggers créés\n');

    // Create Views
    console.log('[12/12] Création des vues...');

    await query(`
      CREATE OR REPLACE VIEW gdpr_active_requests_summary AS
      SELECT
        status,
        request_type,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, CURRENT_TIMESTAMP) - requested_at)) / 86400)::NUMERIC(10,2) as avg_days_to_complete
      FROM gdpr_data_requests
      WHERE status IN ('pending', 'in_progress')
      GROUP BY status, request_type
    `);

    await query(`
      CREATE OR REPLACE VIEW gdpr_consents_summary AS
      SELECT
        consent_type,
        COUNT(*) as total_consents,
        SUM(CASE WHEN granted = true AND withdrawn_at IS NULL THEN 1 ELSE 0 END) as active_consents,
        SUM(CASE WHEN withdrawn_at IS NOT NULL THEN 1 ELSE 0 END) as withdrawn_consents
      FROM gdpr_consents
      GROUP BY consent_type
    `);

    await query(`
      CREATE OR REPLACE VIEW gdpr_breaches_summary AS
      SELECT
        breach_type,
        severity,
        COUNT(*) as count,
        MAX(discovered_at) as last_breach_date
      FROM gdpr_data_breaches
      GROUP BY breach_type, severity
    `);

    console.log('✅ Vues créées\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Migration GDPR complétée avec succès!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎯 Prochaines étapes:');
    console.log('   1. Créer gdprService.js');
    console.log('   2. Créer routes API GDPR');
    console.log('   3. Créer interface GDPR frontend\n');

  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('✅ Migration terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration échouée:', error);
    process.exit(1);
  });
