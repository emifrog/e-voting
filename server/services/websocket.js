import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createNotification, NotificationTemplates } from './notifications.js';
import { sendPushNotification } from './webPush.js';

let io = null;

/**
 * Initialiser le serveur WebSocket
 * @param {http.Server} server - Serveur HTTP Express
 */
export function initializeWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.APP_URL
        : ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true
    },
    // Configuration pour performances optimales
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'] // WebSocket prioritaire, polling en fallback
  });

  // Middleware d'authentification
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Gestion des connexions
  io.on('connection', (socket) => {
    console.log(`✅ WebSocket: User ${socket.userId} connected (${socket.id})`);

    // Joindre la room personnelle de l'utilisateur
    socket.join(`user:${socket.userId}`);

    // Événement: Utilisateur rejoint une élection spécifique
    socket.on('join:election', (electionId) => {
      socket.join(`election:${electionId}`);
      console.log(`📊 User ${socket.userId} joined election ${electionId}`);
    });

    // Événement: Utilisateur quitte une élection
    socket.on('leave:election', (electionId) => {
      socket.leave(`election:${electionId}`);
      console.log(`👋 User ${socket.userId} left election ${electionId}`);
    });

    // Événement: Marquer une notification comme lue (broadcast aux autres devices)
    socket.on('notification:read', (notificationId) => {
      socket.to(`user:${socket.userId}`).emit('notification:marked-read', notificationId);
    });

    // Événement: Déconnexion
    socket.on('disconnect', (reason) => {
      console.log(`❌ WebSocket: User ${socket.userId} disconnected (${reason})`);
    });

    // Gestion d'erreurs
    socket.on('error', (error) => {
      console.error(`⚠️ WebSocket error for user ${socket.userId}:`, error);
    });
  });

  console.log('🚀 WebSocket server initialized');
  return io;
}

/**
 * Envoyer une notification temps réel à un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {object} notification - Notification à envoyer
 */
export async function sendRealtimeNotification(userId, notification) {
  if (!io) {
    console.warn('⚠️ WebSocket not initialized, skipping realtime notification');
    return;
  }

  // Vérifier si l'utilisateur est connecté via WebSocket
  const userSockets = await io.in(`user:${userId}`).fetchSockets();
  const isConnected = userSockets.length > 0;

  if (isConnected) {
    // Utilisateur connecté: envoyer via WebSocket
    io.to(`user:${userId}`).emit('notification', notification);
    console.log(`✅ WebSocket notification sent to user ${userId}`);
  } else {
    // Utilisateur déconnecté: envoyer via Push API
    console.log(`📱 User ${userId} offline, sending Push notification`);
    try {
      const pushResult = await sendPushNotification(userId, notification);
      if (pushResult.sent > 0) {
        console.log(`✅ Push notification sent to ${pushResult.sent} device(s)`);
      }
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
    }
  }

  // Persister en base de données dans tous les cas
  try {
    await createNotification({
      userId,
      electionId: notification.election_id,
      type: notification.type,
      title: notification.title,
      message: notification.message
    });
  } catch (error) {
    console.error('Error persisting notification:', error);
  }
}

/**
 * Notifier tous les utilisateurs d'une élection
 * @param {string} electionId - ID de l'élection
 * @param {object} notification - Notification à envoyer
 */
export function notifyElectionParticipants(electionId, notification) {
  if (!io) {
    console.warn('⚠️ WebSocket not initialized');
    return;
  }

  io.to(`election:${electionId}`).emit('election:update', notification);
}

/**
 * Notifier un événement de vote
 * @param {string} electionId - ID de l'élection
 * @param {string} adminUserId - ID de l'admin créateur
 */
export async function notifyVoteReceived(electionId, adminUserId, electionTitle) {
  const notification = {
    ...NotificationTemplates.VOTE_RECEIVED(electionTitle),
    election_id: electionId
  };

  await sendRealtimeNotification(adminUserId, notification);

  // Aussi notifier via l'élection (pour les observateurs)
  notifyElectionParticipants(electionId, {
    type: 'vote_received',
    message: 'Nouveau vote reçu'
  });
}

/**
 * Notifier quorum atteint
 * @param {string} electionId - ID de l'élection
 * @param {string} adminUserId - ID de l'admin
 * @param {string} electionTitle - Titre de l'élection
 */
export async function notifyQuorumReached(electionId, adminUserId, electionTitle) {
  const notification = {
    ...NotificationTemplates.QUORUM_REACHED(electionTitle),
    election_id: electionId
  };

  await sendRealtimeNotification(adminUserId, notification);
  notifyElectionParticipants(electionId, {
    type: 'quorum_reached',
    message: 'Quorum atteint!'
  });
}

/**
 * Notifier début d'élection
 * @param {string} electionId - ID de l'élection
 * @param {string} adminUserId - ID de l'admin
 * @param {string} electionTitle - Titre de l'élection
 */
export async function notifyElectionStarted(electionId, adminUserId, electionTitle) {
  const notification = {
    ...NotificationTemplates.ELECTION_STARTED(electionTitle),
    election_id: electionId
  };

  await sendRealtimeNotification(adminUserId, notification);
}

/**
 * Notifier clôture d'élection
 * @param {string} electionId - ID de l'élection
 * @param {string} adminUserId - ID de l'admin
 * @param {string} electionTitle - Titre de l'élection
 */
export async function notifyElectionClosed(electionId, adminUserId, electionTitle) {
  const notification = {
    ...NotificationTemplates.ELECTION_CLOSED(electionTitle),
    election_id: electionId
  };

  await sendRealtimeNotification(adminUserId, notification);
  notifyElectionParticipants(electionId, {
    type: 'election_closed',
    message: 'Élection clôturée'
  });
}

/**
 * Notifier ajout d'électeurs
 * @param {string} electionId - ID de l'élection
 * @param {string} adminUserId - ID de l'admin
 * @param {number} count - Nombre d'électeurs ajoutés
 * @param {string} electionTitle - Titre de l'élection
 */
export async function notifyVotersAdded(electionId, adminUserId, count, electionTitle) {
  const notification = {
    ...NotificationTemplates.VOTERS_ADDED(count, electionTitle),
    election_id: electionId
  };

  await sendRealtimeNotification(adminUserId, notification);
}

/**
 * Notifier rappels envoyés
 * @param {string} electionId - ID de l'élection
 * @param {string} adminUserId - ID de l'admin
 * @param {number} count - Nombre de rappels
 * @param {string} electionTitle - Titre de l'élection
 */
export async function notifyRemindersSent(electionId, adminUserId, count, electionTitle) {
  const notification = {
    ...NotificationTemplates.REMINDERS_SENT(count, electionTitle),
    election_id: electionId
  };

  await sendRealtimeNotification(adminUserId, notification);
}

/**
 * Obtenir le nombre de connexions actives
 */
export function getActiveConnections() {
  if (!io) return 0;
  return io.engine.clientsCount;
}

/**
 * Obtenir les statistiques WebSocket
 */
export function getWebSocketStats() {
  if (!io) return null;

  return {
    totalConnections: io.engine.clientsCount,
    rooms: Array.from(io.sockets.adapter.rooms.keys()),
    sockets: Array.from(io.sockets.sockets.keys())
  };
}

export default {
  initializeWebSocket,
  sendRealtimeNotification,
  notifyElectionParticipants,
  notifyVoteReceived,
  notifyQuorumReached,
  notifyElectionStarted,
  notifyElectionClosed,
  notifyVotersAdded,
  notifyRemindersSent,
  getActiveConnections,
  getWebSocketStats
};
