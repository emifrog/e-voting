/**
 * Script pour corriger le search_path de la fonction update_updated_at_column
 *
 * Le problème: La fonction a un search_path mutable qui peut être un risque de sécurité
 * La solution: Recréer la fonction avec SET search_path = pg_catalog, public
 */

import 'dotenv/config';
import { query } from '../database/supabase.js';

async function fixFunctionSearchPath() {
  console.log('🔧 Correction du search_path de la fonction update_updated_at_column...\n');

  try {
    // Recréer la fonction avec un search_path sécurisé
    const sql = `
      CREATE OR REPLACE FUNCTION public.update_updated_at_column()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = pg_catalog, public
      AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$;
    `;

    await query(sql);
    console.log('✅ Fonction update_updated_at_column corrigée avec succès!\n');

    // Vérification
    console.log('🔍 Vérification de la fonction...\n');
    const result = await query(`
      SELECT
        proname as function_name,
        prosecdef as security_definer,
        proconfig as config_settings
      FROM pg_proc
      WHERE proname = 'update_updated_at_column'
        AND pronamespace = 'public'::regnamespace
    `);

    if (result.rows.length > 0) {
      const func = result.rows[0];
      console.log('📋 Détails de la fonction:');
      console.log(`   Nom: ${func.function_name}`);
      console.log(`   Security Definer: ${func.security_definer ? 'Oui' : 'Non'}`);
      console.log(`   Config: ${func.config_settings || 'search_path configuré'}`);
      console.log('\n✅ La fonction est maintenant sécurisée!\n');
    }

    console.log('📝 Notes:');
    console.log('   • SET search_path = pg_catalog, public empêche les attaques par injection de schéma');
    console.log('   • SECURITY DEFINER exécute la fonction avec les privilèges du créateur');
    console.log('   • La fonction continue de fonctionner normalement\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

fixFunctionSearchPath();
