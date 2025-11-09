/**
 * Script pour activer Row Level Security (RLS) sur toutes les tables Supabase
 *
 * Usage: node server/scripts/enable-rls.js
 *
 * Ce script:
 * 1. Active RLS sur toutes les tables
 * 2. Crée des politiques restrictives pour bloquer l'accès PostgREST
 * 3. Vérifie que RLS est bien activé
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../database/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function enableRLS() {
  console.log('🔒 Activation de Row Level Security (RLS) sur toutes les tables...\n');

  try {
    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, '../database/enable-rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Séparer les commandes SQL
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd =>
        cmd &&
        !cmd.startsWith('--') &&
        !cmd.startsWith('/*') &&
        cmd.length > 10
      );

    console.log(`📝 ${commands.length} commandes SQL à exécuter...\n`);

    // Exécuter chaque commande
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];

      // Afficher la commande (première ligne uniquement)
      const firstLine = cmd.split('\n')[0].substring(0, 60);
      process.stdout.write(`[${i + 1}/${commands.length}] ${firstLine}...`);

      try {
        await query(cmd);
        console.log(' ✅');
      } catch (error) {
        // Ignorer les erreurs "already exists" pour les politiques
        if (error.message.includes('already exists')) {
          console.log(' ⚠️  (existe déjà)');
        } else {
          console.log(' ❌');
          console.error(`   Erreur: ${error.message}`);
        }
      }
    }

    console.log('\n✅ RLS activé avec succès!\n');

    // Vérification
    console.log('🔍 Vérification de l\'état RLS des tables...\n');
    const result = await query(`
      SELECT
        schemaname,
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log('┌─────────────────────────┬─────────────┐');
    console.log('│ Table                   │ RLS Activé  │');
    console.log('├─────────────────────────┼─────────────┤');

    result.rows.forEach(row => {
      const status = row.rls_enabled ? '✅ Oui' : '❌ Non';
      const tableName = row.tablename.padEnd(23);
      console.log(`│ ${tableName} │ ${status.padEnd(11)} │`);
    });

    console.log('└─────────────────────────┴─────────────┘\n');

    // Compter les tables avec RLS
    const rlsEnabled = result.rows.filter(r => r.rls_enabled).length;
    const total = result.rows.length;

    if (rlsEnabled === total) {
      console.log(`🎉 Parfait! RLS est activé sur toutes les ${total} tables.\n`);
    } else {
      console.log(`⚠️  Attention: RLS activé sur ${rlsEnabled}/${total} tables.\n`);
    }

    console.log('📋 Notes importantes:');
    console.log('   • RLS empêche l\'accès direct via l\'API Supabase PostgREST');
    console.log('   • Votre application Node.js continue de fonctionner normalement');
    console.log('   • Elle utilise une connexion PostgreSQL directe (DATABASE_URL)\n');

  } catch (error) {
    console.error('\n❌ Erreur lors de l\'activation de RLS:', error);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

// Exécuter le script
enableRLS();
