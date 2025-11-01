import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';
import {
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  requestNotificationPermission as requestBrowserPermission
} from '../utils/webPush';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const socketRef = useRef(null);

  // Récupérer les notifications depuis l'API (initial load)
  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.get('/notifications');
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Erreur récupération notifications:', error);
    }
  }, []);

  // Initialiser WebSocket et écouter les notifications temps réel
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Créer la connexion WebSocket
    const socket = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current = socket;

    // Événement: Connexion réussie
    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      fetchNotifications(); // Charger les notifications initiales
    });

    // Événement: Déconnexion
    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    // Événement: Nouvelle notification temps réel
    socket.on('notification', (notification) => {
      console.log('📬 New notification received:', notification);

      // Ajouter la notification en tête de liste
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Afficher une notification browser native (si permission accordée)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id
        });
      }
    });

    // Événement: Notification marquée comme lue (depuis un autre device)
    socket.on('notification:marked-read', (notificationId) => {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    // Événement: Mise à jour d'élection
    socket.on('election:update', (data) => {
      console.log('📊 Election update:', data);
      // Rafraîchir les données si nécessaire
    });

    // Gestion d'erreurs
    socket.on('connect_error', (error) => {
      console.error('⚠️ WebSocket connection error:', error.message);
      setIsConnected(false);
    });

    // Nettoyage à la déconnexion du composant
    return () => {
      console.log('🔌 Disconnecting WebSocket...');
      socket.disconnect();
    };
  }, [fetchNotifications]);

  // Marquer une notification comme lue
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Notifier les autres devices via WebSocket
      if (socketRef.current?.connected) {
        socketRef.current.emit('notification:read', notificationId);
      }
    } catch (error) {
      console.error('Erreur marquage notification:', error);
    }
  }, []);

  // Marquer toutes les notifications comme lues
  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Erreur marquage toutes notifications:', error);
    }
  }, []);

  // Supprimer une notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      // Mettre à jour le compteur si la notification était non lue
      const wasUnread = !notifications.find(n => n.id === notificationId)?.is_read;
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Erreur suppression notification:', error);
    }
  }, [notifications]);

  // Ajouter une notification locale (pour les toasts temporaires)
  const addLocalNotification = useCallback((notification) => {
    const localNotif = {
      id: `local-${Date.now()}`,
      ...notification,
      is_read: false,
      created_at: new Date().toISOString(),
      isLocal: true // Flag pour identifier les notifications locales
    };
    setNotifications(prev => [localNotif, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Auto-supprimer les notifications locales après 5 secondes
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== localNotif.id));
    }, 5000);
  }, []);

  // Rejoindre une room d'élection pour recevoir les mises à jour
  const joinElection = useCallback((electionId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join:election', electionId);
      console.log(`📊 Joined election room: ${electionId}`);
    }
  }, []);

  // Quitter une room d'élection
  const leaveElection = useCallback((electionId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave:election', electionId);
      console.log(`👋 Left election room: ${electionId}`);
    }
  }, []);

  // Demander la permission pour les notifications browser
  const requestNotificationPermission = useCallback(async () => {
    return await requestBrowserPermission();
  }, []);

  // Activer les notifications Push
  const enablePushNotifications = useCallback(async () => {
    try {
      // Demander la permission
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        throw new Error('Permission refusée');
      }

      // Récupérer la clé publique VAPID
      const { data: { publicKey } } = await api.get('/push/vapid-public-key');

      // S'abonner aux notifications Push
      const subscription = await subscribeToPush(publicKey);

      // Enregistrer la subscription sur le serveur
      await api.post('/push/subscribe', {
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.toJSON().keys.p256dh,
            auth: subscription.toJSON().keys.auth
          }
        }
      });

      setIsPushEnabled(true);
      console.log('✅ Push notifications enabled');
      return true;
    } catch (error) {
      console.error('❌ Error enabling push notifications:', error);
      setIsPushEnabled(false);
      return false;
    }
  }, [requestNotificationPermission]);

  // Désactiver les notifications Push
  const disablePushNotifications = useCallback(async () => {
    try {
      const subscription = await getCurrentSubscription();

      if (subscription) {
        // Supprimer du serveur
        await api.post('/push/unsubscribe', {
          endpoint: subscription.endpoint
        });

        // Désabonner localement
        await unsubscribeFromPush();
      }

      setIsPushEnabled(false);
      console.log('✅ Push notifications disabled');
      return true;
    } catch (error) {
      console.error('❌ Error disabling push notifications:', error);
      return false;
    }
  }, []);

  // Vérifier si Push est activé au chargement
  useEffect(() => {
    const checkPushStatus = async () => {
      const subscription = await getCurrentSubscription();
      setIsPushEnabled(subscription !== null);
    };

    checkPushStatus();
  }, []);

  const value = {
    notifications,
    unreadCount,
    loading,
    isConnected,
    isPushEnabled,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addLocalNotification,
    joinElection,
    leaveElection,
    requestNotificationPermission,
    enablePushNotifications,
    disablePushNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook personnalisé pour utiliser le contexte
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications doit être utilisé dans un NotificationProvider');
  }
  return context;
}
