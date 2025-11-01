/**
 * Script d'initialisation de la base de données
 * Crée toutes les tables nécessaires
 * Usage: npm run init-db
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import db from '../database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initDB() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║              INITIALISATION DE LA BASE DE DONNÉES                       ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

  try {
    // Liste des fichiers SQL à exécuter
    const sqlFiles = [
      'create-notifications-table.sql',
      'create-push-subscriptions-table.sql'
    ];

    for (const file of sqlFiles) {
      console.log(`📝 Exécution: ${file}`);
      const filePath = join(__dirname, '../database', file);

      try {
        const sql = readFileSync(filePath, 'utf8');
        await db.exec(sql);
        console.log(`✅ ${file} créé avec succès\n`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⚠️  ${file} existe déjà\n`);
        } else {
          throw err;
        }
      }
    }

    // Vérifier les tables créées
    console.log('🔍 Vérification des tables...\n');
    const tables = await db.all(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      ORDER BY name
    `);

    console.log('Tables présentes:');
    tables.forEach(table => {
      console.log(`  ✅ ${table.name}`);
    });

    const requiredTables = ['notifications', 'push_subscriptions'];
    const missingTables = requiredTables.filter(
      req => !tables.find(t => t.name === req)
    );

    if (missingTables.length > 0) {
      console.log('\n⚠️  Tables manquantes:');
      missingTables.forEach(t => console.log(`  ❌ ${t}`));
      process.exit(1);
    }

    console.log('\n✨ Initialisation complète avec succès!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'initialisation:', error.message);
    console.error(error);
    process.exit(1);
  }
}

initDB();
