import express from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import {
  getUserNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../services/notifications.js';

const router = express.Router();

/**
 * GET /api/notifications - Récupérer toutes les notifications de l'utilisateur
 */
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const notifications = await getUserNotifications(req.user.id, 50);

    res.json({
      notifications,
      unreadCount: notifications.filter(n => !n.is_read).length
    });
  } catch (error) {
    console.error('Erreur récupération notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/notifications/unread - Récupérer les notifications non lues
 */
router.get('/unread', authenticateAdmin, async (req, res) => {
  try {
    const notifications = await getUnreadNotifications(req.user.id);

    res.json({
      notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Erreur récupération notifications non lues:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/notifications/:id/read - Marquer une notification comme lue
 */
router.put('/:id/read', authenticateAdmin, async (req, res) => {
  try {
    await markAsRead(req.params.id, req.user.id);

    res.json({ success: true, message: 'Notification marquée comme lue' });
  } catch (error) {
    console.error('Erreur marquage notification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/notifications/read-all - Marquer toutes les notifications comme lues
 */
router.put('/read-all', authenticateAdmin, async (req, res) => {
  try {
    const count = await markAllAsRead(req.user.id);

    res.json({
      success: true,
      message: `${count} notification(s) marquée(s) comme lue(s)`
    });
  } catch (error) {
    console.error('Erreur marquage toutes notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/notifications/:id - Supprimer une notification
 */
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    await deleteNotification(req.params.id, req.user.id);

    res.json({ success: true, message: 'Notification supprimée' });
  } catch (error) {
    console.error('Erreur suppression notification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
