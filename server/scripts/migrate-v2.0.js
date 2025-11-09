import 'dotenv/config';
import { pool } from '../database/supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Script de migration v2.0
 * Applique les améliorations de performance et les optimisations
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrations = [
  {
    name: 'Indexes de Performance',
    description: 'Création des index manquants pour optimiser les requêtes',
    sqlFile: 'add-indexes.sql',
    critical: true
  },
  {
    name: 'Analyse des Tables',
    description: 'Mise à jour des statistiques PostgreSQL',
    sql: `
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
    `,
    critical: false
  }
];

async function executeSql(sql, description) {
  console.log(`⏳ Exécution: ${description}`);
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(sql);
      console.log(`  ✅ Succès`);
      return { success: true, result };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`  ❌ Erreur: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runMigration() {
  console.log('\n╔═════════════════════════════════════════════════════╗');
  console.log('║      🚀 Migration v2.0 - Optimisations BDD        ║');
  console.log('╚═════════════════════════════════════════════════════╝\n');

  let successCount = 0;
  let failureCount = 0;
  const results = [];

  for (const migration of migrations) {
    console.log(`\n📦 ${migration.name}`);
    console.log(`   ${migration.description}`);
    console.log('   ' + '-'.repeat(50));

    let sql = migration.sql;

    // Charger le fichier SQL si spécifié
    if (migration.sqlFile) {
      try {
        const sqlPath = path.join(__dirname, migration.sqlFile);
        sql = fs.readFileSync(sqlPath, 'utf8');
      } catch (error) {
        console.error(`  ❌ Erreur de chargement du fichier: ${error.message}`);
        if (migration.critical) {
          failureCount++;
          results.push({
            name: migration.name,
            success: false,
            error: `Fichier non trouvé: ${migration.sqlFile}`
          });
          continue;
        }
      }
    }

    // Exécuter le SQL
    const result = await executeSql(sql, migration.name);

    if (result.success) {
      successCount++;
      results.push({
        name: migration.name,
        success: true,
        rowsAffected: result.result?.rowCount || 0
      });
    } else {
      failureCount++;
      results.push({
        name: migration.name,
        success: false,
        error: result.error
      });

      if (migration.critical) {
        console.log('\n⚠️  MIGRATION CRITIQUE ÉCHOUÉE');
        console.log('   La migration ne peut pas continuer.\n');
        return false;
      }
    }
  }

  // Afficher le résumé
  console.log('\n\n╔═════════════════════════════════════════════════════╗');
  console.log('║                   📊 RÉSUMÉ                        ║');
  console.log('╚═════════════════════════════════════════════════════╝\n');

  console.log(`✅ Succès: ${successCount}`);
  console.log(`❌ Échechs: ${failureCount}`);
  console.log(`📈 Total: ${successCount + failureCount}\n`);

  if (failureCount === 0) {
    console.log('🎉 Migration v2.0 complétée avec succès !\n');
    console.log('📊 Prochaines étapes:');
    console.log('   1. Exécutez: npm run check-indexes');
    console.log('   2. Vérifiez que tous les index sont créés');
    console.log('   3. Testez les performances de votre application\n');
    return true;
  } else {
    console.log('⚠️  Migration terminée avec des erreurs\n');
    console.log('Détails:');
    results.forEach(r => {
      const status = r.success ? '✅' : '❌';
      console.log(`${status} ${r.name}`);
      if (r.error) console.log(`   Erreur: ${r.error}`);
    });
    console.log('');
    return false;
  }
}

// Exécuter la migration
runMigration()
  .then(success => {
    pool.end();
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
