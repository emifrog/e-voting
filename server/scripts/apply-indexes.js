import 'dotenv/config';
import { pool } from '../database/supabase.js';

/**
 * Script d'application des index de performance
 * Tente d'appliquer les index directement via la connexion PostgreSQL
 */

const indexes = [
  // Elections (4)
  {
    name: 'idx_elections_status',
    table: 'elections',
    columns: ['status'],
    reason: 'Optimise les requêtes de scheduler'
  },
  {
    name: 'idx_elections_created_by',
    table: 'elections',
    columns: ['created_by'],
    reason: 'Optimise la récupération des élections par administrateur'
  },
  {
    name: 'idx_elections_status_start',
    table: 'elections',
    columns: ['status', 'scheduled_start'],
    reason: 'Optimise les requêtes de démarrage automatique'
  },
  {
    name: 'idx_elections_status_end',
    table: 'elections',
    columns: ['status', 'scheduled_end'],
    reason: 'Optimise les requêtes de clôture automatique'
  },

  // Election options (1)
  {
    name: 'idx_election_options_election',
    table: 'election_options',
    columns: ['election_id'],
    reason: 'Optimise la récupération des options par élection'
  },

  // Voters (4)
  {
    name: 'idx_voters_election_voted',
    table: 'voters',
    columns: ['election_id', 'has_voted'],
    reason: 'Optimise le calcul du taux de participation'
  },
  {
    name: 'idx_voters_election_email',
    table: 'voters',
    columns: ['election_id', 'email'],
    reason: 'Optimise la vérification de doublons'
  },
  {
    name: 'idx_voters_has_voted',
    table: 'voters',
    columns: ['has_voted'],
    reason: 'Optimise les filtres sur statut de vote'
  },
  {
    name: 'idx_voters_reminder_sent',
    table: 'voters',
    columns: ['reminder_sent'],
    reason: 'Optimise la sélection des électeurs à relancer'
  },

  // Ballots (2)
  {
    name: 'idx_ballots_hash',
    table: 'ballots',
    columns: ['ballot_hash'],
    reason: 'Optimise la vérification des bulletins uniques'
  },
  {
    name: 'idx_ballots_cast_at',
    table: 'ballots',
    columns: ['cast_at'],
    reason: 'Optimise les requêtes de timeline de votes'
  },

  // Public votes (1)
  {
    name: 'idx_public_votes_voter',
    table: 'public_votes',
    columns: ['voter_id'],
    reason: 'Optimise la récupération des votes par électeur'
  },

  // Observers (1)
  {
    name: 'idx_observers_token',
    table: 'observers',
    columns: ['access_token'],
    reason: 'Optimise l\'authentification des observateurs'
  },

  // Attendance (2)
  {
    name: 'idx_attendance_voter',
    table: 'attendance_list',
    columns: ['voter_id'],
    reason: 'Optimise la récupération de l\'historique d\'émargement'
  },
  {
    name: 'idx_attendance_marked_at',
    table: 'attendance_list',
    columns: ['marked_at'],
    reason: 'Optimise les requêtes de timeline d\'émargement'
  },

  // Audit logs (4)
  {
    name: 'idx_audit_logs_election',
    table: 'audit_logs',
    columns: ['election_id'],
    reason: 'Optimise la récupération des logs par élection'
  },
  {
    name: 'idx_audit_logs_user',
    table: 'audit_logs',
    columns: ['user_id'],
    reason: 'Optimise la récupération des logs par utilisateur'
  },
  {
    name: 'idx_audit_logs_created_at',
    table: 'audit_logs',
    columns: ['created_at'],
    reason: 'Optimise le nettoyage des anciens logs'
  },
  {
    name: 'idx_audit_logs_action',
    table: 'audit_logs',
    columns: ['action'],
    reason: 'Optimise les requêtes par type d\'action'
  },

  // Scheduled tasks (2)
  {
    name: 'idx_scheduled_tasks_election',
    table: 'scheduled_tasks',
    columns: ['election_id'],
    reason: 'Optimise la récupération des tâches par élection'
  },
  {
    name: 'idx_scheduled_tasks_exec_time',
    table: 'scheduled_tasks',
    columns: ['executed', 'scheduled_for'],
    reason: 'Optimise la récupération des tâches en attente'
  },

  // Users (2)
  {
    name: 'idx_users_email',
    table: 'users',
    columns: ['email'],
    reason: 'Optimise l\'authentification par email'
  },
  {
    name: 'idx_users_role',
    table: 'users',
    columns: ['role'],
    reason: 'Optimise les requêtes par rôle'
  }
];

async function createIndex(indexDef) {
  try {
    const columnsList = indexDef.columns.join(', ');
    const sql = `
      CREATE INDEX IF NOT EXISTS ${indexDef.name}
      ON ${indexDef.table} (${columnsList})
    `;

    await pool.query(sql);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function applyIndexes() {
  console.log('\n╔═════════════════════════════════════════════════════╗');
  console.log('║    🚀 Application des Index de Performance         ║');
  console.log('╚═════════════════════════════════════════════════════╝\n');

  console.log(`📊 Nombre d'index à créer: ${indexes.length}\n`);

  let createdCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const failed = [];

  // Grouper par table
  const byTable = {};
  indexes.forEach(idx => {
    if (!byTable[idx.table]) byTable[idx.table] = [];
    byTable[idx.table].push(idx);
  });

  // Appliquer les index par table
  for (const [table, tableIndexes] of Object.entries(byTable)) {
    console.log(`📦 ${table}:`);

    for (const indexDef of tableIndexes) {
      process.stdout.write(`  ⏳ ${indexDef.name}... `);

      const result = await createIndex(indexDef);

      if (result.success) {
        console.log('✅');
        createdCount++;
      } else {
        // Vérifier si l'erreur est "déjà existe"
        if (result.error.includes('already exists')) {
          console.log('⏭️  (déjà existant)');
          skippedCount++;
        } else {
          console.log('❌');
          failedCount++;
          failed.push({
            name: indexDef.name,
            error: result.error
          });
        }
      }
    }
    console.log('');
  }

  // Résumé
  console.log('\n╔═════════════════════════════════════════════════════╗');
  console.log('║                   📊 RÉSUMÉ                        ║');
  console.log('╚═════════════════════════════════════════════════════╝\n');

  console.log(`✅ Créés:      ${createdCount}`);
  console.log(`⏭️  Existants:   ${skippedCount}`);
  console.log(`❌ Échechs:      ${failedCount}`);
  console.log(`📈 Total:      ${createdCount + skippedCount + failedCount}\n`);

  if (failedCount > 0) {
    console.log('❌ Erreurs:\n');
    failed.forEach(f => {
      console.log(`  • ${f.name}`);
      console.log(`    ${f.error}\n`);
    });
  }

  // Analyser les tables
  console.log('⏳ Mise à jour des statistiques...\n');
  const tables = ['users', 'elections', 'election_options', 'voters', 'ballots', 'public_votes', 'observers', 'attendance_list', 'audit_logs', 'scheduled_tasks'];

  for (const table of tables) {
    process.stdout.write(`  ANALYZE ${table}... `);
    try {
      await pool.query(`ANALYZE ${table}`);
      console.log('✅');
    } catch (error) {
      console.log(`❌ (${error.message})`);
    }
  }

  console.log('\n✅ Application des index terminée !\n');
  console.log('📝 Prochaine étape: npm run check-indexes\n');

  return failedCount === 0;
}

// Exécuter le script
applyIndexes()
  .then(success => {
    pool.end();
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
