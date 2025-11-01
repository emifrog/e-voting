import express from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import {
  getVapidPublicKey,
  registerPushSubscription,
  removePushSubscription,
  getUserSubscriptions,
  sendPushNotification
} from '../services/webPush.js';

const router = express.Router();

/**
 * GET /api/push/vapid-public-key - Récupérer la clé publique VAPID
 */
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

/**
 * POST /api/push/subscribe - Enregistrer une subscription Push
 */
router.post('/subscribe', authenticateAdmin, async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription invalide' });
    }

    const result = await registerPushSubscription(req.user.id, subscription);

    res.json({
      success: true,
      message: 'Subscription enregistrée',
      ...result
    });
  } catch (error) {
    console.error('Erreur enregistrement subscription:', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement' });
  }
});

/**
 * POST /api/push/unsubscribe - Supprimer une subscription Push
 */
router.post('/unsubscribe', authenticateAdmin, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint manquant' });
    }

    const success = await removePushSubscription(req.user.id, endpoint);

    res.json({
      success,
      message: success ? 'Subscription supprimée' : 'Échec de la suppression'
    });
  } catch (error) {
    console.error('Erreur suppression subscription:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

/**
 * GET /api/push/subscriptions - Récupérer les subscriptions de l'utilisateur
 */
router.get('/subscriptions', authenticateAdmin, async (req, res) => {
  try {
    const subscriptions = await getUserSubscriptions(req.user.id);

    res.json({
      subscriptions,
      count: subscriptions.length
    });
  } catch (error) {
    console.error('Erreur récupération subscriptions:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * POST /api/push/test - Envoyer une notification Push de test
 */
router.post('/test', authenticateAdmin, async (req, res) => {
  try {
    const notification = {
      title: 'Test Notification',
      message: 'Ceci est une notification de test',
      type: 'info'
    };

    const result = await sendPushNotification(req.user.id, notification);

    if (result.sent === 0) {
      return res.status(400).json({
        error: 'Aucune subscription active',
        message: 'Vous devez d\'abord activer les notifications Push'
      });
    }

    res.json({
      success: true,
      message: `Notification envoyée à ${result.sent} device(s)`,
      sent: result.sent,
      failed: result.failed
    });
  } catch (error) {
    console.error('Erreur envoi notification test:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi' });
  }
});

export default router;
