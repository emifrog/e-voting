/**
 * Script pour générer des clés VAPID pour Web Push
 * Usage: npm run generate-vapid
 */

import webPush from 'web-push';

console.log('\n🔑 Génération des clés VAPID pour Web Push...\n');

const vapidKeys = webPush.generateVAPIDKeys();

console.log('╔════════════════════════════════════════════════════════════════════════╗');
console.log('║                        CLÉS VAPID GÉNÉRÉES                             ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

console.log('📋 Copiez ces lignes dans votre fichier .env:\n');
console.log('─'.repeat(76));
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('─'.repeat(76));

console.log('\n⚠️  IMPORTANT:');
console.log('   • Gardez la clé PRIVÉE secrète (ne jamais commit)');
console.log('   • La clé PUBLIQUE peut être partagée avec les clients');
console.log('   • Ces clés sont utilisées pour authentifier votre serveur Push\n');

console.log('📚 Documentation: WEB_PUSH_IMPLEMENTATION.md\n');
