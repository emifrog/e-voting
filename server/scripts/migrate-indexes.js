import 'dotenv/config';
import { supabase } from '../database/supabase.js';

/**
 * Script de migration pour ajouter les index manquants
 * Optimise les performances des requêtes les plus fréquentes
 */

const indexes = [
  // Index sur elections.status pour le scheduler
  {
    name: 'idx_elections_status',
    table: 'elections',
    columns: ['status'],
    reason: 'Optimise les requêtes de scheduler (draft, active, closed)'
  },

  // Index sur elections.created_by pour les requêtes par utilisateur
  {
    name: 'idx_elections_created_by',
    table: 'elections',
    columns: ['created_by'],
    reason: 'Optimise la récupération des élections par administrateur'
  },

  // Index composé sur elections (status, scheduled_start) pour scheduler
  {
    name: 'idx_elections_status_start',
    table: 'elections',
    columns: ['status', 'scheduled_start'],
    reason: 'Optimise les requêtes de démarrage automatique'
  },

  // Index composé sur elections (status, scheduled_end) pour scheduler
  {
    name: 'idx_elections_status_end',
    table: 'elections',
    columns: ['status', 'scheduled_end'],
    reason: 'Optimise les requêtes de clôture automatique'
  },

  // Index sur election_options.election_id (déjà créé mais ajouté pour cohérence)
  {
    name: 'idx_election_options_election',
    table: 'election_options',
    columns: ['election_id'],
    reason: 'Optimise la récupération des options par élection'
  },

  // Index composé sur voters (election_id, has_voted) pour quorum
  {
    name: 'idx_voters_election_voted',
    table: 'voters',
    columns: ['election_id', 'has_voted'],
    reason: 'Optimise le calcul du taux de participation'
  },

  // Index composé sur voters (election_id, email) pour recherche rapide
  {
    name: 'idx_voters_election_email',
    table: 'voters',
    columns: ['election_id', 'email'],
    reason: 'Optimise la vérification de doublons et recherche'
  },

  // Index sur voters.has_voted pour filtrage
  {
    name: 'idx_voters_has_voted',
    table: 'voters',
    columns: ['has_voted'],
    reason: 'Optimise les filtres sur statut de vote'
  },

  // Index sur voters.reminder_sent pour envoi de rappels
  {
    name: 'idx_voters_reminder_sent',
    table: 'voters',
    columns: ['reminder_sent'],
    reason: 'Optimise la sélection des électeurs à relancer'
  },

  // Index sur ballots.ballot_hash pour vérification unicité
  {
    name: 'idx_ballots_hash',
    table: 'ballots',
    columns: ['ballot_hash'],
    reason: 'Optimise la vérification des bulletins uniques'
  },

  // Index sur ballots.cast_at pour tri temporel
  {
    name: 'idx_ballots_cast_at',
    table: 'ballots',
    columns: ['cast_at'],
    reason: 'Optimise les requêtes de timeline de votes'
  },

  // Index sur public_votes.voter_id
  {
    name: 'idx_public_votes_voter',
    table: 'public_votes',
    columns: ['voter_id'],
    reason: 'Optimise la récupération des votes par électeur'
  },

  // Index sur observers.access_token pour authentification
  {
    name: 'idx_observers_token',
    table: 'observers',
    columns: ['access_token'],
    reason: 'Optimise l\'authentification des observateurs'
  },

  // Index sur attendance_list.voter_id
  {
    name: 'idx_attendance_voter',
    table: 'attendance_list',
    columns: ['voter_id'],
    reason: 'Optimise la récupération de l\'historique d\'émargement'
  },

  // Index sur attendance_list.marked_at pour tri temporel
  {
    name: 'idx_attendance_marked_at',
    table: 'attendance_list',
    columns: ['marked_at'],
    reason: 'Optimise les requêtes de timeline d\'émargement'
  },

  // Index sur audit_logs.election_id
  {
    name: 'idx_audit_logs_election',
    table: 'audit_logs',
    columns: ['election_id'],
    reason: 'Optimise la récupération des logs par élection'
  },

  // Index sur audit_logs.user_id
  {
    name: 'idx_audit_logs_user',
    table: 'audit_logs',
    columns: ['user_id'],
    reason: 'Optimise la récupération des logs par utilisateur'
  },

  // Index sur audit_logs.created_at pour nettoyage périodique
  {
    name: 'idx_audit_logs_created_at',
    table: 'audit_logs',
    columns: ['created_at'],
    reason: 'Optimise le nettoyage des anciens logs'
  },

  // Index sur audit_logs.action pour filtrage
  {
    name: 'idx_audit_logs_action',
    table: 'audit_logs',
    columns: ['action'],
    reason: 'Optimise les requêtes par type d\'action'
  },

  // Index sur scheduled_tasks.election_id
  {
    name: 'idx_scheduled_tasks_election',
    table: 'scheduled_tasks',
    columns: ['election_id'],
    reason: 'Optimise la récupération des tâches par élection'
  },

  // Index composé sur scheduled_tasks (executed, scheduled_for)
  {
    name: 'idx_scheduled_tasks_exec_time',
    table: 'scheduled_tasks',
    columns: ['executed', 'scheduled_for'],
    reason: 'Optimise la récupération des tâches en attente'
  },

  // Index sur users.email pour login
  {
    name: 'idx_users_email',
    table: 'users',
    columns: ['email'],
    reason: 'Optimise l\'authentification par email'
  },

  // Index sur users.role pour filtrage
  {
    name: 'idx_users_role',
    table: 'users',
    columns: ['role'],
    reason: 'Optimise les requêtes par rôle'
  }
];

