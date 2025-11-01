import { createClient } from '@supabase/supabase-js';
import pkg from 'pg';
const { Pool } = pkg;

// Client Supabase pour l'authentification et certaines fonctionnalités
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Pool PostgreSQL pour les requêtes directes (meilleures performances)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL est requis pour Supabase
  ssl: process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20
});

// Test de connexion
pool.on('error', (err) => {
  console.error('Erreur PostgreSQL:', err);
});

// Helper pour exécuter des requêtes
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Requête exécutée', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Erreur requête:', error);
    throw error;
  }
};

// Helper pour récupérer une seule ligne
export const queryOne = async (text, params) => {
  const result = await query(text, params);
  return result.rows[0] || null;
};

// Helper pour récupérer plusieurs lignes
export const queryMany = async (text, params) => {
  const result = await query(text, params);
  return result.rows;
};

// Helper pour les transactions
export const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Fonction pour vérifier la connexion
export const checkConnection = async () => {
  try {
    await query('SELECT NOW()');
    console.log('✅ Connexion Supabase/PostgreSQL établie');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à Supabase:', error.message);
    return false;
  }
};

export default { query, queryOne, queryMany, transaction, supabase, checkConnection };
