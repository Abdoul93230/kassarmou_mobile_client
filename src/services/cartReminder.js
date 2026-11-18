import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notifications } from './pushNotifications';

const KEY = 'ihamCartReminderId';
const DELAY_S = 20 * 3600;

async function cancel() {
  const id = await AsyncStorage.getItem(KEY).catch(() => null);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await AsyncStorage.removeItem(KEY).catch(() => {});
  }
}

/**
 * Reprogramme le rappel à chaque changement du panier ; l'annule quand il est vide (ou commandé).
 * Jamais de demande de permission ici : sans permission, il ne se passe rien.
 */
export async function syncCartReminder(count, firstName) {
  if (!Notifications) return;
  try {
    await cancel();
    if (!count) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Votre panier vous attend 🛒',
        body: count > 1
          ? `${count} articles sont encore dans votre panier${firstName ? `, ${firstName}` : ''}. Commandez avant la rupture de stock.`
          : `Un article est encore dans votre panier${firstName ? `, ${firstName}` : ''}. Commandez avant la rupture de stock.`,
        data: { type: 'cart' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: DELAY_S },
    });
    await AsyncStorage.setItem(KEY, id);
  } catch { /* le rappel est un plus, jamais un blocage */ }
}
