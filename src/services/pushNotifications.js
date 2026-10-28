/**
 * Notifications push (Expo) — messages des boutiques.
 * La permission n'est demandée qu'au moment utile (premier message envoyé à une boutique),
 * jamais au lancement de l'app.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { messagingApi } from './messaging';

const IS_EXPO_GO = Constants.appOwnership === 'expo';
// expo-notifications plante à l'import dans Expo Go (SDK 53+) : chargé à la demande
export const Notifications = IS_EXPO_GO ? null : require('expo-notifications');
const TOKEN_KEY = 'ihamPushToken';

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel() {
  if (Platform.OS !== 'android' || !Notifications) return;
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages des boutiques',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: '#30A08B',
    sound: 'default',
  });
}

/**
 * Enregistre l'appareil pour les push.
 * ask=false : seulement si la permission est déjà accordée (pas de fenêtre système).
 */
export async function registerDevicePush({ ask = false } = {}) {
  if (!Notifications) return null;
  try {
    await ensureChannel();
    let { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && ask && canAskAgain !== false) {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return null;
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return null;
    await messagingApi.registerPushToken(token);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch (e) {
    // Android sans google-services.json valide : pas de jeton FCM, l'app reste utilisable
    console.log('ℹ️ Push indisponible :', e?.message);
    return null;
  }
}

export async function unregisterDevicePush() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return;
  await messagingApi.unregisterPushToken(token);
  await AsyncStorage.removeItem(TOKEN_KEY);
}
