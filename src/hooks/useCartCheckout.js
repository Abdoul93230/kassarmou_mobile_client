import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import apiClient from '../config/api';
import { groupByStore, originalPrice, unitPrice } from '../utils/cart';

const ZONE_KEY = 'deliveryZone';
const FALLBACK = { fixedCost: 1000, costPerKg: 250 };

// Helpers purs : voir utils/cart.js (ré-exportés pour compatibilité)
export { storeIdOf, unitPrice, originalPrice, itemWeight, availableStock, groupByStore } from '../utils/cart';

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Toute la logique panier → checkout : zone de livraison (mémorisée), frais de port
 * par boutique (calculés en parallèle), code promo (validé côté serveur), totaux.
 */
export default function useCartCheckout(articles, user) {
  const [zone, setZoneState] = useState(null);
  const [zoneReady, setZoneReady] = useState(false);
  const [shipping, setShipping] = useState({}); // { [storeId]: { totalCost, estimated } }
  const [shippingLoading, setShippingLoading] = useState(false);
  const [promo, setPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const calcId = useRef(0);

  const groups = useMemo(() => groupByStore(articles), [articles]);
  const groupList = useMemo(() => Object.values(groups), [groups]);
  const itemCount = useMemo(() => (articles || []).reduce((s, a) => s + (Number(a.quantite) || 0), 0), [articles]);
  const subtotal = useMemo(() => (articles || []).reduce((s, a) => s + unitPrice(a) * (Number(a.quantite) || 0), 0), [articles]);
  const savings = useMemo(
    () => (articles || []).reduce((s, a) => s + ((originalPrice(a) || unitPrice(a)) - unitPrice(a)) * (Number(a.quantite) || 0), 0),
    [articles],
  );

  // ── Zone : mémorisée, sinon détectée (IP) une seule fois ──
  const setZone = useCallback((z) => {
    setZoneState(z);
    if (z) AsyncStorage.setItem(ZONE_KEY, JSON.stringify(z)).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(ZONE_KEY);
        if (saved) {
          if (!cancelled) setZoneState(JSON.parse(saved));
          return;
        }
        const ip = await axios.get('https://ifconfig.me/ip', { timeout: 5000 });
        const geo = await apiClient.get('/proxy/ip-api', { headers: { 'Client-IP': ip.data }, timeout: 8000 });
        for (const q of [geo.data?.regionName || 'Niamey', geo.data?.country || 'Niger']) {
          const r = await apiClient.get('/api/shipping2/zones/search', { params: { q, limit: 1 } });
          const found = r.data?.success && r.data?.data?.[0];
          if (found) {
            if (!cancelled) setZone(found);
            return;
          }
        }
      } catch {
        // détection impossible : l'utilisateur choisira sa zone
      } finally {
        if (!cancelled) setZoneReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [setZone]);

  // ── Frais de port : recalcul (anti-rebond) quand la zone ou les poids changent ──
  const weightKey = groupList.map((g) => `${g.storeId}:${g.totalWeight.toFixed(2)}`).join('|');
  useEffect(() => {
    if (!zone?._id || !groupList.length) {
      setShipping({});
      return undefined;
    }
    const id = ++calcId.current;
    setShippingLoading(true);
    const timer = setTimeout(async () => {
      const entries = await Promise.all(
        groupList.map(async (g) => {
          const weight = Math.max(0.1, Math.round(g.totalWeight * 100) / 100);
          try {
            if (g.storeId === 'unknown') throw new Error('boutique inconnue');
            const r = await apiClient.post('/api/shipping2/calculate', { sellerId: g.storeId, customerZoneId: zone._id, weight }, { timeout: 10000 });
            const d = r.data?.data;
            if (!r.data?.success || !d) throw new Error('réponse invalide');
            return [g.storeId, {
              totalCost: Number(d.totalCost) || 0,
              fixedCost: Number(d.fixedCost) || 0,
              weightCost: Number(d.weightCost) || 0,
              costPerKg: Number(d.costPerKg) || FALLBACK.costPerKg,
              appliedPolicy: d.appliedPolicy || null,
              estimated: false,
            }];
          } catch {
            return [g.storeId, {
              totalCost: Math.round(FALLBACK.fixedCost + FALLBACK.costPerKg * weight),
              fixedCost: FALLBACK.fixedCost,
              weightCost: Math.round(FALLBACK.costPerKg * weight),
              costPerKg: FALLBACK.costPerKg,
              appliedPolicy: { zone: 'Politique par défaut', type: 'fallback' },
              estimated: true,
            }];
          }
        }),
      );
      if (id !== calcId.current) return; // un calcul plus récent a été lancé
      const result = Object.fromEntries(entries);
      setShipping(result);
      setShippingLoading(false);
      AsyncStorage.setItem('shippingDetails', JSON.stringify({ zone, calculations: result })).catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone?._id, weightKey]);

  const shippingTotal = useMemo(() => Object.values(shipping).reduce((s, c) => s + (c.totalCost || 0), 0), [shipping]);

  // ── Code promo ──
  const validatePromo = useCallback(
    async (code, amount = subtotal) => {
      const userId = user?.id || user?._id;
      const res = await apiClient.post('/api/promocodes/validate', {
        code,
        orderAmount: amount,
        userId,
        products: (articles || []).map((a) => a._id).filter(Boolean),
      });
      if (!res.data?.valid) throw new Error(res.data?.message || 'Code promo invalide');
      const { discount, finalAmount, promoCode } = res.data;
      return {
        _id: promoCode.id,
        code: promoCode.code,
        type: promoCode.type,
        value: promoCode.value,
        description: promoCode.description,
        discount: Number(discount) || 0,
        finalAmount,
        isValide: true,
      };
    },
    [articles, subtotal, user],
  );

  /** Applique un code ; renvoie { ok, message } */
  const applyPromo = useCallback(
    async (code) => {
      const clean = String(code || '').trim().toUpperCase();
      if (!clean) return { ok: false, message: 'Entrez un code promo' };
      setPromoLoading(true);
      try {
        const p = await validatePromo(clean);
        setPromo(p);
        return { ok: true, message: `-${p.discount} FCFA appliqués` };
      } catch (e) {
        setPromo(null);
        return { ok: false, message: e.response?.data?.message || e.message || "Ce code promo n'existe pas" };
      } finally {
        setPromoLoading(false);
      }
    },
    [validatePromo],
  );

  const removePromo = useCallback(() => {
    setPromo(null);
    AsyncStorage.removeItem('appliedPromoCode').catch(() => {});
  }, []);

  // Code mémorisé (relance de commande) appliqué automatiquement
  useEffect(() => {
    if (!user || !articles?.length || promo) return;
    AsyncStorage.getItem('appliedPromoCode')
      .then((code) => code && applyPromo(code))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, articles?.length]);

  // Réduction recalculée quand le sous-total change
  useEffect(() => {
    if (!promo || !user || subtotal <= 0) return;
    validatePromo(promo.code, subtotal)
      .then((p) => setPromo(p))
      .catch(() => setPromo(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const reduction = promo?.discount || 0;
  const total = Math.max(0, subtotal - reduction) + shippingTotal;

  return {
    groups, groupList, itemCount, subtotal, savings,
    zone, setZone, zoneReady,
    shipping, shippingTotal, shippingLoading,
    promo, applyPromo, removePromo, promoLoading,
    reduction, total,
  };
}
