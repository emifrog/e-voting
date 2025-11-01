/**
 * Script de migration pour les tables notifications et push_subscriptions
 * Usage: npm run migrate:notifications
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import db from '../database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  console.log('🔄 Migration des tables notifications...\n');

  try {
    // 1. Table notifications
    console.log('📝 Création de la table notifications...');
    const notificationsSql = readFileSync(
      join(__dirname, '../database/create-notifications-table.sql'),
      'utf8'
    );

    await db.exec(notificationsSql);
    console.log('✅ Table notifications créée\n');

    // 2. Table push_subscriptions
    console.log('📝 Création de la table push_subscriptions...');
    const pushSql = readFileSync(
      join(__dirname, '../database/create-push-subscriptions-table.sql'),
      'utf8'
    );

    await db.exec(pushSql);
    console.log('✅ Table push_subscriptions créée\n');

    // 3. Vérification
    console.log('🔍 Vérification des tables...');
    const tables = await db.all(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      AND name IN ('notifications', 'push_subscriptions')
      ORDER BY name
    `);

    console.log('Tables créées:');
    tables.forEach(table => {
      console.log(`  ✅ ${table.name}`);
    });

    console.log('\n✨ Migration terminée avec succès!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrate();
