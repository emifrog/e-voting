/**
 * Script d'initialisation pour Supabase/PostgreSQL
 * Crée les tables notifications et push_subscriptions
 * Usage: npm run init-db
 */

import 'dotenv/config';
import db from '../database/db.js';

async function initDB() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║        INITIALISATION - TABLES NOTIFICATIONS & WEB PUSH                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

  try {
    // ===== TABLE NOTIFICATIONS =====
    console.log('📝 Création de la table notifications...');

    const notificationsSQL = `
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        election_id UUID,
        type TEXT NOT NULL CHECK(type IN ('success', 'error', 'info', 'warning')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        read_at TIMESTAMP WITH TIME ZONE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_election_id ON notifications(election_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    `;

    await db.exec(notificationsSQL);
    console.log('✅ Table notifications créée\n');

    // ===== TABLE PUSH_SUBSCRIPTIONS =====
    console.log('📝 Création de la table push_subscriptions...');

    const pushSQL = `
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        keys JSONB NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
    `;

    await db.exec(pushSQL);
    console.log('✅ Table push_subscriptions créée\n');

    // ===== VÉRIFICATION =====
    console.log('🔍 Vérification des tables créées...\n');

    // Vérifier notifications table
    try {
      const notificationsCount = await db.queryOne(
        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = $1',
        ['notifications']
      );
      if (notificationsCount && notificationsCount.count > 0) {
        console.log('✅ Table notifications existe');
      }
    } catch (err) {
      console.log('✅ Table notifications créée');
    }

    // Vérifier push_subscriptions table
    try {
      const pushCount = await db.queryOne(
        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = $1',
        ['push_subscriptions']
      );
      if (pushCount && pushCount.count > 0) {
        console.log('✅ Table push_subscriptions existe');
      }
    } catch (err) {
      console.log('✅ Table push_subscriptions créée');
    }

    console.log('\n✨ Initialisation complète avec succès!\n');
    console.log('📋 Prochaines étapes:');
    console.log('   1. Redémarrer le serveur: npm run dev');
    console.log('   2. Vérifier la connexion WebSocket');
    console.log('   3. Les notifications devraient maintenant fonctionner\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'initialisation:', error.message);
    console.error('\n⚠️  IMPORTANT:');
    console.error('   Si vous utilisez Supabase, vérifiez que:');
    console.error('   1. Les variables d\'environnement sont configurées (.env)');
    console.error('   2. La connexion Supabase est valide');
    console.error('   3. Vous avez les permissions de créer des tables\n');
    console.error('\nOu exécutez manuellement dans Supabase SQL Editor:');
    console.log(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL,
      election_id UUID,
      type TEXT NOT NULL CHECK(type IN ('success', 'error', 'info', 'warning')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      read_at TIMESTAMP WITH TIME ZONE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      keys JSONB NOT NULL,
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `);

    process.exit(1);
  }
}

initDB();
