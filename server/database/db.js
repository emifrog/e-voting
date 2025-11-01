// Adaptateur pour Supabase/PostgreSQL
// Garde la même interface que SQLite pour faciliter la migration

import { query, queryOne, queryMany, transaction, checkConnection } from './supabase.js';

// Wrapper pour simuler l'interface SQLite
class DB {
  // Préparer une requête (style SQLite)
  prepare(sql) {
    return {
      // Exécuter une requête qui retourne une ligne
      get: async (...params) => {
        // Convertir les ? en $1, $2, etc. pour PostgreSQL
        const pgSql = this._convertPlaceholders(sql);
        return await queryOne(pgSql, params);
      },

      // Exécuter une requête qui retourne plusieurs lignes
      all: async (...params) => {
        const pgSql = this._convertPlaceholders(sql);
        return await queryMany(pgSql, params);
      },

      // Exécuter une requête sans retour (INSERT, UPDATE, DELETE)
      run: async (...params) => {
        const pgSql = this._convertPlaceholders(sql);
        const result = await query(pgSql, params);
        return {
          rowCount: result.rowCount,
          rows: result.rows
        };
      }
    };
  }

  // Exécuter directement (pour CREATE TABLE, etc.)
  async exec(sql) {
    // Diviser les commandes multiples séparées par ;
    const commands = sql.split(';').filter(cmd => cmd.trim());
    for (const cmd of commands) {
      if (cmd.trim()) {
        await query(cmd.trim());
      }
    }
  }

  // Convertir les placeholders SQLite (?) en PostgreSQL ($1, $2, etc.)
  _convertPlaceholders(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  }

  // Transaction
  async transaction(callback) {
    return await transaction(callback);
  }

  // Fonctions utilitaires PostgreSQL
  async query(sql, params = []) {
    return await query(sql, params);
  }

  async queryOne(sql, params = []) {
    return await queryOne(sql, params);
  }

  async queryMany(sql, params = []) {
    return await queryMany(sql, params);
  }

  // Méthodes directes (sans prepare) pour compatibilité
  async get(sql, params = []) {
    const pgSql = this._convertPlaceholders(sql);
    return await queryOne(pgSql, params);
  }

  async all(sql, params = []) {
    const pgSql = this._convertPlaceholders(sql);
    const result = await queryMany(pgSql, params);
    return result || []; // Retourner un array vide si null/undefined
  }

  async run(sql, params = []) {
    const pgSql = this._convertPlaceholders(sql);
    const result = await query(pgSql, params);
    return {
      rowCount: result.rowCount,
      rows: result.rows
    };
  }
}

const db = new DB();

// Vérifier la connexion au démarrage
checkConnection();

export default db;
