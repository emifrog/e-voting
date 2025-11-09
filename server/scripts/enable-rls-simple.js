/**
 * Script simple pour activer RLS sur toutes les tables
 */

import 'dotenv/config';
import { query } from '../database/supabase.js';

const tables = [
  'users',
  'elections',
  'election_options',
  'voters',
  'ballots',
  'public_votes',
  'observers',
  'attendance_list',
  'audit_logs',
  'scheduled_tasks',
  'notifications',
  'push_subscriptions'
];

async function enableRLS() {
  console.log('🔒 Activation de Row Level Security...\n');

  for (const table of tables) {
    try {
      process.stdout.write(`Activation RLS sur ${table}...`);
      await query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
      console.log(' ✅');
    } catch (error) {
      console.log(` ❌ ${error.message}`);
    }
  }

  // Vérification
  console.log('\n🔍 Vérification...\n');
  const result = await query(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  result.rows.forEach(row => {
    const status = row.rowsecurity ? '✅' : '❌';
    console.log(`${status} ${row.tablename}`);
  });

  const enabled = result.rows.filter(r => r.rowsecurity).length;
  console.log(`\n✅ RLS activé sur ${enabled}/${result.rows.length} tables\n`);
}

enableRLS().catch(console.error);
