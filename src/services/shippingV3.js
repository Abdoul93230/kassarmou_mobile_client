/**
 * Livraison v3 (mobile) : zones (liste complète, recherche locale), position, devis du panier.
 * Même calcul que celui appliqué à la commande : le prix affiché est le prix facturé.
 * Équivalent de src/lib/shippingV3.ts côté web.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../config/api';

const CACHE_KEY = 'zonesV3';
const ZONE_KEY = 'deliveryZoneV3';
const CACHE_TTL = 10 * 60 * 1000;
let memo = null;
let pending = null;

/** Toutes les zones actives (une requête, cache mémoire + disque 10 min) */
export async function getZones({ force = false } = {}) {
  if (!force && memo && Date.now() - memo.at < CACHE_TTL) return memo.data;
  if (!force && !memo) {
    try {
      const cached = JSON.parse((await AsyncStorage.getItem(CACHE_KEY)) || 'null');
      if (cached?.data?.length && Date.now() - cached.at < CACHE_TTL) {
        memo = cached;
        return cached.data;
      }
    } catch {}
  }
  if (!pending) {
    pending = apiClient
      .get('/api/shipping-v3/zones', { timeout: 12000 })
      .then((r) => {
        const data = (r.data?.data || []).map((z) => ({ ...z, _id: String(z._id), parent: z.parent ? String(z.parent) : null }));
        memo = { at: Date.now(), data };
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(memo)).catch(() => {});
        return data;
      })
      .finally(() => { pending = null; });
  }
  return pending;
}

export const normalize = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** « Yantala Bas » + « Commune 1, Niamey » */
export function zoneLabel(z) {
  const parts = String(z?.fullPath || z?.name || '').split(' > ');
  const context = parts.slice(1, -1).reverse().join(', ');
  return { title: z?.name || '', subtitle: context || (parts[0] !== z?.name ? parts[0] : '') };
}

const TYPE_RANK = { district: 0, city: 1, region: 2, country: 3 };

/** Recherche locale : nom > mot > chemin ; Niger d'abord ; jamais un pays seul */
export function searchZones(zones, query, limit = 40) {
  const q = normalize(query);
  const usable = (zones || []).filter((z) => z.type !== 'country');
  if (!q) {
    return usable
      .filter((z) => z.type === 'city')
      .sort((a, b) => Number(!a.fullPath.startsWith('Niger > Niamey')) - Number(!b.fullPath.startsWith('Niger > Niamey')) || a.fullPath.localeCompare(b.fullPath, 'fr'))
      .slice(0, limit);
  }
  const scored = [];
  for (const z of usable) {
    const names = [z.name, ...(z.aliases || [])].map(normalize);
    let s = -1;
    if (names.some((n) => n === q)) s = 100;
    else if (names.some((n) => n.startsWith(q))) s = 80;
    else if (names.some((n) => n.split(' ').some((w) => w.startsWith(q)))) s = 60;
    else if (normalize(z.fullPath).includes(q)) s = 30;
    if (s < 0) continue;
    if (z.fullPath.startsWith('Niger')) s += 10;
    s -= TYPE_RANK[z.type] || 0;
    scored.push({ z, s });
  }
  return scored.sort((a, b) => b.s - a.s || a.z.fullPath.localeCompare(b.z.fullPath, 'fr')).slice(0, limit).map((x) => x.z);
}