async function createIndex(index) {
  const { name, table, columns } = index;

  try {
    console.log(`Création de l'index ${name}...`);

    const columnsList = columns.join(', ');
    const query = `
      CREATE INDEX IF NOT EXISTS ${name}
      ON ${table} (${columnsList})
    `;

    // Utiliser la fonction d'exécution SQL brute de Supabase
    const { data, error } = await supabase.rpc('exec_sql', { sql: query });

    if (error) {
      // Si la fonction RPC n'existe pas, essayer avec une autre méthode
      console.warn(`  ⚠️  RPC non disponible, tentative alternative...`);

      // Pour Supabase, nous devons exécuter ces requêtes manuellement via psql
      // ou via l'interface Supabase SQL Editor
      console.log(`  📝 Requête SQL à exécuter manuellement :`);
      console.log(`     ${query}`);
      console.log(`  ℹ️  Raison: ${index.reason}`);
      return { success: false, manual: true };
    }

    console.log(`  ✅ Index ${name} créé avec succès`);
    return { success: true };

  } catch (error) {
    console.error(`  ❌ Erreur lors de la création de ${name}:`, error.message);
    console.log(`  📝 Requête SQL à exécuter manuellement :`);
    console.log(`     CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${columns.join(', ')})`);
    return { success: false, error: error.message };
  }
}

async function generateMigrationSQL() {
  console.log('\n📄 Génération du fichier SQL de migration...\n');

  const sqlStatements = indexes.map(index => {
    const columnsList = index.columns.join(', ');
    return `-- ${index.reason}
CREATE INDEX IF NOT EXISTS ${index.name}
ON ${index.table} (${columnsList});
`;
  }).join('\n');

  const fullSQL = `-- Migration: Ajout des index manquants pour optimisation des performances
-- Date: ${new Date().toISOString()}
--
-- Instructions:
-- 1. Connectez-vous à votre base de données Supabase
-- 2. Allez dans SQL Editor
-- 3. Exécutez ce script

${sqlStatements}

-- Vérifier les index créés
SELECT
  tablename,
  indexname,
  indexdef
FROM
  pg_indexes
WHERE
  schemaname = 'public'
  AND tablename IN ('users', 'elections', 'election_options', 'voters', 'ballots', 'public_votes', 'observers', 'attendance_list', 'audit_logs', 'scheduled_tasks')
ORDER BY
  tablename, indexname;
`;

  // Sauvegarder dans un fichier
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outputPath = path.join(__dirname, 'add-indexes.sql');

  fs.writeFileSync(outputPath, fullSQL, 'utf8');

  console.log(`✅ Fichier SQL généré: ${outputPath}`);
  console.log('\n📋 Instructions:');
  console.log('   1. Ouvrez votre projet Supabase: https://supabase.com/dashboard');
  console.log('   2. Allez dans SQL Editor');
  console.log(`   3. Copiez/collez le contenu de ${path.basename(outputPath)}`);
  console.log('   4. Exécutez la requête\n');

  return outputPath;
}

async function analyzeIndexes() {
  console.log('\n🔍 Analyse des index existants...\n');

  try {
    // Requête pour lister les index existants
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT
            tablename,
            indexname,
            indexdef
          FROM
            pg_indexes
          WHERE
            schemaname = 'public'
            AND tablename IN ('users', 'elections', 'election_options', 'voters', 'ballots', 'public_votes', 'observers', 'attendance_list', 'audit_logs', 'scheduled_tasks')
          ORDER BY
            tablename, indexname
        `
      });

    if (error) {
      console.warn('⚠️  Impossible de récupérer la liste des index existants');
      console.warn('   Exécutez la requête manuellement dans Supabase SQL Editor\n');
      return;
    }

    console.log('Index existants:');
    data.forEach(idx => {
      console.log(`  - ${idx.tablename}.${idx.indexname}`);
    });
    console.log('');

  } catch (error) {
    console.warn('⚠️  Erreur lors de l\'analyse:', error.message);
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   📊 Migration: Optimisation des Index de la BDD     ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  console.log(`Nombre d'index à créer: ${indexes.length}\n`);

  // Générer le fichier SQL
  const sqlFile = await generateMigrationSQL();

  // Afficher un résumé
  console.log('\n📊 Résumé des optimisations:\n');

  const byTable = indexes.reduce((acc, idx) => {
    if (!acc[idx.table]) acc[idx.table] = [];
    acc[idx.table].push(idx);
    return acc;
  }, {});

  Object.entries(byTable).forEach(([table, tableIndexes]) => {
    console.log(`${table}: ${tableIndexes.length} index`);
    tableIndexes.forEach(idx => {
      console.log(`  • ${idx.name} (${idx.columns.join(', ')})`);
      console.log(`    → ${idx.reason}`);
    });
    console.log('');
  });

  console.log('✅ Migration préparée avec succès!\n');
  console.log('⚠️  IMPORTANT: Ces index doivent être créés manuellement dans Supabase');
  console.log(`📝 Fichier SQL: ${sqlFile}\n`);
}

// Exécuter le script
main().catch(console.error);
