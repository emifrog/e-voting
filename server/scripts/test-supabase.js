import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import pkg from 'pg';
const { Pool } = pkg;

console.log('\n🔍 DIAGNOSTIC DE CONNEXION SUPABASE\n');
console.log('═'.repeat(60));

// Vérification des variables d'environnement
console.log('\n📋 1. Vérification des variables d\'environnement');
console.log('─'.repeat(60));

const config = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV || 'development'
};

for (const [key, value] of Object.entries(config)) {
  if (!value || value.includes('votre-') || value.includes('[PASSWORD]')) {
    console.log(`❌ ${key}: NON CONFIGURÉ ou INVALIDE`);
    if (key === 'DATABASE_URL' && value) {
      console.log(`   Valeur actuelle: ${value.substring(0, 50)}...`);
      if (value.includes('[PASSWORD]')) {
        console.log('   ⚠️  Remplacez [PASSWORD] par votre vrai mot de passe !');
      }
    }
  } else {
    console.log(`✅ ${key}: CONFIGURÉ`);
    if (key === 'SUPABASE_URL') {
      console.log(`   → ${value}`);
    }
    if (key === 'SUPABASE_ANON_KEY') {
      console.log(`   → ${value.substring(0, 20)}...`);
    }
    if (key === 'DATABASE_URL') {
      // Masquer le mot de passe dans l'affichage
      const masked = value.replace(/:([^@]+)@/, ':****@');
      console.log(`   → ${masked.substring(0, 80)}...`);
    }
  }
}

// Test 1: Client Supabase JS
console.log('\n📡 2. Test du client Supabase JS');
console.log('─'.repeat(60));

if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
  console.log('❌ Impossible de tester : Variables manquantes');
  console.log('\n📝 Configuration requise:');
  console.log('   1. Créez un projet sur https://supabase.com');
  console.log('   2. Récupérez URL et ANON_KEY depuis Settings > API');
  console.log('   3. Mettez à jour votre fichier .env');
  process.exit(1);
}

try {
  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  console.log('✅ Client Supabase créé avec succès');

  // Test de connexion basique
  const { data, error } = await supabase.from('users').select('count').limit(0);

  if (error) {
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('⚠️  Tables non créées encore');
      console.log('   → Exécutez le schéma SQL dans Supabase Dashboard');
    } else if (error.message.includes('JWT')) {
      console.log('❌ Erreur d\'authentification JWT');
      console.log('   → Vérifiez votre SUPABASE_ANON_KEY');
    } else {
      console.log('⚠️  Avertissement:', error.message);
    }
  } else {
    console.log('✅ Connexion API Supabase fonctionnelle');
  }
} catch (error) {
  console.log('❌ Erreur client Supabase:', error.message);
}

// Test 2: Pool PostgreSQL
console.log('\n🗄️  3. Test de connexion PostgreSQL directe');
console.log('─'.repeat(60));

if (!config.DATABASE_URL) {
  console.log('❌ DATABASE_URL non configurée');
  process.exit(1);
}

if (config.DATABASE_URL.includes('[PASSWORD]')) {
  console.log('❌ DATABASE_URL contient [PASSWORD]');
  console.log('   → Remplacez [PASSWORD] par votre mot de passe Supabase');
  console.log('\n📝 Comment obtenir votre connection string:');
  console.log('   1. Ouvrez Supabase Dashboard');
  console.log('   2. Settings > Database');
  console.log('   3. Connection string > URI');
  console.log('   4. Copiez et remplacez [YOUR-PASSWORD] par votre mot de passe');
  process.exit(1);
}

