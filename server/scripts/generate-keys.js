/**
 * Script pour générer toutes les clés de sécurité nécessaires
 * Usage: node server/scripts/generate-keys.js
 */

import crypto from 'crypto';
import webPush from 'web-push';

console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
console.log('║              GÉNÉRATION DES CLÉS DE SÉCURITÉ                           ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

// 1. JWT Secret (64 bytes en base64)
const jwtSecret = crypto.randomBytes(64).toString('base64');
console.log('📝 JWT Secret (pour authentification):');
console.log('─'.repeat(76));
console.log(`JWT_SECRET=${jwtSecret}`);
console.log('─'.repeat(76));
console.log('');

// 2. Encryption Key (exactement 32 bytes pour AES-256)
const encryptionKey = crypto.randomBytes(32).toString('base64').substring(0, 32);
console.log('🔐 Encryption Key (exactement 32 bytes pour AES-256):');
console.log('─'.repeat(76));
console.log(`ENCRYPTION_KEY=${encryptionKey}`);
console.log('─'.repeat(76));
console.log('✅ Longueur vérifiée:', Buffer.from(encryptionKey, 'utf8').length, 'bytes\n');

// 3. VAPID Keys (pour Web Push)
const vapidKeys = webPush.generateVAPIDKeys();
console.log('📱 VAPID Keys (pour notifications Web Push):');
console.log('─'.repeat(76));
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('─'.repeat(76));
console.log('');

// Fichier .env complet
console.log('📋 Copiez TOUTES ces lignes dans votre fichier .env:');
console.log('═'.repeat(76));
console.log('# Sécurité');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`ENCRYPTION_KEY=${encryptionKey}`);
console.log('');
console.log('# Web Push');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`ADMIN_EMAIL=admin@evoting.com`);
console.log('═'.repeat(76));
console.log('');

console.log('⚠️  IMPORTANT:');
console.log('   ✓ JWT_SECRET: Secret pour les tokens JWT');
console.log('   ✓ ENCRYPTION_KEY: Clé de chiffrement AES-256 (32 bytes)');
console.log('   ✓ VAPID_PUBLIC_KEY: Partagée avec les clients (OK)');
console.log('   ✓ VAPID_PRIVATE_KEY: GARDEZ SECRÈTE (ne jamais commit)');
console.log('');
console.log('📚 Après avoir copié dans .env:');
console.log('   npm start  # ou  npm run dev');
console.log('');
