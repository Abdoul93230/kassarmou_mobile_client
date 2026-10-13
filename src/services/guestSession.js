/**
 * Commande sans compte (mobile) : session invité liée au numéro, code SMS seulement
 * quand c'est nécessaire, suivi partageable, création du compte après coup.
 * Équivalent de src/lib/guestSession.ts côté web.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share } from 'react-native';
import apiClient from '../config/api';
import { SITE_URL } from '../config/env';

const KEY = 'ihamGuestSession';
export const OFFLINE_PAYMENTS = ['payé à la livraison', 'payé par téléphone'];

const b64 = (s) => {
  try {
    // eslint-disable-next-line no-undef
    return typeof atob === 'function' ? atob(s) : null;
  } catch {
    return null;
  }
};
const expOf = (token) => {
  try {
    const raw = b64(String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
    return raw ? Number(JSON.parse(raw).exp || 0) * 1000 : Number.MAX_SAFE_INTEGER;
  } catch {
    return 0;
  }
};

export async function getGuestSession() {
  try {
    const s = JSON.parse((await AsyncStorage.getItem(KEY)) || 'null');
    if (!s?.token || expOf(s.token) < Date.now() + 60000) return null;
    return s;
  } catch {
    return null;
  }
}

export const saveGuestSession = (s) => AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
export const clearGuestSession = () => AsyncStorage.removeItem(KEY).catch(() => {});

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
const fromApi = (d, fallback) => ({
  token: d.token,
  verified: !!d.verified,
  phone: d.user?.phoneNumber || fallback.phone,
  name: d.user?.name || fallback.name,
  userId: d.user?.id,
});

/** Session invité pour ce numéro, sans SMS si possible (session vérifiée réutilisée 90 jours) */
export async function ensureGuestSession(phone, name) {
  const current = await getGuestSession();
  if (current && current.phone === phone) return { session: current };
  const r = await apiClient.post('/api/guest/session', { phone, name });
  const d = r.data?.data || {};
  if (d.accountExists) return { accountExists: true };
  const session = fromApi(d, { phone, name });
  await saveGuestSession(session);
  return { session };
}

export async function sendGuestOtp(phone, name) {
  const r = await apiClient.post('/api/guest/send-otp', { phone, name });
  return r.data?.data || {};
}

export async function verifyGuestOtp(phone, code, name = '') {
  const r = await apiClient.post('/api/guest/verify-otp', { phone, code });
  const session = fromApi(r.data?.data || {}, { phone, name });
  await saveGuestSession(session);
  return session;
}

/** Crée le compte depuis la session vérifiée (aucun nouveau SMS) */
export async function claimGuestAccount(password, name) {
  const s = await getGuestSession();
  if (!s?.verified) throw new Error('Vérifiez d’abord votre numéro.');
  const r = await apiClient.post('/api/guest/claim', { password, name }, auth(s.token));
  return { ...r.data, phone: s.phone };
}

export async function fetchGuestOrders() {
  const s = await getGuestSession();
  if (!s?.verified) throw new Error('not-verified');
  const r = await apiClient.get('/api/guest/orders', auth(s.token));
  return r.data?.data || [];
}

export async function fetchTracking(reference, k) {
  const r = await apiClient.get(`/api/track/${encodeURIComponent(reference)}`, { params: { k } });
  return r.data?.data;
}

export async function fetchShareLink(orderId) {
  const r = await apiClient.get(`/api/orders/${orderId}/share`);
  return r.data?.data?.url;
}

export const trackingUrl = (reference, token) =>
  `${String(SITE_URL || 'https://ihambaobab.com').replace(/\/+$/, '')}/suivi/${encodeURIComponent(reference)}?k=${token}`;

export async function shareTracking(url) {
  try {
    await Share.share({ message: `Suivez ma commande Ihambaobab : ${url}` });
  } catch {}
}
