/**
 * Migration script for webhooks table
 *
 * Applies migration 007-webhooks.sql
 */

import 'dotenv/config';
import { query } from '../database/supabase.js';

async function runMigration() {
  console.log('🚀 Migration Webhooks - Début\n');

  try {
    // Create table
    console.log('[1/4] Création de la table webhook_configurations...');
    await query(`
      CREATE TABLE IF NOT EXISTS webhook_configurations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
        platform TEXT NOT NULL CHECK (platform IN ('slack', 'teams')),
        webhook_url TEXT NOT NULL,
        events TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        last_triggered_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table créée\n');

    // Create indexes
    console.log('[2/4] Création des index...');
    await query(`CREATE INDEX IF NOT EXISTS idx_webhook_election ON webhook_configurations(election_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_webhook_active ON webhook_configurations(is_active)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_webhook_platform ON webhook_configurations(platform)`);
    console.log('✅ Index créés\n');

    // Check if trigger exists
    console.log('[3/4] Vérification du trigger...');
    const triggerExists = await query(`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE trigger_name = 'update_webhook_updated_at'
        AND event_object_table = 'webhook_configurations'
    `);

    if (triggerExists.rows.length === 0) {
      console.log('⚠️  Trigger non créé (PostgreSQL n\'utilise pas de triggers SQLite-style)\n');
    } else {
      console.log('✅ Trigger existe\n');
    }

    // Verify table structure
    console.log('[4/4] Vérification de la structure...');
    const result = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'webhook_configurations'
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    if (result.rows.length > 0) {
      console.log('\n📋 Structure de la table webhook_configurations:\n');
      console.log('┌─────────────────────────┬────────────────┬──────────┐');
      console.log('│ Colonne                 │ Type           │ Nullable │');
      console.log('├─────────────────────────┼────────────────┼──────────┤');
      result.rows.forEach(row => {
        const col = row.column_name.padEnd(23);
        const type = row.data_type.substring(0, 14).padEnd(14);
        const nullable = (row.is_nullable === 'YES' ? 'Oui' : 'Non').padEnd(8);
        console.log(`│ ${col} │ ${type} │ ${nullable} │`);
      });
      console.log('└─────────────────────────┴────────────────┴──────────┘\n');
    }

    console.log('✅ Migration webhooks terminée avec succès!\n');
    console.log('🎉 La table est prête à utiliser!\n');

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('⚠️  La table existe déjà\n');
    } else {
      console.error('\n❌ Erreur lors de la migration:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  process.exit(0);
}

runMigration();
