import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../config/api';
import { getRememberedZone, getZones, quoteCart, rememberZone } from '../services/shippingV3';
import { groupByStore, originalPrice, unitPrice } from '../utils/cart';

// Helpers purs : voir utils/cart.js (ré-exportés pour compatibilité)
export { storeIdOf, unitPrice, originalPrice, itemWeight, availableStock, groupByStore } from '../utils/cart';

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Toute la logique panier → checkout : zone de livraison (mémorisée ou issue de l'adresse),
 * devis de livraison v3 (un appel pour tout le panier, même calcul que la commande),
 * code promo (validé côté serveur), totaux.
 */
export default function useCartCheckout(articles, user) {
  const [zone, setZoneState] = useState(null);
  const [zoneReady, setZoneReady] = useState(false);
  const [location, setLocation] = useState(null); // position GPS facultative (choisie via « Ma position »)
  const [quote, setQuote] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState(null);
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

  // ── Zone : mémorisée, sinon celle de l'adresse enregistrée (plus de détection par IP) ──
  const setZone = useCallback((z, meta) => {
    setZoneState(z);
    rememberZone(z);
    if (meta?.location) setLocation(meta.location);
  }, []);

  const userId = user?.id || user?._id;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remembered = await getRememberedZone();
        if (remembered) {
          if (!cancelled) setZoneState(remembered);
          return;
        }
        if (!userId) return;
        const r = await apiClient.get(`/getAddressByUserKey/${userId}`).catch(() => null);
        const zoneId = r?.data?.address?.zoneId;
        if (!zoneId) return;
        const z = (await getZones()).find((x) => x._id === String(zoneId));
        if (z && !cancelled) setZone(z);
      } catch {
        // l'utilisateur choisira sa zone
      } finally {
        if (!cancelled) setZoneReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [setZone, userId]);

  // ── Devis v3 : un appel pour tout le panier, relancé (anti-rebond) si la zone ou le panier change ──
  const quoteKey = (articles || []).map((a) => `${a._id}:${Number(a.quantite) || 0}`).sort().join('|');
  useEffect(() => {
    if (!zone?._id || !(articles || []).length) {
      setQuote(null);
      setShippingError(null);
      return undefined;
    }
    const id = ++calcId.current;
    setShippingLoading(true);
    setShippingError(null);
    const timer = setTimeout(async () => {
      try {
        const items = (articles || [])
          .filter((a) => a._id && Number(a.quantite) > 0)
          .map((a) => ({ productId: String(a._id), quantity: Number(a.quantite) }));
        const q = await quoteCart(zone._id, items);
        if (id !== calcId.current) return; // un calcul plus récent a été lancé
        setQuote(q);
      } catch {
        if (id !== calcId.current) return;
        setQuote(null);
        setShippingError('Calcul des frais indisponible. Réessayez dans un instant.');
      } finally {
        if (id === calcId.current) setShippingLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone?._id, quoteKey]);

  /** Frais par boutique : { [storeId]: { totalCost, deliverable, quoteRequired, message, delay, free, freeHint, origin } } */
  const shipping = useMemo(() => {
    const out = {};
    for (const p of quote?.parcels || []) {
      out[p.sellerId] = {
        totalCost: p.deliverable ? p.fee || 0 : 0,
        deliverable: p.deliverable,
        quoteRequired: p.quoteRequired,
        message: p.message,
        delay: p.delay?.label || null,
        free: p.free || null,
        freeHint: p.freeHint || null,
        origin: p.origin?.name || null,
        relation: p.relationLabel || null,
        storeName: p.storeName,
      };
    }
    return out;
  }, [quote]);

  const shippingTotal = quote?.totalFee || 0;
  const blockedParcels = useMemo(() => (quote?.parcels || []).filter((p) => !p.deliverable && !p.quoteRequired), [quote]);
  const quoteRequired = !!quote?.quoteRequired;
  const freeHint = useMemo(() => (quote?.parcels || []).map((p) => p.freeHint).find(Boolean) || null, [quote]);
  const shippingReady = !!zone && !!quote && !shippingLoading;

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
    zone, setZone, zoneReady, location,
    quote, shipping, shippingTotal, shippingLoading, shippingError, shippingReady,
    blockedParcels, quoteRequired, freeHint,
    promo, applyPromo, removePromo, promoLoading,
    reduction, total,
  };
}
