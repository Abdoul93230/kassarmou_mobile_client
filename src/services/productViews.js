import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../config/api';

const KEY = 'ihamVisitorId';
let cached = null;

/** Identifiant anonyme de l'appareil (une vue par personne et par jour côté serveur) */
async function visitorId() {
  if (cached) return cached;
  try {
    cached = await AsyncStorage.getItem(KEY);
    if (!cached) {
      cached = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      await AsyncStorage.setItem(KEY, cached);
    }
  } catch {
    cached = cached || `tmp-${Math.random().toString(36).slice(2, 12)}`;
  }
  return cached;
}

/** Enregistre la visite d'un article ; renvoie le nombre de personnes l'ayant vu sur 7 jours */
export async function trackProductView(productId) {
  if (!productId) return 0;
  try {
    const r = await apiClient.post(`/productView/${productId}`, {}, { headers: { 'x-visitor-id': await visitorId() }, timeout: 8000 });
    return Number(r.data?.weekViewers) || 0;
  } catch {
    return 0;
  }
}

/** Seuil d'affichage public : en dessous, le chiffre ferait « boutique vide » */
export const VIEWERS_MIN = 10;
