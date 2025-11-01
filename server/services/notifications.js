import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';

/**
 * Service de gestion des notifications
 */

/**
 * Créer une nouvelle notification
 */
export async function createNotification({ userId, electionId, type, title, message }) {
  try {
    const id = uuidv4();

    await db.run(`
      INSERT INTO notifications (id, user_id, election_id, type, title, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [id, userId, electionId || null, type, title, message]);

    return {
      id,
      user_id: userId,
      election_id: electionId,
      type,
      title,
      message,
      is_read: false,
      created_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erreur création notification:', error);
    throw error;
  }
}

/**
 * Récupérer les notifications d'un utilisateur
 */
export async function getUserNotifications(userId, limit = 50) {
  try {
    const notifications = await db.all(`
      SELECT
        n.*,
        e.title as election_title
      FROM notifications n
      LEFT JOIN elections e ON n.election_id = e.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT ?
    `, [userId, limit]);

    return notifications;
  } catch (error) {
    console.error('Erreur récupération notifications:', error);
    throw error;
  }
}

/**
 * Récupérer les notifications non lues
 */
export async function getUnreadNotifications(userId) {
  try {
    const notifications = await db.all(`
      SELECT
        n.*,
        e.title as election_title
      FROM notifications n
      LEFT JOIN elections e ON n.election_id = e.id
      WHERE n.user_id = ? AND n.is_read = false
      ORDER BY n.created_at DESC
    `, [userId]);

    return notifications;
  } catch (error) {
    console.error('Erreur récupération notifications non lues:', error);
    throw error;
  }
}

/**
 * Marquer une notification comme lue
 */
export async function markAsRead(notificationId, userId) {
  try {
    await db.run(`
      UPDATE notifications
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [notificationId, userId]);

    return true;
  } catch (error) {
    console.error('Erreur marquage notification lue:', error);
    throw error;
  }
}

/**
 * Marquer toutes les notifications comme lues
 */
export async function markAllAsRead(userId) {
  try {
    const result = await db.run(`
      UPDATE notifications
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND is_read = false
    `, [userId]);

    return result.changes;
  } catch (error) {
    console.error('Erreur marquage toutes notifications lues:', error);
    throw error;
  }
}

/**
 * Supprimer une notification
 */
export async function deleteNotification(notificationId, userId) {
  try {
    await db.run(`
      DELETE FROM notifications
      WHERE id = ? AND user_id = ?
    `, [notificationId, userId]);

    return true;
  } catch (error) {
    console.error('Erreur suppression notification:', error);
    throw error;
  }
}

/**
 * Supprimer les anciennes notifications (> 30 jours)
 */
export async function cleanOldNotifications() {
  try {
    const result = await db.run(`
      DELETE FROM notifications
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
    `);

    console.log(`${result.changes} anciennes notifications supprimées`);
    return result.changes;
  } catch (error) {
    console.error('Erreur nettoyage notifications:', error);
    throw error;
  }
}

/**
 * Créer une notification pour tous les admins d'une élection
 */
export async function notifyElectionAdmins(electionId, type, title, message) {
  try {
    const election = await db.get('SELECT created_by FROM elections WHERE id = ?', [electionId]);

    if (election) {
      await createNotification({
        userId: election.created_by,
        electionId,
        type,
        title,
        message
      });
    }
  } catch (error) {
    console.error('Erreur notification admin élection:', error);
  }
}

/**
 * Notifications prédéfinies pour événements courants
 */
export const NotificationTemplates = {
  VOTE_RECEIVED: (electionTitle) => ({
    type: 'success',
    title: 'Vote reçu',
    message: `Un nouveau vote a été enregistré pour "${electionTitle}"`
  }),

  QUORUM_REACHED: (electionTitle) => ({
    type: 'success',
    title: 'Quorum atteint',
    message: `Le quorum a été atteint pour "${electionTitle}"`
  }),

  ELECTION_STARTED: (electionTitle) => ({
    type: 'info',
    title: 'Élection démarrée',
    message: `L'élection "${electionTitle}" a démarré automatiquement`
  }),

  ELECTION_CLOSED: (electionTitle) => ({
    type: 'info',
    title: 'Élection clôturée',
    message: `L'élection "${electionTitle}" a été clôturée`
  }),

  REMINDERS_SENT: (count, electionTitle) => ({
    type: 'success',
    title: 'Rappels envoyés',
    message: `${count} rappel(s) envoyé(s) pour "${electionTitle}"`
  }),

  VOTERS_ADDED: (count, electionTitle) => ({
    type: 'success',
    title: 'Électeurs ajoutés',
    message: `${count} électeur(s) ajouté(s) à "${electionTitle}"`
  }),

  ERROR_OCCURRED: (message) => ({
    type: 'error',
    title: 'Erreur',
    message
  })
};
