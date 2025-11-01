/**
 * Service Web Push pour envoyer des notifications push
 * Utilise la bibliothèque web-push pour gérer les subscriptions
 */

import webPush from 'web-push';
import db from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';

// Configuration VAPID (Voluntary Application Server Identification)
// Ces clés permettent d'identifier le serveur auprès des services Push
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BNxcqN8Xl5cF8KhX7G5J9cT3FxYH6Hk9iDZ1cZr2xMq',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'xJ8KdLm3Nq5PwRz7tSu9vYx1AzC2DfE4GhI5JkL6'
};

// Configurer web-push
webPush.setVapidDetails(
  `mailto:${process.env.ADMIN_EMAIL || 'admin@evoting.com'}`,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

/**
 * Obtenir la clé publique VAPID
 * @returns {string}
 */
export function getVapidPublicKey() {
  return vapidKeys.publicKey;
}

/**
 * Enregistrer une subscription Push pour un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {object} subscription - Objet PushSubscription du navigateur
 * @returns {Promise<object>}
 */
export async function registerPushSubscription(userId, subscription) {
  try {
    const id = uuidv4();
    const endpoint = subscription.endpoint;
    const keys = JSON.stringify(subscription.keys);
    const userAgent = subscription.userAgent || 'unknown';

    // Vérifier si cette subscription existe déjà
    const existing = await db.get(
      'SELECT id FROM push_subscriptions WHERE endpoint = ?',
      [endpoint]
    );

    if (existing) {
      // Mettre à jour l'utilisateur et la date
      await db.run(
        `UPDATE push_subscriptions
         SET user_id = ?, keys = ?, updated_at = CURRENT_TIMESTAMP
         WHERE endpoint = ?`,
        [userId, keys, endpoint]
      );

      return { id: existing.id, message: 'Subscription updated' };
    }

    // Créer une nouvelle subscription
    await db.run(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, keys, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, endpoint, keys, userAgent]
    );

    console.log(`✅ Push subscription registered for user ${userId}`);

    return { id, message: 'Subscription created' };
  } catch (error) {
    console.error('❌ Error registering push subscription:', error);
    throw error;
  }
}

/**
 * Supprimer une subscription Push
 * @param {string} userId - ID de l'utilisateur
 * @param {string} endpoint - Endpoint de la subscription
 * @returns {Promise<boolean>}
 */
export async function removePushSubscription(userId, endpoint) {
  try {
    await db.run(
      'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      [userId, endpoint]
    );

    console.log(`✅ Push subscription removed for user ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ Error removing push subscription:', error);
    return false;
  }
}

/**
 * Récupérer toutes les subscriptions d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array>}
 */
export async function getUserSubscriptions(userId) {
  try {
    const subscriptions = await db.all(
      'SELECT * FROM push_subscriptions WHERE user_id = ?',
      [userId]
    );

    return subscriptions.map(sub => ({
      id: sub.id,
      endpoint: sub.endpoint,
      keys: JSON.parse(sub.keys),
      userAgent: sub.user_agent,
      createdAt: sub.created_at
    }));
  } catch (error) {
    console.error('❌ Error getting user subscriptions:', error);
    return [];
  }
}

/**
 * Envoyer une notification Push à un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {object} notification - Données de la notification
 * @returns {Promise<object>}
 */
export async function sendPushNotification(userId, notification) {
  try {
    const subscriptions = await getUserSubscriptions(userId);

    if (subscriptions.length === 0) {
      console.log(`⚠️ No push subscriptions for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      message: notification.message, // Alias pour compatibilité
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: notification.id || 'notification',
      requireInteraction: false,
      data: {
        election_id: notification.election_id,
        type: notification.type,
        url: notification.url || '/'
      },
      actions: [
        {
          action: 'view',
          title: 'Voir'
        },
        {
          action: 'dismiss',
          title: 'Ignorer'
        }
      ]
    });

    const options = {
      TTL: 3600, // Time To Live: 1 heure
      vapidDetails: {
        subject: `mailto:${process.env.ADMIN_EMAIL || 'admin@evoting.com'}`,
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey
      }
    };

    let sent = 0;
    let failed = 0;

    // Envoyer à toutes les subscriptions de l'utilisateur
    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: subscription.keys
        };

        await webPush.sendNotification(pushSubscription, payload, options);
        sent++;

        console.log(`✅ Push sent to ${subscription.endpoint.substring(0, 50)}...`);
      } catch (error) {
        failed++;

        // Si la subscription est invalide (410 Gone), la supprimer
        if (error.statusCode === 410) {
          console.log(`🗑️ Removing expired subscription for user ${userId}`);
          await removePushSubscription(userId, subscription.endpoint);
        } else {
          console.error(`❌ Push failed for ${subscription.endpoint}:`, error.message);
        }
      }
    }

    return { sent, failed };
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Envoyer une notification Push à plusieurs utilisateurs
 * @param {Array<string>} userIds - IDs des utilisateurs
 * @param {object} notification - Données de la notification
 * @returns {Promise<object>}
 */
export async function sendPushToMultipleUsers(userIds, notification) {
  const results = {
    totalSent: 0,
    totalFailed: 0,
    byUser: {}
  };

  for (const userId of userIds) {
    const result = await sendPushNotification(userId, notification);
    results.totalSent += result.sent;
    results.totalFailed += result.failed;
    results.byUser[userId] = result;
  }

  return results;
}

/**
 * Générer des clés VAPID (à exécuter une seule fois)
 * Utilisé pour la configuration initiale du serveur
 */
export function generateVapidKeys() {
  const keys = webPush.generateVAPIDKeys();
  console.log('\n🔑 VAPID Keys Generated:\n');
  console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}\n`);
  console.log('⚠️ Ajoutez ces clés dans votre fichier .env\n');
  return keys;
}

export default {
  getVapidPublicKey,
  registerPushSubscription,
  removePushSubscription,
  getUserSubscriptions,
  sendPushNotification,
  sendPushToMultipleUsers,
  generateVapidKeys
};
