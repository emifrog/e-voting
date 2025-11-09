import 'dotenv/config';
import { pool } from '../database/supabase.js';

/**
 * Script de vérification des index de la base de données
 * Affiche les index créés et détecte ceux manquants
 */

const expectedIndexes = [
  // Elections
  { table: 'elections', name: 'idx_elections_status' },
  { table: 'elections', name: 'idx_elections_created_by' },
  { table: 'elections', name: 'idx_elections_status_start' },
  { table: 'elections', name: 'idx_elections_status_end' },

  // Election options
  { table: 'election_options', name: 'idx_election_options_election' },

  // Voters
  { table: 'voters', name: 'idx_voters_election_voted' },
  { table: 'voters', name: 'idx_voters_election_email' },
  { table: 'voters', name: 'idx_voters_has_voted' },
  { table: 'voters', name: 'idx_voters_reminder_sent' },

  // Ballots
  { table: 'ballots', name: 'idx_ballots_hash' },
  { table: 'ballots', name: 'idx_ballots_cast_at' },

  // Public votes
  { table: 'public_votes', name: 'idx_public_votes_voter' },

  // Observers
  { table: 'observers', name: 'idx_observers_token' },

  // Attendance
  { table: 'attendance_list', name: 'idx_attendance_voter' },
  { table: 'attendance_list', name: 'idx_attendance_marked_at' },

  // Audit logs
  { table: 'audit_logs', name: 'idx_audit_logs_election' },
  { table: 'audit_logs', name: 'idx_audit_logs_user' },
  { table: 'audit_logs', name: 'idx_audit_logs_created_at' },
  { table: 'audit_logs', name: 'idx_audit_logs_action' },

  // Scheduled tasks
  { table: 'scheduled_tasks', name: 'idx_scheduled_tasks_election' },
  { table: 'scheduled_tasks', name: 'idx_scheduled_tasks_exec_time' },

  // Users
  { table: 'users', name: 'idx_users_email' },
  { table: 'users', name: 'idx_users_role' }
];

async function checkIndexes() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   🔍 Vérification des Index de Base de Données        ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    // Récupérer tous les index existants
    const query = `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM
        pg_indexes
      WHERE
        schemaname = 'public'
      ORDER BY
        tablename, indexname
    `;

    const result = await pool.query(query);
    const existingIndexes = new Map();

    // Organiser les index existants par table
    result.rows.forEach(row => {
      const key = `${row.tablename}.${row.indexname}`;
      existingIndexes.set(key, row);
    });

    // Vérifier chaque index attendu
    let created = 0;
    let missing = 0;
    const missingIndexes = [];

    console.log('📋 État des Index:\n');

    // Grouper par table
    const byTable = {};
    expectedIndexes.forEach(idx => {
      if (!byTable[idx.table]) byTable[idx.table] = [];
      byTable[idx.table].push(idx);
    });

    Object.entries(byTable).sort().forEach(([table, indexes]) => {
      console.log(`📦 ${table}:`);

      indexes.forEach(idx => {
        const key = `${table}.${idx.name}`;
        if (existingIndexes.has(key)) {
          console.log(`  ✅ ${idx.name}`);
          created++;
        } else {
          console.log(`  ❌ ${idx.name}`);
          missing++;
          missingIndexes.push(key);
        }
      });
      console.log('');
    });

    // Résumé
    console.log('📊 Résumé:\n');
    console.log(`  ✅ Créés:   ${created}/${expectedIndexes.length}`);
    console.log(`  ❌ Manquants: ${missing}/${expectedIndexes.length}`);
    console.log(`  📈 Couverture: ${Math.round((created / expectedIndexes.length) * 100)}%\n`);

    if (missing > 0) {
      console.log('⚠️  Indexes Manquants:\n');
      missingIndexes.forEach(key => {
        console.log(`  • ${key}`);
      });
      console.log('\n📝 Pour appliquer les index manquants:');
      console.log('   1. Allez sur https://supabase.com/dashboard');
      console.log('   2. SQL Editor');
      console.log('   3. Copiez le contenu de server/scripts/add-indexes.sql');
      console.log('   4. Exécutez la requête\n');
    } else {
      console.log('🎉 Tous les index sont créés !\n');
    }

    // Afficher les autres index (non attendus)
    const otherIndexes = [];
    existingIndexes.forEach((value, key) => {
      const isExpected = expectedIndexes.some(idx => key === `${idx.table}.${idx.name}`);
      if (!isExpected && !key.includes('_pkey')) { // Ignorer les clés primaires
        otherIndexes.push(key);
      }
    });

    if (otherIndexes.length > 0) {
      console.log('ℹ️  Autres Indexes Présents:\n');
      otherIndexes.forEach(key => {
        console.log(`  • ${key}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    console.log('\n⚠️  Assurez-vous que:');
    console.log('   • DATABASE_URL est correctement configuré');
    console.log('   • La connexion à la base de données est active');
    console.log('   • Les variables d\'environnement sont chargées\n');
    process.exit(1);
  }
}

// Exécuter le script
checkIndexes().then(() => {
  pool.end();
  process.exit(0);
}).catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