try {
  const pool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Nécessaire pour Supabase
    connectionTimeoutMillis: 10000,
  });

  console.log('⏳ Tentative de connexion...');

  const client = await pool.connect();
  console.log('✅ Connexion PostgreSQL établie');

  // Test de requête
  const result = await client.query('SELECT NOW() as current_time, version() as version');
  console.log('✅ Requête test réussie');
  console.log(`   Heure serveur: ${result.rows[0].current_time}`);
  console.log(`   Version: ${result.rows[0].version.split(',')[0]}`);

  client.release();

  // Test des tables
  console.log('\n📊 4. Vérification des tables');
  console.log('─'.repeat(60));

  const tablesResult = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  if (tablesResult.rows.length === 0) {
    console.log('⚠️  Aucune table trouvée');
    console.log('\n📝 Actions requises:');
    console.log('   1. Ouvrez Supabase Dashboard → SQL Editor');
    console.log('   2. Copiez le contenu de server/database/supabase-schema.sql');
    console.log('   3. Collez et exécutez le script');
    console.log('   4. Relancez ce test');
  } else {
    console.log(`✅ ${tablesResult.rows.length} table(s) trouvée(s):`);

    const expectedTables = [
      'users', 'elections', 'election_options', 'voters',
      'ballots', 'public_votes', 'observers', 'attendance_list',
      'audit_logs', 'scheduled_tasks'
    ];

    expectedTables.forEach(tableName => {
      const exists = tablesResult.rows.some(row => row.table_name === tableName);
      if (exists) {
        console.log(`   ✅ ${tableName}`);
      } else {
        console.log(`   ❌ ${tableName} (manquante)`);
      }
    });

    // Compter les enregistrements
    console.log('\n📈 5. Statistiques de la base de données');
    console.log('─'.repeat(60));

    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM elections) as elections_count,
        (SELECT COUNT(*) FROM voters) as voters_count,
        (SELECT COUNT(*) FROM ballots) as ballots_count
    `);

    const dbStats = stats.rows[0];
    console.log(`   Utilisateurs: ${dbStats.users_count}`);
    console.log(`   Élections: ${dbStats.elections_count}`);
    console.log(`   Électeurs: ${dbStats.voters_count}`);
    console.log(`   Votes: ${dbStats.ballots_count}`);
  }

  await pool.end();

  // Résumé final
  console.log('\n' + '═'.repeat(60));
  console.log('✅ DIAGNOSTIC TERMINÉ : TOUT FONCTIONNE !');
  console.log('═'.repeat(60));
  console.log('\n🚀 Prochaines étapes:');
  console.log('   1. Lancez: npm run migrate (pour créer un admin)');
  console.log('   2. Lancez: npm run dev (pour démarrer l\'app)');
  console.log('   3. Ouvrez: http://localhost:5173');
  console.log('\n');

  process.exit(0);

} catch (error) {
  console.log('\n❌ ERREUR DE CONNEXION');
  console.log('─'.repeat(60));
  console.log(`Type: ${error.code || error.name}`);
  console.log(`Message: ${error.message}`);

  // Diagnostics spécifiques
  if (error.code === 'ENOTFOUND') {
    console.log('\n🔍 Diagnostic:');
    console.log('   → L\'URL Supabase est incorrecte ou inaccessible');
    console.log('   → Vérifiez SUPABASE_URL dans .env');
  } else if (error.code === 'ECONNREFUSED') {
    console.log('\n🔍 Diagnostic:');
    console.log('   → Connexion refusée');
    console.log('   → Le projet Supabase est-il actif ?');
  } else if (error.message.includes('password')) {
    console.log('\n🔍 Diagnostic:');
    console.log('   → Mot de passe incorrect');
    console.log('   → Vérifiez le mot de passe dans DATABASE_URL');
  } else if (error.message.includes('SSL')) {
    console.log('\n🔍 Diagnostic:');
    console.log('   → Problème SSL');
    console.log('   → Assurez-vous que ssl: { rejectUnauthorized: false } est actif');
  } else if (error.message.includes('timeout')) {
    console.log('\n🔍 Diagnostic:');
    console.log('   → Timeout de connexion');
    console.log('   → Vérifiez votre connexion internet');
    console.log('   → Le projet Supabase est-il en pause ?');
  }

  console.log('\n📝 Solutions:');
  console.log('   1. Vérifiez votre fichier .env');
  console.log('   2. Consultez SUPABASE_SETUP.md pour l\'aide');
  console.log('   3. Vérifiez que votre projet Supabase est actif');
  console.log('\n');

  process.exit(1);
}
