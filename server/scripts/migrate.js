import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query, queryOne, checkConnection } from '../database/supabase.js';

console.log('🔄 Migration de la base de données Supabase...\n');

const migrate = async () => {
  try {
    // Vérifier la connexion
    console.log('📡 Vérification de la connexion...');
    const connected = await checkConnection();

    if (!connected) {
      console.error('❌ Impossible de se connecter à Supabase');
      console.log('\n📝 Vérifiez votre fichier .env :');
      console.log('   - SUPABASE_URL');
      console.log('   - SUPABASE_ANON_KEY');
      console.log('   - DATABASE_URL');
      process.exit(1);
    }

    console.log('✅ Connexion établie\n');

    // Vérifier si les tables existent
    console.log('🔍 Vérification des tables...');
    const tableCheck = await queryOne(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'users'
    `);

    if (tableCheck.count === '0') {
      console.log('⚠️  Les tables n\'existent pas encore !');
      console.log('\n📝 Veuillez exécuter le schéma SQL dans Supabase :');
      console.log('   1. Ouvrez Supabase Dashboard → SQL Editor');
      console.log('   2. Copiez le contenu de server/database/supabase-schema.sql');
      console.log('   3. Collez et exécutez le script');
      console.log('\n   Ou consultez SUPABASE_SETUP.md pour plus de détails');
      process.exit(1);
    }

    console.log('✅ Tables détectées\n');

    // Créer un utilisateur admin par défaut (optionnel)
    console.log('👤 Vérification de l\'utilisateur admin...');
    const existingAdmin = await queryOne(
      'SELECT id FROM users WHERE email = $1',
      ['admin@evoting.local']
    );

    if (!existingAdmin) {
      console.log('📝 Création d\'un compte admin par défaut...');

      const hashedPassword = await bcrypt.hash('admin123', 10);

      await query(`
        INSERT INTO users (email, password, name, role)
        VALUES ($1, $2, $3, $4)
      `, ['admin@evoting.local', hashedPassword, 'Administrateur', 'admin']);

      console.log('✅ Utilisateur admin créé !');
      console.log('   📧 Email : admin@evoting.local');
      console.log('   🔑 Mot de passe : admin123');
      console.log('   ⚠️  Changez ce mot de passe en production !');
    } else {
      console.log('ℹ️  Utilisateur admin existe déjà');
    }

    console.log('\n');

    // Statistiques de la base de données
    console.log('📊 Statistiques de la base de données :');

    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM elections) as elections_count,
        (SELECT COUNT(*) FROM voters) as voters_count,
        (SELECT COUNT(*) FROM ballots) as ballots_count
    `);

    const dbStats = stats.rows[0];
    console.log(`   Utilisateurs : ${dbStats.users_count}`);
    console.log(`   Élections : ${dbStats.elections_count}`);
    console.log(`   Électeurs : ${dbStats.voters_count}`);
    console.log(`   Votes : ${dbStats.ballots_count}`);

    console.log('\n✅ Migration terminée avec succès !');
    console.log('\n🚀 Vous pouvez maintenant lancer l\'application :');
    console.log('   npm run dev');

  } catch (error) {
    console.error('\n❌ Erreur de migration:', error.message);
    console.log('\n📝 Consultez SUPABASE_SETUP.md pour l\'aide');
    process.exit(1);
  }

  process.exit(0);
};

migrate();
