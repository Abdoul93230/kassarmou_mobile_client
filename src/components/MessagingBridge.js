import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';
import { CommonActions } from '@react-navigation/native';
import { navigationRef } from '../navigation/RootNavigation';
import { useMessagingConnection } from '../services/messaging';
import { Notifications, registerDevicePush } from '../services/pushNotifications';

const handled = new Set(); // une notification n'ouvre sa conversation qu'une fois

/** Ouvre la conversation d'une notification, avec l'accueil puis la liste des messages en dessous */
function openFromNotification(response) {
  const id = response?.notification?.request?.identifier;
  const data = response?.notification?.request?.content?.data;
  if (!id || handled.has(id) || data?.type !== 'store_message' || !data.conversationId) return;
  handled.add(id);
  const go = () => navigationRef.dispatch(CommonActions.reset({
    index: 2,
    routes: [{ name: 'MainTabs' }, { name: 'Messages' }, { name: 'StoreChat', params: { conversationId: String(data.conversationId) } }],
  }));
  if (navigationRef.isReady()) go();
  else setTimeout(() => navigationRef.isReady() && go(), 800);
}

/**
 * Connexion temps réel de la messagerie + notifications push.
 * Monté une fois, sous le NavigationContainer.
 */
export default function MessagingBridge() {
  const user = useSelector((s) => s.auth.user);
  const userId = user?.id || user?._id || null;

  useMessagingConnection(userId);

  // Jeton push : seulement si la permission est déjà donnée (sinon demandée au 1er message).
  // Refait au retour au premier plan : permission activée entre-temps dans les réglages.
  useEffect(() => {
    if (!userId) return undefined;
    registerDevicePush({ ask: false });
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') registerDevicePush({ ask: false }); });
    return () => sub.remove();
  }, [userId]);

  useEffect(() => {
    if (!Notifications || !userId) return undefined;
    // App fermée : la notification qui l'a ouverte
    Notifications.getLastNotificationResponseAsync()
      .then(openFromNotification)
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(openFromNotification);
    return () => sub.remove();
  }, [userId]);

  return null;
}
