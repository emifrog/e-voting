/**
 * Utilitaires pour Web Push API
 * Gère l'enregistrement des subscriptions et l'envoi de notifications push
 */

/**
 * Convertir une clé VAPID publique en Uint8Array
 * @param {string} base64String - Clé publique VAPID en base64
 * @returns {Uint8Array}
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Enregistrer le Service Worker
 * @returns {Promise<ServiceWorkerRegistration>}
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker not supported');
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('✅ Service Worker registered:', registration.scope);

    // Attendre que le Service Worker soit actif
    if (registration.installing) {
      await new Promise((resolve) => {
        registration.installing.addEventListener('statechange', (e) => {
          if (e.target.state === 'activated') {
            resolve();
          }
        });
      });
    }

    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    throw error;
  }
}

/**
 * Demander la permission pour les notifications
 * @returns {Promise<boolean>}
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('⚠️ Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('⚠️ Notification permission denied');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * S'abonner aux notifications Push
 * @param {string} vapidPublicKey - Clé publique VAPID du serveur
 * @returns {Promise<PushSubscription>}
 */
export async function subscribeToPush(vapidPublicKey) {
  // Vérifier le support Push API
  if (!('PushManager' in window)) {
    throw new Error('Push notifications not supported');
  }

  // Demander la permission
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    throw new Error('Notification permission not granted');
  }

  // Enregistrer le Service Worker
  const registration = await registerServiceWorker();

  // Vérifier s'il existe déjà une subscription
  let subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    console.log('✅ Existing push subscription found');
    return subscription;
  }

  // Créer une nouvelle subscription
  try {
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    console.log('✅ New push subscription created');
    return subscription;
  } catch (error) {
    console.error('❌ Push subscription failed:', error);
    throw error;
  }
}

/**
 * Se désabonner des notifications Push
 * @returns {Promise<boolean>}
 */
export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      console.log('✅ Push subscription removed');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Unsubscribe failed:', error);
    return false;
  }
}

/**
 * Obtenir la subscription actuelle
 * @returns {Promise<PushSubscription|null>}
 */
export async function getCurrentSubscription() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('❌ Get subscription failed:', error);
    return null;
  }
}

/**
 * Vérifier si les notifications Push sont supportées et activées
 * @returns {Promise<boolean>}
 */
export async function isPushSupported() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Tester une notification locale (sans serveur Push)
 * @param {string} title - Titre de la notification
 * @param {object} options - Options de la notification
 */
export async function showTestNotification(title, options = {}) {
  const hasPermission = await requestNotificationPermission();

  if (!hasPermission) {
    throw new Error('Notification permission not granted');
  }

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body: options.body || 'Test notification',
      icon: options.icon || '/favicon.ico',
      badge: options.badge || '/favicon.ico',
      tag: options.tag || 'test',
      requireInteraction: options.requireInteraction || false,
      vibrate: [200, 100, 200],
      data: options.data || {},
      ...options
    });
  } else {
    new Notification(title, options);
  }
}

export default {
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  isPushSupported,
  showTestNotification
};
