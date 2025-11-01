import 'dotenv/config';
import { pool } from '../database/supabase.js';

/**
 * Script de migration pour la version 2.0
 * Ajoute les colonnes pour 2FA, Quorum et Intégrations Meetings
 */

const migrations = [
  {
    name: '2FA - Ajout des colonnes pour l\'authentification à deux facteurs',
    sql: `
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255),
      ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT;
    `
  },
  {
    name: 'Quorum - Ajout des colonnes pour la gestion du quorum',
    sql: `
      ALTER TABLE elections
      ADD COLUMN IF NOT EXISTS quorum_type VARCHAR(50) DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS quorum_value DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS quorum_reached BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS quorum_reached_at TIMESTAMP WITH TIME ZONE;
    `
  },
  {
    name: 'Meetings - Ajout des colonnes pour les intégrations Teams/Zoom',
    sql: `
      ALTER TABLE elections
      ADD COLUMN IF NOT EXISTS meeting_platform VARCHAR(50),
      ADD COLUMN IF NOT EXISTS meeting_url TEXT,
      ADD COLUMN IF NOT EXISTS meeting_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS meeting_password VARCHAR(255);
    `
  }
];

async function runMigration() {
  console.log('\n🚀 Démarrage de la migration vers la version 2.0...\n');

  try {
    // Tester la connexion
    const client = await pool.connect();
    console.log('✅ Connexion à Supabase établie\n');

    let successCount = 0;
    let errorCount = 0;

    // Exécuter chaque migration
    for (const migration of migrations) {
      try {
        console.log(`📝 ${migration.name}...`);
        await client.query(migration.sql);
        console.log(`   ✅ Réussi\n`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Erreur: ${error.message}\n`);
        errorCount++;
      }
    }

    client.release();

    // Résumé
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RÉSUMÉ DE LA MIGRATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Migrations réussies : ${successCount}/${migrations.length}`);
    console.log(`❌ Migrations échouées : ${errorCount}/${migrations.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (errorCount === 0) {
      console.log('🎉 Migration terminée avec succès !');
      console.log('\n📚 Nouvelles fonctionnalités disponibles :');
      console.log('   - Authentification à deux facteurs (2FA)');
      console.log('   - Gestion du quorum');
      console.log('   - Intégrations Teams/Zoom\n');
      console.log('📖 Consultez NOUVELLES_FONCTIONNALITES_2FA_QUORUM_MEETINGS.md pour plus d\'informations\n');
    } else {
      console.log('⚠️  Certaines migrations ont échoué. Vérifiez les erreurs ci-dessus.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error.message);
    console.error('\n💡 Vérifiez :');
    console.error('   - Votre connexion à Supabase');
    console.error('   - Les variables d\'environnement dans .env');
    console.error('   - Que les tables users et elections existent\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Confirmation avant exécution
console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║   MIGRATION BASE DE DONNÉES - VERSION 2.0            ║');
console.log('╚═══════════════════════════════════════════════════════╝');
console.log('\nCette migration va ajouter les colonnes suivantes :');
console.log('  • users : two_factor_enabled, two_factor_secret, two_factor_backup_codes');
console.log('  • elections : quorum_type, quorum_value, quorum_reached, quorum_reached_at');
console.log('  • elections : meeting_platform, meeting_url, meeting_id, meeting_password\n');

// Lancer la migration
runMigration();