const toRad = (d) => (d * Math.PI) / 180;
export function distanceKm(a, b) {
  const h = Math.sin(toRad(b.lat - a.lat) / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Zone géolocalisée la plus proche (quartier si renseigné, sinon ville) — null au-delà de 40 km */
export function nearestZone(zones, pos) {
  let best = null;
  for (const z of zones || []) {
    if (!z.center || z.type === 'country') continue;
    // Région : simple repli quand aucune ville / commune géolocalisée n'est plus proche
    const d = distanceKm(pos, z.center) - (z.type === 'district' ? 0.5 : 0) + (z.type === 'region' ? 8 : 0);
    if (!best || d < best.d) best = { z, d };
  }
  return best && best.d <= 40 ? best.z : null;
}

/**
 * Position de l'appareil. Le module natif peut manquer dans un ancien build :
 * on renvoie alors une erreur « unavailable » au lieu de planter.
 */
export async function getDevicePosition() {
  let Location;
  try {
    // eslint-disable-next-line global-require
    Location = require('expo-location');
  } catch {
    throw Object.assign(new Error('unavailable'), { code: 'unavailable' });
  }
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') throw Object.assign(new Error('denied'), { code: 'denied' });
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy || 0) };
  } catch (e) {
    if (e.code === 'denied') throw e;
    throw Object.assign(new Error('unavailable'), { code: 'unavailable' });
  }
}

// ─── Zone mémorisée ──────────────────────────────────────────────────────────

export async function rememberZone(z) {
  try {
    if (z) await AsyncStorage.setItem(ZONE_KEY, JSON.stringify(z));
    else await AsyncStorage.removeItem(ZONE_KEY);
  } catch {}
}

/** Zone mémorisée, revalidée contre la liste actuelle (une zone peut avoir été fusionnée/désactivée) */
export async function getRememberedZone() {
  try {
    const z = JSON.parse((await AsyncStorage.getItem(ZONE_KEY)) || 'null');
    if (!z?._id) return null;
    const list = await getZones().catch(() => null);
    if (!list) return z;
    return list.find((x) => x._id === z._id) || null;
  } catch {
    return null;
  }
}

// ─── Devis ───────────────────────────────────────────────────────────────────

export async function quoteCart(destinationZoneId, items) {
  const r = await apiClient.post('/api/shipping-v3/quote', { destinationZoneId, items }, { timeout: 12000 });
  return r.data.data;
}

/** Texte des frais d'un colis */
export function parcelFeeText(p, format) {
  if (!p) return '';
  if (!p.deliverable) return p.quoteRequired ? 'Sur devis' : 'Non livrable';
  if (p.free) return 'Offerte';
  return format(p.fee || 0);
}

// ─── Ville d'expédition des boutiques (badge « 📍 ville ») ───────────────────

const originCache = new Map();
const originWaiters = new Map();
let originTimer = null;

/** Regroupe les demandes de toutes les cartes affichées en un seul appel (fenêtre de 40 ms) */
export function loadSellerOrigin(sellerId) {
  if (!sellerId || !/^[a-f\d]{24}$/i.test(sellerId)) return Promise.resolve(null);
  if (originCache.has(sellerId)) return Promise.resolve(originCache.get(sellerId));
  return new Promise((resolve) => {
    originWaiters.set(sellerId, [...(originWaiters.get(sellerId) || []), resolve]);
    if (originTimer) return;
    originTimer = setTimeout(async () => {
      originTimer = null;
      const batch = [...originWaiters.entries()];
      originWaiters.clear();
      const ids = batch.map(([id]) => id);
      let data = {};
      try {
        for (let i = 0; i < ids.length; i += 200) {
          const r = await apiClient.get('/api/shipping-v3/origins', { params: { ids: ids.slice(i, i + 200).join(',') }, timeout: 10000 });
          data = { ...data, ...(r.data?.data || {}) };
        }
      } catch {}
      for (const [id, resolvers] of batch) {
        const v = data[id] ?? null;
        if (id in data) originCache.set(id, v);
        resolvers.forEach((fn) => fn(v));
      }
    }, 40);
  });
}

/** Identifiant de la boutique d'un produit (Clefournisseur peuplé ou brut) */
export function sellerIdOf(product) {
  const c = product?.Clefournisseur;
  const id = (c && typeof c === 'object' ? c._id : c) || product?.createdBy || null;
  return id ? String(id) : null;
}
