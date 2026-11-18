import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../config/api';
import { visitorId } from './productViews';

/**
 * Mesure du tunnel d'achat : vue d'article → panier → commande → paiement → achat.
 * Aucune donnée personnelle. Les événements partent par lots, sans jamais bloquer ni faire échouer l'écran.
 */
const SOURCE_KEY = 'ihamSource';
const queue = [];
let timer = null;
let sending = false;

/** D'où vient le visiteur (lien de parrainage, campagne) : gardé pour toutes ses visites */
export const setSource = (source) => {
  if (source) AsyncStorage.setItem(SOURCE_KEY, String(source).slice(0, 40)).catch(() => {});
};

async function flush() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (sending || !queue.length) return;
  sending = true;
  const batch = queue.splice(0, 20);
  try {
    const [vid, source] = await Promise.all([visitorId(), AsyncStorage.getItem(SOURCE_KEY).catch(() => null)]);
    await apiClient.post('/api/events', { events: batch, platform: Platform.OS === 'ios' ? 'ios' : 'android', source: source || undefined }, {
      headers: { 'x-visitor-id': vid }, timeout: 8000, _silent: true,
    });
  } catch {
    // Hors ligne : on réessaiera au prochain événement (sans grossir indéfiniment)
    if (queue.length < 60) queue.unshift(...batch);
  } finally {
    sending = false;
  }
}

/** track('add_to_cart', { productId, value }) */
export function track(name, props = {}) {
  try {
    queue.push({ name, ts: Date.now(), ...props });
    if (queue.length >= 10) flush();
    else if (!timer) timer = setTimeout(flush, 6000);
  } catch { /* la mesure ne doit jamais gêner */ }
}

AppState.addEventListener('change', (s) => { if (s !== 'active') flush(); });
